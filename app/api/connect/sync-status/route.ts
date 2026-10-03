import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantSlug } = body;

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing tenantSlug" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant?.stripeAccountId) {
      return NextResponse.json(
        { success: false, message: "Tenant Stripe account not configured" },
        { status: 400 }
      );
    }

    const account = await stripe.accounts.retrieve(tenant.stripeAccountId);

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
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
      requirements: account.requirements,
    });
  } catch (error: any) {
    console.error("POST /api/connect/sync-status failed:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to sync Stripe status" },
      { status: 500 }
    );
  }
}