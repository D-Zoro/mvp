---
wave: 1
depends_on: []
files_modified:
  - frontend/components/Header.tsx
  - frontend/components/Footer.tsx
  - frontend/components/BookCard.tsx
  - frontend/components/AuthForm.tsx
  - frontend/app/layout.tsx
  - frontend/app/page.tsx
  - frontend/app/globals.css
  - frontend/app/browse/page.tsx
  - frontend/app/auth/login/page.tsx
  - frontend/app/auth/register/page.tsx
  - frontend/app/auth/reset-password/page.tsx
  - frontend/app/auth/forgot-password/page.tsx
  - frontend/app/books/[id]/page.tsx
  - frontend/app/orders/page.tsx
  - frontend/app/orders/[id]/page.tsx
  - frontend/app/seller/listings/page.tsx
  - frontend/app/seller/listings/create/page.tsx
  - frontend/app/seller/orders/page.tsx
  - frontend/lib/api.ts
  - frontend/lib/auth.ts
  - frontend/lib/hooks.ts
  - frontend/types/index.ts
autonomous: true
---

# Phase 1: Frontend Implementation

## Objective

Build a complete, fully functional Next.js 15 frontend for Books4All that:
- Authenticates users (email/password + OAuth: Google, GitHub)
- Allows buyers to browse, search, filter, and purchase books
- Enables sellers to list, edit, and manage books
- Integrates with the FastAPI backend via `/api/v1/` endpoints
- Implements the design system with Tailwind CSS
- Provides proper error handling and loading states
- Manages JWT tokens and refresh tokens securely

## Context

- **Backend Status**: ✓ Complete and working (FastAPI, PostgreSQL, Stripe, Redis)
- **Frontend Status**: Incomplete/messed up - only homepage and basic components exist
- **API Contract**: OpenAPI 3.1.0 spec at `./docs/openapi.json`
- **Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, React

## Architecture Overview

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Auth routes (login, register, reset)
│   ├── browse/              # Book listing/search page
│   ├── books/[id]/          # Book detail page
│   ├── orders/              # Buyer's orders
│   ├── seller/              # Seller dashboard (listings, create, manage)
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage
│   └── globals.css          # Global styles
├── components/              # Reusable React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── BookCard.tsx
│   ├── AuthForm.tsx
│   └── [other components as needed]
├── lib/                     # Utilities
│   ├── api.ts              # API client (fetch wrapper)
│   ├── auth.ts             # JWT/token management
│   ├── hooks.ts            # Custom React hooks
│   └── utils.ts            # Misc utilities
├── types/                   # TypeScript types
│   └── index.ts            # API response types from OpenAPI
└── next.config.ts          # Next.js configuration
```

## API Endpoints to Implement

### Authentication (`/api/v1/auth/`)
- `POST /register` — Register with email/password
- `POST /login` — Login with email/password
- `POST /refresh` — Refresh access token
- `POST /logout` — Logout
- `GET /me` — Get current user profile
- `POST /verify-email` — Verify email with token
- `POST /forgot-password` — Request password reset
- `POST /reset-password` — Confirm password reset
- `GET /google` — Get Google OAuth URL
- `POST /google/callback` — Handle Google OAuth callback
- `GET /github` — Get GitHub OAuth URL
- `POST /github/callback` — Handle GitHub OAuth callback

### Books (`/api/v1/books/`)
- `GET /categories` — List all book categories
- `GET /` — Search and list books (with filters, pagination)
- `GET /my-listings` — Get seller's listings
- `POST /` — Create book listing
- `GET /{id}` — Get book detail
- `PUT /{id}` — Update book listing
- `DELETE /{id}` — Delete book listing
- `POST /{id}/publish` — Publish draft book

### Reviews (`/api/v1/books/{id}/reviews`)
- `GET /` — List reviews for a book
- `POST /` — Create review
- `GET /stats` — Get review statistics
- `PUT /{id}` — Update review
- `DELETE /{id}` — Delete review

### Orders (`/api/v1/orders/`)
- `GET /` — Get order history
- `POST /` — Create order
- `GET /{id}` — Get order detail
- `POST /{id}/cancel` — Cancel order

### Payments (`/api/v1/payments/`)
- `POST /checkout/{order_id}` — Create Stripe checkout session

### Upload (`/api/v1/upload`)
- `POST /` — Upload file (book images)

## Design System

**Colors:**
- Primary: `#4F46E5` (Indigo)
- Background: `#F9F7F2` (Off-white)
- Text: `#1A1A1A` (Dark)
- Secondary text: `#A4ACAF` (Gray)
- Border: `#E5E7EB` (Light gray)

