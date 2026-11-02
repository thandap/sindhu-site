
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PaymentStatus } from "@/lib/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = request.nextUrl.searchParams.get("tenant");
    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (
      !tenantSlug ||
      !sessionId ||
      !/^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid confirmation request" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        stripeSessionId: sessionId,
        tenant: {
          slug: tenantSlug,
          isActive: true,
        },
      },
      select: {
        orderNumber: true,
        totalCents: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const confirmed = order.paymentStatus === PaymentStatus.PAID;

    return NextResponse.json(
      {
        success: true,
        confirmed,
        orderNumber: order.orderNumber,
        totalCents: order.totalCents,
        paymentStatus: order.paymentStatus,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/checkout/confirmation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to verify order" },
      { status: 500 }
    );
  }
}
