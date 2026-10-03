"use client";

import { useEffect, useMemo, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  priceCents: number;
  price: string;
  isFeatured: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  spiceLevel?: number | null;
  sortOrder: number;
};

type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  sortOrder: number;
  items: MenuItem[];
};

type MenuResponse = {
  success: boolean;
  tenant: {
    slug: string;
    name: string;
    brandName: string;
  };
  menu: MenuCategory[];
};

type Props = {
  tenant: string;
};

export default function MenuClient({ tenant }: Props) {
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch(`/api/menu?tenant=${tenant}`, {
          cache: "no-store",
        });

        const data: MenuResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error("Failed to load menu");
        }

        setMenu(data.menu || []);
        setBrandName(data.tenant?.brandName || "");
      } catch (error) {
        console.error("Failed to load menu", error);
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [tenant]);

  const filteredMenu = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return menu
      .filter((category) => {
        if (activeCategory === "all") return true;
        return category.slug === activeCategory;
      })
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if (!normalizedSearch) return true;

          return (
            item.name.toLowerCase().includes(normalizedSearch) ||
            item.description?.toLowerCase().includes(normalizedSearch)
          );
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [menu, activeCategory, search]);

  if (loading) {
    return <div className="p-6">Loading menu...</div>;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{brandName || "Menu"}</h1>
          <p className="mt-2 text-slate-600">Browse our freshly prepared dishes.</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-500"
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full border px-4 py-2 text-sm ${
              activeCategory === "all"
                ? "bg-orange-600 text-white border-orange-600"
                : "border-slate-300 hover:bg-slate-50"
            }`}
          >
            All
          </button>

          {menu.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.slug)}
              className={`rounded-full border px-4 py-2 text-sm ${
                activeCategory === category.slug
                  ? "bg-orange-600 text-white border-orange-600"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {filteredMenu.length === 0 ? (
          <p className="text-slate-600">No menu items found.</p>
        ) : (
          <div className="space-y-10">
            {filteredMenu.map((category) => (
              <section key={category.id}>
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold">{category.name}</h2>
                  {category.description ? (
                    <p className="mt-1 text-slate-600">{category.description}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">{item.name}</h3>

                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {item.isVegetarian ? (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
                                Vegetarian
                              </span>
                            ) : null}

                            {item.isVegan ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                                Vegan
                              </span>
                            ) : null}

                            {item.isGlutenFree ? (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                                Gluten Free
                              </span>
                            ) : null}

                            {item.spiceLevel ? (
                              <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-700">
                                Spice {item.spiceLevel}
                              </span>
                            ) : null}

                            {item.isFeatured ? (
                              <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700">
                                Featured
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">
                            ${item.price}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <button className="rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}