# Books4All Frontend — Quick-Start Checklist

## For Designers & Stakeholders

### Understanding the Design

- [ ] Read **DESIGN.md** (design system, typography, components)
- [ ] Review **VISUAL-GUIDE.md** (color in action, typography examples, layouts)
- [ ] Review **FRONTEND-SUMMARY.md** (high-level overview)
- [ ] Open `frontend/app/globals.css` (see CSS custom properties)

### Verifying Aesthetic Intent

- [ ] Does the color palette feel "premium" and "editorial"? (cream + ink)
- [ ] Are serif headings (Playfair) visibly distinct from body text (Inter)?
- [ ] Do card left-borders feel like margin notes (not floating boxes)?
- [ ] Do buttons feel sharp and intentional (2px radius)?
- [ ] Does the hero layout feel asymmetric and thoughtful (2/3 + 1/3)?

### Feedback & Approval

- [ ] Stakeholders approve the aesthetic direction ("Modern Academic")
- [ ] Marketing team confirms brand fit (curated, trustworthy, editorial)
- [ ] Product team confirms the layout supports user flows (browse, sell, checkout)

---

## For Engineers (Frontend)

### Setup & Local Testing

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
# → Open http://localhost:3000

# Run build
npm run build

# Run linting
npm run lint
```

### Verify Implementation

**Homepage (`/`):**
- [ ] Hero section renders (2/3 text + 1/3 whitespace)
- [ ] Featured books grid is 3 columns on desktop
- [ ] Book cards have left-border accent (indigo)
- [ ] Buttons are sharp (2px radius, not pill)
- [ ] How It Works section has 3 numbered boxes
- [ ] CTA section has indigo background

**Browse Page (`/browse`):**
- [ ] Sidebar filters on left (1/5 width)
- [ ] Book grid on right (4/5 width)
- [ ] Grid is 3 columns on desktop, 2 on tablet, 1 on mobile
- [ ] Sort dropdown works (visual only for now)
- [ ] Pagination buttons render

**Header:**
- [ ] "Books4All" logo in Playfair Display (serif)
- [ ] Nav links are lowercase (not all-caps)
- [ ] Mobile hamburger menu opens/closes
- [ ] Focus rings appear on keyboard navigation

**Footer:**
- [ ] 4 columns on desktop
- [ ] Stacks to single column on mobile
- [ ] All links are functional (even if placeholder)

### Chrome DevTools Checks

**Performance:**
```
Open DevTools → Lighthouse → Run Audit
Target: 90+ Performance, 95+ Accessibility, 90+ Best Practices
```

**Accessibility:**
```
Open DevTools → Elements → Accessibility Tree
Verify: semantic HTML, focus order, ARIA labels
```

**Responsive:**
```
Toggle Device Toolbar (Cmd+Shift+M)
Test: 375px (mobile), 768px (tablet), 1280px (desktop)
Check: no horizontal scroll, touch targets >44px
```

---

## For Engineers (Backend/API Integration)

### Expected Frontend Routes

```typescript
// Once pages are complete, they'll call these endpoints:

GET /api/v1/books                // Browse page (with filters)
  ├─ query: page, limit, sort
  ├─ query: min_price, max_price
  ├─ query: condition, genre
  └─ query: seller_rating_min

GET /api/v1/books/:id            // Book detail page
  └─ Returns: book, seller info, reviews

GET /api/v1/auth/me              // User profile (on all pages)
  └─ Returns: user, role, auth status

POST /api/v1/auth/login          // Login form
POST /api/v1/auth/register       // Register form
POST /api/v1/auth/forgot-password // Password reset
POST /api/v1/orders              // Checkout (future)
```

### Frontend API Client (To Build)

Create `lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export async function fetchBooks(filters: {
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  genre?: string;
}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined)
  );
  const res = await fetch(`${API_BASE}/api/v1/books?${params}`);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function fetchBook(id: string) {
  const res = await fetch(`${API_BASE}/api/v1/books/${id}`);
  if (!res.ok) throw new Error('Book not found');
  return res.json();
}

// ... more endpoints
```

Then update pages to use it:

```typescript
// app/browse/page.tsx
import { fetchBooks } from '@/lib/api';

export default async function BrowsePage() {
  const books = await fetchBooks({ limit: 20 });
  // Render with real data
}
```

---

## For Product/QA

### User Flow Checklist

**Buyer Journey:**
- [ ] Can user navigate homepage → browse page
- [ ] Can user see book listings with prices
- [ ] Can user see seller ratings & condition info
- [ ] Can user click into book details (future page)
- [ ] Can user add books to cart (future)
- [ ] Can user checkout (future)

**Seller Journey:**
- [ ] Can user see "Become a Seller" CTA
- [ ] Can user register as seller (future)
- [ ] Can user list books (future)
- [ ] Can user see orders dashboard (future)

**Authentication:**
- [ ] Login form is accessible
- [ ] Register form validates inputs
- [ ] Error messages are user-friendly
- [ ] Success states are clear

### Visual Regression Testing

```
Install Percy (visual regression tool):
npm install --save-dev @percy/cli @percy/react

