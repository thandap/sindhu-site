import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { OrderStatus } from "@/lib/generated/prisma/client";

const ALLOWED_STATUSES = ["new", "confirmed", "preparing", "ready", "completed"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function mapOrder(order: any) {
  return {
    id: order.orderNumber,
    dbId: order.id,
    tenantSlug: order.tenant.slug,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    notes: order.notes,
    total: Number(order.total),
    status: order.status.toLowerCase(),
    createdAt: order.createdAt,
    items: order.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: `$${Number(item.price).toFixed(2)}`,
      desc: item.desc,
      quantity: item.quantity,
      tenantSlug: order.tenant.slug,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = request.nextUrl.searchParams.get("tenant");

    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing tenant" },
        { status: 400 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        tenant: {
          slug: tenantSlug,
        },
      },
      include: {
        items: true,
        tenant: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      orders: orders.map(mapOrder),
    });
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { tenantSlug, customerName, customerPhone, notes, items, total } = body;

    if (!tenantSlug || !customerName || !customerPhone || !items?.length) {
      return NextResponse.json(
        { success: false, message: "Missing required order fields" },
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

    const sanitizedItems = items.map(
      (item: {
        name: string;
        price: string | number;
        desc?: string;
        quantity: number;
      }) => ({
        name: item.name,
        price: Number(String(item.price).replace("$", "")),
        desc: item.desc || "",
        quantity: Number(item.quantity) || 1,
      })
    );

    const computedTotal = sanitizedItems.reduce(
  (sum: number, item: { price: number; quantity: number }) =>
    sum + item.price * item.quantity,
  0
);

    const orderNumber = `ORD-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        tenantId: tenant.id,
        customerName,
        customerPhone,
        notes: notes || "",
        total: computedTotal,
        status: OrderStatus.NEW,
        items: {
          create: sanitizedItems,
        },
      },
      include: {
        items: true,
        tenant: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.orderNumber,
        dbId: order.id,
      },
    });
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, tenantSlug } = body;

    if (!id || !status || !tenantSlug) {
      return NextResponse.json(
        { success: false, message: "Missing id, status, or tenantSlug" },
        { status: 400 }
      );
    }

    const normalizedStatus = String(status).toLowerCase();

    if (!ALLOWED_STATUSES.includes(normalizedStatus as AllowedStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    const prismaStatus = normalizedStatus.toUpperCase() as keyof typeof OrderStatus;

    const existing = await prisma.order.findFirst({
      where: {
        orderNumber: id,
        tenant: {
          slug: tenantSlug,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Order not found for this tenant" },
        { status: 404 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: OrderStatus[prismaStatus],
      },
      include: {
        items: true,
        tenant: true,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: updated.orderNumber,
        status: updated.status.toLowerCase(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/orders failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update order status" },
      { status: 500 }
    );
  }
}