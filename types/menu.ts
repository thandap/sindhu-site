export type MenuItem = {
  name: string;
  price: string;
  desc: string;
  veg?: boolean;
  spicy?: boolean;
};

export type MenuSection = {
  category: string;
  items: MenuItem[];
};