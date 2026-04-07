"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const tenantSlug = params.tenant as string;
  const orderNumber = searchParams.get("order");

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="mb-4 text-3xl font-bold text-green-600">
          Order Placed Successfully 🎉
        </h1>

        <p className="mb-3 text-gray-600">
          Thank you! Your order has been received.
        </p>

        {orderNumber && (
          <p className="mb-6 text-sm text-slate-700">
            Your order number is{" "}
            <span className="font-semibold">{orderNumber}</span>
          </p>
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