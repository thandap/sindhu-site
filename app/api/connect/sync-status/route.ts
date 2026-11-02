
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db/prisma";
import { stripeV2 } from "@/lib/stripe-v2";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Cohesion platform administrator
    const session = await getServerSession(authOptions);

    if (
      session?.user?.accountType !== "platform" ||
      session.user.role !== "platform-admin" ||
      !session.user.id
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Confirm administrator is still active
    const platformAdmin = await prisma.platformAdmin.findFirst({
      where: {
        id: session.user.id,
        role: "platform-admin",
        isActive: true,
      },
      select: { id: true },
    });

    if (!platformAdmin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // 3. Validate request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const tenantSlug =
      body &&
      typeof body === "object" &&
      "tenantSlug" in body &&
      typeof body.tenantSlug === "string"
        ? body.tenantSlug.trim()
        : "";

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing tenantSlug" },
        { status: 400 }
      );
    }

    // Only Sindhu accounts use Accounts v2 currently.
    if (!["sindhu-east", "sindhu-west"].includes(tenantSlug)) {
      return NextResponse.json(
        {
          success: false,
          message: "Accounts v2 synchronization is not enabled for this tenant",
        },
        { status: 400 }
      );
    }

    // 4. Find the tenant and its Stripe account
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { success: false, message: "Active tenant not found" },
        { status: 404 }
      );
    }

    if (!tenant.stripeAccountId) {
      return NextResponse.json(
        {
          success: false,
          message: "Tenant Stripe account not configured",
        },
        { status: 400 }
      );
    }

    // 5. Retrieve authoritative Accounts v2 status
    const account = await stripeV2.v2.core.accounts.retrieve(
      tenant.stripeAccountId
    );

    // Verify account ownership before modifying the tenant.
    if (
      account.id !== tenant.stripeAccountId ||
      account.metadata?.tenantId !== tenant.id ||
      account.metadata?.tenantSlug !== tenant.slug
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Stripe account ownership mismatch",
        },
        { status: 409 }
      );
    }

    const merchant = account.configuration?.merchant;
    const recipient = account.configuration?.recipient;

    const cardPaymentsStatus =
      merchant?.capabilities?.card_payments?.status ?? "unknown";

    const transferStatus =
      recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ??
      "unknown";

    const payoutStatus =
      recipient?.capabilities?.stripe_balance?.payouts?.status ?? "unknown";

    const stripeChargesEnabled =
      merchant?.applied === true &&
      cardPaymentsStatus === "active";

    const stripePayoutsEnabled =
      recipient?.applied === true &&
      payoutStatus === "active";

    // Accounts v2 does not have the v1 details_submitted boolean.
    // This conservative approximation requires both capabilities
    // and no outstanding user-action requirements.
    const requirements = account.requirements;
    const hasOutstandingUserRequirements =
      requirements?.entries?.some(
        (entry) => entry.awaiting_action_from === "user"
      ) ?? false;

    const stripeDetailsSubmitted =
      stripeChargesEnabled &&
      stripePayoutsEnabled &&
      !hasOutstandingUserRequirements;

    // 6. Update only the selected tenant
    const updated = await prisma.tenant.update({
      where: {
        id: tenant.id,
        stripeAccountId: account.id,
      },
      data: {
        stripeChargesEnabled,
        stripePayoutsEnabled,
        stripeDetailsSubmitted,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        slug: updated.slug,
        stripeAccountId: updated.stripeAccountId,
        stripeChargesEnabled: updated.stripeChargesEnabled,
        stripePayoutsEnabled: updated.stripePayoutsEnabled,
        stripeDetailsSubmitted: updated.stripeDetailsSubmitted,
      },
      capabilities: {
        cardPayments: cardPaymentsStatus,
        transfers: transferStatus,
        payouts: payoutStatus,
      },
      requirements,
    });
  } catch (error) {
    console.error("POST /api/connect/sync-status failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to synchronize Stripe account status",
      },
      { status: 500 }
    );
  }
}
