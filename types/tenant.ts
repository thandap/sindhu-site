export type BusinessType =
  | "restaurant"
  | "catering"
  | "cafe"
  | "bakery"
  | "food_truck"
  | "mixed";

export type FulfillmentType =
  | "pickup"
  | "delivery"
  | "dinein"
  | "catering";

export type OrderWorkflowType =
  | "instant_order"
  | "quote_request";

export interface TenantAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface TenantHoursDay {
  isOpen: boolean;
  open?: string;   // example: "11:00"
  close?: string;  // example: "21:30"
}

export interface TenantHours {
  sunday: TenantHoursDay;
  monday: TenantHoursDay;
  tuesday: TenantHoursDay;
  wednesday: TenantHoursDay;
  thursday: TenantHoursDay;
  friday: TenantHoursDay;
  saturday: TenantHoursDay;
}

export interface TenantBranding {
  logoText: string;
  primaryColor?: string;
  secondaryColor?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  coverImage?: string;
}

export interface TenantCapabilities {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  dineInEnabled: boolean;
  cateringEnabled: boolean;
  allowQuoteRequests: boolean;
  acceptingOrders: boolean;
}

export interface TenantContact {
  phone: string;
  email?: string;
  website?: string;
}

export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  businessType: BusinessType;

  domain?: string;
  subdomain?: string;

  contact: TenantContact;
  address: TenantAddress;
  branding: TenantBranding;
  capabilities: TenantCapabilities;

  defaultFulfillmentType: FulfillmentType;
  defaultWorkflowType: OrderWorkflowType;

  timezone: string;
  currency: string;
  taxRate: number;

  orderingNotice?: string;
  hours?: TenantHours;

  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
