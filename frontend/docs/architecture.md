# Books4All — Frontend Skeleton Reference

> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand · React Query · Axios · Stripe.js
> **Backend:** FastAPI (via Next.js API Routes as proxy layer)
> **Purpose:** Agent reference — every file, its exports, and its contract.

---

## Directory Structure

```
books4all/
├── .env.local                        # Secrets (never committed)
├── .env.example                      # Committed template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── middleware.ts                     # Auth guard + route protection
│
├── public/
│   └── fonts/                        # Self-hosted Playfair Display, JetBrains Mono
│
└── src/
    ├── app/                          # Next.js App Router
    │   ├── layout.tsx                # Root layout (fonts, providers, toaster)
    │   ├── page.tsx                  # Landing / home page
    │   ├── not-found.tsx
    │   ├── error.tsx
    │   │
    │   ├── (auth)/                   # Auth route group (no navbar)
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   ├── forgot-password/page.tsx
    │   │   ├── reset-password/page.tsx
    │   │   └── verify-email/page.tsx
    │   │
    │   ├── (main)/                   # Authenticated + public pages (with navbar)
    │   │   ├── layout.tsx
    │   │   ├── books/
    │   │   │   ├── page.tsx          # Book search / browse
    │   │   │   └── [id]/
    │   │   │       └── page.tsx      # Book detail
    │   │   ├── sell/
    │   │   │   ├── page.tsx          # Seller dashboard (my listings)
    │   │   │   ├── new/page.tsx      # Create listing
    │   │   │   └── [id]/edit/page.tsx # Edit listing
    │   │   ├── orders/
    │   │   │   ├── page.tsx          # Order history
    │   │   │   └── [id]/page.tsx     # Order detail
    │   │   └── profile/
    │   │       └── page.tsx          # User profile / settings
    │   │
    │   ├── payment/
    │   │   ├── success/page.tsx      # Stripe redirect success
    │   │   └── cancel/page.tsx       # Stripe redirect cancel
    │   │
    │   ├── auth/
    │   │   ├── google/callback/page.tsx   # Google OAuth callback handler
    │   │   └── github/callback/page.tsx   # GitHub OAuth callback handler
    │   │
    │   └── api/                      # Next.js API routes (proxy to FastAPI)
    │       ├── auth/
    │       │   ├── [...nextauth]/route.ts  # (optional NextAuth shim)
    │       │   ├── register/route.ts
    │       │   ├── login/route.ts
    │       │   ├── logout/route.ts
    │       │   ├── refresh/route.ts
    │       │   ├── me/route.ts
    │       │   ├── verify-email/route.ts
    │       │   ├── forgot-password/route.ts
    │       │   ├── reset-password/route.ts
    │       │   ├── google/route.ts
    │       │   ├── google/callback/route.ts
    │       │   ├── github/route.ts
    │       │   └── github/callback/route.ts
    │       ├── books/
    │       │   ├── route.ts               # GET list, POST create
    │       │   ├── categories/route.ts
    │       │   ├── my-listings/route.ts
    │       │   └── [id]/
    │       │       ├── route.ts           # GET, PUT, DELETE
    │       │       ├── publish/route.ts
    │       │       ├── reviews/route.ts   # GET list, POST create
    │       │       └── reviews/stats/route.ts
    │       ├── reviews/
    │       │   └── [id]/route.ts          # PUT, DELETE
    │       ├── orders/
    │       │   ├── route.ts               # GET list, POST create
    │       │   └── [id]/
    │       │       ├── route.ts           # GET
    │       │       └── cancel/route.ts
    │       ├── payments/
    │       │   ├── checkout/[orderId]/route.ts
    │       │   └── webhook/route.ts       # Stripe webhook (raw body)
    │       └── upload/route.ts
    │
    ├── components/
    │   ├── ui/                        # Primitive / shadcn-style atoms
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── textarea.tsx
    │   │   ├── select.tsx
    │   │   ├── badge.tsx
    │   │   ├── card.tsx
    │   │   ├── dialog.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── spinner.tsx
    │   │   ├── toast.tsx              # useToast hook + Toaster
    │   │   ├── avatar.tsx
    │   │   ├── separator.tsx
    │   │   └── pagination.tsx
    │   │
    │   ├── layout/
    │   │   ├── navbar.tsx             # Top nav with auth state
    │   │   ├── footer.tsx
    │   │   ├── sidebar.tsx            # Seller dashboard sidebar
    │   │   └── page-container.tsx     # Max-width wrapper + padding
    │   │
    │   ├── auth/
    │   │   ├── login-form.tsx
    │   │   ├── register-form.tsx
    │   │   ├── forgot-password-form.tsx
    │   │   ├── reset-password-form.tsx
    │   │   ├── oauth-buttons.tsx      # Google + GitHub buttons
    │   │   └── auth-guard.tsx         # Client-side route guard HOC
    │   │
    │   ├── books/
    │   │   ├── book-card.tsx          # Grid card (image, title, price, condition)
    │   │   ├── book-grid.tsx          # Responsive grid wrapper
    │   │   ├── book-detail.tsx        # Full detail view
    │   │   ├── book-form.tsx          # Create / edit listing form
    │   │   ├── book-filters.tsx       # Search + filter sidebar/bar
    │   │   ├── book-status-badge.tsx  # draft / active / sold / archived
    │   │   ├── condition-badge.tsx    # new / like_new / good / acceptable
    │   │   ├── image-uploader.tsx     # Multi-image upload with preview
    │   │   └── price-display.tsx      # JetBrains Mono formatted price
    │   │
    │   ├── reviews/
    │   │   ├── review-list.tsx
    │   │   ├── review-card.tsx
    │   │   ├── review-form.tsx
    │   │   ├── review-stats.tsx       # Star distribution chart
    │   │   └── star-rating.tsx        # Interactive + display star widget
    │   │
    │   ├── orders/
    │   │   ├── order-card.tsx
    │   │   ├── order-list.tsx
    │   │   ├── order-detail.tsx
    │   │   ├── order-status-badge.tsx
    │   │   ├── order-item-row.tsx
    │   │   └── checkout-button.tsx    # Triggers Stripe checkout session
    │   │
    │   └── common/
    │       ├── error-boundary.tsx
    │       ├── empty-state.tsx
    │       ├── confirm-dialog.tsx
    │       └── image-with-fallback.tsx
    │
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts              # Axios instance with interceptors
    │   │   ├── server-client.ts       # Server-side fetch helper (RSC)
    │   │   └── endpoints.ts           # All API URL constants
    │   │
    │   ├── auth/
    │   │   ├── tokens.ts              # get/set/clear tokens (cookies)
    │   │   ├── session.ts             # Server-side session helpers
    │   │   └── oauth.ts               # OAuth redirect helpers
    │   │
    │   ├── stripe/
    │   │   └── client.ts              # loadStripe singleton
    │   │
    │   ├── query/
    │   │   └── client.ts              # React Query client config
    │   │
    │   ├── utils/
    │   │   ├── cn.ts                  # clsx + twMerge helper
    │   │   ├── format.ts              # formatPrice, formatDate, formatCondition
    │   │   └── validators.ts          # Zod schemas mirroring API contracts
    │   │
    │   └── hooks/
    │       ├── use-auth.ts
    │       ├── use-books.ts
    │       ├── use-orders.ts
    │       ├── use-reviews.ts
    │       ├── use-upload.ts
    │       └── use-debounce.ts
    │
    ├── store/
    │   ├── auth.store.ts              # Zustand: user, tokens, login/logout
    │   └── cart.store.ts              # (future) ephemeral cart state
    │
    ├── types/
    │   ├── api.ts                     # Raw API response shapes
    │   ├── auth.ts
    │   ├── book.ts
    │   ├── order.ts
    │   ├── review.ts
    │   └── common.ts                  # Pagination, errors, enums
    │
    └── providers/
        ├── query-provider.tsx         # ReactQueryProvider wrapper
        ├── auth-provider.tsx          # Hydrates Zustand from cookie on mount
        └── index.tsx                  # Combines all providers
```

