# Design System Strategy: Kinetic Editorial

## 1. Overview & Creative North Star

The Creative North Star for this design system is **"The Kinetic Editorial."**

We are moving away from the "SaaS-in-a-box" look. In the high-energy world of fitness, movement is everything. This design system treats the CRM not as a static database, but as a high-end digital magazine that breathes. We achieve this through **Intentional Asymmetry**—where large-scale typography might overlap a container edge—and **Tonal Depth**, using deep charcoal layers rather than rigid lines to organize data. The goal is a "Premium Performance" feel: authoritative, high-contrast, and impeccably polished.

## 2. Colors: Tonal Depth & The "No-Line" Rule

Our palette is rooted in the depth of `surface` (#121416), punctuated by the "Electric Blue" of `primary` (#b7c4ff / #0052ff) and the "Success Green" of `tertiary` (#4ae176).

- **The "No-Line" Rule:** We strictly prohibit 1px solid borders for sectioning. Structural separation must be achieved through background shifts. Place a `surface-container-low` (#1a1c1e) card on a `surface` (#121416) background to create a boundary.

- **Surface Hierarchy & Nesting:** Treat the UI as physical layers.

- **Level 0:** `surface` (The base floor).

- **Level 1:** `surface-container-low` (General sectioning).

- **Level 2:** `surface-container` (Interactive cards).

- **Level 3:** `surface-container-high` (Modals or pop-overs).

- **The "Glass & Gradient" Rule:** For primary actions or hero stats, use a subtle linear gradient transitioning from `primary_container` (#0052ff) to `primary` (#b7c4ff) at a 135-degree angle. For floating navigation or overlays, use `surface_bright` with a 60% opacity and a `20px` backdrop-blur to create a "Frosted Charcoal" glass effect.

## 3. Typography: Authority in Motion

We pair the architectural precision of **Manrope** for displays with the hyper-legibility of **Inter** for data-heavy CRM tasks.

- **Display & Headlines (Manrope):** These are your "Editorial Moments." Use `display-lg` for big motivational numbers (e.g., "Active Members"). Use `headline-sm` for section titles, often set in Semi-Bold to command attention.

- **Body & Labels (Inter):** Inter handles the "Work." Use `body-md` for standard CRM inputs. Use `label-sm` in All Caps with +5% letter spacing for metadata to create a "Technical/Athletic" aesthetic.

- **Hierarchy:** Dramatic scale shifts are encouraged. A `display-sm` stat sitting next to a `label-md` description creates a high-end, asymmetric tension that feels modern.

## 4. Elevation & Depth: Tonal Layering

We reject the heavy, muddy shadows of the early 2010s.

- **The Layering Principle:** Depth is "Stacked," not "Shadowed." By placing a `surface-container-lowest` (#0c0e10) element inside a `surface-container-high` (#282a2c) parent, you create an inset "well" effect—perfect for input fields or data tables.

- **Ambient Shadows:** If an element must float (like a FAB), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color should never be pure black; it should be a deep tint of our charcoal.

- **The "Ghost Border" Fallback:** For accessibility in high-density areas, use a "Ghost Border": `outline-variant` (#434656) at 15% opacity. It should be felt, not seen.

## 5. Components: The Performance Kit

- **Buttons:**

- _Primary:_ `primary_container` background, `on_primary_container` text. Apply `DEFAULT` (0.5rem) rounding.

- _Secondary:_ `surface_container_high` background with a subtle "Electric Blue" `primary` icon.

- **Cards & Lists:** Forbid divider lines. Separate "Client Rows" by alternating between `surface` and `surface-container-low`, or simply use 16px of vertical whitespace.

- **Input Fields:** Use `surface_container_lowest` for the field background. On focus, do not use a border; instead, use a 2px outer glow of `primary` at 30% opacity.

- **Stats Chips:** To represent fitness progress, use `tertiary_container` (#007633) backgrounds with `on_tertiary_container` (#78ff96) text. These should be "Full" (9999px) rounded for a pill shape.

- **Activity Heatmaps:** Use the `tertiary` scale. `tertiary_fixed_dim` for low activity, and `tertiary` for peak performance.

## 6. Do's and Don'ts

- **DO:** Use asymmetrical padding. A wider left margin on a dashboard title creates an editorial, high-end feel.

- **DO:** Use "Success Green" (`tertiary`) sparingly. It is a spotlight for positive momentum, not a general UI color.

- **DON'T:** Use 100% white text on a charcoal background. Use `on_surface_variant` (#c3c5d9) for secondary text to reduce eye strain and look more "expensive."

- **DON'T:** Use sharp 90-degree corners. Everything must feel "Friendly yet Professional," sticking to the `DEFAULT` (0.5rem) to `lg` (1rem) rounding scale.

- **DO:** Embrace "Breathing Room." If you think there is enough whitespace, add 8px more. Premium design requires air.
