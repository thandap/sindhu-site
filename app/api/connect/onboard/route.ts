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

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant not found" },
        { status: 404 }
      );
    }

    let stripeAccountId = tenant.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "company",
        metadata: {
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
        },
      });

      stripeAccountId = account.id;

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          stripeAccountId,
          stripeChargesEnabled: account.charges_enabled,
          stripePayoutsEnabled: account.payouts_enabled,
          stripeDetailsSubmitted: account.details_submitted,
        },
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/${tenant.slug}/admin/stripe/connect/refresh`,
      return_url: `${baseUrl}/${tenant.slug}/admin/stripe/connect/return`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      stripeAccountId,
    });
  } catch (error: any) {
    console.error("POST /api/connect/onboard failed:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to start onboarding" },
      { status: 500 }
    );
  }
}