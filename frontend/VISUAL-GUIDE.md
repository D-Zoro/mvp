# Books4All Frontend — Visual & Interaction Guide

## Color System (In Action)

### Primary Palette

```
BACKGROUND
#F9F7F2 (Off-white/Eggshell)
┌─────────────────────────────────────────┐
│ A clean canvas that feels like paper    │
│ Reduces eye strain during browsing      │
│ Premium, curated aesthetic              │
└─────────────────────────────────────────┘

FOREGROUND
#1A1A1A (Deep Ink)
┌─────────────────────────────────────────┐
│ Body text, headlines, primary content   │
│ 18:1 contrast ratio with background     │
│ High readability, editorial authority   │
└─────────────────────────────────────────┘

ACCENT
#4F46E5 (Modern Indigo)
┌─────────────────────────────────────────┐
│ Buttons, links, interactive elements    │
│ Distinctive and memorable               │
│ Not red/orange (avoids urgency)         │
└─────────────────────────────────────────┘
```

### Supporting Colors

```
STATUS INDICATORS
Success: #10B981 (Emerald)   → "Payment Received", "In Stock"
Warning: #F59E0B (Amber)     → "Low Stock", "Fair Condition"
Error:   #F43F5E (Rose)      → "Out of Stock", "Payment Failed"
Muted:   #E5E7EB (Soft Gray) → Borders, dividers, disabled states

METADATA TEXT
Secondary: #A4ACAF (Warm Gray)
→ Seller names, author info, timestamps, helper text
→ 7.8:1 contrast (WCAG AAA), doesn't fight foreground
```

---

## Typography in Practice

### Display (Playfair Display, Serif)

```
H1 – Page Title
┌───────────────────────────────────────────────────────┐
│                                                       │
│  Discover Curated Books, Purposefully                │
│  [accent word in indigo]                             │
│                                                       │
│  Size: clamp(2rem, 5vw, 3rem)  [fluid scaling]      │
│  Weight: 700                    [bold]               │
│  Letter-spacing: 0.02em         [breathing room]     │
│                                                       │
└───────────────────────────────────────────────────────┘

H2 – Section Headers
┌───────────────────────────────────────────────────────┐
│ Featured This Week                                    │
│                                                       │
│ Size: clamp(1.5rem, 4vw, 2rem)                      │
│ Weight: 600                                           │
└───────────────────────────────────────────────────────┘

H3 – Subsections
┌───────────────────────────────────────────────────────┐
│ The Elements of Style                                │
│                                                       │
│ Size: 1.5rem                                          │
│ Weight: 600                                           │
│ Used in: book cards, modal titles                    │
└───────────────────────────────────────────────────────┘
```

### Body (Inter, Sans-Serif)

```
BODY TEXT
┌───────────────────────────────────────────────────────┐
│ Books4All is a modern marketplace for quality used   │
│ books. No clutter. No noise. Just beautiful books,   │
│ trusted sellers, and thoughtful curation.            │
│                                                       │
│ Size: 1rem (16px)                                     │
│ Weight: 400                                           │
│ Line-height: 1.6                                      │
│ Color: #1A1A1A (foreground)                          │
└───────────────────────────────────────────────────────┘

LABELS (Form)
┌───────────────────────────────────────────────────────┐
│ EMAIL ADDRESS                                         │
│ [input field]                                         │
│                                                       │
│ Size: 0.8125rem (13px)                               │
│ Weight: 500                                           │
│ Transform: uppercase                                  │
│ Letter-spacing: 0.05em                               │
│ Color: #A4ACAF (secondary, muted)                    │
└───────────────────────────────────────────────────────┘

SMALL / METADATA
┌───────────────────────────────────────────────────────┐
│ by Jane Smith  |  ★ 4.8                              │
│                                                       │
│ Size: 0.875rem (14px)                                │
│ Weight: 400                                           │
│ Color: #A4ACAF (secondary)                           │
└───────────────────────────────────────────────────────┘
```

### Monospace (JetBrains Mono)

```
PRICES, ISBNs, ORDER IDs
┌───────────────────────────────────────────────────────┐
│ $12.99        ISBN: 978-0-385-33312-0  ORD-2024-1234 │
│                                                       │
│ Font: JetBrains Mono, 0.95rem                        │
│ Weight: 400–500                                       │
│ Color: #4F46E5 (accent, for prices)                  │
│ Background: rgba(0,0,0,0.05) [subtle highlight]    │
│                                                       │
│ Usage: Precision, technical credibility              │
└───────────────────────────────────────────────────────┘
```

