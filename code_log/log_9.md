# Log 9 — Frontend API Client + Authentication Foundation

**Date:** 2026-03-20

---

## What I Implemented

Built a type-safe API and authentication foundation in `frontend/src` with Axios + React Query + Zustand.

### 1) API Client Layer (`src/lib/api/`)

#### `client.ts`
- Central Axios instance with `baseURL = ${NEXT_PUBLIC_API_URL}/api/v1`.
- Request interceptor injects `Authorization: Bearer <access_token>`.
- Response interceptor:
  - Handles 401 responses.
  - Attempts refresh-token flow once per failed request.
  - Retries original request with the new token.
  - Clears local tokens on unrecoverable auth failures.
- Generic helper:
  - `apiRequest<TResponse, TBody>()` for type-safe API calls.
- Error utility:
  - `toApiClientError()` normalizes Axios/unknown errors into `ApiClientError`.

#### `types.ts`
- Shared API types and interfaces:
  - `User`, `AuthResponse`, `Book`, `Order`, `Review`
  - Request payloads for auth/books/orders/reviews
  - `PaginatedResponse<T>` generic
  - `ApiClientError` typed error class

#### `auth.ts`
- Implemented endpoints:
  - `register(data)` → `POST /auth/register`
  - `login(data)` → `POST /auth/login`
  - `logout()` → `POST /auth/logout`
  - `refreshToken(data)` → `POST /auth/refresh`
  - `getCurrentUser()` → `GET /auth/me`

#### `books.ts`
- Implemented endpoints:
  - `getBooks(params)` → `GET /books`
  - `getBook(id)` → `GET /books/{id}`
  - `createBook(data)` → `POST /books`
  - `updateBook(id, data)` → `PUT /books/{id}`
  - `deleteBook(id)` → `DELETE /books/{id}`

#### `orders.ts`
- Implemented pattern-matching order APIs:
  - `getOrders(params)`
  - `getOrder(id)`
  - `createOrder(data)`
  - `cancelOrder(id)`

#### `reviews.ts`
- Implemented review APIs in same pattern:
  - `getReviews(bookId, params)`
  - `createReview(bookId, data)`
  - `getReviewStats(bookId)`
  - `updateReview(reviewId, data)`
  - `deleteReview(reviewId)`

#### `index.ts`
- Barrel export for API modules.

---

### 2) Auth State Management (`src/store/` + `src/lib/auth/`)

#### `src/lib/auth/tokenStorage.ts`
- Local storage helpers for:
  - Access token get/set/clear
  - Refresh token get/set/clear

#### `src/store/authStore.ts`
- Zustand auth store with persistence middleware.
- Stores:
  - `user`
  - `accessToken`
  - `refreshToken`
  - `isAuthenticated`
- Actions:
  - `setUser`
  - `setTokens`
  - `clearAuth` (also clears localStorage tokens)

---

### 3) Auth Hook (`src/lib/hooks/useAuth.ts`)

Implemented `useAuth()` that returns:
- `user`
- `login`
- `logout`
- `register`
- `refresh`
- `isLoading`
- `error`

Uses:
- React Query (`useQuery`, `useMutation`) for auth operations and `/auth/me` retrieval.
- Zustand store for persisted auth state/tokens.

---

### 4) Route Guards (`src/components/`)

#### `AuthGuard.tsx`
- Protects authenticated routes.
- Redirects unauthenticated users to `/login`.
- Preserves next path via query parameter.

#### `RoleGuard.tsx`
- Restricts by `allow: UserRole[]`.
- Redirects unauthenticated users to `/login`.
- Redirects unauthorized users to fallback route.

---

## Additional Supporting Updates

- Updated `frontend/tsconfig.json` aliases to point to `src/*` paths used by new modules.
- Updated session plan file with new progress and next steps.

---

## Validation Results

Executed successfully:

- `npm run lint`
- `npm run type-check`
- `npm run build`

All passed.

---

## Notes

- Build outputs baseline-browser-mapping staleness warnings; non-blocking.
- Next step is integrating a top-level QueryClient provider and wiring guarded pages/forms for login/register and role-based sections.
