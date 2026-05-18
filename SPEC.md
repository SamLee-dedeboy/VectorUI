# VectorUI — Prototype Implementation Spec

## 1. Project Goal

VectorUI is a feasibility prototype for a UI component model rendered entirely (or near-entirely) in SVG, with the explicit aim of escaping the rectilinear visual language of mainstream UI libraries (shadcn, Material, etc.) and exploring what becomes possible when shapes — not boxes — are the primary layout container.

The deliverable of this phase is **not** a production component library. It is a working prototype that proves out the four hard problems and lets us see, with our own eyes, whether SVG-first UI feels meaningfully different and worth pursuing further.

## 2. Scope

### In scope for this phase

- Core rendering primitives: `Frame` (shape-as-container with slots), `PathFlow` (children along a path), `Text` (pretext-powered multi-line SVG text).
- A two-coordinate-space layout engine (logical layout units + real CSS pixels for text/stroke).
- A small but representative set of design tokens, including SVG-native categories (shape language, filter presets, motion).
- A breakpoint system based on shape-morph, not just size thresholds.
- Architectural hooks for accessibility (role/aria attributes, hit-region as path, future overlay slot for HTML form controls) — but no full ARIA/keyboard implementation in this phase.
- Five demos (Section 11) that exercise the primitives end-to-end.

### Out of scope (explicit non-goals)

- Figma plugin / design-tool pipeline. Revisit only after the prototype works.
- Full WCAG AA conformance. We want the architecture to *not block* future accessibility work, but we are not implementing keyboard nav, full ARIA, focus management, forced-colors-mode handling, or assistive-tech compatibility testing now.
- Text input components (`<input>`, `<textarea>` equivalents). These require HTML overlays and are deferred.
- Production performance work (memoization passes, render budgeting, SSR). Make it correct first, fast later.
- Theming UI, dark-mode toggle, RTL. Tokens should be structured so these are *possible*, but no implementation.
- A docs site. README + Storybook-style demo pages are sufficient.

## 3. Tech Stack

Working assumptions — Claude Code may revisit if there's strong reason to:

