# Books4All — Modern Academic Design System

## Aesthetic Intent

**Modern Academic** – Think a high-end independent bookstore in Tokyo or Berlin's curated library aesthetic. We reject the visual noise of Amazon (clutter, urgency) and the social chaos of Facebook. Instead, we embrace editorial precision, thoughtful negative space, and typography that reads like a printed catalogue.

---

## Color Palette

All colors stored as CSS variables for consistency and easy theming.

| Role | Hex | Variable | Usage |
|------|-----|----------|-------|
| **Background** | #F9F7F2 | `--color-bg` | Page background, cards |
| **Foreground** | #1A1A1A | `--color-fg` | Body text, primary content |
| **Accent (Indigo)** | #4F46E5 | `--color-accent` | Buttons, links, call-to-actions |
| **Success (Emerald)** | #10B981 | `--color-success` | "Paid" badges, confirmation states |
| **Muted (Soft Gray)** | #E5E7EB | `--color-muted` | Borders, dividers, disabled states |
| **Warning (Amber)** | #F59E0B | `--color-warning` | "Out of Stock," alerts |
| **Error (Rose)** | #F43F5E | `--color-error` | Form validation, critical states |
| **Accent (Secondary)** | #A4ACAF | `--color-secondary` | Metadata, seller names, subtle text |

---

## Typography

### Fonts

**Display/Headings:** Playfair Display (Serif)
- Weight: 600–700
- Use for: Page titles, section headers, book titles in listings
- Effect: Bookish, premium, editorial authority

**Body/UI:** Inter (Sans-Serif)
- Weight: 400–500
- Use for: Body copy, labels, form inputs, navigation
- Effect: Clean, readable, modern

**Monospace:** JetBrains Mono
- Weight: 400–500
- Use for: Prices, ISBNs, order IDs, code snippets
- Effect: Precision, technical credibility

### Scale (Tailwind-based)

- **H1:** Playfair Display, 48px, 700 weight, +2% letter-spacing
- **H2:** Playfair Display, 32px, 600 weight
- **H3:** Playfair Display, 24px, 600 weight
- **Body:** Inter, 16px, 400 weight, line-height 1.6
- **Small:** Inter, 14px, 400 weight
- **Label:** Inter, 13px, 500 weight, text-transform: uppercase, letter-spacing: +1px

---

## Spacing & Rhythm

Using Tailwind's spacing scale (4px base unit):

- **Padding:** `p-4` (card internals), `p-6` (section padding), `p-8` (page margins)
- **Gaps:** `gap-4` (small sections), `gap-6` (medium), `gap-8` (large breathing room)
- **Margins:** Asymmetric (e.g., `mt-12 mb-6`) to create visual tension and sophistication

---

## Component Patterns

### Cards
- Background: `bg-white`, border: `border-l-4 border-[#4F46E5]` (accent left edge)
- Padding: `p-6`
- Shadow: None (prefer border weight)
- Hover: Subtle lift via `shadow-md` only on interactive cards

### Buttons
- **Primary:** `bg-[#4F46E5] text-white`, rounded: `rounded-sm` (sharp modern edges, not pill)
- **Secondary:** `bg-transparent border border-[#1A1A1A] text-[#1A1A1A]`
- **Tertiary:** Plain text link, `text-[#4F46E5] underline` on hover
- Padding: `px-6 py-2.5` (vertical breathing room)

### Forms
- Input background: `bg-[#F9F7F2]` (same as page bg for seamless integration)
- Border: `border-b-2 border-[#E5E7EB]`, focus: `border-b-2 border-[#4F46E5]`
- Labels: Uppercase, `text-[#A4ACAF]`, placed **above** input

### Navigation
- Serif brand logo (Playfair Display)
- Horizontal nav links in Inter, lowercase
- Active state: Underline (no background highlight)
- Responsive: Hamburger menu on mobile, using `<details>` + `<summary>` for accessibility

---

## Layout & Grid

### Homepage / Browse
- Hero section: Asymmetric layout (2/3 content + 1/3 whitespace)
- Book grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- Card height: Consistent (book cover + title + author + price, no description)

### Product Page (Book Detail)
- Two-column: Left (cover image), right (metadata + actions)
- Left column width: 40%, right: 60%
- Image aspect ratio: 3:4 (standard book cover)

### Checkout / Order Flow
- Single-column, centered, max-width: 600px
- Step indicators: Simple numbered breadcrumbs (no visual progress bar)

---

## Micro-Interactions

- **Hover on book card:** Subtle scale (1.02) + shadow-md, fade-in on hover text
- **Button hover:** Darker background (shade of accent), no animation (instant feedback)
- **Form input focus:** Border color shift + subtle bg fade
- **Loading state:** Skeleton cards (shimmer via CSS, no animation library)

---

## Accessibility

- Minimum contrast: 7:1 (exceeds WCAG AAA)
- All interactive elements keyboard-navigable
- Focus rings: 2px solid `#4F46E5` outline
- Alt text for all book cover images
- Semantic HTML: `<nav>`, `<article>`, `<section>`, not divs

---

## Differentiation Anchor

> "If this were screenshotted without the logo, you'd recognize it by: the Playfair serif headlines, the cream-ink color system, sharp (not rounded) button edges, and asymmetric left-border accents on cards."

This combination is **not** ShadCN, Vercel templates, or any standard library. It's intentional and ownable.

---

## Responsive Design

- **Desktop:** 1280px+ (3-column layouts, full navigation)
- **Tablet:** 768px–1279px (2-column layouts, simplified nav)
- **Mobile:** <768px (single column, full-width inputs, hamburger menu)

All breakpoints use Tailwind's native `sm:`, `md:`, `lg:` prefixes.