---

## Environment Variables

### `.env.example`
```bash
# ─── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Books4All

# ─── FastAPI Backend ────────────────────────────────────────────────────────
BACKEND_URL=http://localhost:8000            # Server-side only (Next.js API routes)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 # Only expose if direct client calls needed

# ─── Auth ───────────────────────────────────────────────────────────────────
# JWT tokens are managed via httpOnly cookies set by Next.js API routes
# No secret needed here unless using NextAuth

# ─── OAuth ──────────────────────────────────────────────────────────────────
# Redirect URIs must match what's registered in Google/GitHub dashboards
# The actual OAuth client IDs/secrets live in the FastAPI backend .env
# Next.js just redirects to the backend-provided authorization_url

# ─── Stripe ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...              # For webhook signature verification

# ─── Storage ────────────────────────────────────────────────────────────────
# MinIO/S3 upload handled by FastAPI; Next.js just proxies multipart form

# ─── Feature Flags ──────────────────────────────────────────────────────────
NEXT_PUBLIC_ENABLE_OAUTH=true
```

### `.env.local` (local dev, never committed)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
NEXT_PUBLIC_ENABLE_OAUTH=true
```

---

## Types (`src/types/`)

### `common.ts`
```typescript
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ApiError {
  detail: string | ValidationErrorDetail[]
}

