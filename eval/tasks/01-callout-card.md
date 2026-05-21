# Task 01 — Callout card

Author a single VectorUI component called `Eval` (default export, no required
props) that renders the following scene:

A **card-shaped surface** with two parts, top to bottom:

1. A **body paragraph** with a **corner-blob accent** floated to its
   upper-left. The blob is decorative (no text inside it). The paragraph text
   wraps around the blob's silhouette. The paragraph text is:

   > VectorUI's text engine wraps around an arbitrary silhouette, not just a
   > rectangle. The blob to the left isn't a float in the CSS sense — it's a
   > path, and the text follows its real contour. Resize, restyle, or replace
   > the blob and the wrap stays exact.

2. Below the body, a **row of three pill buttons** with labels "Dismiss",
   "Learn more", and "Got it", distributed **`space-between`** across the
   card's content width.

The card must **auto-size to its content** in both width and height — no
hardcoded card height, no hardcoded card width that ignores the content. Use
the public `vectorui` API only.

The card sits inside a `VectorUIRoot` with `height="content"` and a fixed
viewBox width of 480 layout units. Use design tokens (`tokens.color.*`,
`tokens.type.*`, `tokens.space.*`, `tokens.filters.*`) for visual polish. No
`/scale` arithmetic in consumer code. No hand-computed text-width math — use
the library's hooks if you need to size a shape to text.

Output the component module text only — no markdown fences, no commentary.
