# VectorUI — Developer Guide

VectorUI is a React + TypeScript component model that renders UI **entirely in
SVG**. A page is one `<svg>` document; closed paths — not `<div>` boxes — are
the layout containers. This guide is the reference for building UI with it.

> Status: feasibility prototype. The API is small and stable enough to build
> with, but it is not production-hardened. See [Limitations](#13-limitations--rough-edges).

## Contents

1. [The mental model: two coordinate spaces](#1-the-mental-model-two-coordinate-spaces)
2. [Quick start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [`VectorUIRoot`](#4-vectoruiroot)
5. [`Text`](#5-text)
6. [`Frame` — shape as container](#6-frame--shape-as-container)
7. [`Flow` — linear layout](#7-flow--linear-layout)
8. [`PathFlow` — layout along a curve](#8-pathflow--layout-along-a-curve)
9. [`Pill` and the Layer-1 primitives](#9-pill-and-the-layer-1-primitives)
10. [Design tokens](#10-design-tokens)
11. [Hooks & layout utilities](#11-hooks--layout-utilities)
12. [Recipes](#12-recipes)
13. [Limitations & rough edges](#13-limitations--rough-edges)
14. [Build & test](#14-build--test)

---

## 1. The mental model: two coordinate spaces

This is the one concept to internalize. VectorUI works in **two coordinate
spaces at once**:

- **Layout space** — logical units. Positions, sizes, spacing, shapes, and the
  root `viewBox` are all in layout units. When the viewport scales, layout
  space scales with it.
- **Pixel space** — real CSS pixels. **Text size and stroke width** live here:
  they must *not* scale uniformly with the viewport, or body text would shrink
  to nothing on a small screen.

A single number — `scale` (CSS pixels per layout unit) — reconciles them, and
the library applies it for you. **You almost never touch `scale` directly.**
The rules of thumb:

- Props named `x`, `y`, `width`, `height`, `gap`, `padding`, `maxWidth` → **layout units**.
- `font` and `lineHeight` on `<Text>` → **CSS pixels** (so text stays readable).
- Need a label's width in layout units? Use [`useNaturalTextWidth`](#11-hooks--layout-utilities) — it converts internally.

### Sizing modes

`VectorUIRoot` has two modes that decide how a scene responds to its container:

| Goal | Use |
|------|-----|
| The whole scene scales uniformly with its container (a poster, a fixed diagram) | `width={<number>}` |
| The scene keeps text at a constant size and **reflows** instead of shrinking (a settings page, a content surface) | `width="auto"` |
| The scene's height is data-driven | `height="content"` |

With `width="auto"`, `scale` is pinned to 1 — layout units equal pixels — and a
layout adapts by reading [`useViewportWidth()`](#11-hooks--layout-utilities).

---

## 2. Quick start

```bash
npm install
npm run dev      # dev server at http://localhost:5180
```

A minimal scene:

```tsx
import { VectorUIRoot, Text, tokens } from "vectorui";

function Hello() {
  return (
    <VectorUIRoot width={320} height="content">
      <Text {...tokens.type.body} maxWidth={320} x={16} y={16} fill={tokens.color.ink}>
        Hello from an SVG document.
      </Text>
    </VectorUIRoot>
  );
}
```

Every VectorUI tree must be wrapped in a `VectorUIRoot`; it emits the `<svg>`
and provides the coordinate scale.

> Examples in this guide import from `"vectorui"` — the public API barrel
> (`src/index.ts`). Inside this repo the demos use relative paths
> (`../../components/…`); there is no published package yet.

---

## 3. Architecture

Three layers, strictly bottom-up. **Layers 1 and 2 never import tokens.**

| Layer | Path | Role |
|-------|------|------|
| 1 — render primitives | `src/svg/` | Thin SVG wrappers: `Group`, `Path`, `TextLine`. No layout logic. |
| 2 — layout engine | `src/layout/` | Pure functions + hooks: coordinate scale, text measurement, flow placement, arc-length curves, breakpoints, path morphing. |
| 3 — components | `src/components/` | `VectorUIRoot`, `Text`, `Frame`, `Flow`, `PathFlow`, `Pill`, `TokenDefs`. |
| tokens | `src/tokens/` | Design tokens — consumed at Layer 3 only. |

Most apps consume Layer 3 + tokens. Layers 1 and 2 are escape hatches.

---

## 4. `VectorUIRoot`

The root of every VectorUI tree. Emits the `<svg>`, tracks its real pixel width
with a `ResizeObserver`, applies the color tokens as CSS variables, and mounts
the filter `<defs>`.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `width` | `number \| "auto"` | — | viewBox width in layout units, or `"auto"` to track pixel width (pins `scale` to 1). |
| `height` | `number \| "content"` | — | viewBox height in layout units, or `"content"` to fit the rendered content. |
| `style` | `CSSProperties` | — | Applied to the `<svg>`. Use for `maxWidth`, `minWidth`, `background`. |
| …`SVGProps` | | | `role`, `aria-*`, etc. forwarded to the `<svg>`. |

```tsx
<VectorUIRoot width="auto" height="content" style={{ minWidth: 480 }}>
  …
</VectorUIRoot>
```

---

## 5. `Text`

Multi-line SVG text, line-broken by [pretext](https://github.com/chenglou/pretext)
to match the browser's own wrapping. Lives in pixel space, so it stays a
constant size as the viewBox scales.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | `string` | — | Plain text only (no inline markup — see [Limitations](#13-limitations--rough-edges)). |
| `font` | `string` | — | CSS font shorthand in **px**, e.g. `"600 16px Inter"`. |
| `lineHeight` | `number` | — | Line-box height in **CSS px**. |
| `maxWidth` | `number \| "100%"` | — | Wrap width in layout units; `"100%"` resolves to the enclosing slot's width. |
| `x`, `y` | `number` | `0` | Top-left of the text block, layout units. |
| `fill` | `string` | `"currentColor"` | |
| `letterSpacing` | `number` | — | In px. |
| `flowAround` | `FlowAround` | — | Wrap text around a floated shape (see [Recipes](#12-recipes)). |
| `onMeasure` | `(size: { width, height }) => void` | — | Reports the wrapped block size in layout units. |

Spread a `type` token straight in: `<Text {...tokens.type.body} maxWidth="100%">`.

`FlowAround` = `{ intrusionAt, rightIntrusionAt?, gap? }` — each `intrusionAt`
reports, in layout units, how far the shape reaches into a line band from one
edge. Supply `rightIntrusionAt` as well and the text wraps on both sides at
once (e.g. poured through an archway).

---

## 6. `Frame` — shape as container

A `Frame` is a closed path plus **named slots**. Children render into slots via
`<Frame.Slot name="…">`. The path is generated *after* layout, so a
`height="auto"` Frame shrink-wraps its content.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `shape` | `(w, h) => string` | — | Path generator. Use `tokens.shapes.*`. |
| `width` | `number` | — | Layout units. |
| `height` | `number \| "auto"` | — | `"auto"` derives height from the slots. |
| `slots` | `Record<string, SlotSpec>` | — | Named slot definitions (below). |
| `fill`, `stroke`, `strokeWidth` | | | For the shape path. |
| `filter` | `string` | — | e.g. `tokens.filters.softShadow`. |
| `title` | `string` | — | Rendered as a leading `<title>` for screen readers. |
| `padding` | `number` | `0` | Bottom inset when `height="auto"`. |
| `hitPath` | `string` | — | Optional enlarged hit region. |
| `onLayout` | `(size) => void` | — | Reports the resolved Frame size. |

### Slot specs

```ts
// A rectangular region. `y` may stack below another slot; height may fit content.
type RegionSlot = {
  type: "region";
  x: number;
  y: number | { after: string; gap?: number };
  width: number;
  height: number | "fill" | "content";
};

// A point with a 9-way alignment; negative x/y count back from the far edge.
type AnchorSlot = {
  type: "anchor";
  x: number;
  y: number;
  align?: "top-left" | "top-center" | "top-right"
        | "center-left" | "center" | "center-right"
        | "bottom-left" | "bottom-center" | "bottom-right";
};
```

```tsx
<Frame
  shape={tokens.shapes.blob}
  width={320}
  height="auto"
  padding={tokens.space.xl}
  slots={{
    body:    { type: "region", x: 24, y: 24, width: 272, height: "content" },
    actions: { type: "anchor", x: -24, y: -24, align: "bottom-right" },
  }}
  fill={tokens.color.surface}
  filter={tokens.filters.softShadow}
>
  <Frame.Slot name="body"><Text {...tokens.type.body} maxWidth="100%">…</Text></Frame.Slot>
  <Frame.Slot name="actions"><Button>OK</Button></Frame.Slot>
</Frame>
```

A `Text` with `maxWidth="100%"` inside a slot resolves to that slot's width.

> Tip: for a column of content inside a Frame, put **one** region slot
> containing a [`Flow`](#7-flow--linear-layout) rather than many stacked slots.

---

## 7. `Flow` — linear layout

The general linear-layout primitive: stacks children along an axis, placing
each by its **rendered bounds**, so a child larger than expected never collides
with its sibling. `padding` and `align` are first-class.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `direction` | `"column" \| "row"` | `"column"` | Main axis. |
| `gap` | `number` | `0` | Between children, layout units. |
| `padding` | `number \| [number, number]` | `0` | All sides, or `[vertical, horizontal]`. |
| `align` | `"start" \| "center" \| "end"` | `"start"` | Cross-axis alignment. |
| `crossSize` | `number` | widest child | Explicit cross-axis extent. |
| `x`, `y` | `number` | `0` | Top-left, layout units. |
| `onMeasure` | `(size) => void` | — | Reports the flow's resolved size. |

```tsx
<Flow direction="column" gap={tokens.space.md} padding={24}>
  <Text {...tokens.type.title} maxWidth="100%">Title</Text>
  <Text {...tokens.type.body}  maxWidth="100%">Body…</Text>
  <Button>Action</Button>
</Flow>
```

`Flow` is the answer to "stack things"; reach for `Frame` only when you need a
shape *around* the content, and `PathFlow` only for genuinely curved layout.

---

## 8. `PathFlow` — layout along a curve

Distributes children along a `Curve`, optionally rotating each to the tangent.
A straight `line()` curve makes it an ordinary flex row.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `curve` | `Curve` | — | From `arc()`, `line()`, or `quadratic()`. |
| `distribute` | `"even" \| "start" \| "end" \| "spread"` | `"even"` | Spacing strategy. |
| `gap` | `number` | `0` | For `"start"`/`"end"`. |
| `orient` | `"along" \| "upright"` | `"along"` | Rotate to the tangent, or not. |
| `align` | `number` | `0` | Perpendicular offset from the curve. |

```tsx
import { PathFlow, arc } from "vectorui";

const fan = arc({ cx: 200, cy: 300, radius: 160, startAngle: -2.6, endAngle: -0.5 });
<PathFlow curve={fan} distribute="even" orient="along">
  {icons.map((i) => <Icon key={i} name={i} />)}
</PathFlow>
```

Children are placed at their **origin** on the curve point — give them
origin-centered geometry (e.g. `Pill origin="center"`).

---

## 9. `Pill` and the Layer-1 primitives

### `Pill`

A text label shrink-wrapped in a pill shape. Measures the label itself (in
layout units — no `scale` math) and centers it.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | `string` | — | The label. |
| `textStyle` | `TextStyle` | — | A `tokens.type.*` style. |
| `height` | `number` | — | Pill height, layout units. |
| `paddingX` | `number` | `16` | Horizontal padding. |
| `fill`, `textFill` | `string` | accent / accentInk | |
| `origin` | `"top-left" \| "center"` | `"top-left"` | `"center"` for placement on a curve/point. |
| …`SVGProps` | | | `role`, `onClick`, etc. — `Pill` is presentational; wire interaction through these. |

### Layer 1 — `Group`, `Path`, `TextLine`

Thin SVG wrappers, for escape-hatch rendering:

- **`Group`** — a semantic `<g>`.
- **`Path`** — a `<path>`; `decorative` (default `true`) makes it `aria-hidden`.
- **`TextLine`** — one pre-positioned line of `<text>` (the layout engine uses it).

---

## 10. Design tokens

`import { tokens } from "vectorui"` — one object, consumed at Layer 3 only.

| Category | Shape | Examples |
|----------|-------|----------|
| `tokens.color` | semantic CSS-variable refs | `surface`, `ink`, `inkMuted`, `accent`, `line` |
| `tokens.space` | numbers, layout units | `xs:4 … xxxl:48` |
| `tokens.type` | `{ font, lineHeight, letterSpacing? }` | `display`, `title`, `heading`, `body`, `caption`, `label` |
| `tokens.motion` | durations + easings | `duration.base`, `easing.standard`, `reduced` |
| `tokens.shapes` | `(w, h, morph?) => string` | `blob`, `rectRounded`, `sharp`, `leaf`, `pill`, `tabBackdrop` |
| `tokens.filters` | `url(#…)` refs | `softShadow`, `glow`, `etched` |

Spread a type token onto `<Text>`: `<Text {...tokens.type.title}>`. Colors are
CSS custom properties on the root `<svg>`, so theming later means overriding
variables, not editing components.

---

## 11. Hooks & layout utilities

All from `"vectorui"`. Hooks must be used under a `VectorUIRoot`.

| Hook / fn | Returns | Use for |
|-----------|---------|---------|
| `useCoordinateScale()` | `{ scale, viewBoxWidth, viewBoxHeight }` | Low-level; prefer the converters below. |
| `useViewportWidth()` | `number` (real px) | Responsive layout under `width="auto"`. |
| `useBreakpoint(stops?)` | breakpoint name | Discrete responsive branching. |
| `breakpointMorph(width, threshold, band)` | `0…1` | Continuous morph across a breakpoint. |
| `useNaturalTextWidth(text, font)` | `number` (layout units) | Sizing a shape to a label. |
| `useFontsReady()` | `boolean` | Re-measure when the web font loads. |
| `usePrefersReducedMotion()` | `boolean` | Drop animations to instant. |
| `useMeasuredBounds(onBounds)` | a `ref` | Measure one element's rendered `getBBox`. |
| `useChildBounds()` | `{ bounds, Measured }` | Measure N children (the core of `Flow`/`PathFlow`). |
| `useFitToContent()` | `{ ref, size }` | Size a container to its content. |

Curves for `PathFlow`: `arc({cx,cy,radius,startAngle,endAngle})`,
`line({x1,y1,x2,y2})`, `quadratic({p0,control,p1})`. Path morphing:
`morphPath(fromD, toD, t)` (the two paths must share a command structure —
the `tokens.shapes.*` family does).

---

## 12. Recipes

### A button

```tsx
<Pill role="button" tabIndex={0} onClick={onClick}
      textStyle={tokens.type.label} height={34} style={{ cursor: "pointer" }}>
  Save
</Pill>
```

### A self-sizing card

```tsx
<VectorUIRoot width={420} height="content">
  <Flow padding={40} align="center" crossSize={340}>
    <Frame
      shape={tokens.shapes.blob} width={300} height="auto" padding={tokens.space.xl}
      slots={{ body: { type: "region", x: 24, y: 24, width: 252, height: "content" } }}
      fill={tokens.color.surface} filter={tokens.filters.softShadow}
    >
      <Frame.Slot name="body">
        <Flow gap={tokens.space.md}>
          <Text {...tokens.type.title} maxWidth="100%">Card</Text>
          <Text {...tokens.type.body}  maxWidth="100%">Body text…</Text>
        </Flow>
      </Frame.Slot>
    </Frame>
  </Flow>
</VectorUIRoot>
```

`height="content"` + `Flow` means **no `onMeasure` callbacks and no guessed
heights** — the scene sizes itself.

### Centering

`Flow` with `align="center"` and a `crossSize` centers its children — no
`translate(-w/2 …)` arithmetic.

### Responsive reflow

```tsx
<VectorUIRoot width="auto" height="content" style={{ minWidth: 480 }}>
  <ReflowingScene />   {/* reads useViewportWidth() to lay itself out */}
</VectorUIRoot>
```

### Text wrapping a shape

```tsx
// `flowAround.intrusionAt(yTop, yBottom)` reports, in layout units, how far
// the float reaches into each line band. Demo 1's `cornerBlob` helper
// (src/demos/01-text-flow/cornerBlob.ts — not part of the public API)
// returns both the path and a matching intrusionAt; supply your own for
// any shape.
const blob = cornerBlob({ width: 96, height: 104 });
<g>
  <Path d={blob.path} fill={tokens.color.accentSoft} />
  <Text {...tokens.type.body} maxWidth={400}
        flowAround={{ intrusionAt: blob.intrusionAt, gap: 16 }}>
    Text that wraps the blob's silhouette…
  </Text>
</g>
```

### Animation

There is no animation primitive yet. The demos drive animation with plain
React state + `requestAnimationFrame`, gated by `usePrefersReducedMotion()`,
and feed a `0…1` value into a `tokens.shapes.*` generator's `morph` argument or
into `morphPath`.

---

## 13. Limitations & rough edges

Honest list — useful when assessing the API:

- **One-frame settle.** `height="content"`, `Flow`, and `Frame height="auto"`
  measure rendered bounds, so layout settles one frame after first paint.
  `VectorUIRoot` paints a placeholder frame first; there is no flash in
  practice, but layout is not synchronous.
- **`getBBox` ignores filter ink.** Auto-sizing measures geometry, not the
  blur/spread of a `filter` (e.g. a drop shadow). `Flow` reserves its own
  `padding` geometrically, so a shadowed shape inside a padded `Flow` is not
  clipped — but a filtered element placed flush at the edge of a
  `height="content"` scene, with no surrounding padding, can have its shadow
  cut. Keep a little padding around shadowed shapes.
- **`Text` takes a plain string only.** No inline spans, bold runs, or links
  within a paragraph. Mixed formatting means multiple `<Text>` elements.
- **No animation primitive.** No `useTween` / transition component is exported;
  apps roll their own (see [Animation](#12-recipes)).
- **`Frame` slot specs are hand-coded coordinates.** `x`, `y`, `width` are
  literal numbers (`width: containerWidth - 150` and similar). `Flow` removes
  most of this, but anchor/region geometry is still manual.
- **Two responsiveness APIs.** `useCoordinateScale` (raw scale) and
  `useViewportWidth` (px width) coexist; prefer `useViewportWidth` +
  `useNaturalTextWidth` and treat raw `scale` as low-level.
- **`PathFlow` children must be origin-centered** to sit on the curve point.
- **Deferred (SPEC §16):** Figma pipeline, full WCAG/keyboard nav, HTML-overlay
  text inputs (`Frame.HTMLOverlay` slot type is reserved but not implemented),
  RTL, theming UI, SSR, performance work.

---

## 14. Build & test

```bash
npm run dev      # dev server at http://localhost:5180
npm run build    # type-check (tsc) + production build
npm test         # vitest — pure layout/shape functions
```

Demos live at `/#/<demo-id>` and double as integration tests and worked
examples; each demo page has a **Code** tab showing its source. See
[`src/demos/README.md`](../src/demos/README.md).
