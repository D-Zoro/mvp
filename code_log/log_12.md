# Frontend Implementation Update

## Summary
Implemented the missing Checkout and Seller Dashboard features, along with necessary API clients and components. Fixed build errors and synchronized types with backend.

## Changes

### 1. New Pages
-   **Checkout (`/checkout`)**:
    -   Displays order summary and shipping address form.
    -   Creates order via `POST /orders`.
    -   Initiates Stripe checkout via `POST /payments/checkout/{order_id}`.
    -   Protected by `AuthGuard`.
-   **Seller Dashboard (`/seller/dashboard`)**:
    -   Lists seller's books using `GET /books/my-listings`.
    -   Allows deleting books.
    -   Protected by `AuthGuard` (seller/admin).
-   **Create Book (`/seller/books/create`)**:
    -   Form to list a new book.
    -   Includes image upload via `POST /upload`.
    -   Protected by `AuthGuard` (seller/admin).
-   **Cart (`/cart`)**:
    -   Fully functional cart with quantity updates and removal.
    -   Connected to `useCartStore`.

### 2. Components
-   **`AuthGuard`**: New component to protect routes based on authentication status and user roles.
-   **`useAuth`**: Updated hook (verified existence and imports).

### 3. API Clients
-   **`orders.ts`**: Added `getMyOrders` and `createOrder`.
-   **`payments.ts`**: Added `createCheckoutSession`.
-   **`books.ts`**: Added `getMyListings`.
-   **`upload.ts`**: Created client for `POST /upload`.
-   **`types.ts`**:
    -   Added `RegisterRequest`, `LoginRequest`, `RefreshTokenRequest`.
    -   Added `BookQueryParams`.
    -   Synced `ShippingAddress` fields (`address_line1`).

## Verification
-   `npm run build` passed successfully.
-   Routes verified: `/checkout`, `/seller/dashboard`, `/seller/books/create`, `/cart`.
