import type { FulfillmentType } from "./tenant";

export type MenuItemPricingModel =
  | "fixed"
  | "per_person"
  | "per_tray"
  | "per_half_tray"
  | "package";

export type MenuItemServiceScope =
  | "regular"
  | "catering"
  | "both";

export type ModifierSelectionType =
  | "single"
  | "multiple";

/* =========================================================
   Phase 1 simple menu types
   Used by current static menuData in /data/menu.ts
========================================================= */

export interface MenuDataItem {
  name: string;
  price: string;
  desc: string;
  veg?: boolean;
  spicy?: boolean;
}

export interface MenuSection {
  category: string;
  items: MenuDataItem[];
}

/* =========================================================
   Phase 2 platform-ready menu types
========================================================= */

export interface MenuCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ModifierOption {
  id: string;
  tenantId: string;
  modifierGroupId: string;
  name: string;
  description?: string;
  priceDelta: number;
  displayOrder: number;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  tenantId: string;
  name: string;
  selectionType: ModifierSelectionType;
  isRequired: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder: number;
  options: ModifierOption[];
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  price: number;
  pricingModel: MenuItemPricingModel;
  serviceScope: MenuItemServiceScope;
  unitLabel?: string;
  minimumQuantity?: number;
  isVeg?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiceLevelDefault?: "mild" | "medium" | "hot";
  prepTimeMinutes?: number;
  isFeatured?: boolean;
  isActive: boolean;
  displayOrder: number;
  availableFor: FulfillmentType[];
  modifierGroups?: ModifierGroup[];
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface TenantMenu {
  tenantId: string;
  categories: MenuCategoryWithItems[];
}