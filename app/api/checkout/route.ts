import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/stripe";
import {
    FulfillmentType,
    OrderStatus,
    PaymentStatus,
} from "@/lib/generated/prisma/client";

type IncomingItem = {
    name: string;
    priceCents: number;
    desc?: string;
    quantity: number;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            tenantSlug,
            customerName,
            customerPhone,
            customerEmail,
            notes,
            items,
            fulfillmentType = "PICKUP",
            addressLine1,
            addressLine2,
            city,
            state,
            zip,
            requestedDate,
            requestedTimeLabel,
            gratuityCents = 0,
            deliveryFeeCents = 0,
        } = body;

        if (!tenantSlug || !customerName || !customerPhone || !items?.length) {
            return NextResponse.json(
                { success: false, message: "Missing required checkout fields" },
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

        if (!tenant.stripeAccountId) {
            return NextResponse.json(
                { success: false, message: "Tenant Stripe account not connected" },
                { status: 400 }
            );
        }

        const sanitizedItems: {
            name: string;
            priceCents: number;
            desc: string;
            quantity: number;
        }[] = (items as IncomingItem[]).map((item: IncomingItem) => ({
            name: item.name,
            priceCents: item.priceCents,
            desc: item.desc || "",
            quantity: Number(item.quantity) || 1,
        }));

        const subtotalCents = sanitizedItems.reduce(
            (sum: number, item: { priceCents: number; quantity: number }) =>
                sum + item.priceCents * item.quantity,
            0
        );

        const tenantConfig = (tenant.config ?? {}) as any;
        const taxRate = Number(tenantConfig.taxRate ?? 0.06);
        const taxCents = Math.round(subtotalCents * taxRate);

        const totalCents =
            subtotalCents +
            Number(deliveryFeeCents || 0) +
            Number(gratuityCents || 0) +
            taxCents;

        const platformFeeBps = tenant.platformFeeBps ?? 300;
        const applicationFeeCents = Math.round(
            (subtotalCents * platformFeeBps) / 10000
        );

        const orderNumber = `ORD-${Date.now()}`;

        const order = await prisma.order.create({
            data: {
                orderNumber,
                tenantId: tenant.id,
                customerName,
                customerPhone,
                customerEmail: customerEmail || null,
                notes: notes || "",
                fulfillmentType:
                    FulfillmentType[
                    String(fulfillmentType).toUpperCase() as keyof typeof FulfillmentType
                    ] || FulfillmentType.PICKUP,
                addressLine1: addressLine1 || null,
                addressLine2: addressLine2 || null,
                city: city || null,
                state: state || null,
                zip: zip || null,
                requestedDate: requestedDate ? new Date(requestedDate) : null,
                requestedTimeLabel: requestedTimeLabel || null,
                subtotalCents,
                deliveryFeeCents: Number(deliveryFeeCents || 0),
                gratuityCents: Number(gratuityCents || 0),
                taxCents,
                totalCents,
                status: OrderStatus.NEW,
                paymentStatus: PaymentStatus.PENDING,
                items: {
                    create: sanitizedItems,
                },
            },
            include: {
                items: true,
            },
        });

        const payment = await prisma.payment.create({
            data: {
                tenantId: tenant.id,
                orderId: order.id,
                provider: "stripe",
                currency: "usd",
                amountCents: totalCents,
                applicationFeeCents,
                destinationAccountId: tenant.stripeAccountId,
                status: PaymentStatus.PENDING,
            },
        });

 type CheckoutLineItem = {
  price_data: {
    currency: string;
    product_data: {
      name: string;
      description?: string;
    };
    unit_amount: number;
  };
  quantity: number;
};

const lineItems: CheckoutLineItem[] = sanitizedItems.map((item) => ({
  price_data: {
    currency: "usd",
    product_data: {
      name: item.name,
      ...(item.desc?.trim() ? { description: item.desc.trim() } : {}),
    },
    unit_amount: item.priceCents,
  },
  quantity: item.quantity,
}));

        if (Number(deliveryFeeCents) > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Delivery Fee",                        
                    },
                    unit_amount: Number(deliveryFeeCents),
                },
                quantity: 1,
            });
        }

        if (Number(gratuityCents) > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Gratuity",
                       },
                    unit_amount: Number(gratuityCents),
                },
                quantity: 1,
            });
        }

        if (taxCents > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Sales Tax",
                          },
                    unit_amount: taxCents,
                },
                quantity: 1,
            });
        }

        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: lineItems,
            success_url: `${baseUrl}/${tenant.slug}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/${tenant.slug}/checkout/cancel`,
            client_reference_id: order.id,
            metadata: {
                tenantId: tenant.id,
                tenantSlug: tenant.slug,
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentId: payment.id,
            },
            payment_intent_data: {
                application_fee_amount: applicationFeeCents,
                transfer_data: {
                    destination: tenant.stripeAccountId,
                },
                on_behalf_of: tenant.stripeAccountId,
                metadata: {
                    tenantId: tenant.id,
                    tenantSlug: tenant.slug,
                    orderId: order.id,
                    paymentId: payment.id,
                },
            },
            customer_email: customerEmail || undefined,
            billing_address_collection: "auto",
            ...(String(fulfillmentType).toUpperCase() === "DELIVERY"
                ? {
                    shipping_address_collection: {
                        allowed_countries: ["US"],
                    },
                }
                : {}),
        });

        await prisma.order.update({
            where: { id: order.id },
            data: {
                stripeSessionId: session.id,
            },
        });

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                stripeSessionId: session.id,
                rawPayload: session as any,
            },
        });

        return NextResponse.json({
            success: true,
            checkoutUrl: session.url,
            orderId: order.id,
            orderNumber: order.orderNumber,
        });
    } catch (error: any) {
        console.error("POST /api/checkout failed:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Checkout failed" },
            { status: 500 }
        );
    }
}