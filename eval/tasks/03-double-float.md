# Task 03 — Text wrapping around two floats

Author a single VectorUI component called `Eval` (default export, no required
props) that renders the following scene:

A **single column of body text** that wraps around **two rectangular callouts
floated on its LEFT edge at different vertical positions**:

- The first callout is near the top of the column (a small square, roughly
  64 × 64 layout units).
- The second callout is lower down (a wider, shorter rectangle, roughly
  120 × 40 layout units), positioned so there is a band of full-width text
  between the two.

The body text must indent past **whichever callout it is currently beside**,
and run at full column width in the gap between them and below the lower one.
The callouts are decorative rectangles (a filled `Path` or `rect` is fine);
the point of the task is the **text wrap**, not the callout art.

Requirements:

- Both callouts intrude from the **same side** (the left), so a single
  `flowAround.intrusionAt` must account for **both** of them. Use the library
  helper that builds a float-around-a-rectangle profile, and the library
  helper that **combines** multiple intrusion profiles into one — do not write
  your own band-sampling loop or your own `Math.max` over two hand-rolled
  intrusion functions.
- The text column is ~360 layout units wide.
- Use `tokens.type.body` for the text and tokens for color.

The scene sits inside a `VectorUIRoot` with `height="content"` and a viewBox
width of 400 layout units. No `/scale` arithmetic. No hand-computed
text-width math.

Output the component module text only — no markdown fences, no commentary.
