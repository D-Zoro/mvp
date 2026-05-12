# Frontend Phase Plan Summary

**Phase**: 1 - Frontend Implementation  
**Status**: 📋 Planned and ready for execution  
**Date**: 2026-05-13

## Overview

You have a **complete, structured PLAN.md** that covers rebuilding the Books4All frontend from scratch. The plan is organized into **5 waves** with **13 major tasks**, each with:

- ✅ Specific file paths to create/modify
- ✅ Exact API endpoints to integrate (from OpenAPI spec)
- ✅ Acceptance criteria (grep-verifiable)
- ✅ Dependencies and read-first files

---

## Plan Structure

### **Wave 1: Core Infrastructure & Auth** (4 tasks)
- API client setup with type definitions
- Layout, header, footer components
- Auth pages (login, register, forgot password, reset password)
- Auth context and hooks

**Output**: Working authentication, JWT token management, landing page

### **Wave 2: Books & Browsing** (3 tasks)
- Book listing page with search/filters/pagination
- Book detail page with full info and reviews
- Review submission and management

**Output**: Buyers can browse, search, filter, and read reviews

### **Wave 3: Shopping & Orders** (2 tasks)
- Shopping cart and checkout flow
- Order history and order detail pages

**Output**: Full purchase flow from cart to Stripe payment

### **Wave 4: Seller Dashboard** (3 tasks)
- Seller's book listings page
- Book listing form (create + edit)
- Seller's order management

**Output**: Sellers can list books and track orders

### **Wave 5: Polish & Edge Cases** (4 tasks)
- Error boundaries and error pages
- Loading skeletons and smooth transitions
- Mobile responsive design
- OAuth integration (Google, GitHub)

**Output**: Production-ready frontend

---

## What the Plan Covers

✅ **Authentication**
- Email/password login & registration
- Google & GitHub OAuth
- JWT token refresh (automatic)
- Password reset flow

✅ **Buyer Features**
- Browse books with search, filters (category, condition, price)
- Book detail page with reviews and ratings
- Shopping cart (in localStorage)
- Checkout with shipping address
- Stripe payment integration
- Order history and tracking

✅ **Seller Features**
- Create, edit, publish book listings
- View all their listings with status
- Manage images (upload to S3/MinIO)
- View orders containing their books
- Mark orders as shipped (future)

✅ **Reviews**
- View book reviews and stats
- Leave review if purchased
- Edit/delete own reviews
- Verified purchase badge

✅ **Technical**
- TypeScript strict mode
- Tailwind CSS (design system colors/spacing)
- Next.js 15 App Router
- Responsive mobile-first design
- Error handling throughout
- Type-safe API client with auto token refresh

---

## Key Design Decisions (Locked)

From OpenAPI spec and your project instructions:

| Decision | Value |
|----------|-------|
| Frontend Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + custom color vars |
| Auth | JWT (access + refresh tokens) |
| Token Storage | localStorage (for now) |
| Cart | localStorage (no DB cart yet) |
| Payment | Stripe (redirect to checkout) |
| Image Upload | S3/MinIO via `/api/v1/upload` |
| OAuth | Google + GitHub (from OpenAPI) |
| API Base URL | `process.env.NEXT_PUBLIC_API_URL` |
| Error Handling | User-friendly messages + retry options |

---

## How to Execute This Plan

```bash
# 1. Review the full plan
cat .planning/phases/01-frontend/01-PLAN.md

# 2. Start implementation (when ready)
/gsd-execute-phase 1

# 3. This will:
#    - Check your workspace
#    - Begin Wave 1 tasks
#    - Auto-execute each task with the plan as guide
#    - Test output and provide feedback
#    - Move to Wave 2, etc.
```

---

## Acceptance Criteria (Phase-Level)

Before marking the phase complete, verify:

1. **Auth flow**: Register → Login → Browse → works end-to-end
2. **Browse**: Search books by name, filter by category/price, pagination works
3. **Detail**: Click book → see full info + reviews + "Add to Cart"
4. **Checkout**: Add to cart → enter shipping → Stripe payment → success
5. **Orders**: View past orders with status, cancellation for pending orders
6. **Seller**: Create listing → edit → publish → view listings + orders
7. **Mobile**: All pages work on phone (< 640px)
8. **Errors**: Network errors don't crash app, show helpful messages

---

## File Structure Created

```
.planning/
└── phases/
    └── 01-frontend/
        └── 01-PLAN.md          ← Complete executable plan (your guide)

frontend/ (to be built)
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── callback/page.tsx
│   ├── browse/page.tsx
│   ├── books/[id]/page.tsx
│   ├── orders/page.tsx
│   ├── orders/[id]/page.tsx
│   ├── seller/
│   │   ├── listings/page.tsx
│   │   ├── listings/create/page.tsx
│   │   ├── listings/[id]/edit/page.tsx
│   │   └── orders/page.tsx
│   ├── layout.tsx
│   ├── page.tsx (homepage - already exists, will refine)
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── BookCard.tsx
│   ├── AuthForm.tsx
│   ├── ReviewForm.tsx
│   ├── BookListingForm.tsx
│   └── [more as needed]
├── lib/
│   ├── api.ts (HTTP client + types)
│   ├── auth.ts (JWT management)
│   ├── hooks.ts (useAuth, useCart, etc.)
│   └── utils.ts
├── types/
│   └── index.ts (TypeScript types from OpenAPI)
└── next.config.ts
```

---

## Next Steps

1. **Review the PLAN.md** — it has everything you need
2. **When ready, run `/gsd-execute-phase 1`** to begin implementation
3. **Watch executor run tasks in order** — each task has:
   - Files to read first
   - Exact action (what to code/change)
   - Acceptance criteria (how to verify it worked)
4. **Executor will test each task** and move to next
5. **You can pause and ask questions** if anything is unclear

---

## Notes

- **Backend is done** ✓ You don't need to touch it
- **API spec is your source of truth** — OpenAPI at `./docs/openapi.json`
- **Design system is locked** — colors, spacing, fonts defined in plan
- **All page flows are specified** — no guesswork needed
- **Error handling is built in** — no silent failures

---

**Status**: 🟢 **READY TO EXECUTE**

Run `/gsd-execute-phase 1` to begin implementation, or `/gsd-clear` to reset and review first.
