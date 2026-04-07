import type { TenantConfig } from "@/types/tenant";

// TEMP: seed-based tenant config (Phase 2A)
// Later this will come from DB

const tenants: TenantConfig[] = [
  {
    id: "1",
    slug: "sindhu",
    name: "Sindhu Indian Restaurant",
    brandName: "SINDHU",
    businessType: "restaurant",

    contact: {
      phone: "(517) 555-1234",
      email: "info@sindhu.com",
    },

    address: {
      addressLine1: "123 Okemos Rd",
      city: "Okemos",
      state: "MI",
      postalCode: "48864",
      country: "USA",
    },

    branding: {
      logoText: "SINDHU",
      primaryColor: "#c2410c", // orange
      heroTitle: "Authentic Indian Cuisine",
      heroSubtitle: "Fresh. Flavorful. Made with love.",
    },

    capabilities: {
      pickupEnabled: true,
      deliveryEnabled: false,
      dineInEnabled: true,
      cateringEnabled: false,
      allowQuoteRequests: false,
      acceptingOrders: true,
    },

    defaultFulfillmentType: "pickup",
    defaultWorkflowType: "instant_order",

    timezone: "America/Detroit",
    currency: "USD",
    taxRate: 0.06,

    isActive: true,
  },

  {
    id: "2",
    slug: "elitecaters",
    name: "Elite Catering Services",
    brandName: "Elite Caters",
    businessType: "catering",

    contact: {
      phone: "(517) 555-5678",
      email: "info@elitecaters.com",
    },

    address: {
      addressLine1: "3530 S Waverly Rd",
      city: "Lansing",
      state: "MI",
      postalCode: "48910",
      country: "USA",
    },

    branding: {
      logoText: "Elite Caters",
      primaryColor: "#1f2937",
      heroTitle: "Premium Catering for Every Occasion",
      heroSubtitle: "Weddings. Parties. Corporate Events.",
    },

    capabilities: {
      pickupEnabled: false,
      deliveryEnabled: true,
      dineInEnabled: false,
      cateringEnabled: true,
      allowQuoteRequests: true,
      acceptingOrders: true,
    },

    defaultFulfillmentType: "catering",
    defaultWorkflowType: "quote_request",

    timezone: "America/Detroit",
    currency: "USD",
    taxRate: 0.06,

    isActive: true,
  },
];


// 🔍 Get tenant by slug
export function getTenantBySlug(slug: string): TenantConfig | null {
  return tenants.find((t) => t.slug === slug && t.isActive) || null;
}


// 🔍 Default fallback (Sindhu for now)
export function getDefaultTenant(): TenantConfig {
  return tenants[0];
}


// 🔍 Resolve tenant from request path
export function resolveTenantFromPath(pathname: string): TenantConfig {
  const parts = pathname.split("/").filter(Boolean);

  const slug = parts[0];

  if (!slug) return getDefaultTenant();

  return getTenantBySlug(slug) || getDefaultTenant();
}