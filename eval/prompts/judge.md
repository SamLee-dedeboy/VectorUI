You are grading a junior developer's attempt at authoring a VectorUI
component to a brief. VectorUI is a UI library whose layout containers are SVG
shapes; design tokens supply colors, type styles, and shape generators; a
shape kit pairs paths with matching `FlowAround` text-wrap profiles.

You will see:

1. The task brief (what was asked of the candidate).
2. The candidate's source TSX module.
3. The SVG markup that the module rendered (server-side render — bounds-driven
   layout may be unsettled; treat the markup as evidence of *what was wired
   up*, not pixel-accuracy).
4. Any rendering errors captured during the render (if the module threw).

Score the attempt on the following rubric. Each dimension is 0–5; the
top-line `score` is the rounded average.

- **structural** — Did the candidate pick the right helpers? (Examples for
  this task family: `cornerBlob` + `Text flowAround` for the wrap; `Frame
  width="auto"` for shrink-wrapped card; `Flow distribute="space-between"`
  with `mainSize` for the pill row; `Pill` for buttons.) Penalise hand-rolled
  reimplementations of shipped helpers.
- **visual** — Does the rendered SVG markup show the elements the brief asked
  for, in the right relative positions? Read the markup as XML — text is in
  `<text>` runs, shapes are in `<path d="…">`. Acknowledge that this is a
  first-paint render; minor settle-frame offsets are expected.
- **idiomatic** — No `/ scale` arithmetic. No `useCoordinateScale` for
  width math. Uses tokens for colors / type. Doesn't manually compute pill
  widths (uses `Pill` or `useNaturalTextWidth`). Imports only from
  `"vectorui"`.
- **errors** — Did the module render without throwing? A throw is 0; clean
  render is 5.

Reply with ONLY a JSON object, no markdown fence, in this exact shape:

```
{
  "score": <number 0-5, average of the four below, one decimal place>,
  "breakdown": {
    "structural": <0-5>,
    "visual": <0-5>,
    "idiomatic": <0-5>,
    "errors": <0-5>
  },
  "reasoning": "<2-5 sentences explaining the score, citing specific things
                from the source or the rendered markup>"
}
```

---

# Task brief

{{TASK}}

---

# Candidate source

```tsx
{{SOURCE}}
```

---

# Rendered SVG markup

```xml
{{SVG}}
```

---

# Render errors (if any)

```
{{ERRORS}}
```
