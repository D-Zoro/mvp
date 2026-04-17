# Design System: The Ethereal Archive

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves beyond the transactional nature of a standard bookstore to create an editorial, high-end experience. Our Creative North Star is **"The Digital Curator."** 

We reject the rigid, "boxed-in" layout of traditional e-commerce. Instead, we embrace **Clean Glassmorphism**: a world of diffused light, layered transparency, and breathing room. By utilizing intentional asymmetry—such as overlapping book jackets on frosted surfaces and dramatic typography scales—we create an experience that feels like browsing a premium gallery rather than a database. The UI should feel like it is floating over a soft, luminous environment, guiding the reader through a curated literary journey.

---

## 2. Colors & Surface Logic
The palette is rooted in a sophisticated transition from clinical neutrals to a vibrant, "Electric Violet" pulse.

### The "No-Line" Rule
Traditional 1px solid borders for sectioning are strictly prohibited. We define boundaries through **Tonal Transitions**. A section transition is achieved by moving from `surface` (#f8f9fa) to `surface_container_low` (#f3f4f5). Physicality is suggested by depth, not by lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers:
*   **Base Layer:** `surface` (#f8f9fa).
*   **Secondary Content Areas:** `surface_container_low`.
*   **Interactive Cards:** `surface_container_lowest` (#ffffff) with 80% opacity to allow the `primary` gradients to bleed through softly.

### The Glass & Gradient Rule
To achieve the "signature" look, use Glassmorphism for floating elements (Navigation bars, Quick-view modals, and Filters). 
*   **Glass Recipe:** `surface_container_lowest` at 20% opacity + `backdrop-blur: 20px`.
*   **Signature Textures:** For Hero sections and primary CTAs, use a linear gradient: `primary` (#630ed4) to `primary_container` (#7c3aed) at a 135-degree angle. This adds "soul" and prevents the flat-ui fatigue common in lower-end builds.

---

## 3. Typography: The Editorial Voice
We use a dual-sans-serif approach to balance modern authority with high-readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for book titles in hero sections to create an authoritative, editorial impact.
*   **Body & Labels (Inter):** The workhorse. Inter provides exceptional legibility at small scales. Use `body-md` (0.875rem) for descriptions to ensure the interface feels "light" and airy.
*   **Hierarchy Note:** Always maintain a high contrast between `headline-lg` and `body-sm`. This scale disparity is what transforms a "website" into a "digital experience."

---

## 4. Elevation & Depth
Depth in this system is organic, mimicking natural light diffusion through frosted glass.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a "soft lift" without a single drop shadow.
*   **Ambient Shadows:** For floating elements like the "Shopping Cart" drawer, use a custom shadow: `0 20px 40px rgba(115, 46, 228, 0.06)`. Note the tint—we use a 6% opacity of our `surface_tint` rather than pure grey to keep the shadows "alive."
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use `outline_variant` (#ccc3d8) at **20% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** Linear gradient (`primary` to `primary_container`), `xl` (1.5rem) roundedness. No shadow, but a subtle white `inner-glow` (1px top-border white/20).
*   **Secondary:** Glass effect (`surface_container_lowest` 20% opacity) with a 1px "Ghost Border."

### Status Badges (The "Luminous" System)
Instead of flat color blocks, badges use a desaturated background with high-contrast text:
*   **PAID/DELIVERED:** Background: `on_primary_container` (10% opacity), Text: `primary`.
*   **PENDING:** Background: `tertiary_fixed` (20% opacity), Text: `tertiary`.
*   **CANCELLED/REFUNDED:** Background: `error_container` (20% opacity), Text: `error`.

### Cards & Lists
*   **The Grid:** Forbid divider lines. Use `spacing-6` (2rem) of white space to separate list items. 
*   **Book Cards:** Use `xl` rounded corners. The book cover should slightly "overlap" the top edge of the frosted glass card to break the grid's rigidity.

### Input Fields
*   **Style:** `surface_container_low` background, no border, `md` (0.75rem) roundedness. On focus, transition background to `surface_container_lowest` and add a 1px `primary` ghost border.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Whitespace:** Use `spacing-12` and `spacing-16` for section margins. The brand is "Modern Professional"; it needs room to breathe.
*   **Use Subtle Motion:** Glass elements should have a slight "lift" (Y-axis translation) on hover to reinforce the floating metaphor.
*   **Color as Accent:** Reserve `primary` (#630ed4) for meaningful interactions. The background should remain a neutral sanctuary.

### Don't:
*   **Don't use pure black:** Use `on_surface` (#191c1d) for text. Pure black (#000) kills the "glass" illusion.
*   **Don't use hard shadows:** If the shadow looks like a shadow, it's too dark. It should feel like a "glow" or a "soft occlusion."
*   **Don't use sharp corners:** Even "small" roundedness should be at least `sm` (0.25rem). This is a tactile, soft system.

## Named Colors
- background: #f8f9fa
- primary: #630ed4
- primary_container: #7c3aed
- surface: #f8f9fa
- surface_container_low: #f3f4f5
- surface_container_lowest: #ffffff
