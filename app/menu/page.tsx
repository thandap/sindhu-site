const menuData = [
  {
    category: "Appetizers",
    items: [
      { name: "Samosa", price: "$5.99", desc: "Crispy pastry stuffed with spiced potatoes." },
      { name: "Paneer Pakora", price: "$7.99", desc: "Indian cottage cheese fritters." },
    ],
  },
  {
    category: "Main Course",
    items: [
      { name: "Butter Chicken", price: "$15.99", desc: "Creamy tomato-based chicken curry." },
      { name: "Paneer Tikka Masala", price: "$14.99", desc: "Paneer in rich spiced tomato gravy." },
    ],
  },
  {
    category: "Biryani",
    items: [
      { name: "Chicken Biryani", price: "$16.99", desc: "Fragrant basmati rice with spiced chicken." },
      { name: "Vegetable Biryani", price: "$14.99", desc: "Rice cooked with vegetables and Indian spices." },
    ],
  },
];

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10">Our Menu</h1>

        <div className="space-y-10">
          {menuData.map((section) => (
            <section key={section.category}>
              <h2 className="text-2xl font-semibold text-orange-700 mb-4">
                {section.category}
              </h2>
              <div className="grid gap-4">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="border rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">{item.name}</h3>
                      <span className="font-semibold text-orange-600">
                        {item.price}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">{item.desc}</p>
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