export interface ValidationErrorDetail {
  loc: (string | number)[]
  msg: string
  type: string
}
```

### `auth.ts`
```typescript
export type UserRole = 'buyer' | 'seller' | 'admin'
export type OAuthProvider = 'google' | 'github' | 'facebook'

export interface User {
  id: string
  email: string
  role: UserRole
  email_verified: boolean
  is_active: boolean
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  oauth_provider: OAuthProvider | null
  created_at: string
  updated_at: string
}

export interface UserBrief {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AuthResponse extends AuthTokens {
  user: User
}

// Form inputs
export interface LoginInput { email: string; password: string }
export interface RegisterInput {
  email: string; password: string
  first_name?: string; last_name?: string
  role?: UserRole
}
export interface ForgotPasswordInput { email: string }
export interface ResetPasswordInput { token: string; new_password: string }
export interface VerifyEmailInput { token: string }
```

### `book.ts`
```typescript
export type BookCondition = 'new' | 'like_new' | 'good' | 'acceptable'
export type BookStatus = 'draft' | 'active' | 'sold' | 'archived'

export interface Book {
  id: string
  seller_id: string
  title: string
  author: string
  isbn: string | null
  description: string | null
  condition: BookCondition
  price: string                // Decimal string from API
  quantity: number
  images: string[] | null
  status: BookStatus
  category: string | null
  publisher: string | null
  publication_year: number | null
  language: string
  page_count: number | null
  seller: UserBrief | null
  created_at: string
  updated_at: string
}

export interface BookCreateInput {
  title: string; author: string; condition: BookCondition; price: number
  isbn?: string; description?: string; quantity?: number
  images?: string[]; category?: string; publisher?: string
  publication_year?: number; language?: string; page_count?: number
  status?: BookStatus
}

export interface BookUpdateInput extends Partial<BookCreateInput> {}

export interface BookFilters {
  query?: string; category?: string; condition?: BookCondition
  min_price?: number; max_price?: number; seller_id?: string
  sort_by?: 'created_at' | 'price' | 'title'
  sort_order?: 'asc' | 'desc'
  page?: number; per_page?: number
}
```

### `order.ts`
```typescript
export type OrderStatus =
  | 'pending' | 'payment_processing' | 'paid'
  | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

export interface ShippingAddress {
  full_name: string; address_line1: string; address_line2?: string
  city: string; state: string; postal_code: string
  country?: string; phone?: string
}

export interface OrderItemCreate { book_id: string; quantity?: number }

export interface OrderCreateInput {
  shipping_address: ShippingAddress
  items: OrderItemCreate[]
  notes?: string
}

export interface OrderItem {
  id: string; order_id: string; book_id: string | null
  quantity: number; price_at_purchase: string
  book_title: string; book_author: string
  book: import('./book').BookBrief | null
  created_at: string; updated_at: string
}

export interface Order {
  id: string; buyer_id: string; total_amount: string
  status: OrderStatus; stripe_payment_id: string | null
  shipping_address: ShippingAddress | null; notes: string | null
  items: OrderItem[]; buyer: UserBrief | null
  created_at: string; updated_at: string
}

export interface CheckoutSession {
  checkout_url: string; session_id: string; order_id: string
}
```

### `review.ts`
```typescript
export interface Review {
  id: string; book_id: string; user_id: string
  rating: number; comment: string | null
  is_verified_purchase: boolean
  user: UserBrief | null
  created_at: string; updated_at: string
}

export interface ReviewCreateInput { rating: number; comment?: string }
export interface ReviewUpdateInput { rating?: number; comment?: string }

export interface ReviewFilters {
  min_rating?: number; verified_only?: boolean
  page?: number; per_page?: number
}

export interface ReviewStats {
  book_id: string; total_reviews: number
  average_rating: number | null
  rating_distribution: Record<string, number>
  verified_purchase_count: number
}
```

---

## API Client (`src/lib/api/`)

### `endpoints.ts`
```typescript
// All paths relative to /api (Next.js proxy prefix)
export const API = {
  auth: {
    register:       '/api/auth/register',
    login:          '/api/auth/login',
    logout:         '/api/auth/logout',
    refresh:        '/api/auth/refresh',
    me:             '/api/auth/me',
    verifyEmail:    '/api/auth/verify-email',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword:  '/api/auth/reset-password',
    googleUrl:      '/api/auth/google',
    googleCallback: '/api/auth/google/callback',
    githubUrl:      '/api/auth/github',
    githubCallback: '/api/auth/github/callback',
  },
  books: {
    list:           '/api/books',
    create:         '/api/books',
    myListings:     '/api/books/my-listings',
    categories:     '/api/books/categories',
    detail:  (id: string) => `/api/books/${id}`,
    update:  (id: string) => `/api/books/${id}`,
    delete:  (id: string) => `/api/books/${id}`,
    publish: (id: string) => `/api/books/${id}/publish`,
    reviews: (id: string) => `/api/books/${id}/reviews`,
    reviewStats: (id: string) => `/api/books/${id}/reviews/stats`,
  },
  reviews: {
    update: (id: string) => `/api/reviews/${id}`,
    delete: (id: string) => `/api/reviews/${id}`,
  },
  orders: {
    list:   '/api/orders',
    create: '/api/orders',
    detail:  (id: string) => `/api/orders/${id}`,
    cancel:  (id: string) => `/api/orders/${id}/cancel`,
  },
  payments: {
    checkout: (orderId: string) => `/api/payments/checkout/${orderId}`,
  },
  upload: '/api/upload',
} as const
```

### `client.ts`
```typescript
// Axios instance that:
// 1. Attaches access_token from cookie to every request
// 2. On 401, attempts token refresh, then retries original request
// 3. On refresh failure, clears tokens + redirects to /login
// 4. All requests go to Next.js /api/* (same origin) — no CORS issues

import axios, { AxiosInstance } from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/tokens'
import { API } from './endpoints'

export const apiClient: AxiosInstance = /* ... configured instance */

// Interceptors:
// REQUEST: config.headers.Authorization = `Bearer ${getAccessToken()}`
// RESPONSE error: if 401 → POST /api/auth/refresh → retry
//                 if refresh 400 → clearTokens() → redirect('/login')
```

### `server-client.ts`
```typescript
// For use in React Server Components and Next.js API route handlers
// Reads token from cookies() (next/headers) and forwards to FastAPI
// Handles response parsing and typed errors

export async function serverFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T>
```

---

## Next.js API Routes (Proxy Layer)

**Pattern for every route:**
```typescript
// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { serverFetch } from '@/lib/api/server-client'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams.toString()
  const data = await serverFetch(`/api/v1/books?${params}`, {
    headers: { /* forward Authorization from cookie */ }
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = await serverFetch('/api/v1/books', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', /* auth */ }
  })
  return NextResponse.json(data, { status: 201 })
}
```

### Special Routes

#### `src/app/api/auth/login/route.ts`
- POST → FastAPI `/api/v1/auth/login`
- On success: **set `access_token` and `refresh_token` as httpOnly cookies**
- Return user data (strip tokens from JSON body)

#### `src/app/api/auth/logout/route.ts`
- POST → FastAPI `/api/v1/auth/logout`
- **Clear httpOnly cookies**
- Return 200

#### `src/app/api/auth/refresh/route.ts`
- POST → FastAPI `/api/v1/auth/refresh` with refresh_token from cookie
- On success: **update httpOnly cookies** with new token pair
- Called automatically by `client.ts` interceptor

#### `src/app/api/auth/google/route.ts`
- GET → FastAPI `/api/v1/auth/google` → returns `{ authorization_url, state }`
- Store `state` in a short-lived cookie for CSRF check
- Return the `authorization_url` to the client to redirect

#### `src/app/api/auth/google/callback/route.ts`
- POST with `{ code, state }` → FastAPI `/api/v1/auth/google/callback`
- Verify `state` matches cookie
- On success: set httpOnly token cookies, return user

#### `src/app/api/payments/webhook/route.ts`
- **Must disable body parsing** (`export const config = { api: { bodyParser: false } }`)
- Read raw body, verify `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`
- Forward raw body + signature to FastAPI `/api/v1/payments/webhook`
- Return 200 to Stripe regardless (FastAPI handles business logic)

#### `src/app/api/upload/route.ts`
- Forward multipart/form-data directly to FastAPI `/api/v1/upload`
- Return `{ url }` from FastAPI

---

## Auth Token Management (`src/lib/auth/tokens.ts`)

```typescript
// Uses 'cookies' from 'next/headers' (server) or document.cookie (client)
// Tokens stored as httpOnly, Secure, SameSite=Lax cookies

export const TOKEN_KEYS = {
  access: 'b4a_access',
  refresh: 'b4a_refresh',
} as const

export function getAccessToken(): string | null
export function getRefreshToken(): string | null
export function setTokens(tokens: AuthTokens): void  // sets both cookies
export function clearTokens(): void                   // deletes both cookies
```

---

## OAuth Flow

```
1. User clicks "Continue with Google"
2. Client calls GET /api/auth/google → gets { authorization_url, state }
3. Next.js API stores state in cookie, returns authorization_url
4. Client redirects: window.location.href = authorization_url
5. User authenticates with Google
6. Google redirects to: /auth/google/callback?code=...&state=...
7. app/auth/google/callback/page.tsx reads code+state from URL
8. Page POSTs to /api/auth/google/callback with { code, state }
9. Next.js API verifies state, forwards to FastAPI
10. FastAPI returns AuthResponse
11. Next.js API sets httpOnly cookies, returns user to page
12. Page redirects to /books (or intended destination)
```

---

## Stripe Flow

```
1. User adds book to order → POST /api/orders → gets Order { id, status: 'pending' }
2. User clicks "Pay" → POST /api/payments/checkout/{orderId}
3. Next.js proxies to FastAPI → returns CheckoutSession { checkout_url, session_id }
4. Client: window.location.href = checkout_url (Stripe-hosted page)
5. User pays on Stripe
6. Stripe sends webhook to POST /api/payments/webhook
7. Next.js verifies signature, forwards to FastAPI
8. FastAPI marks order as 'paid', updates stock
9. Stripe redirects user to /payment/success?session_id=... OR /payment/cancel
10. /payment/success page: poll GET /api/orders/{id} until status = 'paid'
```

---

## Zustand Store (`src/store/auth.store.ts`)

```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setUser: (user: User) => void
  logout: () => Promise<void>          // calls /api/auth/logout, clears store
  refreshUser: () => Promise<void>     // calls /api/auth/me
}
```

---

## React Query Hooks (`src/lib/hooks/`)

### `use-auth.ts`
```typescript
export function useMe()                           // GET /api/auth/me
export function useLogin()                        // Mutation → POST /api/auth/login
export function useRegister()                     // Mutation → POST /api/auth/register
export function useLogout()                       // Mutation → POST /api/auth/logout
export function useForgotPassword()               // Mutation
export function useResetPassword()                // Mutation
export function useVerifyEmail()                  // Mutation
```

### `use-books.ts`
```typescript
export function useBooks(filters: BookFilters)    // GET /api/books with params
export function useBook(id: string)               // GET /api/books/:id
export function useMyListings(filters?)           // GET /api/books/my-listings
export function useCategories()                   // GET /api/books/categories
export function useCreateBook()                   // Mutation → POST /api/books
export function useUpdateBook(id: string)         // Mutation → PUT /api/books/:id
export function useDeleteBook()                   // Mutation → DELETE /api/books/:id
export function usePublishBook()                  // Mutation → POST /api/books/:id/publish
```

### `use-orders.ts`
```typescript
export function useOrders(page?: number)          // GET /api/orders
export function useOrder(id: string)              // GET /api/orders/:id
export function useCreateOrder()                  // Mutation → POST /api/orders
export function useCancelOrder()                  // Mutation → POST /api/orders/:id/cancel
export function useCheckout()                     // Mutation → POST /api/payments/checkout/:id
```

### `use-reviews.ts`
```typescript
export function useReviews(bookId: string, filters?: ReviewFilters)
export function useReviewStats(bookId: string)
export function useCreateReview(bookId: string)   // Mutation
export function useUpdateReview()                 // Mutation
export function useDeleteReview()                 // Mutation
```

### `use-upload.ts`
```typescript
export function useUpload(): {
  upload: (file: File) => Promise<string>         // Returns URL
  isUploading: boolean
  progress: number
}
```

---

## Pages — Content & Functions

### `app/page.tsx` — Landing
- Hero section: tagline, CTA to browse or sell
- Featured book grid (static or `useBooks({ sort_by: 'created_at', per_page: 8 })`)
- Category chips from `useCategories()`
- No auth required

### `app/(auth)/login/page.tsx`
- Renders `<LoginForm />` and `<OAuthButtons />`
- On success: redirect to `?redirect` param or `/books`
- Link to `/register` and `/forgot-password`

### `app/(auth)/register/page.tsx`
- Renders `<RegisterForm />` (fields: email, password, first_name, last_name, role toggle buyer/seller)
- Renders `<OAuthButtons />`
- On success: redirect to `/books`

### `app/(auth)/forgot-password/page.tsx`
- Single email input, calls `useForgotPassword()`
- Shows success state ("Check your email") after submit
- Always shows success (API prevents enumeration)

### `app/(auth)/reset-password/page.tsx`
- Reads `token` from URL query param
- Password + confirm password fields
- Calls `useResetPassword()` → redirect to `/login` on success

### `app/(auth)/verify-email/page.tsx`
- Reads `token` from URL query param
- On mount: auto-calls `useVerifyEmail()`
- Shows success or error state

### `app/auth/google/callback/page.tsx`
- On mount: reads `code` + `state` from URL
- POSTs to `/api/auth/google/callback`
- Shows loading spinner → redirects to `/books` on success

### `app/(main)/books/page.tsx` — Browse
- `<BookFilters />` (search input, category select, condition select, price range, sort)
- `<BookGrid />` with `useBooks(filters)` — URL search params as filter state
- `<Pagination />` component
- Each card: `<BookCard />` linking to `/books/[id]`

### `app/(main)/books/[id]/page.tsx` — Book Detail
- Server component: fetch book data for SEO
- Book images carousel / gallery
- Title, author, price (`<PriceDisplay />`), condition badge, category
- Seller info (`<UserBrief />`)
- Buy / Add to order flow: opens `<OrderCreateDialog />`
- `<ReviewStats />` + `<ReviewList />` below fold
- If authenticated: `<ReviewForm />` for leaving review

### `app/(main)/sell/page.tsx` — Seller Dashboard
- Requires role = 'seller' (redirect buyers)
- Stats cards: active listings, total sold, pending orders
- `<BookGrid />` with `useMyListings()` + status filter tabs (All / Draft / Active / Sold)
- Each card has Edit / Publish / Delete actions
- FAB or button → `/sell/new`

### `app/(main)/sell/new/page.tsx` — Create Listing
- `<BookForm mode="create" />`
- Fields: title, author, isbn, description, condition, price, quantity, category, publisher, publication_year, language, page_count, images
- `<ImageUploader />` integrated
- On submit: `useCreateBook()` → redirect to `/sell` or new book detail

### `app/(main)/sell/[id]/edit/page.tsx` — Edit Listing
- Prefetch book data with `useBook(id)`
- `<BookForm mode="edit" defaultValues={book} />`
- On submit: `useUpdateBook(id)` → redirect to `/sell`

### `app/(main)/orders/page.tsx` — Order History
- `useOrders()` paginated list
- `<OrderCard />` per order with status badge, total, date
- Filter by status (optional)

### `app/(main)/orders/[id]/page.tsx` — Order Detail
- `useOrder(id)` 
- Order items table with book thumbnails
- Shipping address display
- Order status timeline (visual stepper)
- If status = 'pending': `<CheckoutButton orderId={id} />`
- If status = 'pending' or 'payment_processing': Cancel button
- Stripe payment status

### `app/(main)/profile/page.tsx` — Profile
- Display user info: name, email, role, avatar, verified badge
- Edit name / avatar upload
- Change password section (if not OAuth user)
- Account status

### `app/payment/success/page.tsx`
- Reads `session_id` from URL
- Shows "Payment successful!" with order summary
- Poll order status until `paid` (max 10s, 2s intervals)
- Link to `/orders/[id]`

### `app/payment/cancel/page.tsx`
- "Payment was cancelled" message
- Link back to orders to retry

---

## Middleware (`src/middleware.ts`)

```typescript
// Protect routes that require authentication
// Runs on Edge runtime

