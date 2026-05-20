# VectorUI

A UI component model rendered entirely in SVG — shapes, not boxes, as the
primary layout container.

📖 **[Developer Guide](./docs/guide.md)** — the reference for building with
VectorUI: the coordinate model, every component, layout, tokens, hooks,
recipes, and known limitations. [SPEC.md](./SPEC.md) is the original design.

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
- **Demo 5** is interactive: HTML controls drive a single composed scene so
  the user can see the layout system respond to inputs in real time (container
  width, child count, distribute strategy, body length, footer count, inspect
  overlay).
- **`VectorUIRoot` `width="auto"`** — opts a scene out of uniform scaling so it
  reflows to the real width (`scale` stays 1) instead of shrinking. Demo 5
  uses it; combined with a `resize: horizontal` wrapper it doubles as the
  demo's container-query mechanic.
- **Unified measurement** — `useMeasuredBounds` (`getBBox`) is the one
  rendered-bounds primitive `Frame.Slot`, `Flow` and `PathFlow` all build on,
  so a layout always clears a child taller than expected.

## Phase 2 — developer-experience refactor

A DX audit of the demo (consumer) code found the friction concentrated in
coordinate-model leaks, a measure/auto-size callback dance, and triplicated
plumbing. Phase 2 addressed it:

- **`Flow`** — the linear-layout primitive (replaces `Stack`): `direction`
  (column/row), `gap`, `padding`, cross-axis `align`. Children are placed by
  their rendered bounds, so `padding` and `align` retire the hand-computed
  `OUTER + PAD` and `-w / 2` arithmetic.
- **`VectorUIRoot height="content"`** — the viewBox sizes itself to the
  rendered content, so a scene needs no `onMeasure`/`onLayout` callback and no
  guessed fallback height.
- **`Pill`** + **`useNaturalTextWidth`** — a label shrink-wrapped in a pill;
  the natural-width hook returns layout units, so consumer code sizing a shape
  to text never touches `scale`. `Button` and the settings tabs are now both
  `Pill`.
- **`useChildBounds`** — the shared child-bounds aggregation `Flow` and
  `PathFlow` build on, on top of `useMeasuredBounds`.

The result: across the five demos, zero `/ scale` in consumer code, zero
guessed fallback heights, zero `onMeasure`/`onLayout` wiring.

## Phase 3 — first-principles components + edit mode

Phase 3 stops treating VectorUI as "an SVG-rendered version of an HTML kit"
and starts using SVG as its own design surface — components that the medium
makes possible, and a direct-manipulation editor that runs on the same
geometry as the live UI.

- **`CurveSlider`** — a continuous-value selector whose track *is* the
  transfer function. Place it on any `Curve` (line, arc, quadratic Bézier,
  polyline) and the curve's shape encodes the function — an audio taper,
  an easing preview, a quarter-arc hour selector. Pointer XY maps to the
  nearest point on the curve via the new `nearestPointOnCurve` /
  `pointAt` Layer-2 exports. Keyboard, focus-as-path, `role="slider"`
  a11y, and reduced-motion all built in.
- **`<DesignSurface>` + `useEditHandle`** — a small protocol for direct
  manipulation. Components declare *which* points are draggable
  (`CurveSlider.editablePoints`, `Frame.onSlotEdit`); a surrounding
  `<DesignSurface>` draws them in an aggregating overlay. The same
  declarations also power a per-component `edit` prop that self-wraps in a
  scoped surface — one declaration, two rendering routes. The runtime UI
  slides a value along the curve; edit mode reshapes the curve. Same
  geometry, two semantics.
- **Demos 7 & 8** are the worked examples — `#/07-curve-slider` (runtime),
  `#/08-design-surface` (edit). See [guide.md §14](./docs/guide.md) for the
  protocol and authoring notes.

Deliberately out of scope this phase: editing arbitrary `<path d="…">`
strings, round-tripping edits to source, multi-select / snap / undo, and an
agent-authorability eval (revisited after more components exist).

## Run

```bash
npm install
npm run dev      # dev server on http://localhost:5181
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
| 2 — layout engine | `src/layout/` | Pure functions + hooks: coordinate scale, pretext text measurement, flow-around, arc-length curves, path morphing, breakpoints, rendered-bounds measurement, flow placement. |
| 3 — components | `src/components/` | `VectorUIRoot`, `Text`, `Frame`, `PathFlow`, `Flow`, `Pill`, `TokenDefs`. |
| tokens | `src/tokens/` | Design tokens — consumed at Layer 3 only. |

Demos live in `src/demos/` (see [its README](src/demos/README.md)), one route
each via a tiny hash router (`src/router.tsx`). Pure layout/shape functions are
unit-tested under `tests/` (`npm test`).

The deferred items in SPEC §16 (Figma pipeline, full WCAG, HTML-overlay inputs,
theming UI, performance) remain out of scope.
