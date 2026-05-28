# VectorUI Demos

Each demo is the integration test for one or more primitives. They run on
the dev server (`npm run dev`), one route each via the hash router. The
table below lists them in **navigation order** — the order the home page
shows them, grouped by what they teach (core components → first-principles
input → animation → responsive → composition → editing). The `0N-` prefix
in each route is a stable id, not a position.

| Route | Demo | Proves |
|-------|------|--------|
| `#/01-text-flow` | **1 · Text flow around a shape** | Text flow-around via `WrapText` + `Float`: one path declaration drives BOTH the drawn silhouette and the wrap contour. Variable-width per-line layout against analytical `intrusionAt` / `occupancyAt` profiles. |
| `#/02-card` | **2 · Card — a shape-as-container core component** | `Card` as a reusable core component: shape-as-prop + contour-fit slots; one `Float` doing three jobs (drawn, wrap-around, fill-inside) in `LandscapeCard`. |
| `#/03-radial-menu` | **3 · PathFlow + VectorButton** | Two library cores composed: `PathFlow` (curve as layout) + `VectorButton` (path as button); arc-length distribution, tangent rotation, staggered fan-out. |
| `#/07-curve-slider` | **7 · CurveSlider — the curve is the function** | First-principles input: a value selector whose track *is* the transfer function (volume cusp, hike elevation, full-circle clock). `nearestPointOnCurve` + `pointAt`; pointer + keyboard + reduced-motion. |
| `#/06-procedural-path` | **6 · Procedural path with live reflow** | One closed-form function (or measured row widths) feeding both `ShapeGenerator` and the layout consumer — silhouette and paragraph stay in lockstep, one frame. |
| `#/09-animation` | **9 · Animation — drive a prop over time** | Animation as a render-time concern — five RAF hooks (`useTween`, `useTweenedNumbers`, `useTweenedPoints`, `useTweenedPath`, `useStaggeredReveal`) + shared easings. Three sub-scenes show the same recipe applied to a child transform, a layout input, and a `shape` prop. |
| `#/04-breakpoint-morph` | **4 · Breakpoint shape-morph** | Container-query responsiveness: `useViewportWidth` + `breakpointMorph` blend across a breakpoint band; `morphPath` between same-structure `d` strings; the scene reflows to its container rather than uniformly scaling. |
| `#/05-layout-playground` | **5 · Layout playground** | Every layout primitive composed live, knob-driven: `Frame` shrink-wrap, `Flow` distribute, `PathFlow` distribution along a curve, container queries, dynamic shapes. The whole layout system in one scene. |
| `#/08-design-surface` | **8 · DesignSurface — direct manipulation** | Direct-manipulation edit mode: `useEditHandle` protocol; drags that cascade through the layout (scoop → text rewrap → slot height → Frame auto-size) instead of overriding it. |
| `#/playground` | **▶ Playground** | A live scratchpad (dev only): tabbed instances, each a real file in `src/playground/sketches/`. Both the in-browser editor and Claude Code write the same file; either edit hot-reloads. |

Demo 1 is the headline: a column of body text wrapping a shape's silhouette —
the thing that is impossible in plain HTML/CSS without absurd hacks. Demos 7
and 8 are the Phase 3 additions (first-principles input + direct-manipulation
authoring); Demo 9 is the Phase 3 animation kit.

## Folder convention

Each demo folder separates the **reusable component** from the **demo page**:

- `demo.tsx` — the page: controls, description, the `VectorUIRoot`, and the
  hard-coded arguments. The hash router renders this.
- `<Component>.tsx` — the reusable component (`Card`, `MorphCard`,
  `Playground`, …), parameterized entirely by props. Some demos (e.g.
  Demo 3) compose two library cores directly in `demo.tsx` with no
  in-folder wrapper.
- helpers (`Button.tsx`, `Icon.tsx`, `cornerBlob.ts`, …). Animation hooks
  now live in the library (`src/layout/tween.ts`) — demos consume them.

So `02-card/demo.tsx` imports `02-card/Card.tsx` and passes it arguments — the
component carries no demo-specific hard-coded content. Each demo page's **Code**
tab lists `demo.tsx` first, then the component files.

The Playground is the one exception: it lives in `src/playground/` (not under
`demos/`) because its instances (`sketches/*.tsx`) are real, persistent files a
Claude Code session is meant to edit by path. A dev-only Vite plugin
(`src/vite-playground-plugin.ts`) gives the in-browser editor CRUD over those
files; the page ships no Code tab (it *is* the editor). See
[`docs/playground.md`](../../docs/playground.md) for the full write-up.