const PROTECTED = ['/sell', '/orders', '/profile']
const AUTH_ONLY = ['/login', '/register']   // redirect if already logged in

export function middleware(req: NextRequest) {
  const token = req.cookies.get('b4a_access')?.value
  const { pathname } = req.nextUrl

  if (PROTECTED.some(p => pathname.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, req.url))
  }

  if (AUTH_ONLY.some(p => pathname.startsWith(p)) && token) {
    return NextResponse.redirect(new URL('/books', req.url))
  }
}

export const config = {
  matcher: ['/sell/:path*', '/orders/:path*', '/profile/:path*', '/login', '/register']
}
```

---

## `next.config.ts`

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      // MinIO / S3 bucket domain from env
      { protocol: 'https', hostname: process.env.STORAGE_HOSTNAME ?? '' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async rewrites() {
    // Optional: direct rewrite fallback (prefer proxy routes for auth cookie handling)
    return []
  },
}
```

---

## Zod Validators (`src/lib/utils/validators.ts`)

```typescript
// Mirror FastAPI validation rules exactly

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  role: z.enum(['buyer', 'seller']).default('buyer'),
})

export const bookCreateSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().min(1).max(255),
  isbn: z.string().min(10).max(20).optional(),
  description: z.string().max(5000).optional(),
  condition: z.enum(['new', 'like_new', 'good', 'acceptable']),
  price: z.number().positive().max(10000),
  quantity: z.number().int().min(1).max(1000).default(1),
  images: z.array(z.string().url()).max(10).optional(),
  category: z.string().max(100).optional(),
  publisher: z.string().max(255).optional(),
  publication_year: z.number().int().min(1000).max(2100).optional(),
  language: z.string().max(50).default('English'),
  page_count: z.number().int().min(1).max(50000).optional(),
})

export const shippingAddressSchema = z.object({
  full_name: z.string().min(1).max(200),
  address_line1: z.string().min(1).max(255),
  address_line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postal_code: z.string().min(1).max(20),
  country: z.string().min(2).max(100).default('US'),
  phone: z.string().max(20).optional(),
})

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})
```

