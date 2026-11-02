"use client";

import { useCartStore } from "@/lib/cart/cartStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;


  type CheckoutConfig = {
    payment: {
      onlineEnabled: boolean;
    };
    fulfillment: {
      pickupEnabled: boolean;
      deliveryEnabled: boolean;
      deliveryFeeType: string;
      deliveryFeeCents: number | null;
    };
    tax: {
      rate: number;
    };
  };

  const [checkoutConfig, setCheckoutConfig] =
    useState<CheckoutConfig | null>(null);

  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");

  const [fulfillmentType, setFulfillmentType] =
    useState<"PICKUP" | "DELIVERY">("PICKUP");

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutConfig() {
      setConfigLoading(true);
      setConfigError("");
      setCheckoutConfig(null);

      try {
        const response = await fetch(
          `/api/checkout/config?tenant=${encodeURIComponent(tenantSlug)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Failed to load checkout settings"
          );
        }

        if (cancelled) return;

        setCheckoutConfig(data);

        setFulfillmentType(
          data.fulfillment.pickupEnabled ? "PICKUP" : "DELIVERY"
        );
      } catch (error) {
        if (!cancelled) {
          setConfigError(
            error instanceof Error
              ? error.message
              : "Failed to load checkout settings"
          );
        }
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }

    if (tenantSlug) loadCheckoutConfig();

    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);


  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);

  const tenantItems = items.filter((item) => item.tenantSlug === tenantSlug);


  const subtotalCents = tenantItems.reduce((sum, item) => {
    return sum + item.priceCents * item.quantity;
  }, 0);

  // Temporary display estimate.
  // Must match the tenant's server-side tax configuration.
  const taxRate = 0.06;
  const taxCents = Math.round(subtotalCents * taxRate);

  const totalCents = subtotalCents + taxCents;


  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const deliveryQuoteRequired =
    fulfillmentType === "DELIVERY" &&
    checkoutConfig?.fulfillment.deliveryFeeType === "CUSTOM";

  const canPay =
    !loading &&
    !configLoading &&
    !configError &&
    !!checkoutConfig &&
    checkoutConfig.payment?.onlineEnabled === true &&
    tenantItems.length > 0 &&
    !deliveryQuoteRequired &&
    (fulfillmentType === "PICKUP"
      ? checkoutConfig.fulfillment.pickupEnabled
      : checkoutConfig.fulfillment.deliveryEnabled);

  const handlePlaceOrder = async () => {
    const trimmedName = name.trim();
    const trimmedNotes = notes.trim();
    const normalizedPhone = phone.replace(/\D/g, "");

    if (!canPay) {
      alert("This checkout option is not currently available.");
      return;
    }

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
          fulfillmentType,

          items: tenantItems.map((item) => ({
            id: item.id,
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

      alert(
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

        <div className="mb-8 space-y-4">

          {/* Fulfillment Options */}
          <div className="mb-6 rounded-xl border p-5">
            <h2 className="mb-3 text-lg font-semibold">
              Order Type
            </h2>

            {configLoading ? (
              <p className="text-sm text-gray-500">
                Loading ordering options...
              </p>
            ) : configError ? (
              <p className="text-sm text-red-600">
                {configError}
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {checkoutConfig?.fulfillment.pickupEnabled && (
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("PICKUP")}
                    className={`rounded-lg border px-5 py-3 ${fulfillmentType === "PICKUP"
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-gray-300"
                      }`}
                  >
                    Pickup
                  </button>
                )}

                {checkoutConfig?.fulfillment.deliveryEnabled && (
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("DELIVERY")}
                    className={`rounded-lg border px-5 py-3 ${fulfillmentType === "DELIVERY"
                      ? "border-orange-600 bg-orange-50 text-orange-700"
                      : "border-gray-300"
                      }`}
                  >
                    Delivery
                  </button>
                )}
              </div>
            )}

            {fulfillmentType === "DELIVERY" &&
              checkoutConfig?.fulfillment.deliveryFeeType === "CUSTOM" && (
                <p className="mt-3 text-sm text-amber-700">
                  Delivery requires a custom quote. Online payment
                  for delivery is not available yet.
                </p>
              )}
          </div>

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


          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${(subtotalCents / 100).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Estimated Sales Tax (6%)</span>
              <span>${(taxCents / 100).toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Estimated Total</span>
              <span>${(totalCents / 100).toFixed(2)}</span>
            </div>
          </div>

        </div>


        <div className="flex flex-col items-end gap-3">
          {!configLoading &&
            !configError &&
            checkoutConfig &&
            checkoutConfig.payment?.onlineEnabled === false && (
              <p
                role="alert"
                className="text-sm font-medium text-amber-700"
              >
                Online payment is temporarily unavailable for this restaurant.
                Please contact the restaurant.
              </p>
            )}
          {tenantItems.length === 0 && (
            <p className="text-sm text-amber-700">
              Your cart is empty. Please add items from the menu
              before checkout.
            </p>
          )}

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={!canPay}
            className="rounded-full bg-orange-600 px-6 py-3 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : checkoutConfig?.payment?.onlineEnabled === false
                ? "Online Payment Unavailable"
                : deliveryQuoteRequired
                  ? "Delivery Quote Required"
                  : "Pay Now"}
          </button>

        </div>

      </div>
    </main>
  );
}