# VectorUI Demos

Each demo is the integration test for one or more primitives, in order of
increasing ambition (SPEC §11). They run on the dev server (`npm run dev`),
one route each via the hash router.

| Route | Demo | Proves |
|-------|------|--------|
| `#/smoke` | **0 · Root & coordinate scale** | `VectorUIRoot`, `useCoordinateScale`, ResizeObserver (impl. steps 1–2). |
| `#/text-fidelity` | **Text fidelity — risk gate** | The `Text` primitive vs. the browser's line breaker (SPEC §14 gate). |
| `#/01-text-flow` | **1 · Text flow around a shape** | pretext flow-around; variable-width per-line layout. |
| `#/02-card` | **2 · Non-rectangular card** | `Frame`, the slot system, path-as-container, shrink-wrap. |
| `#/03-radial-menu` | **3 · Radial menu** | `PathFlow`, arc-length distribution, tangent rotation. |
| `#/04-breakpoint-morph` | **4 · Breakpoint shape-morph** | Breakpoint system, path morphing, ResizeObserver wiring. |
| `#/05-settings` | **5 · Composed settings page** | Every primitive composed; design tokens. |

Demo 1 is the headline: a column of body text wrapping a shape's silhouette —
the thing that is impossible in plain HTML/CSS without absurd hacks.