---

## Utility Functions (`src/lib/utils/format.ts`)

```typescript
// All price display uses JetBrains Mono via className
export function formatPrice(value: string | number): string
  // → "$12.99"

export function formatCondition(c: BookCondition): string
  // → "Like New"

export function formatOrderStatus(s: OrderStatus): string
  // → "Payment Processing"

export function formatDate(iso: string): string
  // → "Jan 15, 2024"

export function formatRelativeDate(iso: string): string
  // → "2 hours ago"

export function getConditionColor(c: BookCondition): string
  // Returns Tailwind class string

export function getOrderStatusColor(s: OrderStatus): string
  // Returns Tailwind class string for badge variant
```

---

## Key Component Contracts

### `<BookForm />`
```typescript
interface BookFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<BookCreateInput>
  onSuccess?: (book: Book) => void
}
// Uses react-hook-form + zod resolver
// Integrates <ImageUploader /> for images array
// Shows publish toggle on edit mode
```

### `<ImageUploader />`
```typescript
interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number   // default 10
}
// Drag-and-drop + click to upload
// Calls useUpload() per file → POST /api/upload
// Shows preview thumbnails with remove button
```

### `<CheckoutButton />`
```typescript
interface CheckoutButtonProps {
  orderId: string
  disabled?: boolean
}
// Calls useCheckout() → gets checkout_url
// window.location.href = checkout_url
```

