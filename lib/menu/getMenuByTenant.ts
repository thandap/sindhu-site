import type { MenuSection } from "@/types/menu";
import { sindhuMenu } from "@/data/tenants/sindhu-menu";
import { eliteCatersMenu } from "@/data/tenants/elitecaters-menu";

export function getMenuByTenant(slug: string): MenuSection[] {
  switch (slug) {
    case "sindhu":
      return sindhuMenu;

    case "elitecaters":
      return eliteCatersMenu;

    default:
      return [];
  }
}