"use client";

import { useCartStore } from "@/lib/cart/cartStore";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const tenantItems = items.filter((item) => item.tenantSlug === tenantSlug);

  const totalCents = tenantItems.reduce((sum, item) => {
    return sum + item.priceCents * item.quantity;
  }, 0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    const trimmedName = name.trim();
    const trimmedNotes = notes.trim();
    const normalizedPhone = phone.replace(/\D/g, "");

    if (!trimmedName || !normalizedPhone) {
      alert("Please enter name and phone");
      return;
    }

    if (normalizedPhone.length < 10) {
      alert("Please enter a valid phone number");
      return;
    }

    if (tenantItems.length === 0) {
      alert("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
   const response = await fetch("/api/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    tenantSlug,
    customerName: trimmedName,
    customerPhone: normalizedPhone,
    notes: trimmedNotes,
    fulfillmentType: "PICKUP",
    items: tenantItems.map((item) => ({
      name: item.name,
      priceCents: item.priceCents,
      desc: item.desc,
      quantity: item.quantity,
    })),
    deliveryFeeCents: 0,
    gratuityCents: 0,
  }),
});

const data = await response.json();
console.log("checkout response", data);

if (!response.ok || !data.success || !data.checkoutUrl) {
  throw new Error(data.message || "Failed to start checkout");
}

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error(error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />

          <textarea
            placeholder="Special Instructions (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div className="mb-6 rounded-xl border p-6">
          <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>

          <div className="space-y-2">
            {tenantItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>${((item.priceCents * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
            <span>Total</span>
            <span>${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="rounded-full bg-orange-600 px-6 py-3 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Redirecting..." : "Pay Now"}
          </button>
        </div>
      </div>
    </main>
  );
}