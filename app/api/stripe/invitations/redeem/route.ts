import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { stripeV2 } from "@/lib/stripe-v2";
import {
  resolveConnectedAccount,
  StripeOnboardingError,
  type OnboardingMethod,
} from "@/lib/stripe/resolve-connected-account";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
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

    const action = data.action ?? "VALIDATE";

    if (action !== "VALIDATE" && action !== "START_ONBOARDING") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid invitation action",
        },
        { status: 400 }
      );
    }

    const token =
      typeof data.token === "string"
        ? data.token.trim()
        : "";

    // Invitation tokens are generated as 32 random bytes,
    // represented by 64 hexadecimal characters.
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { success: false, message: "Invalid invitation" },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const invitation =
      await prisma.stripeOnboardingInvitation.findUnique({
        where: { tokenHash },
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              isActive: true,
              stripeAccountId: true,
            },
          },
        },
      });

    if (
      !invitation ||
      !invitation.tenant.isActive ||
      invitation.revokedAt ||
      invitation.usedAt ||
      invitation.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invitation is invalid or expired",
        },
        { status: 410 }
      );
    }

    if (
      invitation.method !== "SELF_SERVICE" &&
      invitation.method !== "ASSISTED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid onboarding method",
        },
        { status: 409 }
      );
    }


    if (action === "START_ONBOARDING") {
      // Initial rollout: Sindhu restaurants only.
      // Elite Caters remains on its standalone production system.
      if (
        invitation.tenant.slug !== "sindhu-east" &&
        invitation.tenant.slug !== "sindhu-west"
      ) {
        return NextResponse.json(
          { success: false, message: "Onboarding is not enabled for this tenant" },
          { status: 403 }
        );
      }

      // Validate configuration before claiming the invitation.
      const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (!configuredUrl) {
        return NextResponse.json(
          { success: false, message: "Application URL is not configured" },
          { status: 500 }
        );
      }

      let baseUrl: string;

      try {
        const parsed = new URL(configuredUrl);
        const isLocal =
          parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1";

        if (
          (parsed.protocol !== "https:" && !isLocal) ||
          (isLocal && parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
          parsed.username ||
          parsed.password
        ) {
          throw new Error("Invalid application URL");
        }

        baseUrl = parsed.origin;
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid application URL configuration" },
          { status: 500 }
        );
      }

      const claimId = randomUUID();
      const now = new Date();

      const claim = await prisma.stripeOnboardingInvitation.updateMany({
        where: {
          id: invitation.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
          claimId: null,
          claimedAt: null,
        },
        data: {
          claimId,
          claimedAt: now,
        },
      });

      if (claim.count !== 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Invitation is already being processed. Contact your Resto administrator.",
          },
          { status: 409 }
        );
      }

      let accountResolutionStarted = false;

      try {
        accountResolutionStarted = true;

        const stripeAccountId = await resolveConnectedAccount(
          invitation.tenant.slug,
          invitation.method as OnboardingMethod
        );

        const accountLink = await stripeV2.v2.core.accountLinks.create({
          account: stripeAccountId,
          use_case: {
            type: "account_onboarding",
            account_onboarding: {
              refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/stripe/refresh`,
              return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/stripe/return`,
            },
          },
        } as Parameters<typeof stripeV2.v2.core.accountLinks.create>[0]);

        // Consume the invitation only if this request still owns it.
        const consumed = await prisma.stripeOnboardingInvitation.updateMany({
          where: {
            id: invitation.id,
            claimId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: {
            usedAt: new Date(),
            claimId: null,
            claimedAt: null,
          },
        });

        if (consumed.count !== 1) {
          return NextResponse.json(
            {
              success: false,
              message: "Invitation could not be finalized. Contact your Resto administrator.",
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            url: accountLink.url,
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "Referrer-Policy": "no-referrer",
            },
          }
        );
      } catch (error) {
        console.error("Stripe invitation onboarding failed:", error);

        // Preserve the claim once account resolution has begun.
        // The outcome may require reconciliation.
        if (!accountResolutionStarted) {
          await prisma.stripeOnboardingInvitation.updateMany({
            where: { id: invitation.id, claimId, usedAt: null },
            data: { claimId: null, claimedAt: null },
          });
        }

        if (error instanceof StripeOnboardingError) {
          return NextResponse.json(
            { success: false, message: error.message },
            { status: error.statusCode }
          );
        }

        return NextResponse.json(
          {
            success: false,
            message: "Unable to complete onboarding. Contact your Resto administrator.",
          },
          { status: 500 }
        );
      }
    }


    // Validation only. Do not consume the invitation yet.
    // A later step will create a Stripe onboarding link
    // and implement safe redemption/retry handling.

    return NextResponse.json({
      success: true,
      valid: true,
      tenantSlug: invitation.tenant.slug,
      onboardingMethod: invitation.method,
      expiresAt: invitation.expiresAt.toISOString(),
    });


  } catch (error) {
    console.error("Stripe invitation validation failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to validate invitation",
      },
      { status: 500 }
    );
  }
}
