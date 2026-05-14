import type { UserBrief } from "./auth";
import type { BookBrief } from "./book";

export type OrderStatus =
  | "pending"
  | "payment_processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface ShippingAddress {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  phone?: string;
}

export interface OrderItemCreate {
  book_id: string;
  quantity?: number;
}

export interface OrderCreateInput {
  shipping_address: ShippingAddress;
  items: OrderItemCreate[];
  notes?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  book_id: string | null;
  quantity: number;
  price_at_purchase: string;
  book_title: string;
  book_author: string;
  book: BookBrief | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  total_amount: string;
  status: OrderStatus;
  stripe_payment_id: string | null;
  shipping_address: ShippingAddress | null;
  notes: string | null;
  items: OrderItem[];
  buyer: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
  order_id: string;
}
