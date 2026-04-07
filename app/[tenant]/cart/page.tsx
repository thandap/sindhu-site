"use client";

import { useCartStore } from "@/lib/cart/cartStore";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CartPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const items = useCartStore((state) => state.items);
  const increaseQty = useCartStore((state) => state.increaseQty);
  const decreaseQty = useCartStore((state) => state.decreaseQty);
  const removeItem = useCartStore((state) => state.removeItem);

  const tenantItems = items.filter(
    (item) => item.tenantSlug === tenantSlug
  );

  const total = tenantItems.reduce((sum, item) => {
    const price = parseFloat(item.price.replace("$", ""));
    return sum + price * item.quantity;
  }, 0);

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

        {tenantItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-6">Your cart is empty</p>
            <Link
              href={`/${tenantSlug}/menu`}
              className="bg-orange-600 text-white px-6 py-3 rounded-full"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {tenantItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() =>
                          decreaseQty(item.id, tenantSlug)
                        }
                        className="px-3 py-1 border rounded"
                      >
                        -
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() =>
                          increaseQty(item.id, tenantSlug)
                        }
                        className="px-3 py-1 border rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-orange-600">
                      ${(parseFloat(item.price.replace("$", "")) * item.quantity).toFixed(2)}
                    </p>

                    <button
                      onClick={() =>
                        removeItem(item.id, tenantSlug)
                      }
                      className="text-sm text-red-500 mt-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t pt-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Total</h2>
              <h2 className="text-xl font-bold text-orange-600">
                ${total.toFixed(2)}
              </h2>
            </div>

            <div className="mt-6 flex justify-end">
              <Link
                href={`/${tenantSlug}/checkout`}
                className="bg-orange-600 text-white px-6 py-3 rounded-full hover:bg-orange-700"
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}