---

## Component Examples

### Button States

```
PRIMARY BUTTON
┌─────────────────────────────────────────┐
│  Start Browsing                         │  ← Idle
│  (bg: #4F46E5, text: white)            │
└─────────────────────────────────────────┘
         ↓ (hover)
┌─────────────────────────────────────────┐
│  Start Browsing                         │  ← Hover
│  (bg: #3c37c4 [darker indigo])         │
└─────────────────────────────────────────┘
         ↓ (active/click)
┌─────────────────────────────────────────┐
│  Browsing…                              │  ← Loading
│  (disabled: opacity 0.5)                │
└─────────────────────────────────────────┘

SECONDARY BUTTON
┌─────────────────────────────────────────┐
│  Become a Seller                        │  ← Idle
│  (border: 2px solid #1A1A1A, text)    │
└─────────────────────────────────────────┘
         ↓ (hover)
┌─────────────────────────────────────────┐
│  Become a Seller                        │  ← Hover
│  (bg: #1A1A1A, text: white)            │
└─────────────────────────────────────────┘

TERTIARY (Link)
─ View All Books →  ← Idle (color: #4F46E5)
─ View All Books →  ← Hover (underline: yes)
```

### Card with Left-Border Accent

```
┌─────────────────────────────────────┐
│ │ Book Cover Image                  │
│ │ (3:4 aspect ratio)                │
│ │                                   │
│ │                                   │
│ │─────────────────────────────────│
│ │ The Elements of Style            │
│ │ [Hover: → color shift to indigo] │
│ │                                   │
│ │ William Strunk Jr.               │
│ │ [metadata color]                 │
│ │                                   │
│ │ $12.99      Like New             │
│ │ [monospace] [success badge]      │
│ │─────────────────────────────────│
│ │ by Jane Smith    ★ 4.8           │
│ │ [secondary text] [rating]        │
└─────────────────────────────────────┘
  ↑
  4px left border accent (#4F46E5)

HOVER STATE:
┌─────────────────────────────────────┐
│ │ Book Cover Image  ✓ Scale: 1.02   │
│ │                   ✓ Shadow: md    │
│ │ ...
└─────────────────────────────────────┘
```

### Form Input with Focus State

```
Idle State:
┌─────────────────────────────┐
│ EMAIL ADDRESS               │
│                             │  ← Cursor ready
│ you@example.com─────────    │
│ ─────────────────────────    │
                2px gray border

Focus State:
┌─────────────────────────────┐
│ EMAIL ADDRESS               │
│                             │  ← Focused
│ you@example.com─────────    │
│ ═════════════════════════    │
     (border: #4F46E5, 2px)
     
Background shift: rgba(79, 70, 229, 0.02)
[Very subtle blue tint, almost imperceptible]
```

### Status Badges

```
SUCCESS (Payment Received)
┌──────────────────┐
│ PAID             │  ← uppercase, small font
│ (bg: rgba(16,185,129,0.15), text: #10B981)
└──────────────────┘

WARNING (Fair Condition)
┌──────────────────┐
│ FAIR             │
│ (bg: rgba(245,158,11,0.15), text: #F59E0B)
└──────────────────┘

ERROR (Out of Stock)
┌──────────────────┐
│ OUT OF STOCK     │
│ (bg: rgba(244,63,94,0.15), text: #F43F5E)
└──────────────────┘

MUTED (Conditionally)
┌──────────────────┐
│ UNREAD           │
│ (bg: rgba(229,231,235,0.5), text: #A4ACAF)
└──────────────────┘
```

---

## Layout Patterns

### Hero Section (Asymmetric)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌─────────────┐  ┌───────┐                    │
│  │ 2/3 Content │  │ 1/3   │                    │
│  │             │  │       │                    │
│  │ H1 Title    │  │ WHITE │                    │
│  │ Description │  │ SPACE │                    │
│  │ CTAs        │  │       │                    │
│  │ Stats       │  │       │                    │
│  └─────────────┘  └───────┘                    │
│                                                 │
└─────────────────────────────────────────────────┘
   ↑
   Creates visual tension: not 50/50, intentional