**Typography:**
- Serif font for headings (via `font-serif` class)
- Sans-serif for body (system default)
- Font size: base 16px, lg 18px, xl 20px, 2xl 24px, 3xl 30px, 4xl 36px, 5xl 48px

**Layout:**
- Container max-width: `1280px` (handled by Tailwind `container` class)
- Padding: 6 units (24px) horizontal on large screens
- Gap between items: 6 units (24px)
- Rounded corners: minimal (use `rounded-sm` for sharp aesthetic)

## Key User Flows

### 1. Authentication Flow
1. **Registration** → User enters email, password, name, role (buyer/seller) → Account created with JWT tokens
2. **Login** → User enters email/password → Tokens issued, stored locally
3. **OAuth** → User clicks "Login with Google/GitHub" → Redirected to provider → Callback creates/logs in user
4. **Token Refresh** → Access token expires → Client uses refresh token to get new pair
5. **Logout** → User clicks logout → Tokens cleared locally

### 2. Buyer Browse & Purchase Flow
1. **Browse** → View books with search, filters (category, condition, price range) → Pagination
2. **Book Detail** → Click book → See full details, seller info, reviews/ratings
3. **Add to Cart** → Select quantity → Store in state or local storage (no DB cart yet)
4. **Checkout** → Provide shipping address → Create order → Redirect to Stripe checkout
5. **Payment** → Complete Stripe payment → Order marked as PAID
6. **Order History** → View past orders with status

### 3. Seller Listing & Management Flow
1. **Create Listing** → Seller fills form (title, author, condition, price, images, category, etc.) → Saves as DRAFT
2. **Edit Listing** → Seller modifies draft → Saves changes
3. **Publish Listing** → Change status DRAFT → ACTIVE (visible to buyers)
4. **My Listings** → Seller views all their listings with status
5. **Order Notifications** → Seller sees orders containing their books, can mark as shipped

## Tasks

### Wave 1: Core Infrastructure & Auth

#### 1.1 Set up API client and type definitions
**Read first:**
- `./docs/openapi.json` (API contract)
- `frontend/lib/api.ts` (if exists)
- `frontend/types/index.ts` (if exists)

**Action:**
Create `frontend/lib/api.ts` with a fetch-based HTTP client that:
- Adds `Authorization: Bearer {token}` header to all requests
- Handles token refresh automatically (intercept 401 → call refresh endpoint → retry)
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (default to `http://localhost:8000`)
- Provides typed methods: `get<T>()`, `post<T>()`, `put<T>()`, `delete<T>()`, `upload<T>()`
- Returns parsed JSON response or throws with error details

Create `frontend/types/index.ts` with TypeScript types for all API responses:
- `User`, `UserRole` (buyer, seller, admin)
- `Book`, `BookStatus` (draft, active, sold, archived), `BookCondition`
- `Order`, `OrderStatus`, `OrderItem`
- `Review`, `ReviewStats`
- `ShippingAddress`
- `AuthResponse`, `TokenResponse`
- `etc.` (copy from OpenAPI schema)

Create `frontend/lib/auth.ts` with JWT token management:
- `getAccessToken()` — retrieve from localStorage
- `setTokens(access, refresh)` — store both
- `clearTokens()` — remove both
- `isAuthenticated()` — check if valid access token exists
- `getUserId()` — decode JWT and extract sub claim