Then:
percy snapshot ./app/page.tsx
```

This captures the current design for comparison as code evolves.

---

## For DevOps/Deployment

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000  # Dev
# NEXT_PUBLIC_API_URL=https://api.books4all.com  # Production
```

### Build & Deploy

```bash
# Build
npm run build
# → Creates .next/ directory

# Test production build locally
npm run start
# → http://localhost:3000

# Deploy to Vercel (recommended for Next.js)
# → Connected to GitHub, auto-deploys on push
```

### Performance Targets

- [ ] Lighthouse Performance: 90+
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] First Contentful Paint: <1.5s
- [ ] Time to Interactive: <3s

---

## Design File Locations

| File | Purpose | Audience |
|------|---------|----------|
| `DESIGN.md` | Design system spec | Designers, engineers |
| `VISUAL-GUIDE.md` | Color, typography, layouts in action | Designers, product |
| `FRONTEND-SUMMARY.md` | High-level overview | Everyone |
| `IMPLEMENTATION.md` | Architecture, integration guide | Engineers |
| `globals.css` | All CSS with comments | Engineers |
| Component files | Reusable React components | Engineers |
| `QUICK-START.md` | This file | Everyone |

---

## Accessibility Audit Checklist

Before launch, verify:

### Contrast
- [ ] WAVE tool reports 0 contrast errors
- [ ] axe DevTools reports 0 violations
- [ ] Manual check: text is readable on all backgrounds

### Keyboard Navigation
- [ ] All interactive elements focusable (Tab)
- [ ] Focus order follows visual flow
- [ ] Focus rings are visible (2px solid indigo)
- [ ] Hamburger menu keyboard-accessible

### Semantic HTML
- [ ] No `<div>` tags used for interactive elements
- [ ] All form inputs have `<label>` tags
- [ ] Images have alt text
- [ ] Links are distinguishable from text

### Screen Reader
- [ ] Test with NVDA or JAWS
- [ ] Page structure is announced correctly
- [ ] Form labels are associated
- [ ] Error messages are announced

### Mobile
- [ ] Touch targets are 44×44px minimum
- [ ] Text is readable without pinch-zoom
- [ ] Hamburger menu opens/closes correctly
- [ ] No horizontal scroll

---

## Common Issues & Fixes

### Issue: Fonts not loading

**Solution:**
```typescript
// Check layout.tsx has font variables defined
const playfairDisplay = Playfair_Display({
  variable: "--font-serif",  // ← used in CSS
  subsets: ["latin"],
  weight: ["600", "700"],
});
```

### Issue: Colors look different on mobile

**Solution:**
- Colors should be identical across devices
- Use device-rgb color space in DevTools
- Check that CSS variables are in `:root` (not media-queried)

### Issue: Cards don't hover on mobile

**Solution:**
- On touch devices, `:hover` doesn't fire
- Add active state: `.card:active { ... }`
- Consider using `@media (hover: hover)` for desktop-only effects

### Issue: Form inputs have double borders

**Solution:**
```css
input {
  border: none;              /* Remove default */
  border-bottom: 2px solid;  /* Add custom border */
}
```

---

## Next Steps (First 48 Hours)

**Designers & Product:**
1. Review DESIGN.md + VISUAL-GUIDE.md (30 min)
2. Approve aesthetic & feedback (30 min)
3. Identify any brand/style adjustments needed (30 min)

**Engineers:**
1. Clone repo and run `npm run dev` (15 min)
2. Test homepage & browse page in browser (30 min)
3. Run accessibility audit (WAVE, axe) (30 min)
4. Create GitHub issues for any bugs (30 min)
5. Plan API integration work (1 hour)

**Stakeholders:**
1. View live at http://localhost:3000
2. Test on mobile (iPhone 12, Galaxy S21)
3. Confirm aesthetic matches brief
4. Approve before API integration begins

---

## Success Criteria (Before Launch)

- [ ] All pages render correctly (homepage, browse, auth forms)
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Accessibility audit passes (WAVE, axe, NVDA)
- [ ] API calls are integrated (books, auth, orders)
- [ ] Loading states work (skeleton shimmer)
- [ ] Error handling is user-friendly
- [ ] Forms validate and submit correctly
- [ ] Performance is >90 Lighthouse
- [ ] Design matches visual guide (no regressions)
- [ ] Team is trained on design system

---

## Questions?

- **Design questions?** → See `DESIGN.md`
- **Visual questions?** → See `VISUAL-GUIDE.md`
- **Code questions?** → See component files + `globals.css`
- **Architecture?** → See `IMPLEMENTATION.md`
- **API integration?** → See API section above

---

## Contact

- **Design Lead:** [Your name]
- **Frontend Lead:** [Your name]
- **Backend Lead:** [Your name]

Slack channel: #books4all-frontend

Happy shipping! 📚✨
