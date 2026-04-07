import type { FulfillmentType, OrderWorkflowType } from "./tenant";

export type OrderStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type PaymentMethod =
  | "cash"
  | "card"
  | "online"
  | "other";

export type FulfillmentTimeType =
  | "asap"
  | "scheduled";

export type QuoteStatus =
  | "not_applicable"
  | "pending_review"
  | "quoted"
  | "approved"
  | "rejected";

export interface CustomerInfo {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
}

export interface FulfillmentInfo {
  fulfillmentType: FulfillmentType;
  fulfillmentTimeType: FulfillmentTimeType;
  scheduledFor?: string; // ISO string
  specialInstructions?: string;
}

export interface CateringDetails {
  eventDate?: string; // YYYY-MM-DD
  eventTime?: string; // HH:mm
  guestCount?: number;
  occasionType?: string;
  venueName?: string;
  venueAddressLine1?: string;
  venueAddressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  serviceStyle?: "buffet" | "tray_dropoff" | "boxed_meals" | "full_service";
  setupRequired?: boolean;
  servingRequired?: boolean;
  specialRequests?: string;
}

export interface OrderItemModifier {
  modifierGroupId: string;
  modifierGroupName: string;
  modifierOptionId: string;
  modifierOptionName: string;
  priceDelta: number;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  specialInstructions?: string;
  modifiers?: OrderItemModifier[];
}

export interface OrderPricing {
  subtotal: number;
  taxAmount: number;
  serviceFee: number;
  discountAmount: number;
  totalAmount: number;
}

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: string;

  workflowType: OrderWorkflowType;
  quoteStatus?: QuoteStatus;

  customer: CustomerInfo;
  fulfillment: FulfillmentInfo;
  cateringDetails?: CateringDetails;

  items: OrderItem[];
  pricing: OrderPricing;

  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;

  source?: "web" | "admin" | "phone";
  internalNotes?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderRequest {
  tenantSlug: string;
  workflowType: OrderWorkflowType;
  customer: CustomerInfo;
  fulfillment: FulfillmentInfo;
  cateringDetails?: CateringDetails;
  items: OrderItem[];
}

export interface CreateOrderResponse {
  success: boolean;
  order?: Order;
  message?: string;
}