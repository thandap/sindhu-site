
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db/prisma";
import { PaymentStatus } from "@/lib/generated/prisma/client";

type PaymentOutcome = "PAID" | "FAILED";

type PaymentReference = {
  tenantId: string;
  orderId: string;
  paymentId: string;
  sessionId?: string;
  paymentIntentId?: string;
  amountCents?: number | null;
  currency?: string | null;
  clientReferenceId?: string | null;
};

async function updatePayment(
  ref: PaymentReference,
  outcome: PaymentOutcome,
  payload: Stripe.Event.Data.Object
) {
  const {
    tenantId,
    orderId,
    paymentId,
    sessionId,
    paymentIntentId,
    amountCents,
    currency,
    clientReferenceId,
  } = ref;

  if (!tenantId || !orderId || !paymentId) {
    throw new Error("Missing required Stripe payment metadata");
  }

  await prisma.$transaction(async (tx) => {
    const [order, payment] = await Promise.all([
      tx.order.findUnique({ where: { id: orderId } }),
      tx.payment.findUnique({ where: { id: paymentId } }),
    ]);

    if (
      !order ||
      !payment ||
      order.tenantId !== tenantId ||
      payment.tenantId !== tenantId ||
      payment.orderId !== order.id
    ) {
      throw new Error("Stripe tenant/order/payment mismatch");
    }

    if (
      sessionId &&
      (order.stripeSessionId !== sessionId ||
        payment.stripeSessionId !== sessionId)
    ) {
      throw new Error("Stripe session mismatch");
    }

    if (
      clientReferenceId !== undefined &&
      clientReferenceId !== order.id
    ) {
      throw new Error("Stripe client reference mismatch");
    }

    if (
      paymentIntentId &&
      ((order.stripePaymentIntentId &&
        order.stripePaymentIntentId !== paymentIntentId) ||
        (payment.stripePaymentIntentId &&
          payment.stripePaymentIntentId !== paymentIntentId))
    ) {
      throw new Error("Stripe PaymentIntent mismatch");
    }

    if (
      amountCents != null &&
      (amountCents !== order.totalCents ||
        amountCents !== payment.amountCents)
    ) {
      throw new Error("Stripe payment amount mismatch");
    }

    if (
      currency &&
      currency.toLowerCase() !== payment.currency.toLowerCase()
    ) {
      throw new Error("Stripe currency mismatch");
    }

    // Never overwrite a refunded or canceled payment.
    // Never overwrite refunded or canceled payments.
    if (
      order.paymentStatus === PaymentStatus.REFUNDED ||
      order.paymentStatus === PaymentStatus.CANCELED ||
      payment.status === PaymentStatus.REFUNDED ||
      payment.status === PaymentStatus.CANCELED
    ) {
      return;
    }

    // A late failure must never overwrite a successful payment.
    if (
      outcome === "FAILED" &&
      (order.paymentStatus === PaymentStatus.PAID ||
        payment.status === PaymentStatus.PAID)
    ) {
      return;
    }

    const nextStatus =
      outcome === "PAID"
        ? PaymentStatus.PAID
        : PaymentStatus.FAILED;

    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: nextStatus,
        ...(sessionId ? { stripeSessionId: sessionId } : {}),
        ...(paymentIntentId
          ? { stripePaymentIntentId: paymentIntentId }
          : {}),
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        ...(sessionId ? { stripeSessionId: sessionId } : {}),
        ...(paymentIntentId
          ? { stripePaymentIntentId: paymentIntentId }
          : {}),
        rawPayload: payload as any,
      },
    });
  });
}

function getSessionReference(
  session: Stripe.Checkout.Session
): PaymentReference {
  return {
    tenantId: session.metadata?.tenantId ?? "",
    orderId: session.metadata?.orderId ?? "",
    paymentId: session.metadata?.paymentId ?? "",
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? undefined,
    amountCents: session.amount_total,
    currency: session.currency,
    clientReferenceId: session.client_reference_id,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook signature or secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe signature verification failed:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        if (session.payment_status !== "paid") {
          console.log(
            "Checkout payment not yet paid:",
            session.id,
            session.payment_status
          );
          break;
        }

        await updatePayment(
          getSessionReference(session),
          "PAID",
          session
        );

        break;
      }

      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        await updatePayment(
          getSessionReference(session),
          "FAILED",
          session
        );

        break;
      }

      case "payment_intent.payment_failed": {
        const intent =
          event.data.object as Stripe.PaymentIntent;

        await updatePayment(
          {
            tenantId: intent.metadata?.tenantId ?? "",
            orderId: intent.metadata?.orderId ?? "",
            paymentId: intent.metadata?.paymentId ?? "",
            paymentIntentId: intent.id,
            amountCents: intent.amount,
            currency: intent.currency,
          },
          "FAILED",
          intent
        );

        break;
      }

      default:
        console.log("Stripe event ignored:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
