# Task 04 — Shape-as-container card

Author a single VectorUI component called `Eval` (default export, no required
props) that renders the following scene:

A **card whose outline is a non-rectangular shape** — use one of the shape
tokens (`tokens.shapes.blob` or `tokens.shapes.leaf`) as the Frame's outline,
not a plain rectangle. Inside the shape:

1. A **title** ("Field notes") near the top.
2. A **body paragraph** stacked **below the title**, using the slot system's
   "place this slot after that one" relationship (not a hand-computed `y`):

   > A Frame is a shape used as a layout container. Its slots stack, its
   > height grows to fit the content, and the outline is generated last —
   > after the body text has settled — so the shape always wraps snugly
   > around whatever it holds.

3. A small **circular badge** (a filled circle ~24 units across) **anchored to
   the top-right area** of the card, using an anchor slot with a negative x so
   it counts back from the card's right edge.

Requirements:

- The card's **height must auto-size to its content** (`height="auto"`) — no
  hardcoded card height.
- The body slot must be positioned **relative to the title slot** via the slot
  spec's stacking relationship, not a magic `y` number.
- The badge must use an **anchor slot** (not a region slot), pinned toward the
  top-right corner.
- Use design tokens for colors / type / the shape generator.

The scene sits inside a `VectorUIRoot` with `height="content"` and a viewBox
width of 360 layout units. No `/scale` arithmetic.

Output the component module text only — no markdown fences, no commentary.
