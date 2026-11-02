
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const tenantSlug =
      request.nextUrl.searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Tenant is required",
        },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: {
        slug: tenantSlug,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        brandName: true,
        config: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "Restaurant not found",
        },
        { status: 404 }
      );
    }

    const config = (tenant.config ?? {}) as Record<
      string,
      any
    >;

    const fulfillment = config.fulfillment ?? {};

    return NextResponse.json({
      success: true,
      tenant: {
        slug: tenant.slug,
        name: tenant.name,
        brandName: tenant.brandName,
      },
      fulfillment: {
        pickupEnabled:
          fulfillment.pickupEnabled === true,

        deliveryEnabled:
          fulfillment.deliveryEnabled === true,

        deliveryFeeType:
          fulfillment.deliveryFeeType ?? "NONE",

        deliveryFeeCents:
          fulfillment.deliveryFeeType === "FIXED"
            ? fulfillment.deliveryFeeCents ?? 0
            : null,
      },
      tax: {
        rate: Number(config.taxRate ?? 0.06),
      },
    });
  } catch (error) {
    console.error("GET /api/checkout/config failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load checkout configuration",
      },
      { status: 500 }
    );
  }
}
