
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/db/prisma";
import { stripeV2 } from "@/lib/stripe-v2";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  resolveConnectedAccount,
  StripeOnboardingError,
  type OnboardingMethod,
} from "@/lib/stripe/resolve-connected-account";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Verify Cohesion platform administrator.
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

    const admin = await prisma.platformAdmin.findFirst({
      where: {
        id: session.user.id,
        role: "platform-admin",
        isActive: true,
      },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // Validate request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const tenantSlug =
      typeof data.tenantSlug === "string"
        ? data.tenantSlug.trim()
        : "";

    const onboardingMethod = data.onboardingMethod;

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing tenantSlug" },
        { status: 400 }
      );
    }

    if (!["sindhu-east", "sindhu-west"].includes(tenantSlug)) {
      return NextResponse.json(
        {
          success: false,
          message: "Stripe Accounts v2 onboarding is not enabled for this tenant",
        },
        { status: 400 }
      );
    }

    if (
      onboardingMethod !== "SELF_SERVICE" &&
      onboardingMethod !== "ASSISTED"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid onboarding method" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        isActive: true,
      },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { success: false, message: "Active tenant not found" },
        { status: 404 }
      );
    }

    // Shared account resolution prevents duplicate creation.
    const stripeAccountId = await resolveConnectedAccount(
      tenant.slug,
      onboardingMethod as OnboardingMethod
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Application URL is not configured",
        },
        { status: 500 }
      );
    }

    // Generate a fresh, short-lived Stripe Account Link.
    // Generate a fresh, short-lived Stripe Account Link.
// API 2026-10-28.preview no longer accepts configurations.
const accountLink = await stripeV2.v2.core.accountLinks.create({
  account: stripeAccountId,
  use_case: {
    type: "account_onboarding",
    account_onboarding: {
      refresh_url: `${baseUrl.replace(/\/$/, "")}/stripe/refresh`,
      return_url: `${baseUrl.replace(/\/$/, "")}/stripe/return`,
    },
  },
} as Parameters<typeof stripeV2.v2.core.accountLinks.create>[0]);

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      stripeAccountId,
    });
  } catch (error) {
    if (error instanceof StripeOnboardingError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.statusCode }
      );
    }

    console.error("POST /api/connect/onboard failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to start Stripe onboarding",
      },
      { status: 500 }
    );
  }
}
