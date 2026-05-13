/**
 * API Request/Response Types
 * Interfaces for all HTTP requests and responses from the Books4All backend API
 */

import type {
  User,
  UserBrief,
  Book,
  BookBrief,
  BookCreatePayload,
  BookUpdatePayload,
  BookListResponse,
  Order,
  OrderItem,
  OrderCreatePayload,
  OrderListResponse,
  ShippingAddress,
  Review,
  ReviewCreatePayload,
  ReviewUpdatePayload,
  ReviewStats,
  ReviewListResponse,
  CheckoutSession,
  UserRole,
  BookCondition,
  BookStatus,
  OrderStatus,
  OAuthProvider,
} from './models';

// ============================================================================
// AUTHENTICATION API
// ============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * User registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string; // Min 8 chars
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole; // Default 'buyer'
}

/**
 * Authentication response with tokens and user info
 */
export interface AuthResponse {
  access_token: string; // JWT
  refresh_token: string; // JWT
  token_type?: string; // Default 'bearer'
  expires_in: number; // Seconds
  user: User;
}

/**
 * Token refresh request payload
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Token response (used for token refresh)
 */
export interface TokenResponse {
  access_token: string; // JWT
  refresh_token: string; // JWT
  token_type?: string; // Default 'bearer'
  expires_in: number; // Seconds
}

/**
 * Email verification request payload
 */
export interface EmailVerificationRequest {
  token: string;
}

/**
 * Password reset request payload (forgot password)
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation payload
 */
export interface PasswordResetConfirm {
  token: string;
  new_password: string; // Min 8 chars
}

/**
 * OAuth callback request payload
 */
export interface OAuthCallbackRequest {
  code: string;
  state?: string | null;
}

/**
 * OAuth authorization URL response
 */
export interface OAuthURLResponse {
  authorization_url: string;
  state: string;
}

// ============================================================================
// BOOKS API
// ============================================================================

// Request types
export type BookCreateRequest = BookCreatePayload;
export type BookUpdateRequest = BookUpdatePayload;

// Response types are imported from models
export type BookResponse = Book;
export type BookBriefResponse = BookBrief;

/**
 * Query parameters for book search/listing
 */
export interface BookListQuery {
  query?: string; // Full-text search
  category?: string;
  condition?: BookCondition;
  min_price?: number;
  max_price?: number;
  seller_id?: string; // UUID
  sort_by?: 'created_at' | 'price' | 'title';
  sort_order?: 'asc' | 'desc';
  page?: number; // Default 1
  per_page?: number; // Default 20, max 100
}

// ============================================================================
// ORDERS API
// ============================================================================

// Request types
export type OrderCreateRequest = OrderCreatePayload;

// Response types are imported from models
export type OrderResponse = Order;
export type OrderItemResponse = OrderItem;

/**
 * Query parameters for order listing
 */
export interface OrderListQuery {
  page?: number; // Default 1
  per_page?: number; // Default 20, max 100
}

// ============================================================================
// REVIEWS API
// ============================================================================

// Request types
export type ReviewCreateRequest = ReviewCreatePayload;
export type ReviewUpdateRequest = ReviewUpdatePayload;

// Response types are imported from models
export type ReviewResponse = Review;

/**
 * Query parameters for review listing
 */
export interface ReviewListQuery {
  min_rating?: number; // 1-5
  verified_only?: boolean; // Default false
  page?: number; // Default 1
  per_page?: number; // Default 20, max 100
}

// ============================================================================
// PAYMENTS API
// ============================================================================

// Response types are imported from models
export type CheckoutSessionResponse = CheckoutSession;

/**
 * Stripe webhook payload signature (the body is generic JSON)
 */
export interface StripeWebhookPayload {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: Record<string, any>;
  livemode: boolean;
  pending_webhooks: number;
  request: Record<string, any>;
  type: string;
}

// ============================================================================
// UPLOAD API
// ============================================================================

/**
 * File upload response
 */
export interface UploadResponse {
  url: string; // Public URL of uploaded file
  filename: string;
  size: number; // Bytes
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * API error response structure
 */
export interface APIErrorResponse {
  message: string;
  status: number;
  data?: Record<string, any>;
  timestamp?: string;
}

/**
 * HTTP validation error response (422 status)
 */
export interface ValidationErrorDetail {
  loc: (string | number)[]; // Location path
  msg: string; // Error message
  type: string; // Error type
}

export interface ValidationErrorResponse {
  detail: ValidationErrorDetail[];
}

// ============================================================================
// PAGINATED RESPONSE TYPES
// ============================================================================

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Re-export paginated responses
export type BookListReponse = BookListResponse;
export type OrderListReponse = OrderListResponse;
export type ReviewListReponse = ReviewListResponse;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Request interceptor context
 */
export interface RequestContext {
  token?: string;
  userId?: string;
}

/**
 * API client configuration
 */
export interface APIClientConfig {
  baseURL?: string;
  timeout?: number;
  withCredentials?: boolean;
}
