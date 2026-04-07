export type SubmittedOrderItem = {
  id: string;
  name: string;
  price: string;
  desc: string;
  quantity: number;
  tenantSlug: string;
};

export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed";

export type SubmittedOrder = {
  id: string;
  tenantSlug: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  items: SubmittedOrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
};

const globalForOrders = globalThis as unknown as {
  orders?: SubmittedOrder[];
};

if (!globalForOrders.orders) {
  globalForOrders.orders = [];
}

export function getOrders() {
  return globalForOrders.orders!;
}

export function addOrder(
  order: Omit<SubmittedOrder, "id" | "createdAt" | "status">
): SubmittedOrder {
  const newOrder: SubmittedOrder = {
    ...order,
    id: `ORD-${Date.now()}`,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  globalForOrders.orders!.unshift(newOrder);
  return newOrder;
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  const orders = globalForOrders.orders!;
  const index = orders.findIndex((order) => order.id === id);

  if (index === -1) return null;

  orders[index] = {
    ...orders[index],
    status,
  };

  return orders[index];
}