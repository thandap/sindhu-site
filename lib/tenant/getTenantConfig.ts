import type { TenantConfig } from "@/types/tenant";

const tenants: TenantConfig[] = [
  {
    id: "1",
    slug: "sindhu",
    name: "Sindhu Indian Restaurant",
    brandName: "SINDHU",
    businessType: "restaurant",
    subdomain: "sindhu",
    domain: "sindhu.com",
    contact: {
      phone: "(517) 351-3080",
      email: "info@sindhu.com",
    },
    address: {
      addressLine1: "4790 Hagadorn Rd #132",
      city: "East Lansing",
      state: "MI",
      postalCode: "48823",
      country: "USA",
    },
    branding: {
      logoText: "SINDHU",
      primaryColor: "#c2410c",
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
    name: "Elite Caters",
    brandName: "Elite Caters",
    businessType: "catering",
    subdomain: "elitecaters",
    domain: "elitecaters.com",
    contact: {
      phone: "(517) 555-5678",
      email: "orders@elitecaters.com",
    },
    address: {
      addressLine1: "456 Lansing Ave",
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

export function getTenantBySlug(slug: string): TenantConfig | null {
  return tenants.find((t) => t.slug === slug && t.isActive) || null;
}

export function getTenantByDomain(domain: string): TenantConfig | null {
  const clean = domain.toLowerCase().replace(/^www\./, "");
  return (
    tenants.find(
      (t) =>
        t.isActive &&
        (t.domain?.toLowerCase() === clean ||
          `${t.subdomain}.resto.com`.toLowerCase() === clean)
    ) || null
  );
}

export function getDefaultTenant(): TenantConfig {
  return tenants[0];
}