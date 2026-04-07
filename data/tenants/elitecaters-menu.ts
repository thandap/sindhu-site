import type { MenuSection } from "@/types/menu";

export const eliteCatersMenu: MenuSection[] = [
  {
    category: "Catering Packages",
    items: [
      {
        name: "Classic Package",
        price: "$14.99 / person",
        desc: "Rice, naan, one veg curry, one chicken curry, salad, and dessert.",
      },
      {
        name: "Premium Package",
        price: "$19.99 / person",
        desc: "Rice, naan, two veg curries, two non-veg curries, appetizer, dessert.",
        spicy: true,
      },
    ],
  },
  {
    category: "Party Trays",
    items: [
      {
        name: "Butter Chicken Tray",
        price: "$69.99",
        desc: "Large catering tray of butter chicken, ideal for parties and events.",
      },
      {
        name: "Paneer Tikka Masala Tray",
        price: "$64.99",
        desc: "Large vegetarian tray with rich paneer tikka masala.",
        veg: true,
        spicy: true,
      },
    ],
  },
  {
    category: "Rice & Bread",
    items: [
      {
        name: "Biryani Tray",
        price: "$59.99",
        desc: "Aromatic biryani tray for group catering orders.",
        spicy: true,
      },
      {
        name: "Naan Basket",
        price: "$24.99",
        desc: "Assorted naan basket for catering orders.",
        veg: true,
      },
    ],
  },
];