### `<StarRating />`
```typescript
interface StarRatingProps {
  value: number
  onChange?: (value: number) => void  // undefined = display only
  size?: 'sm' | 'md' | 'lg'
}
```

### `<OAuthButtons />`
```typescript
// No props
// Fetches OAuth URLs from /api/auth/google and /api/auth/github
// Stores state in sessionStorage for CSRF check
// Redirects on click
```

---

## React Query Key Factory

```typescript
// src/lib/query/keys.ts
export const queryKeys = {
  books: {
    all: ['books'] as const,
    list: (filters: BookFilters) => ['books', 'list', filters] as const,
    detail: (id: string) => ['books', 'detail', id] as const,
    myListings: (filters?: any) => ['books', 'my-listings', filters] as const,
    categories: () => ['books', 'categories'] as const,
  },
  reviews: {
    list: (bookId: string, filters?: ReviewFilters) => ['reviews', bookId, filters] as const,
    stats: (bookId: string) => ['reviews', 'stats', bookId] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (page?: number) => ['orders', 'list', page] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  auth: {
    me: () => ['auth', 'me'] as const,
  },
}
```

---

## Providers (`src/providers/index.tsx`)

```typescript
// Wrap app in:
// 1. QueryClientProvider (React Query)
// 2. AuthProvider (hydrates Zustand from /api/auth/me on mount)
// 3. Toaster (toast notifications)
// Order: QueryClient → Auth → Toaster
```

