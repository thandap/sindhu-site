"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/cart/cartStore";

type MenuItem = {
  id: string;
  name: string;
  desc: string;
  priceCents: number;
  image: string | null;
  veg?: boolean;
  spicy?: boolean;
};

type MenuSection = {
  category: string;
  items: MenuItem[];
};

type Props = {
  tenantSlug: string;
  tenantBrandName: string;
  tenantSubtitle?: string;
};


export default function TenantMenuClient({
  tenantSlug,
  tenantBrandName,
  tenantSubtitle,
}: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);

  const [menuData, setMenuData] = useState<MenuSection[]>([]);

  useEffect(() => {
    async function loadMenu() {
      const res = await fetch(`/api/menu?tenant=${tenantSlug}`);
      const data = await res.json();

      if (data.success) {
        setMenuData(
          data.menu.map((cat: any) => ({
            category: cat.name,
            items: cat.items.map((item: any) => ({
              id: item.id,
              name: item.name,
              desc: item.description ?? "",
              priceCents: item.priceCents,
              image: item.image ?? null,
              veg: item.isVegetarian,
              spicy: (item.spiceLevel || 0) > 0,
            })),
          }))
        );
      }
    }

    loadMenu();
  }, [tenantSlug]);

  const cartCount = items
    .filter((item) => item.tenantSlug === tenantSlug)
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-3 text-4xl font-bold text-center md:text-left">
              {tenantBrandName} Menu
            </h1>

            {tenantSubtitle && (
              <p className="text-center text-gray-600 md:text-left">
                {tenantSubtitle}
              </p>
            )}
          </div>

          <Link
            href={`/${tenantSlug}/cart`}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Cart ({cartCount})
          </Link>
        </div>

        <div className="space-y-10">
          {menuData.map((section) => (
            <section key={section.category}>
              <h2 className="mb-4 text-2xl font-semibold text-orange-700">
                {section.category}
              </h2>

              <div className="space-y-4">
                {section.items.map((item) => {
                  const itemId = item.id;

                  return (
                    <div key={itemId} className="border-b pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              loading="lazy"
                              className="h-24 w-24 shrink-0 rounded-xl object-cover shadow-sm sm:h-28 sm:w-28"
                            />
                          ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs text-orange-700 sm:h-28 sm:w-28">
                              No photo
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-orange-600 font-semibold">
                            ${(item.priceCents / 100).toFixed(2)}
                          </p>

                          <button
                            onClick={() => {
                              console.log("adding item", {
                                id: itemId,
                                tenantSlug,
                                name: item.name,
                                priceCents: item.priceCents,
                              });
                              addItem({
                                id: itemId,
                                tenantSlug,
                                name: item.name,
                                priceCents: item.priceCents,
                                desc: item.desc,
                                veg: item.veg,
                                spicy: item.spicy,
                              });
                            }}
                            className="mt-2 rounded bg-orange-600 px-3 py-1 text-white"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
