"use client";

import Link from "next/link";
import { useCartStore } from "@/lib/cart/cartStore";
import type { MenuSection } from "@/types/menu";

type Props = {
  tenantSlug: string;
  tenantBrandName: string;
  tenantSubtitle?: string;
  menuData: MenuSection[];
};

function makeItemId(category: string, itemName: string) {
  return `${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}__${itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
}

export default function TenantMenuClient({
  tenantSlug,
  tenantBrandName,
  tenantSubtitle,
  menuData,
}: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);

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
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Cart ({cartCount})
          </Link>
        </div>

        <div className="sticky top-16 z-40 mb-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
          <div className="flex min-w-max gap-3">
            {menuData.map((section) => {
              const sectionId = section.category
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");

              return (
                <a
                  key={section.category}
                  href={`#${sectionId}`}
                  className="rounded-full border border-orange-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                >
                  {section.category}
                </a>
              );
            })}
          </div>
        </div>

        <div className="space-y-10">
          {menuData.map((section) => (
            <section
              key={section.category}
              id={section.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
              className="scroll-mt-36"
            >
              <h2 className="mb-4 text-2xl font-semibold text-orange-700">
                {section.category}
              </h2>

              <div className="space-y-4">
                {section.items.map((item) => {
                  const itemId = makeItemId(section.category, item.name);

                  return (
                    <div
                      key={itemId}
                      className="rounded-md border-b px-2 pb-4 transition hover:bg-orange-50"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">{item.name}</h3>

                            {item.veg && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                🟢 Veg
                              </span>
                            )}

                            {item.spicy && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                🌶️ Spicy
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm text-gray-600">{item.desc}</p>
                        </div>

                        <div className="flex items-center gap-3 md:min-w-[180px] md:justify-end">
                          <span className="font-semibold text-orange-600">
                            {item.price}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              addItem({
                                id: itemId,
                                tenantSlug,
                                name: item.name,
                                price: item.price,
                                desc: item.desc,
                                veg: item.veg,
                                spicy: item.spicy,
                              })
                            }
                            className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                          >
                            Add to Cart
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