---

## Error Handling Conventions

- All API errors caught in React Query `onError`
- Toast shown for mutation failures using `ApiError.detail`
- 401 errors auto-refresh via `client.ts` interceptor
- 403 → toast "You don't have permission"
- 404 → redirect to not-found page
- 409 (duplicate review / insufficient stock) → specific toast messages
- Form validation errors: inline field errors via react-hook-form

---

## Notes for Agent

1. **Never call FastAPI directly from the browser.** All requests go through `/api/*` Next.js routes.
2. **Tokens are always httpOnly cookies.** Never store in localStorage.
3. **Role checks are UI-only.** Real authorization is enforced by FastAPI.
4. **Stripe webhook route must read raw body** — do not use `req.json()`.
5. **OAuth state must be verified** against the stored cookie before exchanging code.
6. **Price fields from API are strings** (decimal precision). Parse before math, format with `formatPrice()` for display. Use JetBrains Mono class on price elements.
7. **Seller-only pages** (`/sell/*`): check `user.role === 'seller'` in layout and redirect buyers.
8. **Image URLs** come from MinIO/S3 via FastAPI upload. Always use `next/image` with the configured remote pattern.
9. **React Query cache invalidation**: after create/update/delete book → invalidate `books.list` and `books.myListings`. After create review → invalidate `reviews.list` and `reviews.stats`. After cancel order → invalidate `orders.list` and `orders.detail`.
10. **Book status machine**: draft → active (via publish) → sold (automatic on order paid) → archived (manual).