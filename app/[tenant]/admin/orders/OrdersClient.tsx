"use client";

import { useEffect, useRef, useState } from "react";

type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "completed";

type OrderItem = {
  id: string;
  name: string;
  price: string;
  desc: string;
  quantity: number;
};

type Order = {
  id: string;
  tenantSlug: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
};

type Props = {
  tenant: string;
};

export default function TenantAdminOrdersClient({ tenant }: Props) {
  const tenantSlug = tenant;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    OrderStatus | "all" | "awaiting-payment"
  >("all");

  const [newPaidOrderCount, setNewPaidOrderCount] = useState(0);

  const previousOrdersRef = useRef<Map<string, string> | null>(null);

  async function loadOrders() {
    try {
      const res = await fetch(`/api/orders?tenant=${tenantSlug}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load orders: ${res.status}`);
      }

      const data = await res.json();
      const latestOrders: Order[] = data.orders || [];

      const previousOrders = previousOrdersRef.current;

      if (previousOrders !== null) {
        const newlyPaidOrders = latestOrders.filter((order) => {
          if (order.paymentStatus !== "paid" || order.status !== "new") {
            return false;
          }

          const previousPaymentStatus = previousOrders.get(order.id);

          return (
            previousPaymentStatus === undefined ||
            previousPaymentStatus !== "paid"
          );
        });

        if (newlyPaidOrders.length > 0) {
          setNewPaidOrderCount((current) => current + newlyPaidOrders.length);
        }
      }

      previousOrdersRef.current = new Map(
        latestOrders.map((order) => [order.id, order.paymentStatus])
      );

      setOrders(latestOrders);
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status, tenantSlug }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: data.order.status } : order
        )
      );
    } catch (error) {
      console.error(error);
      alert("Failed to update order status");
    }
  }

  useEffect(() => {
    previousOrdersRef.current = null;
    setNewPaidOrderCount(0);

    loadOrders();

    const interval = setInterval(() => {
      loadOrders();
    }, 20000);

    return () => clearInterval(interval);
  }, [tenantSlug]);

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "awaiting-payment") {
      return order.paymentStatus !== "paid";
    }

    if (filter === "new") {
      return order.status === "new" && order.paymentStatus === "paid";
    }

    return order.status === filter && order.paymentStatus === "paid";
  });

  const counts = {
    new: orders.filter(
      (o) => o.status === "new" && o.paymentStatus === "paid"
    ).length,

    awaitingPayment: orders.filter(
      (o) => o.paymentStatus !== "paid"
    ).length,

    preparing: orders.filter(
      (o) => o.status === "preparing" && o.paymentStatus === "paid"
    ).length,

    ready: orders.filter(
      (o) => o.status === "ready" && o.paymentStatus === "paid"
    ).length,
  };

  function statusColor(status: OrderStatus) {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "confirmed":
        return "bg-yellow-100 text-yellow-700";
      case "preparing":
        return "bg-orange-100 text-orange-700";
      case "ready":
        return "bg-green-100 text-green-700";
      case "completed":
        return "bg-gray-200 text-gray-700";
      default:
        return "";
    }
  }

  if (loading) {
    return <p className="p-6">Loading orders...</p>;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">Admin Orders</h1>

        {newPaidOrderCount > 0 && (
          <div
            role="status"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900"
          >
            <div>
              <p className="font-bold">
                New Paid Order Received!
              </p>
              <p className="text-sm">
                {newPaidOrderCount} new paid{" "}
                {newPaidOrderCount === 1 ? "order" : "orders"} received.
                Check the New orders filter.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilter("new");
                setNewPaidOrderCount(0);
              }}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              View New Orders
            </button>
          </div>
        )}

        {/* STATUS SUMMARY */}
        <div className="flex gap-4 mb-6 text-sm">
          <span>New: {counts.new}</span>
          <span>Awaiting Payment: {counts.awaitingPayment}</span>
          <span>Preparing: {counts.preparing}</span>
          <span>Ready: {counts.ready}</span>
        </div>

        {/* FILTER */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            "all",
            "new",
            "awaiting-payment",
            "confirmed",
            "preparing",
            "ready",
            "completed",
          ].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-full border text-sm ${filter === f ? "bg-black text-white" : "hover:bg-gray-100"
                }`}
            >
              {f === "awaiting-payment" ? "Awaiting Payment" : f}
            </button>
          ))}
        </div>

        {/* ORDERS */}
        {filteredOrders.length === 0 ? (
          <p>No orders found.</p>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">{order.id}</h2>
                    <p className="text-slate-700">{order.customerName}</p>
                    <p className="text-slate-600">{order.customerPhone}</p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-orange-600">
                      ${order.total.toFixed(2)}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${order.paymentStatus === "paid"
                        ? "text-green-600"
                        : order.paymentStatus === "pending"
                          ? "text-amber-600"
                          : "text-red-600"
                        }`}
                    >
                      Payment: {order.paymentStatus.toUpperCase()}
                    </p>
                    <span
                      className={`px-3 py-1 text-sm rounded-full ${statusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* ITEMS */}
                <div className="mt-4 border-t pt-4 space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>
                        $
                        {(
                          parseFloat(item.price.replace("$", "")) *
                          item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ACTIONS */}
                {order.paymentStatus !== "paid" ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-amber-700">
                      Awaiting Payment — Kitchen actions unavailable
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {(() => {
                      const nextAction: Partial<
                        Record<OrderStatus, { status: OrderStatus; label: string }>
                      > = {
                        new: {
                          status: "confirmed",
                          label: "Confirm Order",
                        },
                        confirmed: {
                          status: "preparing",
                          label: "Start Preparing",
                        },
                        preparing: {
                          status: "ready",
                          label: "Mark Ready",
                        },
                        ready: {
                          status: "completed",
                          label: "Complete Order",
                        },
                      };

                      const action = nextAction[order.status];

                      if (!action) {
                        return (
                          <span className="text-sm font-medium text-green-700">
                            Order Completed
                          </span>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => changeStatus(order.id, action.status)}
                          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                        >
                          {action.label}
                        </button>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}