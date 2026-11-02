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


        const tenantConfig = (tenant.config ?? {}) as any;
        const fulfillmentConfig = tenantConfig.fulfillment ?? {};

        const selectedFulfillment = String(fulfillmentType).toUpperCase();

        // Validate fulfillment type
        if (
            selectedFulfillment !== "PICKUP" &&
            selectedFulfillment !== "DELIVERY"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid fulfillment type",
                },
                { status: 400 }
            );
        }

        // Check tenant fulfillment settings
        if (
            (selectedFulfillment === "PICKUP" &&
                fulfillmentConfig.pickupEnabled !== true) ||
            (selectedFulfillment === "DELIVERY" &&
                fulfillmentConfig.deliveryEnabled !== true)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Fulfillment option is not available for this restaurant",
                },
                { status: 400 }
            );
        }

        // Elite Caters delivery requires server-side fee calculation.
        // Keep delivery payments disabled until implemented.
        if (selectedFulfillment === "DELIVERY") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Delivery checkout is being configured. Please contact the restaurant for a delivery quote.",
                },
                { status: 400 }
            );
        }

        // Verify Stripe connection
        if (!tenant.stripeAccountId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Tenant Stripe account not connected",
                },
                { status: 400 }
            );
        }

        // Prevent checkout when the connected Stripe account
        // is not approved to accept payments.
        if (
            !tenant.stripeChargesEnabled ||
            !tenant.stripePayoutsEnabled
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Online payment is temporarily unavailable for this restaurant. Please contact the restaurant.",
                },
                { status: 409 }
            );
        }

        // Server-controlled amounts for current pickup checkout
        const validatedDeliveryFeeCents = 0;
        const validatedGratuityCents = 0;

        // Tenant tax configuration
        const taxRate = Number(tenantConfig.taxRate ?? 0.06);



        if (String(fulfillmentType).toUpperCase() !== "PICKUP") {
            return NextResponse.json(
                {
                    success: false,
                    message: "Only pickup orders are currently supported",
                },
                { status: 400 }
            );
        }

        type CheckoutCartItem = {
            id: string;
            quantity: number;
        };

        // Validate the incoming cart.
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, message: "Cart is empty" },
                { status: 400 }
            );
        }

        const requestedItems = items as CheckoutCartItem[];

        if (
            requestedItems.length > 100 ||
            requestedItems.some(
                (item) =>
                    !item ||
                    typeof item.id !== "string" ||
                    !item.id.trim() ||
                    !Number.isSafeInteger(item.quantity) ||
                    item.quantity < 1 ||
                    item.quantity > 50
            )
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid cart items or quantities" },
                { status: 400 }
            );
        }

        const requestedIds = requestedItems.map((item) => item.id);

        if (new Set(requestedIds).size !== requestedIds.length) {
            return NextResponse.json(
                { success: false, message: "Duplicate cart item IDs" },
                { status: 400 }
            );
        }

        // Fetch authoritative prices from PostgreSQL.
        const dbItems = await prisma.menuItem.findMany({
            where: {
                tenantId: tenant.id,
                id: { in: requestedIds },
                isActive: true,
                isAvailable: true,
                category: {
                    isActive: true,
                },
            },
            select: {
                id: true,
                name: true,
                description: true,
                priceCents: true,
            },
        });

        if (dbItems.length !== requestedIds.length) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "One or more dishes are unavailable. Please refresh the menu.",
                },
                { status: 400 }
            );
        }

        const dbItemMap = new Map(
            dbItems.map((item) => [item.id, item])
        );

        const sanitizedItems = requestedItems.map((requested) => {
            const dbItem = dbItemMap.get(requested.id)!;

            return {
                name: dbItem.name,
                priceCents: dbItem.priceCents,
                desc: dbItem.description ?? "",
                quantity: requested.quantity,
                metadata: {
                    menuItemId: dbItem.id,
                },
            };
        });


        const subtotalCents = sanitizedItems.reduce(
            (sum: number, item: { priceCents: number; quantity: number }) =>
                sum + item.priceCents * item.quantity,
            0
        );


        const taxCents = Math.round(subtotalCents * taxRate);

        const totalCents =
            subtotalCents +
            validatedDeliveryFeeCents +
            validatedGratuityCents +
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
                fulfillmentType: selectedFulfillment as FulfillmentType,
                addressLine1: addressLine1 || null,
                addressLine2: addressLine2 || null,
                city: city || null,
                state: state || null,
                zip: zip || null,
                requestedDate: requestedDate ? new Date(requestedDate) : null,
                requestedTimeLabel: requestedTimeLabel || null,
                subtotalCents,
                deliveryFeeCents: validatedDeliveryFeeCents,
                gratuityCents: validatedGratuityCents,
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

        if (validatedDeliveryFeeCents > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Delivery Fee",
                    },
                    unit_amount: validatedDeliveryFeeCents,
                },
                quantity: 1,
            });
        }

        if (validatedGratuityCents > 0) {
            lineItems.push({
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Gratuity",
                    },
                    unit_amount: validatedGratuityCents,
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
            success_url: `${baseUrl}/${tenant.slug}/order-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/${tenant.slug}/cart`,
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