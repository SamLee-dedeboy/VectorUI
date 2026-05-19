# VectorUI

A UI component model rendered entirely in SVG — shapes, not boxes, as the
primary layout container. See [SPEC.md](./SPEC.md) for the full design.

## Status — Phase 1 (feasibility prototype) complete

Phase 1 set out to prove the four hard problems and let a human see, with their
own eyes, whether SVG-first UI feels meaningfully different. **It does, and the
prototype stands:** all ten SPEC §13 steps are done, both SPEC §14 risk gates
were passed, and all five §11 demos are live.

- [x] **Steps 1–3** — Project setup, `VectorUIRoot` + `useCoordinateScale`,
      the `Text` primitive (pretext-driven multi-line SVG text).
- [x] **Risk gate** — Text fidelity vs. HTML `<p>`: prose and vertical metrics
      match exactly; the only divergences are a sub-pixel boundary flip and a
      deliberate long-token wrap policy.
- [x] **Step 4** — Demo 1: text flowing around a floated blob's silhouette.
- [x] **Steps 5–6** — `Frame` (slots, auto-height, path-as-container) + Demo 2.
- [x] **Risk gate** — Frame API. Anchor slots originally couldn't size an
      auto-height Frame; the slot model was redesigned with stacked slots
      (`y: { after }`) — that limitation is now fixed.
- [x] **Step 7** — `PathFlow` + Demo 3: a radial menu; a line curve makes the
      same primitive a flex row.
- [x] **Step 8** — path morphing + breakpoint hooks + Demo 4: a card that
      morphs blob↔rectangle as the viewport crosses 600px.
- [x] **Step 9** — design tokens (color, space, type, motion, shapes, filters);
      all demos refactored to consume them; Demo 5, the composed settings page.
- [x] **Step 10** — accessibility pass: ARIA passthrough on every primitive,
      decorative shapes `aria-hidden` by default, `prefers-reduced-motion`
      honored, `Frame.HTMLOverlay` slot type reserved, `hitPath` hook added.

### Post-spec refinements

- **Demo 3** animates between the arc and the line — the curve is a quadratic
  Bézier whose control points are tweened, so items slide and rotate smoothly.
- **Demo 5** is interactive: tabs switch content, toggles flip with an
  animated knob, value rows cycle.
- **`VectorUIRoot` `width="auto"`** — opts a scene out of uniform scaling so it
  reflows to the real width (`scale` stays 1) instead of shrinking. Demo 5 uses
  it; this is what stops text colliding at narrow widths.
- **`Stack` + unified measurement** — a vertical-flow primitive that places
  children by their *rendered* bounds (`getBBox` via `useMeasuredBounds`), the
  one mechanism `Frame.Slot` and `PathFlow` also use. Demo 5's page is a single
  `Stack`, so the row list always clears the body's illustration even when that
  shape is taller than the text it wraps.

## Run

```bash
npm install
npm run dev      # dev server on http://localhost:5180
npm run build    # type-check + production build
npm test         # vitest (layout/measurement pure functions)
```

Open the dev server and pick a demo. Each demo page has a **Demo / Code**
tab — "Code" shows the exact source that produced the demo (imported verbatim
via Vite `?raw`, highlighted), so the running result and the code that made it
sit side by side. The **Text fidelity — risk gate** demo is the step-3
verification: it renders the same paragraph as a native HTML `<p>` and as a
VectorUI `<Text>` at an identical width and font, side by side and as an
overlay.

## Architecture

Three layers (SPEC §4), strictly bottom-up — Layer 1 and 2 never import tokens:

| Layer | Path | Role |
|------|------|------|
| 1 — render primitives | `src/svg/` | Thin SVG wrappers: `Group`, `Path`, `TextLine`. |
| 2 — layout engine | `src/layout/` | Pure functions + hooks: coordinate scale, pretext text measurement, flow-around, arc-length curves, path morphing, breakpoints, rendered-bounds measurement. |
| 3 — components | `src/components/` | `VectorUIRoot`, `Text`, `Frame`, `PathFlow`, `Stack`, `TokenDefs`. |
| tokens | `src/tokens/` | Design tokens — consumed at Layer 3 only. |

Demos live in `src/demos/` (see [its README](src/demos/README.md)), one route
each via a tiny hash router (`src/router.tsx`). Pure layout/shape functions are
unit-tested under `tests/` (`npm test`).

## Next phase

Phase 1 proved the model is feasible. The next phase assesses **developer
experience** — what it actually feels like to build UI with these primitives —
and looks for improvements: API ergonomics, the slot/stack composition story,
escape hatches, and where the two-coordinate model still leaks. The deferred
items in SPEC §16 (Figma pipeline, full WCAG, HTML-overlay inputs, theming UI,
performance) remain out of scope until that assessment is done.
