
"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Confirmation = {
  success: boolean;
  confirmed: boolean;
  orderNumber: string;
  totalCents: number;
  paymentStatus: string;
};

type PageState = "loading" | "paid" | "pending" | "invalid" | "error";

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const tenantSlug = params.tenant as string;
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState<PageState>("loading");
  const [order, setOrder] = useState<Confirmation | null>(null);

  useEffect(() => {
    if (!sessionId || !tenantSlug) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function verifyOrder(attempt = 0) {
      try {
        const query = new URLSearchParams({
          tenant: tenantSlug,
          session_id: sessionId!,
        });

        const response = await fetch(
          `/api/checkout/confirmation?${query.toString()}`,
          { cache: "no-store" }
        );

        if (cancelled) return;

        if (response.status === 400 || response.status === 404) {
          setState("invalid");
          return;
        }

        if (!response.ok) {
          setState("error");
          return;
        }

        const data: Confirmation = await response.json();

        if (cancelled) return;

        setOrder(data);

        if (data.confirmed && data.paymentStatus === "PAID") {
          setState("paid");
          return;
        }

        if (data.paymentStatus === "PENDING" && attempt < 5) {
          setState("pending");
          timer = setTimeout(() => verifyOrder(attempt + 1), 2000);
          return;
        }

        setState(
          data.paymentStatus === "PENDING" ? "pending" : "invalid"
        );
      } catch {
        if (!cancelled) setState("error");
      }
    }

    verifyOrder();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, tenantSlug]);

  const missingSession = !sessionId || !tenantSlug;
  const currentState = missingSession ? "invalid" : state;

  const amount = order
    ? (order.totalCents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        {currentState === "loading" && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-slate-800">
              Verifying Your Payment
            </h1>
            <p className="mb-6 text-gray-600">
              Please wait while we confirm your order.
            </p>
          </>
        )}

        {currentState === "paid" && order && (
          <>
            <h1 className="mb-4 text-3xl font-bold text-green-600">
              Order Placed Successfully!
            </h1>
            <p className="mb-3 text-gray-600">
              Thank you! Your payment has been confirmed.
            </p>
            <p className="mb-2 text-sm text-slate-700">
              Order Number:{" "}
              <span className="font-semibold">{order.orderNumber}</span>
            </p>
            <p className="mb-6 text-lg font-semibold text-slate-900">
              Total Paid: {amount}
            </p>
          </>
        )}

        {currentState === "pending" && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-amber-600">
              Payment Confirmation Pending
            </h1>
            <p className="mb-6 text-gray-600">
              Your order was created, but payment confirmation is
              still processing. Please check again shortly.
              Do not submit another payment yet.
            </p>
          </>
        )}

        {currentState === "invalid" && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-slate-800">
              No Confirmed Order Found
            </h1>
            <p className="mb-6 text-gray-600">
              We could not verify a completed payment for this link.
            </p>
          </>
        )}

        {currentState === "error" && (
          <>
            <h1 className="mb-4 text-2xl font-bold text-red-600">
              Unable to Verify Payment
            </h1>
            <p className="mb-6 text-gray-600">
              We could not check your payment status right now.
              Please try again later before placing another order.
            </p>
          </>
        )}

        <div className="flex justify-center">
          <Link
            href={`/${tenantSlug}/menu`}
            className="rounded-full bg-orange-600 px-6 py-3 text-white"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
