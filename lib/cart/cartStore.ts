"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  tenantSlug: string;
  name: string;
  price: string;
  desc: string;
  veg?: boolean;
  spicy?: boolean;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string, tenantSlug: string) => void;
  clearCart: (tenantSlug?: string) => void;
  increaseQty: (id: string, tenantSlug: string) => void;
  decreaseQty: (id: string, tenantSlug: string) => void;
  getItemCount: (tenantSlug?: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (cartItem) =>
              cartItem.id === item.id && cartItem.tenantSlug === item.tenantSlug
          );

          if (existing) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.id === item.id && cartItem.tenantSlug === item.tenantSlug
                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                  : cartItem
              ),
            };
          }

          return {
            items: [...state.items, { ...item, quantity: 1 }],
          };
        }),

      removeItem: (id, tenantSlug) =>
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === id && item.tenantSlug === tenantSlug)
          ),
        })),

      clearCart: (tenantSlug) =>
        set((state) => ({
          items: tenantSlug
            ? state.items.filter((item) => item.tenantSlug !== tenantSlug)
            : [],
        })),

      increaseQty: (id, tenantSlug) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.tenantSlug === tenantSlug
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        })),

      decreaseQty: (id, tenantSlug) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.id === id && item.tenantSlug === tenantSlug
                ? { ...item, quantity: item.quantity - 1 }
                : item
            )
            .filter((item) => item.quantity > 0),
        })),

      getItemCount: (tenantSlug) => {
        const items = get().items;
        const filtered = tenantSlug
          ? items.filter((item) => item.tenantSlug === tenantSlug)
          : items;

        return filtered.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "resto-cart",
    }
  )
);