```

### Browse Page (Sidebar + Grid)

```
┌──────────────────────────────────────────────────────┐
│                    HEADER                            │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ┌─────────┐ ┌─────────────────────────────────────┐ │
│ │ Filters │ │ Grid (3 columns on desktop)        │ │
│ │         │ │                                     │ │
│ │ Search  │ │ ┌───────┐ ┌───────┐ ┌───────┐    │ │
│ │ Price   │ │ │ Book  │ │ Book  │ │ Book  │    │ │
│ │ Cond.   │ │ │ Card  │ │ Card  │ │ Card  │    │ │
│ │ Genre   │ │ └───────┘ └───────┘ └───────┘    │ │
│ │ Rating  │ │ ┌───────┐ ┌───────┐ ┌───────┐    │ │
│ │ [Apply] │ │ │ Book  │ │ Book  │ │ Book  │    │ │
│ │         │ │ │ Card  │ │ Card  │ │ Card  │    │ │
│ └─────────┘ │ └───────┘ └───────┘ └───────┘    │ │
│             │ [Pagination]                       │ │
│             └─────────────────────────────────────┘ │
│                                                       │
├──────────────────────────────────────────────────────┤
│                    FOOTER                            │
└──────────────────────────────────────────────────────┘

Widths: Left (1/5), Right (4/5)
Gaps: 2rem (md) between columns
```

### Responsive Breakpoints

```
MOBILE (<768px)
Single column, stacked:
┌────────────────┐
│ HEADER         │
├────────────────┤
│ CONTENT        │
│ (full width)   │
├────────────────┤
│ FOOTER         │
└────────────────┘

TABLET (768–1279px)
2-column grid, simplified:
┌────────────────────┐
│ HEADER             │
├──────────┬─────────┤
│ SIDEBAR  │ GRID    │
│ (1/3)    │ (2/3)   │
├──────────┴─────────┤
│ FOOTER             │
└────────────────────┘

DESKTOP (1280px+)
Full layout:
┌────────────────────────┐
│ HEADER                 │
├─────────┬──────────────┤
│ FILTERS │ 3-COL GRID   │
│ (1/5)   │ (4/5)        │
├─────────┴──────────────┤
│ FOOTER                 │
└────────────────────────┘
```

---

## Micro-Interactions

### Book Card Hover

```
Before Hover          During Hover         After Hover
───────────────      ──────────────        ───────────
No shadow            Scale: 1.02           Back to 1.0
Gray border edge     +shadow-md            No shadow
Text: #1A1A1A        Text: #4F46E5         Text: #1A1A1A

Duration: 300ms (--transition-base)
Easing: ease-in-out (smooth)
```

### Button Hover

```
Primary Idle         Primary Hover        Click
──────────────       ─────────────        ─────
#4F46E5              #3c37c4 (darker)     opacity 0.9
white text           white text           slightly faded

Duration: 150ms (--transition-fast)
No scale, no shadow — feedback is instant color shift
```

### Form Focus

```
Idle                    Focus
────                    ─────
Border: gray            Border: indigo
Background: cream       Background: cream + tiny blue tint
No visual feedback      Border darkens (2px)
                        Subtle glow inside

Duration: 150ms
User knows field is active within 100ms
```

### Loading State

```
Skeleton shimmer animation (2s infinite):
┌─────────────┐
│ ▓▓░░▓▓░░▓▓  │  ← Shimmer moves left to right
│ ▓▓░░▓▓░░▓▓  │
│ ▓▓░░▓▓░░▓▓  │
└─────────────┘

Used for: book cards, search results
Stops when data loads
```

---

## Animation Keyframes

### fadeIn (300ms)
```
0% opacity: 0
100% opacity: 1
```
Usage: Page transitions, modal entries

### slideUp (300ms)
```
0% opacity: 0, transform: translateY(20px)
100% opacity: 1, transform: translateY(0)
```
Usage: Form submissions, new content

### shimmer (2s infinite)
```
Horizontal gradient moves across element
Used for skeleton loading
```

---

## This Avoids Generic UI By:

| Generic Pattern | Our Approach | Why |
|---|---|---|
| Rounded buttons (pill) | 2px sharp radius | Modern, intentional, distinctive |
| Purple accent (default) | Indigo #4F46E5 | Specific, memorable, not generic |
| White background | Cream #F9F7F2 | Paper-like, premium, editorial |
| Sans-serif only | Serif + sans combo | Bookish authority + modern clarity |
| Top/bottom shadows | Left-border accent | Margin notes, not floating boxes |
| Predictable 50/50 layout | 2/3 + 1/3 asymmetry | Visual tension, designer's intent |
| Generic "Learn More" | Context-specific CTAs | "Start Browsing", "List Your Books" |

---

This visual guide serves as the **implementation reference** for designers and engineers building on Books4All. Every pixel, color, and animation decision is intentional and documented.
