# Task 02 — Arc menu

Author a single VectorUI component called `Eval` (default export, no required
props) that renders the following scene:

A **menu of five labeled pills** — "Home", "Search", "Create", "Alerts",
"Profile" — distributed **evenly along a circular arc** that bows downward
(a smile-shaped arc spanning roughly the top half of the viewBox). Each pill
must be **rotated to follow the curve's tangent**, so the pills fan around the
arc like beads on a necklace rather than sitting upright.

Requirements:

- The arc must be a real `Curve` (use the `arc()` primitive — or `quadratic()`
  if you prefer a parabola). Do **not** hand-compute each pill's `(x, y)` with
  `Math.cos` / `Math.sin` and place them manually — the whole point is that the
  layout engine walks the curve for you.
- Distribute the pills with the library's curve-distribution component so they
  are evenly spaced by arc length.
- Each pill follows the tangent (rotates along the curve).
- Use `Pill` for the items and design tokens for color / type.

The scene sits inside a `VectorUIRoot` with a fixed viewBox of 480 × 240
layout units. No `/scale` arithmetic. No hand-rolled angular trigonometry for
placement — reach for the curve primitives and the path-distribution
component.

Output the component module text only — no markdown fences, no commentary.
