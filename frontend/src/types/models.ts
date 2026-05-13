/**
 * Domain Model Types
 * Core business entities for Books4All marketplace
 */

// ============================================================================
// ENUMERATIONS
// ============================================================================

/**
 * Physical condition of a book listing
 */
export type BookCondition = 'new' | 'like_new' | 'good' | 'acceptable';

/**
 * Status of a book listing
 */
export type BookStatus = 'draft' | 'active' | 'sold' | 'archived';

/**
 * Status of an order
 */
export type OrderStatus = 'pending' | 'payment_processing' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

/**
 * User role in the marketplace
 */
export type UserRole = 'buyer' | 'seller' | 'admin';

/**
 * OAuth providers supported for authentication
 */
export type OAuthProvider = 'google' | 'facebook' | 'github';

// ============================================================================
// USER MODELS
// ============================================================================

/**
 * User profile response from API
 */
export interface User {
  id: string; // UUID
  email: string;
  role: UserRole;
  email_verified: boolean;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  oauth_provider?: OAuthProvider | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

/**
 * Minimal user info for nested responses
 */
export interface UserBrief {
  id: string; // UUID
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

// ============================================================================
// BOOK MODELS
// ============================================================================

/**
 * Book listing with full details and seller info
 */
export interface Book {
  id: string; // UUID
  seller_id: string; // UUID
  title: string;
  author: string;
  isbn?: string | null;
  description?: string | null;
  condition: BookCondition;
  price: string; // Decimal as string to preserve precision
  quantity: number;
  images?: string[] | null;
  status: BookStatus;
  category?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language: string;
  page_count?: number | null;
  seller?: UserBrief | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

/**
 * Minimal book info for nested responses (e.g., in orders)
 */
export interface BookBrief {
  id: string; // UUID
  title: string;
  author: string;
  price: string;
  condition: BookCondition;
  primary_image?: string | null;
}

/**
 * Book listing creation payload
 */
export interface BookCreatePayload {
  title: string; // 1-500 chars
  author: string; // 1-255 chars
  condition: BookCondition;
  price: number | string; // Must be > 0, max 10000
  isbn?: string | null; // 10-20 chars
  description?: string | null; // Max 5000 chars
  quantity?: number; // 1-1000, default 1
  images?: string[] | null; // Array max 10
  category?: string | null; // Max 100 chars
  publisher?: string | null; // Max 255 chars
  publication_year?: number | null; // 1000-2100
  language?: string; // Max 50, default 'English'
  page_count?: number | null; // 1-50000
  status?: BookStatus; // Default 'draft'
}

/**
 * Book listing update payload - all fields optional
 */
export interface BookUpdatePayload {
  title?: string | null;
  author?: string | null;
  condition?: BookCondition | null;
  price?: number | string | null;
  isbn?: string | null;
  description?: string | null;
  quantity?: number | null;
  images?: string[] | null;
  category?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string | null;
  page_count?: number | null;
  status?: BookStatus | null;
}

/**
 * Paginated list response for books
 */
export interface BookListResponse {
  items: Book[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// ORDER MODELS
// ============================================================================

/**
 * Shipping address for orders
 */
export interface ShippingAddress {
  full_name: string; // 1-200 chars
  address_line1: string; // 1-255 chars
  address_line2?: string | null; // Max 255 chars
  city: string; // 1-100 chars
  state: string; // 1-100 chars
  postal_code: string; // 1-20 chars
  country?: string; // 2-100 chars, default 'US'
  phone?: string | null; // Max 20 chars
}

/**
 * Order item in an order
 */
export interface OrderItem {
  id: string; // UUID
  order_id: string; // UUID
  book_id?: string | null; // UUID
  quantity: number;
  price_at_purchase: string; // Price in USD
  book_title: string;
  book_author: string;
  book?: BookBrief | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

/**
 * Order item creation payload
 */
export interface OrderItemCreatePayload {
  book_id: string; // UUID
  quantity?: number; // 1-100, default 1
}

/**
 * Order with items and buyer info
 */
export interface Order {
  id: string; // UUID
  buyer_id: string; // UUID
  total_amount: string; // Total in USD
  status: OrderStatus;
  stripe_payment_id?: string | null;
  shipping_address?: ShippingAddress | null;
  notes?: string | null;
  items?: OrderItem[];
  buyer?: UserBrief | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

/**
 * Order creation payload
 */
export interface OrderCreatePayload {
  items: OrderItemCreatePayload[]; // 1-50 items
  shipping_address: ShippingAddress;
  notes?: string | null; // Max 1000 chars
}

/**
 * Paginated list response for orders
 */
export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// REVIEW MODELS
// ============================================================================

/**
 * Book review with reviewer info
 */
export interface Review {
  id: string; // UUID
  book_id: string; // UUID
  user_id: string; // UUID
  rating: number; // 1-5
  comment?: string | null;
  is_verified_purchase: boolean;
  user?: UserBrief | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}

/**
 * Review creation payload
 */
export interface ReviewCreatePayload {
  rating: number; // 1-5, required
  comment?: string | null; // Max 2000 chars
}

/**
 * Review update payload
 */
export interface ReviewUpdatePayload {
  rating?: number | null; // 1-5
  comment?: string | null; // Max 2000 chars
}

/**
 * Review statistics for a book
 */
export interface ReviewStats {
  book_id: string; // UUID
  total_reviews: number;
  average_rating?: number | null; // 1-5
  rating_distribution: Record<string, number>; // { "1": count, "2": count, ... }
  verified_purchase_count: number;
}

/**
 * Paginated list response for reviews
 */
export interface ReviewListResponse {
  items: Review[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// PAYMENT MODELS
// ============================================================================

/**
 * Stripe checkout session response
 */
export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
  order_id: string; // UUID
}
