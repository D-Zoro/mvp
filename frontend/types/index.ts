/**
 * API Type Definitions
 * Generated from OpenAPI spec at docs/openapi.json
 */

// ========== ENUMS ==========

export enum UserRole {
  BUYER = "BUYER",
  SELLER = "SELLER",
  ADMIN = "ADMIN",
}

export enum BookStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  SOLD = "SOLD",
  ARCHIVED = "ARCHIVED",
}

export enum BookCondition {
  MINT = "MINT",
  EXCELLENT = "EXCELLENT",
  VERY_GOOD = "VERY_GOOD",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

export enum OrderStatus {
  PENDING = "PENDING",
  PAYMENT_PROCESSING = "PAYMENT_PROCESSING",
  PAID = "PAID",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export enum OAuthProvider {
  GOOGLE = "google",
  GITHUB = "github",
}

// ========== AUTH TYPES ==========

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state?: string;
}

// ========== TOKEN TYPES ==========

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse extends TokenResponse {
  user: UserResponse;
}

// ========== USER TYPES ==========

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBriefResponse {
  id: string;
  first_name: string;
  last_name: string;
}

// ========== BOOK TYPES ==========

export interface BookCreate {
  title: string;
  author: string;
  description: string;
  isbn?: string;
  price: string;
  condition: BookCondition;
  images?: string[];
  category?: string;
}

export interface BookUpdate {
  title?: string;
  author?: string;
  description?: string;
  price?: string;
  condition?: BookCondition;
  status?: BookStatus;
  images?: string[];
  category?: string;
}

export interface BookResponse {
  id: string;
  title: string;
  author: string;
  description: string;
  isbn?: string;
  price: string;
  condition: BookCondition;
  status: BookStatus;
  seller: UserBriefResponse;
  images: string[];
  primary_image?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  review_stats: ReviewStats;
}

export interface BookBriefResponse {
  id: string;
  title: string;
  author: string;
  price: string;
  condition: BookCondition;
  primary_image?: string;
}

export interface BookListResponse {
  items: BookResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========== REVIEW TYPES ==========

export interface ReviewCreate {
  rating: number;
  comment: string;
}

export interface ReviewUpdate {
  rating?: number;
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  book_id: string;
  reviewer: UserBriefResponse;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewListResponse {
  items: ReviewResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  distribution: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
}

// ========== ORDER TYPES ==========

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface OrderItemCreate {
  book_id: string;
  quantity: number;
}

export interface OrderItemResponse {
  id: string;
  book: BookBriefResponse;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface OrderCreate {
  items: OrderItemCreate[];
  shipping_address: ShippingAddress;
}

export interface OrderResponse {
  id: string;
  buyer: UserBriefResponse;
  items: OrderItemResponse[];
  total_amount: string;
  status: OrderStatus;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========== PAYMENT TYPES ==========

export interface CheckoutSession {
  id: string;
  order_id: string;
  stripe_session_id: string;
  stripe_url: string;
  status: string;
  created_at: string;
}

// ========== OAUTH TYPES ==========

export interface OAuthURLResponse {
  authorization_url: string;
  state: string;
}

// ========== ERROR TYPES ==========

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationError[];
}

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

// ========== UTILITY TYPES ==========

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface SearchParams extends PaginationParams {
  q?: string;
  category?: string;
  condition?: BookCondition;
  min_price?: number;
  max_price?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "rating";
}
