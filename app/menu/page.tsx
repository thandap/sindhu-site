import { menuData } from "@/data/menu";

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10">Our Menu</h1>

       <div className="sticky top-16 z-40 mb-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
          <div className="flex gap-3 min-w-max">
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
              <h2 className="text-2xl font-semibold text-orange-700 mb-4">
                {section.category}
              </h2>

              <div className="space-y-4">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="border-b pb-4 hover:bg-orange-50 transition px-2 rounded-md"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{item.name}</h3>

                        {item.veg && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                            🟢 Veg
                          </span>
                        )}

                        {item.spicy && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                            🌶️ Spicy
                          </span>
                        )}
                      </div>

                      <span className="text-orange-600 font-semibold">
                        {item.price}
                      </span>
                    </div>

                    <p className="text-gray-600 mt-1 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}