**Acceptance criteria:**
- `frontend/lib/api.ts` exports `apiClient` with `get/post/put/delete/upload` methods
- `frontend/types/index.ts` has `export interface` for at least: `User`, `Book`, `Order`, `Review`, `AuthResponse`
- `frontend/lib/auth.ts` exports functions: `getAccessToken`, `setTokens`, `clearTokens`, `isAuthenticated`
- `api.ts` handles 401 with automatic refresh (call `/api/v1/auth/refresh`)
- All API calls use typed responses: `const response = await apiClient.get<Book>(...)`

---

#### 1.2 Create layout, header, footer components
**Read first:**
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/components/Header.tsx`
- `frontend/components/Footer.tsx`

**Action:**
- Update `globals.css` with:
  - Tailwind base styles
  - Color palette CSS variables (optional, or use Tailwind color names)
  - Typography rules (serif headings)
  - Default body styles (bg-[#F9F7F2], text-[#1A1A1A])

- Update `app/layout.tsx` root layout:
  - Import Header, Footer
  - Wrap children with `<Header/>` at top, `<Footer/>` at bottom
  - Set meta tags (title, description)
  - Apply global background color

- Refine `components/Header.tsx`:
  - Logo (left)
  - Navigation links: Browse, Sell (centered or right)
  - Auth state: if logged in → user menu + logout; if not → Login / Register buttons
  - Mobile responsive (hamburger menu for small screens)
  - Use Tailwind classes from design system (colors, spacing)

- Refine `components/Footer.tsx`:
  - Company info, links, copyright
  - Simple layout (3 columns: About, Links, Contact)
  - Use same color scheme

**Acceptance criteria:**
- `app/layout.tsx` renders `<Header/>` and `<Footer/>` around `{children}`
- `Header.tsx` shows "Login / Register" when not authenticated, user menu when authenticated
- `Footer.tsx` has 3+ sections with links
- All components use Tailwind classes from design system (colors from spec)
- Meta tags in layout include at least `<title>`, `<meta name="description">`

---

#### 1.3 Create auth pages (login, register, reset password)
**Read first:**
- `frontend/components/AuthForm.tsx`
- `frontend/types/index.ts` (register with `RegisterRequest`, `LoginRequest`)
- `frontend/lib/api.ts` (register with auth endpoints)

**Action:**
- Update or create `components/AuthForm.tsx`:
  - Accepts `mode: 'login' | 'register' | 'reset'`
  - For **login**: email + password inputs → POST `/api/v1/auth/login` → store tokens → redirect `/browse`
  - For **register**: email + password + first_name + last_name + role selector → POST `/api/v1/auth/register` → store tokens → redirect based on role (buyer → `/browse`, seller → `/seller/listings`)
  - For **reset**: email input → POST `/api/v1/auth/forgot-password` → success message
  - Error display for invalid credentials, validation errors
  - Loading state during API call

- Create `app/(auth)/login/page.tsx`:
  - Render `<AuthForm mode="login" />`
  - "Don't have an account? Register here" link to `/auth/register`
  - Layout: centered form, 400px width

- Create `app/(auth)/register/page.tsx`:
  - Render `<AuthForm mode="register" />`
  - Role selector (buyer/seller)
  - "Already have an account? Login here" link to `/auth/login`

- Create `app/(auth)/forgot-password/page.tsx`:
  - Simple form with email input
  - POST `/api/v1/auth/forgot-password`
  - Success message: "Check your email for reset link"

- Create `app/(auth)/reset-password/page.tsx`:
  - URL param: `?token=<reset_token>`
  - Form: new_password + confirm password
  - POST `/api/v1/auth/reset-password` with token and new password
  - Redirect to login on success

**Acceptance criteria:**
- `components/AuthForm.tsx` exports component that accepts `mode` prop
- Login form POSTs to `/api/v1/auth/login`, stores `access_token` and `refresh_token` in localStorage
- Register form includes email, password, first_name, last_name, role inputs; POSTs to `/api/v1/auth/register`
- Forgot password form POSTs to `/api/v1/auth/forgot-password`
- Reset password form POSTs to `/api/v1/auth/reset-password` with token parameter
- All forms show error messages on failure
- All forms have loading state (disabled button during API call)
- Routes redirect to appropriate page after success

---

#### 1.4 Create auth context/hooks for checking login status
**Read first:**
- `frontend/lib/hooks.ts` (or create)
- `frontend/lib/auth.ts`

**Action:**
- Create `lib/hooks.ts` with `useAuth()` hook:
  - Returns `{ user, isLoading, error, isAuthenticated, logout }`
  - On mount: if access token exists, fetch user from `/api/v1/auth/me` and decode JWT
  - Handle token refresh if access token expired
  - Set `isAuthenticated = true` only if valid user is loaded

- Create `lib/middleware.ts` (or use `middleware.tsx` at root):
  - Redirect `/auth/*` pages to `/browse` if already logged in
  - Redirect `/seller/*`, `/orders/*` to `/auth/login` if not logged in
  - (Optional: use Next.js `middleware.ts` or handle in page components)

**Acceptance criteria:**
- `lib/hooks.ts` exports `useAuth()` hook
- `useAuth()` returns user object with `id`, `email`, `role`, `first_name`, `last_name`
- `useAuth()` calls `/api/v1/auth/me` on mount if token exists
- Pages requiring auth check `useAuth()` and redirect if not authenticated
- Token refresh is transparent (handled in api client)

---

### Wave 2: Books & Browsing

#### 2.1 Create book listing page with search and filters
**Read first:**
- `frontend/types/index.ts` (Book, BookCondition, BookStatus)
- `./docs/openapi.json` (GET `/api/v1/books` endpoint)

**Action:**
- Create `app/browse/page.tsx`:
  - Fetch books from `/api/v1/books` with optional query params:
    - `query` (search term)
    - `category` (filter by category)
    - `condition` (filter by condition: new, like_new, good, acceptable)
    - `min_price`, `max_price`
    - `sort_by` (created_at, price, title)
    - `sort_order` (asc, desc)
    - `page`, `per_page`
  
  - Display as grid of `BookCard` components (3 columns on large screens, 2 on medium, 1 on small)
  - Include sidebar with:
    - Search input (text query)
    - Category dropdown (fetch from `/api/v1/books/categories`)
    - Condition multi-select
    - Price range slider (min/max inputs)
    - Sort selector
  
  - Pagination: "Previous" / "Next" buttons or page numbers
  - Loading state: skeleton cards while fetching
  - Error state: show error message with retry button

- Update `components/BookCard.tsx`:
  - Display: book image (primary_image), title, author, price, condition badge, seller name, rating
  - Click → navigate to `/books/{id}`
  - Show "Add to Cart" button (disabled for now, store in state)

**Acceptance criteria:**
- `app/browse/page.tsx` fetches from `/api/v1/books` on mount
- Search input filters books by query (debounced, max 300ms)
- Category dropdown populated from `/api/v1/books/categories`
- Condition checkboxes filter by condition
- Price range inputs filter min/max
- Sort selector changes sort_by and sort_order
- Results paginate with "Previous" / "Next" buttons
- BookCard displays at least: title, author, price, condition, image, seller name
- Error state shows "Failed to load books. Retry?" with retry button

---

#### 2.2 Create book detail page with reviews
**Read first:**
- `frontend/types/index.ts` (Book, Review, ReviewStats)
- `./docs/openapi.json` (GET `/api/v1/books/{id}`, GET `/api/v1/books/{id}/reviews`, GET `/api/v1/books/{id}/reviews/stats`)

**Action:**
- Create `app/books/[id]/page.tsx`:
  - Route param: `id` (book UUID)
  - Fetch book from `/api/v1/books/{id}`
  - Fetch review stats from `/api/v1/books/{id}/reviews/stats`
  - Fetch first page of reviews from `/api/v1/books/{id}/reviews?page=1&per_page=10`
  
  - Display:
    - **Book Info Section**:
      - Large image (primary_image)
      - Title, author, ISBN, publisher, publication_year, page_count
      - Condition badge, price, quantity available
      - Description (long form)
      - Category, language
    
    - **Seller Section**:
      - Seller name, avatar, link to seller profile (if available)
      - Seller rating (average rating of their books)
    
    - **Reviews Section**:
      - Average rating (from ReviewStats)
      - Rating distribution (bar chart or text: "4★ 8 votes, 3★ 3 votes, etc.")
      - "Leave a Review" button (if logged in and buyer, and has purchased this book)
      - Reviews list (paginated):
        - Reviewer name + avatar
        - Rating (star icons)
        - Comment
        - "Verified Purchase" badge (if is_verified_purchase)
        - Created date
        - [Edit] [Delete] buttons (if current user's review)
    
    - **Actions**:
      - "Add to Cart" button → store in state/local storage
      - "Continue Shopping" link to `/browse`

**Acceptance criteria:**
- `app/books/[id]/page.tsx` fetches book from `/api/v1/books/{id}`
- Book detail shows at least: title, author, price, condition, description, seller name
- Review stats displayed (average rating and rating distribution)
- Reviews paginated with "Load More" or pagination controls
- "Add to Cart" button navigates to checkout
- "Leave a Review" button shows form (if user logged in and eligible)
- If error (book not found), show "Book not found" message with link to browse

---

#### 2.3 Create review submission component
**Read first:**
- `frontend/types/index.ts` (ReviewCreate, ReviewUpdate)
- `./docs/openapi.json` (POST `/api/v1/books/{id}/reviews`, PUT `/api/v1/reviews/{id}`, DELETE `/api/v1/reviews/{id}`)

**Action:**
- Create `components/ReviewForm.tsx`:
  - Modal or inline form
  - Inputs: rating (1-5 star selector), comment (textarea)
  - Buttons: "Submit" (POST), "Cancel"
  - Error display if submission fails
  - Loading state
  - On success: close modal, refresh reviews list

- In book detail page:
  - Show form in modal when "Leave a Review" button clicked (if user is authenticated and has purchased)
  - Allow editing own review: show form with pre-filled values, PUT instead of POST
  - Show "Delete" button on own review: POST to `/api/v1/reviews/{id}` with DELETE method

**Acceptance criteria:**
- ReviewForm component shows rating selector (1-5 stars) and comment textarea
- Submit POSTs to `/api/v1/books/{id}/reviews` with rating and comment
- Edit review PUTs to `/api/v1/reviews/{id}` with updated rating/comment
- Delete review calls DELETE `/api/v1/reviews/{id}`
- Form shows loading state during API call
- Error messages displayed on failure
- Success: reviews list refreshes or form closes

---

### Wave 3: Shopping & Orders

#### 3.1 Create cart and checkout flow
**Read first:**
- `frontend/types/index.ts` (Order, OrderCreate, OrderItem, ShippingAddress)
- `./docs/openapi.json` (POST `/api/v1/orders`, POST `/api/v1/payments/checkout/{order_id}`)

**Action:**
- Create `lib/cart.ts` or add to `lib/hooks.ts`:
  - `useCart()` hook: manages cart state (array of { bookId, quantity })
  - Store in `localStorage` to persist across sessions
  - Methods: `addToCart(bookId, qty)`, `removeFromCart(bookId)`, `updateQuantity(bookId, qty)`, `clearCart()`
  - `cartTotal()`, `cartItems()` getters

- Create `app/checkout/page.tsx`:
  - Display cart items (book details + quantity)
  - Total price calculation
  - Form for shipping address:
    - full_name, address_line1, address_line2, city, state, postal_code, country, phone
  - "Place Order" button:
    - POST `/api/v1/orders` with cart items + shipping address
    - On success: store `order_id`
    - Redirect to `/checkout/payment/{order_id}`

- Create `app/checkout/payment/[order_id]/page.tsx`:
  - Fetch order details from `/api/v1/orders/{order_id}`
  - Display order summary (items, total, shipping address)
  - "Pay with Stripe" button:
    - POST `/api/v1/payments/checkout/{order_id}`
    - Redirect to `checkout_url` (Stripe Checkout)
    - (Stripe handles payment, redirect back to app on success/cancel)

- Handle Stripe redirect:
  - On return from Stripe: check order status in `/api/v1/orders/{order_id}`
  - If status is PAID: show "Payment successful" + link to `/orders`
  - If status is CANCELLED: show "Payment cancelled" + link to `/checkout`

**Acceptance criteria:**
- `useCart()` hook stores cart in localStorage with `addToCart`, `removeFromCart`, `updateQuantity` methods
- Checkout page shows cart items, calculates total, accepts shipping address
- "Place Order" POSTs to `/api/v1/orders`, creates order with all items and shipping address
- Payment page POSTs to `/api/v1/payments/checkout/{order_id}`, redirects to Stripe URL
- On return from Stripe: check order status and show success/failure message
- Clear cart after successful payment

---

#### 3.2 Create order history page
**Read first:**
- `frontend/types/index.ts` (Order, OrderStatus, OrderItem)
- `./docs/openapi.json` (GET `/api/v1/orders`)

**Action:**
- Create `app/orders/page.tsx`:
  - Fetch orders from `/api/v1/orders?page=1&per_page=20`
  - Display as list or table:
    - Order ID
    - Created date
    - Status (pending, payment_processing, paid, shipped, delivered, refunded, cancelled)
    - Total amount
    - Item count ("3 books" or similar)
    - Link to `/orders/{id}`
  
  - Pagination: "Previous" / "Next" buttons
  - Empty state: "No orders yet. Start shopping?" with link to `/browse`
  - Loading state: skeleton rows

- Create `app/orders/[id]/page.tsx`:
  - Fetch order from `/api/v1/orders/{id}`
  - Display:
    - Order ID, created date, status, total amount
    - Shipping address
    - Order items (table):
      - Book title, author, condition
      - Quantity, price at purchase, subtotal
      - Link to book detail (if book still exists)
    - Status timeline or status badge
    - "Cancel Order" button (if status is PENDING or PAYMENT_PROCESSING):
      - POST `/api/v1/orders/{id}/cancel`
      - Refresh order details after cancellation
    - "Back to Orders" link

**Acceptance criteria:**
- `app/orders/page.tsx` fetches from `/api/v1/orders` on mount
- Orders displayed as list/table with date, status, total, item count
- Pagination works: fetch page 1, show "Previous" (disabled) and "Next" (enabled if has_next)
- Click order → navigate to `/orders/{id}`
- Order detail shows shipping address, items, status
- "Cancel Order" button POSTs to `/api/v1/orders/{id}/cancel` (if PENDING or PAYMENT_PROCESSING)
- Error state handled with retry

---

### Wave 4: Seller Dashboard

#### 4.1 Create seller listings page
**Read first:**
- `frontend/types/index.ts` (Book, BookStatus)
- `./docs/openapi.json` (GET `/api/v1/books/my-listings`)

**Action:**
- Create `app/seller/listings/page.tsx`:
  - Require auth with role === SELLER (check in `useAuth()`)
  - Fetch seller's books from `/api/v1/books/my-listings?status=all&page=1&per_page=20`
  - Display as table or grid with columns:
    - Book image (thumbnail)
    - Title, author
    - Status (draft, active, sold, archived) with badge color
    - Price
    - Quantity
    - Created date
    - Actions: [Edit] [Delete] [Publish] (if DRAFT) [View]
  
  - Status filter dropdown (all, draft, active, sold, archived)
  - Pagination
  - Empty state: "No listings yet. Create one?" with button to `/seller/listings/create`
  - "Create New Listing" button at top

- Update book card or create seller-specific card component for listings view

**Acceptance criteria:**
- `app/seller/listings/page.tsx` fetches from `/api/v1/books/my-listings`
- Displays books with title, author, status, price, quantity, created date
- Status filter works (dropdown updates query param, refetches)
- Pagination works
- [Edit] link → `/seller/listings/[id]/edit`
- [Delete] button → DELETE `/api/v1/books/{id}` with confirmation
- [Publish] button (if DRAFT) → POST `/api/v1/books/{id}/publish`, refresh list
- [View] link → `/books/{id}`
- Empty state and error states handled

---

#### 4.2 Create book listing form (create + edit)
**Read first:**
- `frontend/types/index.ts` (BookCreate, BookUpdate, BookCondition)
- `./docs/openapi.json` (POST `/api/v1/books`, PUT `/api/v1/books/{id}`, POST `/api/v1/upload`)

**Action:**
- Create `components/BookListingForm.tsx`:
  - Mode prop: 'create' | 'edit'
  - Inputs (all fields from BookCreate/BookUpdate):
    - title (required)
    - author (required)
    - isbn (optional)
    - description (optional, textarea, 5000 chars max)
    - condition (required, dropdown: new, like_new, good, acceptable)
    - price (required, number, > 0)
    - quantity (optional, number, default 1, max 1000)
    - category (optional, text input with autocomplete from `/api/v1/books/categories`)
    - publisher (optional)
    - publication_year (optional, 4-digit year)
    - language (optional, default "English")
    - page_count (optional, number)
    - images (optional, file upload, max 10 images)
    - status (optional, radio: draft or active, default draft)
  
  - Image upload:
    - File input (accept images only)
    - Preview uploaded images
    - POST `/api/v1/upload` for each file, get public URL
    - Display URLs in form state
    - Remove button for each image
  
  - Form actions:
    - "Save Draft" button (POST/PUT with status=draft)
    - "Publish" button (POST/PUT with status=active)
    - "Cancel" button
  
  - Error display
  - Loading state

- Create `app/seller/listings/create/page.tsx`:
  - Render `<BookListingForm mode="create" />`
  - On submit: POST `/api/v1/books` → redirect to `/seller/listings`

- Create `app/seller/listings/[id]/edit/page.tsx`:
  - Route param: `id` (book UUID)
  - Fetch book from `/api/v1/books/{id}` on mount
  - Render `<BookListingForm mode="edit" book={book} />`
  - On submit: PUT `/api/v1/books/{id}` → redirect to `/seller/listings` or show success message

**Acceptance criteria:**
- BookListingForm has inputs for all fields: title, author, condition, price, quantity, description, images, etc.
- Image upload POSTs to `/api/v1/upload`, stores returned URLs
- "Save Draft" button POSTs/PUTs with status=draft
- "Publish" button POSTs/PUTs with status=active
- Form validation: required fields checked, price > 0, quantity 1-1000
- Error messages shown on API failure
- Loading state during submission
- On success: redirect to listing detail or listings page

---

#### 4.3 Create seller orders page
**Read first:**
- `frontend/types/index.ts` (Order, OrderItem, OrderStatus)
- `./docs/openapi.json` (GET `/api/v1/orders`)

**Action:**
- Create `app/seller/orders/page.tsx`:
  - Fetch seller's orders from `/api/v1/orders` (backend filters to seller's items)
  - Display as table with columns:
    - Order ID
    - Buyer name
    - Order date
    - Status
    - Total amount
    - Items (book count)
    - Actions: [View]
  
  - Status filter (pending, payment_processing, paid, shipped, delivered, cancelled, refunded)
  - Pagination
  - Empty state: "No orders containing your books"

- In order detail (shared with buyer view):
  - For seller: show items they're selling in this order
  - Show "Mark as Shipped" button (if status is PAID and seller owns items)
  - (Assuming backend will update order status to SHIPPED when all items are shipped)

**Acceptance criteria:**
- `app/seller/orders/page.tsx` fetches from `/api/v1/orders`
- Displays orders with order ID, buyer name, date, status, total, item count
- Status filter works
- Pagination works
- [View] link → `/seller/orders/{id}` (or reuse `/orders/{id}` with role-based view)
- Error state handled

---

### Wave 5: Polish & Edge Cases

#### 5.1 Add error boundaries and error pages
**Action:**
- Create `app/error.tsx` (Next.js error boundary):
  - Catches unhandled errors in all routes
  - Display: "Something went wrong" message + "Go Home" link
  - Log error (optional)

- Create `app/not-found.tsx`:
  - Display: "Page not found" + "Go Home" link

- Add error handling to all API calls:
  - Catch network errors
  - Display user-friendly error messages
  - Show "Retry" buttons where appropriate

**Acceptance criteria:**
- `app/error.tsx` catches errors and displays message
- `app/not-found.tsx` handles 404s
- All async operations show error messages
- Network errors don't crash the app

---

#### 5.2 Add loading skeletons and transitions
**Action:**
- Create skeleton component for BookCard, order list, etc.
- Show skeletons while data is loading
- Smooth transitions when data loads
- Add `<Suspense>` boundaries for async components

**Acceptance criteria:**
- Loading pages show skeleton placeholders
- Smooth fade-in when content loads
- No jarring layout shifts

---

#### 5.3 Add responsive design for mobile
**Action:**
- Ensure all pages work on mobile (< 640px)
- Test navigation on small screens (hamburger menu in header)
- Test forms on mobile
- Test image uploads on mobile
- Use Tailwind responsive classes (sm, md, lg, xl)

**Acceptance criteria:**
- All pages responsive down to 320px
- Mobile navigation works (hamburger menu)
- Forms usable on small screens
- Images scale properly

---

#### 5.4 Add OAuth integration (Google & GitHub)
**Action:**
- Create OAuth callback page: `app/(auth)/callback/page.tsx`
- Handle OAuth response (code + state parameters)
- POST to `/api/v1/auth/google/callback` or `/api/v1/auth/github/callback`
- Store tokens, redirect to `/browse` or `/seller/listings` based on role
- Add "Login with Google" and "Login with GitHub" buttons to auth forms
- Redirect to OAuth authorization URL on button click

**Acceptance criteria:**
- OAuth buttons on login/register pages
- Click "Login with Google" → redirects to Google login
- Google returns code → app POSTs to `/api/v1/auth/google/callback`
- Tokens stored, user logged in, redirect to `/browse`
- Same for GitHub

---

## Verification Criteria

### Functional
- [ ] All auth flows work (register, login, logout, refresh token, forgot/reset password)
- [ ] OAuth integration works (Google & GitHub)
- [ ] Books browse page shows books with search, filters, pagination
- [ ] Book detail page shows full info, reviews, stats
- [ ] Cart works (add, remove, quantity updates)
- [ ] Checkout creates order and redirects to Stripe
- [ ] Order history shows all past orders
- [ ] Seller can create, edit, delete, publish listings
- [ ] Seller can see orders containing their books
- [ ] Reviews can be created, edited, deleted
- [ ] All error states handled gracefully

### Technical
- [ ] TypeScript strict mode enabled
- [ ] All API calls use typed responses
- [ ] Token refresh transparent (no user-facing 401 errors)
- [ ] Images upload and display correctly
- [ ] Responsive design on mobile, tablet, desktop
- [ ] No console errors or warnings
- [ ] Environment variables configured correctly

### User Experience
- [ ] Loading states shown (skeletons or spinners)
- [ ] Errors show clear messages with retry options
- [ ] Form validation clear (required field indicators)
- [ ] Smooth transitions and animations (no jarring layout shifts)
- [ ] Navigation intuitive (clear CTA buttons)

## Deliverables

- [ ] Complete Next.js 15 frontend application
- [ ] All pages from roadmap implemented and functional
- [ ] API integration working with real backend
- [ ] Stripe payment integration working (redirects to checkout)
- [ ] OAuth working (Google, GitHub)
- [ ] Responsive design on all breakpoints
- [ ] Error handling and edge cases covered
- [ ] Code well-typed (TypeScript strict mode)

## Must-Haves

1. **Auth works end-to-end** — users can register, login, logout, and tokens refresh automatically
2. **Browse & purchase flow works** — buyers can find books and complete checkout
3. **Seller listing flow works** — sellers can create, edit, publish listings
4. **All pages responsive** — app works on mobile, tablet, desktop
5. **API integration complete** — all endpoints from OpenAPI spec used correctly
