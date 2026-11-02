
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes, createHash } from "node:crypto";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Verify Cohesion platform administrator
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

    // Validate request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON" },
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

    const method = data.onboardingMethod;

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing tenantSlug" },
        { status: 400 }
      );
    }

    if (method !== "SELF_SERVICE" && method !== "ASSISTED") {
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
        stripeAccountId: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardingOperation: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!tenant || !tenant.isActive) {
      return NextResponse.json(
        { success: false, message: "Active tenant not found" },
        { status: 404 }
      );
    }

    // Do not invite a tenant with an uncertain account state.
    const operation = tenant.stripeOnboardingOperation;

    if (
      operation?.status === "CREATING" ||
      operation?.status === "REVIEW_REQUIRED" ||
      (operation?.status === "CREATED" &&
        !tenant.stripeAccountId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Stripe account requires reconciliation first",
        },
        { status: 409 }
      );
    }

    if (
      tenant.stripeAccountId &&
      tenant.stripeChargesEnabled &&
      tenant.stripePayoutsEnabled
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Stripe account is already enabled",
        },
        { status: 409 }
      );
    }


    // Validate the application URL before changing invitation records.
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!configuredUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Application URL is not configured",
        },
        { status: 500 }
      );
    }

    let baseUrl: URL;

    try {
      baseUrl = new URL(configuredUrl);

      if (
        baseUrl.protocol !== "https:" &&
        !(
          process.env.NODE_ENV !== "production" &&
          baseUrl.hostname === "localhost" &&
          baseUrl.protocol === "http:"
        )
      ) {
        throw new Error("Invalid application URL protocol");
      }

      if (baseUrl.username || baseUrl.password) {
        throw new Error("Application URL contains credentials");
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid application URL configuration",
        },
        { status: 500 }
      );
    }

    // Generate a cryptographically secure invitation token.
    const token = randomBytes(32).toString("hex");

    // Never store the raw token in PostgreSQL.
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Revoke previous unused invitations for this tenant
    // and create the replacement in one transaction.
    await prisma.$transaction(async (tx) => {
      await tx.stripeOnboardingInvitation.updateMany({
        where: {
          tenantId: tenant.id,
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.stripeOnboardingInvitation.create({
        data: {
          tenantId: tenant.id,
          tokenHash,
          method,
          expiresAt,
        },
      });
    });

    const invitationUrl = new URL("/stripe/invite", baseUrl);
    invitationUrl.searchParams.set("token", token);

    return NextResponse.json({
      success: true,
      tenantSlug: tenant.slug,
      onboardingMethod: method,
      invitationUrl: invitationUrl.toString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Stripe invitation creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create Stripe invitation",
      },
      { status: 500 }
    );
  }
}
