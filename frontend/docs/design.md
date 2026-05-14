# Books4All Frontend Design Spec

## Books4All | Rigid Design System & UI/UX Spec (v1.0)

Agent directive: do not deviate from these exact values, classes, and specifications. Do not hallucinate colors, paddings, or animations. If a specification is missing, use the closest defined equivalent below. Do not use generic Tailwind classes like `bg-white` or `text-black`.

## 1. Viewports & Layout Matrix

We use a strictly mobile-first approach. All layouts must follow these breakpoints and padding rules.

| Viewport | Tailwind | Pixel | Max Page Width (`max-w-*`) | Page Padding (`px-*`) | Grid Columns (Browse) |
| --- | --- | --- | --- | --- | --- |
| Mobile | default | < 640px | `w-full` | `px-4` (16px) | `grid-cols-1` |
| Tablet | `sm:` | >= 640px | `w-full` | `px-6` (24px) | `grid-cols-2` |
| Laptop | `md:` | >= 768px | `w-full` | `px-8` (32px) | `grid-cols-3` |
| Desktop | `lg:` | >= 1024px | `max-w-7xl` (1280px) | `px-8` (32px) | `grid-cols-4` |

### Container Implementation

The main wrapper (`page-container.tsx`) must be:

```tsx
mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8
```

## 2. Exact Color Palette (Tailwind Config)

Agent must inject these exactly into `tailwind.config.ts`. No generic colors.

```ts
colors: {
  background: '#F9F7F2',    // Paper base
  foreground: '#1A1A1A',    // Deep Ink
  surface: {
    DEFAULT: '#FFFFFF',     // Clean paper for cards
    muted: '#F3F1ED',       // Slightly darker for stage/image backgrounds
  },
  border: {
    DEFAULT: '#E5E7EB',     // Standard 1px borders
    focus: '#4F46E5',       // Focus rings
  },
  primary: {
    DEFAULT: '#4F46E5',     // Indigo
    hover: '#4338CA',       // Darker Indigo
    foreground: '#FFFFFF',
  },
  success: {
    DEFAULT: '#10B981',     // Emerald
    bg: '#D1FAE5',          // 10% opacity Emerald for badges
  },
  muted: {
    DEFAULT: '#A4ACAF',     // Secondary text
  }
}
```

## 3. Typography Scale

Fonts must be configured via `next/font/google`.

- Serif (`Playfair Display`): headings only.
- Sans (`Inter`): UI, forms, body.
- Mono (`JetBrains Mono`): prices, ISBNs, IDs.

### Scale & Line Height

Use these exact Tailwind classes:

- H1 (Page Title): `font-serif text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-foreground`
- H2 (Section): `font-serif text-2xl sm:text-3xl font-semibold leading-snug text-foreground`
- H3 (Card Title): `font-serif text-lg sm:text-xl font-semibold leading-snug text-foreground`
- Body Base: `font-sans text-base leading-relaxed text-foreground`
- Body Small: `font-sans text-sm leading-normal text-muted`
- Price/Data: `font-mono text-lg font-bold text-primary tracking-tight`
- Overlines/Badges: `font-sans text-[10px] uppercase tracking-wider font-semibold`

## 4. Shape & Shadow (Radii & Elevation)

Agent directive: absolutely no pill buttons (`rounded-full`) or heavy shadows (`shadow-lg`).

- Border radius: use `rounded-sm` (2px) for everything: buttons, inputs, cards, images. Avatar is the only exception (`rounded-full`).
- Shadows:
  - Cards (rest): `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`).
  - Cards (hover): `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / 0.1)`).
  - Modals/dropdowns: `shadow-lg`.
- Borders: `border border-border`.
- Left accent stripes must be `border-l-4 border-primary`.

## 5. Motion & Transitions

Transitions must be fast and snappy. Do not use spring physics.

- Standard hover (buttons/links): `transition-colors duration-150 ease-out`
- Card hover: `transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md`
- Framer Motion page enter (`layout.tsx`):

```tsx
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} // strict ease-out
```

## 6. Exact Component Specifications

### 6.1 Button (`components/ui/button.tsx`)

- Heights: `h-10` (default), `h-8` (sm), `h-12` (lg).
- Primary: `bg-primary text-primary-foreground hover:bg-primary-hover rounded-sm font-sans font-medium transition-colors`
- Secondary/Outline: `bg-transparent border border-foreground text-foreground hover:bg-foreground/5 rounded-sm`
- Disabled state: `opacity-50 cursor-not-allowed pointer-events-none`

### 6.2 Input & Textarea (`components/ui/input.tsx`)

- Height: `h-10` exactly.
- Padding: `px-3 py-2`.
- Style: `bg-surface border border-border rounded-sm text-sm text-foreground placeholder:text-muted`
- Focus state (critical): `focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary`

### 6.3 Navbar (`components/layout/navbar.tsx`)

- Height: exactly `h-16` (64px).
- Position: `sticky top-0 z-50`.
- Background: `bg-background/80 backdrop-blur-md border-b border-border`.
- Mobile menu: hamburger icon on `< 640px`. Slides in from right (`w-64`).

### 6.4 Book Card (`components/books/book-card.tsx`)

- Wrapper: `group relative flex flex-col bg-surface border border-border rounded-sm overflow-hidden`.
- Image container: `relative aspect-[2/3] w-full overflow-hidden bg-surface-muted`.
- Image tag: `object-cover transition-transform duration-300 group-hover:scale-105`.
- Content padding: `p-4 flex flex-col flex-grow`.
- Gap between text: `space-y-1`.

### 6.5 Condition Badge (`components/books/condition-badge.tsx`)

Must be absolutely positioned in `BookCard`: `absolute top-2 right-2 px-2 py-1 rounded-sm`.

- New: `bg-success-bg text-success`
- Like New: `bg-primary/10 text-primary`
- Good / Acceptable: `bg-surface-muted text-foreground border border-border`

### 6.6 The Browse Layout (`app/(main)/books/page.tsx`)

- Desktop (`lg:`): `grid grid-cols-12 gap-8`.
- Sidebar is `col-span-3` (`sticky`, `top-24`, `h-[calc(100vh-6rem)]`, `overflow-auto`).
- Main grid is `col-span-9`.
- Mobile (`< 1024px`): sidebar becomes an accordion/drawer. Main grid takes `col-span-12`.

### 6.7 The Book Detail Layout (`app/(main)/books/[id]/page.tsx`)

- Grid: `grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8`.
- Left (image): `lg:col-span-5`.
- Image must stick while scrolling right column (`sticky top-24`). Background: `bg-surface-muted p-4 rounded-sm border border-border`.
- Right (content): `lg:col-span-7 flex flex-col space-y-6`.
- Mobile buy bar: on `< 640px`, the "Add to Order / Buy" button must move to a fixed `bottom-0 left-0 right-0 p-4 bg-surface border-t border-border z-40` bar.

## 7. Anti-Slop Check (Agent Stop-Rules)

Before completing any component, the agent must verify:

- Are there any `rounded-md`, `rounded-lg`, or `rounded-xl` classes? If yes, fail and change to `rounded-sm`.
- Is the background pure white outside of a card? If yes, fail and use `bg-background`.
- Are there inline styles like `style={{ color: '#333' }}`? If yes, fail and use Tailwind tokens.
- Are API calls made inside Client Components using `useEffect`? If yes, fail and use `useQuery` from TanStack or Server Components.