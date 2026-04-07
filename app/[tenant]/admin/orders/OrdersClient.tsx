"use client";

import { useEffect, useState } from "react";

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
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  async function loadOrders() {
    try {
      const res = await fetch(`/api/orders?tenant=${tenantSlug}`, {
        cache: "no-store",
      });

      const data = await res.json();
      setOrders(data.orders || []);
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
    loadOrders();

    const interval = setInterval(() => {
      loadOrders();
    }, 20000); // auto refresh every 20 sec

    return () => clearInterval(interval);
  }, [tenantSlug]);

  const filteredOrders =
    filter === "all"
      ? orders
      : orders.filter((order) => order.status === filter);

  const counts = {
    new: orders.filter((o) => o.status === "new").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
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

        {/* STATUS SUMMARY */}
        <div className="flex gap-4 mb-6 text-sm">
          <span>New: {counts.new}</span>
          <span>Preparing: {counts.preparing}</span>
          <span>Ready: {counts.ready}</span>
        </div>

        {/* FILTER */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "new", "confirmed", "preparing", "ready", "completed"].map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-full border text-sm ${filter === f ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
              >
                {f}
              </button>
            )
          )}
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
                <div className="mt-4 flex gap-2 flex-wrap">
                  {["confirmed", "preparing", "ready", "completed"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() =>
                          changeStatus(order.id, status as OrderStatus)
                        }
                        className="border px-3 py-1 rounded-full text-sm hover:bg-gray-100"
                      >
                        {status}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}