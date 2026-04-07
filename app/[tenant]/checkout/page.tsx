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

  const total = tenantItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace("$", ""));
    return sum + price * item.quantity;
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
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug,
          customerName: trimmedName,
          customerPhone: normalizedPhone,
          notes: trimmedNotes,
          items: tenantItems,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to place order");
      }

      clearCart(tenantSlug);
      router.push(`/${tenantSlug}/order-success?order=${data.order.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to place order. Please try again.");
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
                <span>
                  $
                  {(
                    parseFloat(item.price.replace("$", "")) * item.quantity
                  ).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between border-t pt-4 font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="rounded-full bg-orange-600 px-6 py-3 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </main>
  );
}