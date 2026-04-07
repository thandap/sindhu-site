import type { MenuSection } from "@/types/menu";

export const sindhuMenu: MenuSection[] = [
  {
    category: "Appetizers",
    items: [
      {
        name: "Samosa (2 pcs)",
        price: "$5.99",
        desc: "Crispy pastry filled with spiced potatoes and peas.",
        veg: true,
      },
      {
        name: "Paneer Pakora",
        price: "$7.99",
        desc: "Deep fried paneer fritters with chickpea batter.",
        veg: true,
        spicy: true,
      },
    ],
  },
  {
    category: "Vegetarian Entrees",
    items: [
      {
        name: "Paneer Tikka Masala",
        price: "$14.99",
        desc: "Paneer cubes in creamy tomato gravy.",
        veg: true,
        spicy: true,
      },
      {
        name: "Chana Masala",
        price: "$13.99",
        desc: "Chickpeas cooked with onion, tomato and spices.",
        veg: true,
        spicy: true,
      },
    ],
  },
  {
    category: "Non-Vegetarian Entrees",
    items: [
      {
        name: "Butter Chicken",
        price: "$15.99",
        desc: "Creamy tomato-based chicken curry.",
      },
      {
        name: "Chicken Curry",
        price: "$14.99",
        desc: "Traditional Indian chicken curry.",
        spicy: true,
      },
    ],
  },
  {
    category: "Biryani & Rice",
    items: [
      {
        name: "Chicken Biryani",
        price: "$16.99",
        desc: "Fragrant basmati rice with spiced chicken and herbs.",
        spicy: true,
      },
      {
        name: "Vegetable Biryani",
        price: "$14.99",
        desc: "Rice cooked with vegetables and aromatic Indian spices.",
        veg: true,
        spicy: true,
      },
    ],
  },
  {
    category: "Breads",
    items: [
      {
        name: "Garlic Naan",
        price: "$4.99",
        desc: "Soft naan with fresh garlic.",
        veg: true,
      },
      {
        name: "Butter Naan",
        price: "$3.99",
        desc: "Traditional naan brushed with butter.",
        veg: true,
      },
    ],
  },
];