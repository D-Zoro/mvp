export type UserRole = "buyer" | "seller" | "admin";

export interface ApiErrorDetail {
  field?: string;
  message?: string;
  type?: string;
}

export interface ApiErrorBody {
  status_code?: number;
  detail?: string | ApiErrorDetail[];
  title?: string;
}

export class ApiClientError extends Error {
  status: number;
  body: ApiErrorBody | undefined;

  constructor(message: string, status = 500, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface Book {
  id: string;
  seller_id: string;
  isbn?: string | null;
  title: string;
  author: string;
  description?: string | null;
  condition: string;
  price: string;
  quantity: number;
  images?: string[];
  status: string;
  category?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string | null;
  page_count?: number | null;
  created_at?: string;
  updated_at?: string;
  seller?: User;
}

export interface BookQueryParams {
  query?: string;
  category?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface CreateBookRequest {
  isbn?: string;
  title: string;
  author: string;
  description?: string;
  condition: string;
  price: number;
  quantity?: number;
  images?: string[];
  category?: string;
  publisher?: string;
  publication_year?: number;
  language?: string;
  page_count?: number;
}

export type UpdateBookRequest = Partial<CreateBookRequest>;

export interface ShippingAddress {
  full_name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface OrderItemInput {
  book_id: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItemInput[];
  shipping_address: ShippingAddress;
  notes?: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  total_amount: string;
  status: string;
  shipping_address?: ShippingAddress;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: {
    id: string;
    quantity: number;
    price_at_purchase: string;
    book_title: string;
    book_author: string;
  }[];
}

export interface Review {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  comment?: string | null;
  is_verified_purchase?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}