- **Language:** TypeScript. Forced by pretext (TS-only) and good for the API surface we're designing.
- **Framework:** React. Best ecosystem fit for component-model prototyping; pretext's API maps cleanly into hooks.
- **Build:** Vite. Fast dev loop, good defaults.
- **Text engine:** `@chenglou/pretext` (https://github.com/chenglou/pretext). Use `prepareWithSegments` + `walkLineRanges` / `layoutNextLineRange` paths — they give per-line cursors and widths needed for shrink-wrap and flow-around-shape.
- **Constraint solver (optional, only if needed):** Kiwi.js (Cassowary). Don't add until a real use case demands it.
- **Demos:** A simple multi-page dev server (could be Vite's default, with one route per demo). No Storybook setup required.
- **Tests:** Vitest for the layout/measurement pure functions. Visual demos are the integration test.

## 4. Architecture Overview

Three layers, bottom to top:

**Layer 1 — Render primitives (`/src/svg`)**. Thin wrappers over SVG elements that emit clean output: `<Group>`, `<Path>`, `<TextLine>`, `<Filter>`. No layout logic.

**Layer 2 — Layout engine (`/src/layout`)**. Pure functions and React hooks. Given a shape and children, compute slot rectangles. Given a path and children, compute positions along the path. Given a text node and a max width, run pretext and emit line geometry. No SVG output — this layer returns layout data.

**Layer 3 — Components (`/src/components`)**. `Frame`, `PathFlow`, `Text`, plus a small set of demo-app components (`Card`, `Button`, `RadialMenu`, etc.) composed from the primitives. This is where tokens are consumed.

A separate **tokens module (`/src/tokens`)** is read by Layer 3 only.

## 5. Coordinate Model

Two coordinate systems coexist, and the distinction is load-bearing:

- **Layout space** — logical units, used for positioning components, defining shapes, and expressing spacing. The root SVG's `viewBox` is in layout space. When the viewport scales, layout space scales with it.
- **Pixel space** — real CSS pixels, used for text rendering and stroke widths. Text size and stroke weight should NOT scale uniformly with the viewport (otherwise body text shrinks on mobile, which is wrong).

The Text primitive lives in pixel space. The layout engine reconciles: when a Frame asks for its body slot's width, it gets layout units; when Text inside that slot asks pretext for line breaks, the layout engine converts the slot's width from layout units to pixels using the current viewport scale, runs pretext in pixels, then converts the resulting height back to layout units to advance the layout cursor.

This conversion happens in one place (a `useCoordinateScale()` hook backed by a ResizeObserver on the root SVG). Components never compute it themselves.

## 6. Primitives

### 6.1 `Frame` — shape-as-container with slots

A Frame is a closed path plus a set of named slots. Slots are regions or anchor points defined relative to the path. Children render into named slots.

Sketch:

```tsx
<Frame
  shape={shapes.card}               // path generator: (w, h) => SVGPathData
  width={320}
  height={"auto"}                   // height derived from slot contents
  slots={{
    header:  { type: "region", x: 16, y: 12, width: 288, height: 32 },
    body:    { type: "region", x: 16, y: 52, width: 288, height: "fill" },
    actions: { type: "anchor", x: 304, y: -16, align: "bottom-right" },
  }}
  fill={tokens.color.surface}
  filter={filters.softShadow}
  role="region"
  aria-labelledby="card-title-1"
>
  <Frame.Slot name="header">
    <Text id="card-title-1">Hello</Text>
  </Frame.Slot>
  <Frame.Slot name="body">
    <Text>Body content that wraps inside the slot.</Text>
  </Frame.Slot>
  <Frame.Slot name="actions">
    <Button>OK</Button>
  </Frame.Slot>
</Frame>
```

Implementation notes for Claude Code:

- A region slot is a rectangle (start simple; arbitrary subpaths can come later).
- An anchor slot is an (x, y) point with an alignment direction.
- `height="auto"` means the Frame's height is determined by the sum of its `"fill"`-or-content slots. This is where pretext closes the loop — body text asks for its height given the slot's width, the Frame uses that to determine its own height, and the path generator re-runs with the final (w, h) to produce the actual path.
- The path is generated *after* layout, not before. The path generator is a function `(w, h) => string`.
- ARIA attributes pass through to the outer `<g>` element.

### 6.2 `PathFlow` — distribute children along a path

```tsx
<PathFlow
  path={arcPath(120)}               // any SVG path string
  distribute="even"                 // "even" | "start" | "end" | "spread"
  gap={8}                           // gap in layout units (only for "start"/"end")
  align="center"                    // perpendicular to path
  orient="along"                    // "along" | "upright"
>
  <Icon name="home" />
  <Icon name="search" />
  <Icon name="profile" />
</PathFlow>
```

The engine measures each child's natural width, walks the path, and emits transforms that place each child at the right arc-length offset, optionally rotated to match the path tangent. A straight horizontal path with `distribute="start"` and `gap=8` reduces to a flex row — by design, flex is a degenerate case.

### 6.3 `Text` — pretext-powered multi-line SVG text

```tsx
<Text
  font="16px Inter"
  lineHeight={20}                   // CSS px
  maxWidth={"100%"}                 // resolves to slot width
  flowAround={floatedShapePath}     // optional; per-line width comes from shape
>
  Some long text that wraps and can flow around an irregular shape.
</Text>
```

Implementation:

- Internally calls `prepareWithSegments` once per (text, font) tuple. Cache the prepared handle.
- For fixed-width: call `walkLineRanges` or `layoutWithLines`. Emit one `<text>` element per line at the correct `(x, y)`.
- For `flowAround`: per-line max width is `slotWidth - shapeWidthAtThisY(y)`. Loop `layoutNextLineRange` and ask the shape for each line's available width.
- Returned height bubbles up so the parent Frame can size itself.

### 6.4 Optional: anchor constraints

Defer until Frame + PathFlow demonstrably can't express something. If needed, expose a `<Constrain>` primitive that takes a list of anchor relationships (`{ from, to, offset }`) and solves with Kiwi.js. **Do not build this preemptively.**

## 7. Layout Engine

Layout is a depth-first pass over the React tree, executed via context + hooks:

1. Root `<VectorUIRoot>` provides the viewport scale (from ResizeObserver) and a layout-units `viewBox`.
2. Each `Frame` measures its slots, asks children to measure themselves into those slots, then computes its own height. The path generator runs with final (w, h).
3. Text measures via pretext in pixel space and reports back in layout units.
4. PathFlow measures children's natural widths, walks the path, emits transforms.

Use a two-pass model if needed (measure pass + place pass), similar to React Native's Yoga. Cache aggressively — measurement is the hot path on resize.

Render output is a single SVG document. Avoid nested `<svg>` elements except where they buy specific functionality (e.g., independent `viewBox` for a self-contained widget).

## 8. Responsiveness

Two mechanisms, used together:

**Mechanism A — viewBox scaling.** The root SVG's `viewBox` is set in layout units; the SVG element's CSS width is `100%`. Everything scales together by default. This handles the "the whole thing got bigger or smaller" case for free.

**Mechanism B — breakpoint shape-morph.** Shape generators take a breakpoint argument. The `card` shape might generate a wide rounded rect at `lg`, a taller more squared one at `sm`. The Frame interpolates between path strings when crossing a breakpoint, using a path-morph utility (`flubber` library, or hand-written for matched-vertex-count paths). Breakpoints are evaluated against the root SVG's real-pixel width via ResizeObserver, so this is implicitly container-queried.

```ts
const cardShape = (w: number, h: number, bp: Breakpoint) =>
  bp === "sm" ? sharpRect(w, h, 4) : blob(w, h, 24);
```

Text size does **not** scale with viewBox — the pixel-space rule from Section 5 handles this.

## 9. Design Tokens

`/src/tokens/index.ts` exports a single `tokens` object. Categories:

**Standard** (port from any modern design system):
- `color` — semantic color names (`surface`, `surface.muted`, `text.primary`, `accent`, etc.) Map to CSS custom properties so theming is possible later.
- `space` — numeric scale in layout units (4, 8, 12, 16, 24, 32, 48).
- `type` — named text styles, each with `font`, `lineHeight`, `letterSpacing` in CSS px.
- `radius` — corner radii in layout units (where applicable to rectangular shapes).
- `motion` — durations and easings, plus a `reducedMotion` variant honored when `prefers-reduced-motion: reduce`.

**SVG-native** (the interesting ones):
- `shapes` — a map of named path generators. `(w: number, h: number, opts?) => string`. Includes `rectRounded`, `blob`, `pill`, `tabBackdrop`, etc. This is the "shape language" of the design system.
- `filters` — named SVG `<filter>` specs (as JSX or as data). Include `softShadow`, `glow`, `etched`. Rendered once into a `<defs>` block at the root and referenced by id.
- `corners` — named corner styles that pluggable rectangular shapes can use (`rounded`, `scooped`, `beveled`, `organic`). Optional, second priority.

Tokens are consumed at Layer 3 only. Layer 1 and Layer 2 must not import tokens.

## 10. Accessibility — Architectural Hooks Only

Per the user's direction: do not implement keyboard nav, focus management, or full ARIA. Do ensure the architecture does not block these later. Concretely:

- Every primitive accepts and forwards `role`, `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-hidden`, `tabIndex`, and standard React event handlers (`onKeyDown`, `onFocus`, `onBlur`) to its outermost SVG element.
- Frame supports a `title` prop that renders an SVG `<title>` child as the first element of its group (screen readers announce this).
- Decorative shapes (backgrounds, dividers, ornamental paths) default to `aria-hidden="true"`. Make this the explicit default in the relevant primitives so screen readers don't enumerate them.
- Reserve a `Frame.HTMLOverlay` slot type in the slot API — not implemented in this phase, but defined so the future text-input story slots in cleanly. The contract: an HTML-overlay slot accepts arbitrary React children, mounts them in a `<foreignObject>`, and the Frame sizes the foreignObject from the slot region.
- Hit regions follow the rendered path by default (no extra invisible boxes). Components that want a larger hit area can pass a `hitPath` prop.
- Honor `prefers-reduced-motion` in the motion tokens — any default transitions should drop to instant when the user prefers reduced motion. This is cheap to do right now and expensive to retrofit.

These are the floor. Anything more (live regions, focus rings as path, full keyboard wiring) is deferred.

## 11. Demos

Five demos, each on its own route, in order of increasing ambition. Each demo is the integration test for one or more primitives.

**Demo 1 — Text flow around a shape.** A column of body text with a floated blob in the upper-left corner; the text wraps around the blob's silhouette. Proves: pretext integration, variable-width line layout, flow-around capability. This is the demo that's *impossible in pure HTML/CSS without absurd hacks*, so it doubles as the project's headline screenshot.

**Demo 2 — Non-rectangular card.** A blob-shaped card with header / body / actions slots. Body text shrink-wraps the card's height. Card has a soft shadow filter. Hover state morphs the blob shape slightly. Proves: `Frame`, slot system, path-as-container.

**Demo 3 — Radial menu.** Six icons distributed evenly along an arc, with a center hub. Items rotate to face outward. Proves: `PathFlow`, arc-length distribution, tangent rotation.

**Demo 4 — Breakpoint shape-morph.** A card that, when the viewport shrinks below 600px wide, smoothly morphs from a blob into a sharper rounded rectangle. Resize the window to see the animation. Proves: breakpoint system, path-morph, ResizeObserver wiring.

**Demo 5 — Composed "settings" page.** A small settings-style screen using all primitives: a header (PathFlow of tabs along a curve), a list of non-rectangular rows (Frames), a body text block (Text with flow-around for an illustration). No real interactivity required. Proves: the primitives compose into something that looks like a real product UI.

A README in `/demos` lists all five with short descriptions.

## 12. Repository Layout (Suggested)

```
VectorUI/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── SPEC.md                    (this file)
├── src/
│   ├── svg/                   Layer 1: render primitives
│   │   ├── Group.tsx
│   │   ├── Path.tsx
│   │   ├── TextLine.tsx
│   │   └── Filter.tsx
│   ├── layout/                Layer 2: pure layout
│   │   ├── coordinateScale.ts
│   │   ├── measureText.ts     (pretext wrapper)
│   │   ├── measureFrame.ts
│   │   ├── walkPath.ts        (arc-length math for PathFlow)
│   │   └── morphPath.ts       (breakpoint interpolation)
│   ├── components/            Layer 3: components
│   │   ├── Frame.tsx
│   │   ├── PathFlow.tsx
│   │   ├── Text.tsx
│   │   └── VectorUIRoot.tsx
│   ├── tokens/
│   │   ├── color.ts
│   │   ├── space.ts
│   │   ├── type.ts
│   │   ├── motion.ts
│   │   ├── shapes.ts
│   │   ├── filters.ts
│   │   └── index.ts
│   └── index.ts
├── demos/
│   ├── 01-text-flow-around-shape/
│   ├── 02-non-rectangular-card/
│   ├── 03-radial-menu/
│   ├── 04-breakpoint-morph/
│   ├── 05-settings-page/
│   └── README.md
└── tests/
    ├── measureText.test.ts
    ├── walkPath.test.ts
    └── morphPath.test.ts
```

## 13. Implementation Order

Suggested sequencing. Each step should be runnable before moving to the next.

1. Project setup (Vite + TS + React) and one trivial SVG component on screen.
2. `VectorUIRoot` + `useCoordinateScale` hook. Resize the window and confirm scale updates.
3. `Text` primitive with pretext. Render a multi-line paragraph at fixed width. Compare line breaks against the equivalent HTML `<p>` visually. **This is the first risk gate** — if text rendering looks subtly off, surface that immediately before building on top.
4. Demo 1 (text flow around a shape) — proves Text fully.
5. `Frame` with rectangular shapes and region slots only. No path generators yet.
6. Add path generators and the blob shape. Build Demo 2.
7. `PathFlow`. Build Demo 3.
8. Path morphing utility + breakpoint hooks. Build Demo 4.
9. Tokens module. Refactor existing demos to consume tokens. Build Demo 5.
10. Pass over all demos to verify `prefers-reduced-motion`, decorative-element `aria-hidden`, ARIA prop passthrough on every primitive.

## 14. Risk Gates (Stop and Surface)

These are the points at which Claude Code should pause and report back rather than push through:

- **After step 3 (Text):** Does pretext-rendered SVG text match the visual fidelity of an HTML `<p>` closely enough to be acceptable? If line breaks differ noticeably from the browser's native wrapping, or if rendering looks off (kerning, baseline, vertical metrics), report concrete examples before continuing.
- **After Demo 2:** Does the Frame API feel awkward to use in practice? If composing a card requires unexpected boilerplate or escape hatches, surface that.
- **Before adding the constraint solver:** Only justify by pointing to a specific layout that Frame + PathFlow demonstrably cannot express.
- **Anywhere a feature needs HTML overlay to work:** Stop and confirm rather than building the HTML-overlay slot opportunistically. This is the deferred work.

## 15. Open Questions for Claude Code to Surface

Don't guess at these — flag during implementation.

- The exact React version and React-Server-Components posture (default: latest stable React, client-only, no RSC).
- Whether to ship the prototype as ESM-only or also CJS (default: ESM-only; this is a prototype).
- Whether to use CSS-in-JS, plain CSS variables, or no styling system for tokens (default: plain CSS variables on the root SVG, mapped from the tokens module).
- Whether shape path generators should produce a single `<path d="...">` string or a `<path>` element JSX (default: string; keeps generators pure and easier to morph).
- Whether `Text` should reuse pretext's `clearCache()` lifecycle anywhere (default: rely on built-in caching; revisit only if memory or font-cycling becomes an issue).

## 16. Deferred (Tracked for Future Phases)

For visibility, not for action now:

- Figma plugin / import pipeline.
- Full WCAG AA pass: keyboard nav, focus management, focus-ring-as-path, ARIA roles beyond what passthrough enables.
- Forced-colors-mode (Windows High Contrast) handling.
- Text input components via HTML overlay in `<foreignObject>`.
- RTL, theming UI, dark mode toggle.
- Performance: virtualization, render budgeting, SSR support.
- Browser/AT compatibility matrix testing.

---

**Bottom line for Claude Code:** the goal is a prototype that lets a human look at five demos and say "this feels like a genuinely different kind of UI." Prefer simple, correct, observable code over clever abstractions. Stop and ask whenever a decision feels load-bearing.
