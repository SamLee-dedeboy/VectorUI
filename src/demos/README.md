# VectorUI Demos

Each demo is the integration test for one or more primitives, in order of
increasing ambition (SPEC §11). They run on the dev server (`npm run dev`),
one route each via the hash router.

| Route | Demo | Proves |
|-------|------|--------|
| `#/01-text-flow` | **1 · Text flow around a shape** | pretext flow-around; variable-width per-line layout. |
| `#/02-card` | **2 · Non-rectangular card** | `Frame`, the slot system, path-as-container, shrink-wrap. |
| `#/03-radial-menu` | **3 · Radial menu** | `PathFlow`, arc-length distribution, tangent rotation. |
| `#/04-breakpoint-morph` | **4 · Breakpoint shape-morph** | Breakpoint system, path morphing, ResizeObserver wiring. |
| `#/05-layout-playground` | **5 · Layout playground** | Every primitive composed live; container queries; Frame shrink-wrap; PathFlow distribute strategies; dynamic Flow. |
| `#/06-procedural-path` | **6 · Procedural path with live reflow** | One closed-form function feeding both `ShapeGenerator` and `Text`'s `intrusionAt` — slider input morphs the silhouette and reflows the paragraph on one frame. |
| `#/07-curve-slider` | **7 · CurveSlider** | First-principles components — a value selector whose track *is* the function (volume cusp, hike elevation, full-circle clock). |
| `#/08-design-surface` | **8 · DesignSurface** | Direct-manipulation edit mode — `useEditHandle` protocol; drags that cascade through the layout (scoop → text rewrap → slot height → Frame auto-size). |
| `#/09-animation` | **9 · Animation — drive a prop over time** | Animation as a render-time concern — five RAF hooks (`useTween`, `useTweenedNumbers`, `useTweenedPoints`, `useTweenedPath`, `useStaggeredReveal`) + shared easings. Three sub-scenes show the same recipe applied to a child transform, a layout input, and a `shape` prop. |
| `#/playground` | **▶ Playground** | A live scratchpad (dev only): edit the real `src/playground/Sketch.tsx` on the left, see it render on the right. Both the in-browser editor and Claude Code write the same file; either edit hot-reloads. |

Demo 1 is the headline: a column of body text wrapping a shape's silhouette —
the thing that is impossible in plain HTML/CSS without absurd hacks.
Demos 7 and 8 are the Phase 3 additions and the most current entry points.

## Folder convention

Each demo folder separates the **reusable component** from the **demo page**:

- `demo.tsx` — the page: controls, description, the `VectorUIRoot`, and the
  hard-coded arguments. The hash router renders this.
- `<Component>.tsx` — the reusable component (`Card`, `RadialMenu`,
  `MorphCard`, `Playground`, …), parameterized entirely by props.
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
