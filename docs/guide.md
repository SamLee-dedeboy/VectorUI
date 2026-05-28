# VectorUI — Developer Guide

VectorUI is a React + TypeScript component model that renders UI **entirely in
SVG**. A page is one `<svg>` document; closed paths — not `<div>` boxes — are
the layout containers. This guide is the reference for building UI with it.

> Status: feasibility prototype. The API is small and stable enough to build
> with, but it is not production-hardened. See [Limitations](#16-limitations--rough-edges).

## Contents

1. [The mental model: two coordinate spaces](#1-the-mental-model-two-coordinate-spaces)
2. [Quick start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [`VectorUIRoot`](#4-vectoruiroot)
5. [`Text`](#5-text)
6. [`Frame` — shape as container](#6-frame--shape-as-container)
7. [`Flow` — linear layout](#7-flow--linear-layout)
8. [`PathFlow` — layout along a curve](#8-pathflow--layout-along-a-curve)
9. [`Card` and `LandscapeCard` — shape-as-card](#9-card-and-landscapecard--shape-as-card)
10. [`Pill` and the Layer-1 primitives](#10-pill-and-the-layer-1-primitives)
11. [Design tokens](#11-design-tokens)
12. [Hooks & layout utilities](#12-hooks--layout-utilities)
13. [Animation — drive a prop over time](#13-animation--drive-a-prop-over-time)
14. [`ShapeBundle` — shape-aware text wrap](#14-shapebundle--shape-aware-text-wrap)
15. [Recipes](#15-recipes)
16. [Limitations & rough edges](#16-limitations--rough-edges)
17. [Edit mode (`CurveSlider`, `DesignSurface`)](#17-edit-mode-curveslider-designsurface)
18. [Coordinate model — intrinsic geometry vs placement](#18-coordinate-model--intrinsic-geometry-vs-placement)
19. [Build & test](#19-build--test)

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
- Need a label's width in layout units? Use [`useNaturalTextWidth`](#12-hooks--layout-utilities) — it converts internally.

### Sizing modes

`VectorUIRoot` has two modes that decide how a scene responds to its container:

| Goal | Use |
|------|-----|
| The whole scene scales uniformly with its container (a poster, a fixed diagram) | `width={<number>}` |
| The scene keeps text at a constant size and **reflows** instead of shrinking (a settings page, a content surface) | `width="auto"` |
| The scene's height is data-driven | `height="content"` |

With `width="auto"`, `scale` is pinned to 1 — layout units equal pixels — and a
layout adapts by reading [`useViewportWidth()`](#12-hooks--layout-utilities).
`width` defaults to `"auto"` and `height` to `"content"`, so the minimal
`<VectorUIRoot>` reflows and sizes to its content; reach for `width={<number>}`
only when you want uniform scaling.

---

## 2. Quick start

```bash
npm install
npm run dev      # dev server at http://localhost:5181
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
| 3 — components | `src/components/` | `VectorUIRoot`, `Text`, `Frame`, `Card`, `LandscapeCard`, `Flow`, `PathFlow`, `Pill`, `VectorButton`, `WrapText`, `Float`, `CurveSlider`, `DesignSurface`, `TokenDefs`. |
| tokens | `src/tokens/` | Design tokens — consumed at Layer 3 only. |

Most apps consume Layer 3 + tokens. Layers 1 and 2 are escape hatches.

Cutting through every layer is one discipline that's not enforced by types
but shows up in every code review: **intrinsic geometry stays separable
from viewport placement.** A shape, a curve, a sub-tree's whole layout
should be defined in its own local frame; the SVG-viewBox coordinates
where it ends up sitting belong in ONE outer `<g transform>` (or layout
primitive) at the call site. See [§18 Coordinate model](#18-coordinate-model--intrinsic-geometry-vs-placement)
for the full rule and the patterns.

---

## 4. `VectorUIRoot`

The root of every VectorUI tree. Emits the `<svg>`, tracks its real pixel width
with a `ResizeObserver`, applies the color tokens as CSS variables, and mounts
the filter `<defs>`.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `width` | `number \| "auto"` | `"auto"` | viewBox width in layout units, or `"auto"` to track pixel width (pins `scale` to 1). Defaults to `"auto"`, so an unsized root reflows and wraps at its real boundary; pass a number for uniform scaling. |
| `height` | `number \| "content"` | `"content"` | viewBox height in layout units, or `"content"` to fit the rendered content (the default). |
| `padding` | `number` | `0` | Inner padding in **layout units** (NOT CSS). Wraps the subtree in a `translate(p, p)` group and grows the `height="content"` fit by `2p`. The "framed root" shortcut — no `<Flow padding=…>` wrapper needed for a single centered card. Does NOT center on the cross-axis; for distribution use `<Flow>`. |
| `style` | `CSSProperties` | — | Applied to the `<svg>`. Use for `maxWidth`, `minWidth`, `background`. CSS `padding` on `style` pads the OUTER element box (HTML layout) — not the viewBox content. Use the `padding` prop above for inner padding. |
| …`SVGProps` | | | `role`, `aria-*`, etc. forwarded to the `<svg>`. |

```tsx
<VectorUIRoot width="auto" height="content" style={{ minWidth: 480 }}>
  …
</VectorUIRoot>

// "Framed card" — no Flow needed:
<VectorUIRoot
  padding={56}
  style={{ maxWidth: 520, background: "#f4f3ee" }}
>
  <Card width={520 - 112} … />
</VectorUIRoot>
```

---

## 5. `Text`

Multi-line SVG text, line-broken by [pretext](https://github.com/chenglou/pretext)
to match the browser's own wrapping. Lives in pixel space, so it stays a
constant size as the viewBox scales.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | `string` | — | Plain text only (no inline markup — see [Limitations](#16-limitations--rough-edges)). |
| `font` | `string` | — | CSS font shorthand in **px**, e.g. `"600 16px Inter"`. |
| `lineHeight` | `number` | — | Line-box height in **CSS px**. |
| `maxWidth` | `number \| "100%"` | `"100%"` | Wrap width in layout units. Defaults to `"100%"` — like a block element, text fills its container and wraps. `"100%"` resolves to the enclosing `Flow`'s content box (inside its padding) or `Frame` slot, falling back to the viewBox edge. Pass a number to wrap at a fixed width. |
| `x`, `y` | `number` | `0` | Top-left of the text block, layout units. |
| `fill` | `string` | `"currentColor"` | |
| `letterSpacing` | `number` | — | In px. |
| `sizing` | `"screen" \| "layout"` | `"screen"` | `"layout"` reads `font`/`lineHeight` as layout units so the text scales with the viewBox (for labels inside a graphic). See below. |
| `flowAround` | `FlowAround` | — | Wrap text around a floated shape (see [Recipes](#15-recipes)). |
| `onMeasure` | `(size: { width, height }) => void` | — | Reports the wrapped block size in layout units. |

Spread a `type` token straight in: `<Text {...tokens.type.body} maxWidth="100%">`.

**`sizing` — constant pixels vs scales-with-the-viewBox.** By default text is
`"screen"`: a constant CSS-pixel size no matter the viewBox scale, so body copy
stays readable on a scaling surface (SPEC §5). Set `sizing="layout"` for text
that is *part of a graphic* — a label inside a `Pill`, a chip on a curve — so it
scales with the shapes around it and the graphic moves as one unit. In layout
mode the `font`/`lineHeight`/`letterSpacing` numbers are read as **layout
units**, and there is no px↔layout boundary inside the shape (this is what lets
`Pill` centre its label at any scale with zero `scale` arithmetic). `Pill` opts
into this for you; reach for it directly only when hand-placing graphic text.

`FlowAround` = `{ intrusionAt, rightIntrusionAt?, gap? }` — each `intrusionAt`
reports, in layout units, how far the shape reaches into a line band from one
edge. Supply `rightIntrusionAt` as well and the text wraps on both sides at
once (e.g. poured through an archway).

> For the common case — draw a shape *and* wrap text around it from a single
> path string — reach for [`WrapText`/`Float`](#15-recipes) (§15). Raw
> `flowAround` below stays the low-level escape hatch for analytical or
> hand-tuned intrusions.

---

## 6. `Frame` — shape as container

A `Frame` is a closed path plus **named slots**. Children render into slots via
`<Frame.Slot name="…">`. The path is generated *after* layout, so an
`"auto"` Frame shrink-wraps its content.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `shape` | `ShapeGenerator \| ShapeBundle` | — | Path generator (`(w,h) => string`) or a bundle (`{ path, flowAround? }`). See [§14 ShapeBundle](#14-shapebundle--shape-aware-text-wrap). Use `tokens.shapes.*` for plain generators. |
| `width` | `number \| "auto"` | — | Layout units, or `"auto"` to shrink-wrap to the rightmost slot edge + `padding`. |
| `height` | `number \| "auto"` | — | Layout units, or `"auto"` to shrink-wrap to the lowest slot edge + `padding`. |
| `slots` | `Record<string, SlotSpec>` | — | Named slot definitions (below). |
| `fill`, `stroke`, `strokeWidth` | | | For the shape path. |
| `filter` | `string` | — | e.g. `tokens.filters.softShadow`. |
| `title` | `string` | — | Rendered as a leading `<title>` for screen readers. |
| `padding` | `number` | `0` | Inset added past the lowest/rightmost slot under `"auto"`. |
| `hitPath` | `string` | — | Optional enlarged hit region. |
| `onLayout` | `(size) => void` | — | Reports the resolved Frame size. |

> `width="auto"` and `height="auto"` are independent and combine — a Frame can
> grow in both axes at once to wrap its content. (Distinct from
> `VectorUIRoot`'s `width="auto"`, which is a *coordinate-scale* mode, §[4](#4-vectoruiroot), not a
> shrink-wrap.) Auto-width derives from **numeric-width** region/overlay slots
> only — `"fill"` slots fill into the result, and anchor slots are positioned
> *against* the resolved edge, so neither drives it.

### Slot specs

```ts
// A rectangular region. `y` may stack below another slot; height may fit content.
type RegionSlot = {
  type: "region";
  x?: number;            // defaults to the Frame's `padding`
  y: number | { after: string; gap?: number };
  width?: number | "fill"; // defaults to "fill" — the content box
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

**`x` defaults to the Frame's `padding`** and **`width` defaults to `"fill"`**
(the content box, `resolvedWidth - x - padding`) — so a slot that just sits in
the padded content column needs neither. Under `width="auto"`, `"fill"` slots
are *excluded* from the width derivation (they fill into the result), so one
slot must declare a numeric `width` to anchor the Frame — that number is your
content column; siblings `"fill"` to match it.

```tsx
// An auto-sized card: the body declares the column width (the one number you
// must choose for any paragraph); x defaults to padding, the actions row
// `"fill"`s to match, and the Frame's width derives from the body + padding.
<Frame
  shape={tokens.shapes.blob}
  width="auto"
  height="auto"
  padding={tokens.space.xl}
  slots={{
    body:    { type: "region", y: 0, width: 272, height: "content" }, // x ← padding
    actions: { type: "region", y: { after: "body", gap: tokens.space.md },
               height: "content" },                                   // x, width default
  }}
  fill={tokens.color.surface}
  filter={tokens.filters.softShadow}
>
  <Frame.Slot name="body"><Text {...tokens.type.body} maxWidth="100%">…</Text></Frame.Slot>
  <Frame.Slot name="actions">
    <Flow direction="row" distribute="space-between" mainSize="100%"><Pill …/>…</Flow>
  </Frame.Slot>
</Frame>
```

A `Text` with `maxWidth="100%"` (or a `Flow` with `mainSize="100%"`) inside a
slot resolves to that slot's width.

> Tip: for a column of content inside a Frame, put **one** region slot
> containing a [`Flow`](#7-flow--linear-layout) rather than many stacked slots.
> For card-shaped containers — body + header + actions auto-fitting the
> contour — reach for [`Card`](#9-card-and-landscapecard--shape-as-card)
> directly; it composes Frame's shape-fit slots into a ready-made API.

### Shape-fit slots — content auto-follows the contour

A `"shape-fit"` slot makes the slot's content track the Frame's actual shape
boundary instead of sitting in a hand-coded rectangle. It uses the
[`occupancyFromPath`](#12-hooks--layout-utilities) sampler internally, so it
works for **any** `shape` you pass to the Frame — no per-shape intrusion to
wire.

| Mode | Effect |
|------|--------|
| `"text"` (default) | Slot publishes a per-band `flowAround`; a child `Text` (with no explicit `flowAround`) reflows to fit the shape's interior, hugging dents and curves. |
| `"safe"` | Slot collapses to the largest conservative inset rectangle inside the shape across its vertical band — for rigid widgets (a `Pill`, an image) that can't reflow. |

```ts
type ShapeFitSlot = {
  type: "shape-fit";
  mode?: "text" | "safe";              // default "text"
  x?: number;                          // defaults to padding
  y: number | { after: string; gap? };
  width?: number | "fill";             // defaults to "fill"
  height: number | "fill" | "content";
  /** Override shape to fit inside; defaults to the Frame's own `shape`.
   *  Lets a slot fit inside an inner feature (e.g. a triangle whose title
   *  fills it) different from the Frame's outline. Plain generator only —
   *  the closed-form `flowAround` fast path (§14) is currently scoped to
   *  the Frame-level shape; override-shape slots always sample. */
  shape?: ShapeGenerator;
  padding?: number;                    // inset from the contour
};
```

This is what powers the library's [`Card`](#9-card-and-landscapecard--shape-as-card) — body text wraps the
card's scoop or blob; actions sit in a derived safe rectangle — without the
consumer wiring any intrusion.

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
| `distribute` | `"pack" \| "space-between" \| "space-around"` | `"pack"` | Main-axis distribution (the flexbox names). |
| `mainSize` | `number \| "100%"` | — | Main-axis extent to spread into. **Required** for non-`pack` distribute. `"100%"` fills the enclosing Frame slot's width (rows). |
| `crossSize` | `number \| "100%"` | widest child | Explicit cross-axis extent. `"100%"` fills the slot width (columns). |
| `x`, `y` | `number` | `0` | Top-left, layout units. |
| `onMeasure` | `(size) => void` | — | Reports the flow's resolved size. |

A **column** `Flow` publishes its content width (its cross extent minus its
horizontal `padding`) to each child, the way a `Frame` slot does. So a `Text`
with no `maxWidth` fills that content box and wraps **inside** the padding — no
`maxWidth="100%"` needed, and no overrun of the padded edge. This chains through
nested column Flows and Frame slots. (A **row** shares its width across children,
so it passes the ambient width through unchanged — a single row child can't claim
it all; size row children explicitly or with `mainSize`.)

```tsx
<Flow direction="column" gap={tokens.space.md} padding={24}>
  <Text {...tokens.type.title}>Title</Text>  {/* fills the content box, wraps */}
  <Text {...tokens.type.body}>Body…</Text>
  <Button>Action</Button>
</Flow>

// A row of buttons pushed to the two ends, evenly gapped — give it the
// width to spread into via `mainSize`. (Without `mainSize`, distribute
// silently falls back to `pack`.)
<Flow direction="row" distribute="space-between" mainSize={contentWidth}>
  <Pill …>Dismiss</Pill>
  <Pill …>Learn more</Pill>
  <Pill …>Got it</Pill>
</Flow>

// Inside a Frame slot, let `mainSize="100%"` read the slot's width — no
// content-width arithmetic, the same way Text uses maxWidth="100%". This is
// the idiomatic way to distribute a row across an auto-width card.
<Frame.Slot name="actions">
  <Flow direction="row" distribute="space-between" mainSize="100%">
    <Pill …>Dismiss</Pill><Pill …>Learn more</Pill><Pill …>Got it</Pill>
  </Flow>
</Frame.Slot>
```

> `Flow.distribute` (`pack`/`space-between`/`space-around`) governs the
> *straight-line* main axis. `PathFlow.distribute` (§[8](#8-pathflow--layout-along-a-curve)) is a different
> vocabulary (`even`/`start`/`end`/`spread`) for spacing along a *curve* —
> `spread` there is the curve analogue of `space-between` here.

`Flow` is the answer to "stack things"; reach for `Frame` only when you need a
shape *around* the content, and `PathFlow` only for genuinely curved layout.

---

## 8. `PathFlow` — layout along a curve

Distributes children along a `Curve`, optionally rotating each to the tangent.
A straight `line()` curve makes it an ordinary flex row.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `curve` | `Curve \| CurveFactory` | — | A fixed curve, or a `fitLine`/`fitArc` factory that sizes to content. |
| `distribute` | `"even" \| "start" \| "end" \| "spread"` | `"start"` for a factory, else `"even"` | Spacing strategy. |
| `gap` | `number` | `0` | For `"start"`/`"end"`. |
| `padding` | `number` | `0` | Inset before first / after last item — content-sized curves only. |
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

#### Content-sized curves — don't hand-size the curve to the items

A fixed `Curve` has a fixed length; if the items don't fit, they overlap
(PathFlow warns in dev when they do). Instead of hand-tuning the radius/length
until a row of pills happens to fit, pass a **curve factory** — `fitLine` or
`fitArc` — and PathFlow sizes the curve to the measured content (Σwidths +
gaps + `padding`), the curve analogue of `Frame width="auto"`. A valid spec
then *can't* overlap.

```tsx
import { PathFlow, fitArc, Pill, tokens } from "vectorui";

// Give the arc its centre + start + a free degree of freedom. Here radius is
// fixed and the SWEEP grows to fit the pills (give `sweep` instead to fix the
// angular span and grow the RADIUS). distribute defaults to "start" (packs
// flush); orient="upright" is the safe default for an arc.
const arcFit = fitArc({ cx: 240, cy: 320, startAngle: -2.0, radius: 260 });
<PathFlow curve={arcFit} gap={12} padding={8} orient="upright">
  {labels.map((l) => (
    <Pill key={l} textStyle={tokens.type.label} origin="center">{l}</Pill>
  ))}
</PathFlow>
```

Pair with auto-sized `Pill`s (no hand-coded width/height) and the whole menu is
declared by *content* — no pixel geometry to keep in sync.

---

## 9. `Card` and `LandscapeCard` — shape-as-card

`Card` and `LandscapeCard` are the library's two ready-made card components.
Both are thin compositions over `Frame` (§6) — they give you a single-prop API
for the common "shape-as-card with header, body, and actions" pattern, with
the contour-following text and safe-rectangle button placement already wired
up. Reach for `Frame` directly only when you need a layout outside what these
express.

### `Card` — header, body, actions inside any shape

`Card` takes a `shape` (any `ShapeGenerator` or `ShapeBundle`) and three
optional content props — `title`, `body`, `actions`. It builds three Frame
shape-fit slots internally: `header` and `actions` use *safe* mode (a
conservative inset rectangle, so a fixed-size title or button row always
fits the shape), and `body` uses *text* mode (the paragraph reflows to the
shape's interior contour line by line). The card shrink-wraps its height
to fit the content unless you pin it.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `shape` | `ShapeGenerator \| ShapeBundle` | — | The card's outline. A plain `(w,h) => string`, or a `ShapeBundle` whose `flowAround` lets body text wrap morphing shapes at 60 fps. See [§14 ShapeBundle](#14-shapebundle--shape-aware-text-wrap). |
| `width` | `number \| "auto"` | `340` | Layout units. |
| `height` | `number \| "auto"` | `"auto"` | Shrink-wraps to header + body + actions when `"auto"`. |
| `title` | `string` | — | Header text. Omit for a card with no header band. |
| `body` | `string \| ReactNode` | — | A string is rendered as a contour-fitting `Text`. Pass a `ReactNode` (e.g. a `WrapText` with `Float`s) for custom content; nested plain `Text` still picks up the slot's `flowAround`. |
| `actions` | `ReactNode` | — | Rigid content (typically a button row). Sits in a safe rectangle at the bottom. |
| `padding` | `number` | `space.xl` | Inner padding around the content, layout units. |
| `titleHeight` | `number` | `34` | Header band height. |
| `headerGap` | `number` | `space.sm` | Gap between header and body. |
| `bodyPadding` | `number` | `space.md` | Gap kept between body text and the shape's contour. |
| `actionsGap` | `number` | `space.md` | Gap between body and actions. |
| `surface`, `titleFill`, `bodyFill` | `string` | tokens | Override fills. |
| `titleStyle`, `bodyStyle` | `TextStyle` | `type.title`, `type.body` | Override type tokens. |
| `filter` | `string` | `filters.softShadow` | Any SVG filter ref; pass `""` to drop the shadow. |
| …`SVGProps` | | | `role`, `aria-*`, etc. pass through. `role` defaults to `"region"`. |

```tsx
import { Card, tokens } from "vectorui";

<Card
  shape={(w, h) => tokens.shapes.rectRounded(w, h, 24)}
  title="Settings"
  body="Saved to your local profile. Sync happens on next sign-in."
  actions={<Pill onClick={save}>Save</Pill>}
/>
```

`Card` knows nothing about any specific shape family — pass `tokens.shapes.blob`,
`scoopCard(...).path`, or your own `(w, h) => "M…"`. The Demo 9 Scene C
"morphing scoop card" works because `scoopCard(...)` ships a `ShapeBundle`
with a closed-form `flowAround`; the body text re-wraps the morphing contour
at full frame rate without per-frame contour sampling.

### `LandscapeCard` — card whose body wraps an inner feature shape

A `Card` whose `body` slot holds a `WrapText` around a `<Float>`. The
feature path serves three roles from one declaration: it draws the inner
shape, publishes the wrap contour the body text avoids, AND provides the
interior contour the title text fits inside. No bespoke slot, no per-shape
intrusion code.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `outline` | `ShapeGenerator` | — | The card's outer outline. |
| `feature` | `ShapeGenerator` | — | The inner shape — drawn as a Float, wrapped by the body, fills the title. |
| `featureWidth`, `featureHeight` | `number` | — | Natural size of the feature, layout units. |
| `width` | `number \| "auto"` | `420` | Layout units. |
| `height` | `number \| "auto"` | `"auto"` | Shrink-wraps unless pinned. |
| `padding` | `number` | *Card default* | Inner padding. |
| `flowGap` | `number` | `4` | Gap between body text and the feature contour. |
| `titlePadding` | `number` | `8` | Inset from the feature's slopes for the title text. |
| `title`, `body` | `string` | — | Required. |
| `titleStyle`, `bodyStyle` | `TextStyle` | `type.heading`, `type.body` | |
| `surface`, `featureFill`, `titleFill`, `bodyFill` | `string` | tokens | |
| …`SVGProps` | | | Forwarded to the underlying Card. |

```tsx
import { LandscapeCard, tokens } from "vectorui";

<LandscapeCard
  outline={(w, h) => tokens.shapes.rectRounded(w, h, 20)}
  feature={triangleFeature}
  featureWidth={140}
  featureHeight={140}
  title="Path"
  body="Body text that wraps the triangle's silhouette on both sides…"
/>
```

`LandscapeCard` is the canonical example of a Layer-3 composition that
adds *no* new measurement code — just a useful default arrangement of
the existing primitives. The legacy two-slot Frame implementation is
preserved in `LandscapeCard.legacy.tsx` as a diff reference.

---

## 10. `Pill` and the Layer-1 primitives

### `Pill`

A text label shrink-wrapped in a shape. Measures the label itself and sizes the
shape to it — width always, height too unless you pin it. Renders in **layout
units** (`Text sizing="layout"`), so the whole pill scales with the viewBox as
one unit and the label stays centred at any scale (no `scale` math anywhere).

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | `string` | — | The label. |
| `textStyle` | `TextStyle` | — | A `tokens.type.*` style. |
| `height` | `number` | *derived* | Layout units. Omit to size to the label's cap height + `paddingY`. |
| `paddingX` | `number` | `16` | Horizontal padding. |
| `paddingY` | `number` | `9` | Vertical padding — used only when `height` is omitted. |
| `shape` | `ShapeGenerator` | `tokens.shapes.pill` | Any shape — `tokens.shapes.leaf`, a custom `(w,h)=>d`, etc. |
| `fill`, `textFill` | `string` | accent / accentInk | |
| `origin` | `"top-left" \| "center"` | `"top-left"` | `"center"` for placement on a curve/point. |
| …`SVGProps` | | | `role`, `onClick`, etc. — `Pill` is presentational; wire interaction through these. |

```tsx
// Fully content-driven: no width, no height, any shape.
<Pill textStyle={tokens.type.label}>Tag</Pill>
<Pill textStyle={tokens.type.label} shape={tokens.shapes.leaf}>Leaf chip</Pill>
```

### `VectorButton`

A **path-as-button** core component. The `shape` prop IS the outline, the
filled surface, AND the hit target — one path, no rectangular wrapper.
Children render on top so icons / labels ride the shape. Keyboard
activation (Enter / Space), focus, and hover are wired up here once;
consumers only supply callbacks. Like `Card.shape`, it knows nothing about
any specific shape family: pass a hexagon, a cog, a leaf, a hand-drawn
blob — anything that fits in a `d` string.

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `shape` | `string` | — | Path data — the outline AND the click target. |
| `fill` | `string` | `tokens.color.accent` | Path fill. |
| `stroke`, `strokeWidth`, `fillRule` | | | Forwarded to the path. |
| `children` | `ReactNode` | — | Content rendered on top (icon, text, badges, …). |
| `onClick` | `(event) => void` | — | Fires on click AND on Enter/Space when focused. |
| `onHoverChange` | `(hovered) => void` | — | Called whenever hover starts or ends. |
| `disabled` | `boolean` | `false` | No click, no keyboard activation, no hover state. |
| `cursor` | `CSS cursor` | `"pointer"` | `"default"` when disabled. |
| `role`, `aria-*`, `tabIndex`, … | | | SVG `<g>` props pass through. `role` defaults to `"button"`. |

The component sets `data-hovered` on its `<g>` while hovered, so a
CSS selector or a downstream component can style hover without owning
the state.

```tsx
<VectorButton
  shape={hexagon(27)}                       // any path string
  fill={tokens.color.surface}
  stroke={tokens.color.line}
  role="menuitem"
  aria-label="home"
  onClick={() => …}
>
  <Icon name="home" size={24} />
</VectorButton>
```

### Layer 1 — `Group`, `Path`, `Circle`, `TextLine`

Thin SVG wrappers, for escape-hatch rendering:

- **`Group`** — a semantic `<g>`.
- **`Path`** — a `<path>`; `decorative` (default `true`) makes it `aria-hidden`.
- **`Circle`** — a `<circle>` for discs (badges, dots, avatars); `r`/`cx`/`cy`
  in layout units, `cx`/`cy` default to 0 so it's centred on its own origin
  (handy when a parent places that origin on a point). Don't hand-roll an arc
  path for a plain circle.
- **`TextLine`** — one pre-positioned line of `<text>` (the layout engine uses it).

---

## 11. Design tokens

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

## 12. Hooks & layout utilities

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
| `useTween(target, opts?)` | `number` | RAF-driven scalar tween. See §13 Animation. |
| `useTweenedNumbers(targets, opts?)` | `number[]` | Per-index tween with optional `staggerMs`. |
| `useTweenedPoints(target, opts?)` | `CurvePoint[]` | Tween a vertex array; feed `polyline()` to PathFlow. |
| `useTweenedPath(target, opts?)` | `string` | Tween an SVG `d`; feed `Card`/`Frame`/`Path`. |
| `useStaggeredReveal(count, open, opts?)` | `number[]` | Sugar: `[0,…]` → `[1,…]` with stagger (Demo 3A's reveal). |
| `useMeasuredBounds(onBounds)` | a `ref` | Measure one element's rendered `getBBox`. |
| `useChildBounds()` | `{ bounds, Measured }` | Measure N children (the core of `Flow`/`PathFlow`). |
| `useFitToContent()` | `{ ref, size }` | Size a container to its content. |

`TweenOptions = { durationMs?, easing? }`; `StaggeredTweenOptions` adds
`staggerMs?`. The five named easings — `linear`, `easeIn`, `easeOut`,
`easeInOut` (default), `smoothstep` — are all `Easing = (t: number) => number`
on `[0, 1]` → `[0, 1]`. Pass your own function for anything custom.

Curves for `PathFlow`: `arc({cx,cy,radius,startAngle,endAngle})`,
`line({x1,y1,x2,y2})`, `quadratic({p0,control,p1})`. Path morphing:
`morphPath(fromD, toD, t)` (the two paths must share a command structure —
the `tokens.shapes.*` family does).

---

## 13. Animation — drive a prop over time

VectorUI primitives are pure functions of their props, so animation reduces
to a single recipe: **drive a prop over time, re-render**. The library ships
a small RAF-driven kit at Layer 2; the rest happens for free.

### The five hooks

All hooks honor `prefers-reduced-motion` (the user setting is respected
automatically — they snap to the target instead of tweening).

| Hook | Signature | What it tweens |
|------|-----------|----------------|
| `useTween(target, opts?)` | `(number, { durationMs?, easing? }) => number` | A scalar (scale, opacity, progress…). |
| `useTweenedNumbers(targets, opts?)` | `(number[], …) => number[]` | An array of scalars in lockstep (per-row widths, per-item radii, …). |
| `useTweenedPoints(target, opts?)` | `(CurvePoint[], …) => CurvePoint[]` | A curve's vertices (morph one polyline into another). |
| `useTweenedPath(target, opts?)` | `(string, …) => string` | An SVG `d` string (when you only have the rendered path). |
| `useStaggeredReveal(count, open, opts?)` | `(number, boolean, …) => number[]` | Per-item progress [0,1] with a stagger — fan-outs / cascading reveals. |

`opts` is `{ durationMs?: number; easing?: (t: number) => number; staggerMs?: number }`
(staggerMs only on the array hooks).

```tsx
import { useTween, useTweenedPoints } from "vectorui";

// Animate a scale on hover. The component is a pure function of `scale`.
function Chip() {
  const [hovered, setHovered] = useState(false);
  const scale = useTween(hovered ? 1.18 : 1, { durationMs: 220 });
  return (
    <g
      transform={`scale(${scale})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      …
    </g>
  );
}
```

### Mid-flight retargets

Each tween snapshots its current eased mid-value when the target changes,
so a hover-grow that the cursor leaves mid-flight reverses smoothly from
where it is, not from the start.

### Content-keyed effects

The internal tween effect keys on a **content hash** of the target, not the
reference. This means a caller that builds a fresh array literal each
render (`targets.map(...)` is the canonical case) does **not** restart the
tween every frame. A subtle but common footgun, retired once.

### The "drive parameters, not the rendered path" rule

When you want text to wrap a morphing shape, tween the shape's
**parameters** — not the rendered `d` string. The parametric generator
emits BOTH the path AND a closed-form `flowAround` each frame; Card
consumes the bundle (§14) and skips contour sampling. Demo 9 Scene C is
the worked example. `useTweenedPath` is still in the kit for the (rarer)
case where all you have is a `d` from a non-parametric source.

---

## 14. `ShapeBundle` — shape-aware text wrap

`Card.shape` and `Frame.shape` accept either a plain `ShapeGenerator`
(`(w, h) => string`) or a `ShapeBundle`:

```ts
type ShapeBundle = {
  path: ShapeGenerator;
  flowAround?: (columnLeft: number, columnTop: number) => FlowAround;
};

type ShapeProp = ShapeGenerator | ShapeBundle;
```

**Why this exists.** A `Frame` shape-fit text slot has to know where the
shape's contour intrudes into the text column. Without help, Frame derives
this by SAMPLING the rendered `d` per band — walking the path tokens,
finding x-intercepts. Robust for unknown shapes; expensive when the path
changes every frame.

A parametric shape usually knows its intrusion **in closed form** — there
is an analytical function for "how far does the scoop poke into a column
at y?" When the shape ships that function as `flowAround`, Frame plugs it
straight in and skips sampling. The Demo 9 Scene C morph runs at full 60
fps because of this.

**Producing a bundle.** Pair `path` with a `flowAround` that takes the
text column's top-left in shape coords and returns a `FlowAround`
(`{ intrusionAt?, rightIntrusionAt?, occupancyAt?, gap? }`):

```ts
function myShape(opts: MyOpts): ShapeBundle {
  // …closed-form scoop / curve / blob…
  const path: ShapeGenerator = (w, h) => "M …";
  const flowAround = (cl: number, ct: number): FlowAround => ({
    intrusionAt: (yTop, yBot) => /* how far the contour pokes into the column */,
  });
  return { path, flowAround };
}
```

`scoopCard(...)` is the canonical example — it returns
`{ path, intrusionInto, flowAround }` (the third field is what Card
consumes).

**Consuming a bundle.**

```tsx
// In a Card:
<Card shape={scoopCard({ … })} title="…" body="…" />

// In a Frame (more general):
<Frame shape={scoopCard({ … })} width="auto" height="auto" slots={{ … }}>
  …
</Frame>
```

If the bundle's `flowAround` is missing (`{ path }` only), Frame falls
back to sampling. Same API, slower path. Either works.

**Animating a bundle.**

```tsx
const progress = useTween(deep ? 1 : 0, { durationMs: 480 });
const shape = scoopCard({
  scoopTop:   lerp(SHALLOW.scoopTop,   DEEP.scoopTop,   progress),
  scoopHeight: lerp(SHALLOW.scoopHeight, DEEP.scoopHeight, progress),
  depth:      lerp(SHALLOW.depth,      DEEP.depth,      progress),
});
<Card shape={shape} title="…" body="…" />
```

Each render's `scoopCard(...)` returns a fresh bundle whose `flowAround` is
the closed-form profile for the current params. Text re-wraps the morphing
contour with no per-frame contour sampling.

**Scope.** The fast path applies to the **Frame-level** shape. Override-shape
slots (`shape?` in `ShapeFitSlot`) still go through sampling — the
slot-local intrusion is not yet threaded through. Most cards don't use
override shapes, so this rarely matters.

---

## 15. Recipes

### A button

```tsx
<Pill role="button" tabIndex={0} onClick={onClick}
      textStyle={tokens.type.label} height={34} style={{ cursor: "pointer" }}>
  Save
</Pill>
```

### A self-sizing card (hand-rolled from Frame)

For most cards reach for [`Card`](#9-card-and-landscapecard--shape-as-card) — it
composes the shape-fit slots for you. This Frame-direct version is a
useful reference when you need a non-card layout (a popover, a custom
header + footer rail, an inset region) shrink-wrapped to its content.

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

For an **arbitrary path** — a Figma export, a hand-drawn outline — the high-level
answer is `WrapText` + `Float`. Each `<Float>` is declared once: `WrapText` draws
its path **and** derives the wrap contour from the same `d`, so the drawn shape
and the contour the text hugs can't drift apart. Text flows into **every open
region** of each line — left of, between, and right of the floats — so a float in
the middle has text on both sides, and several floats fill the gaps. The bounding
box is auto-measured (no `width`/`height` to pass), and the wrap width is
inherited from the enclosing column `Flow` / `Frame` slot like any `<Text
maxWidth="100%">` — so keep it in a column context (a *row* `Flow` doesn't publish
a width, and the text would overflow).

```tsx
import { WrapText, Float, tokens } from "vectorui";

<Flow direction="column" padding={28}>
  <WrapText {...tokens.type.body} fill={tokens.color.ink} gap={16}>
    <Float d={BLOB} anchor="center" x="50%" y="50%" fill={tokens.color.accent} />
    Body text that flows around the blob on both sides, hugging its left and
    right silhouettes, and squares back off above and below it…
  </WrapText>
</Flow>
```

**`<WrapText>` props**

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | `ReactNode` | — | `<Float>` elements and the body text, intermixed. Plain strings only — same single-string-paragraph rule as `<Text>`. |
| `font`, `lineHeight`, `letterSpacing` | | — | Type style. Spread a `tokens.type.*` token. |
| `fill` | `string` | — | Text fill. |
| `maxWidth` | `number \| "100%"` | `"100%"` | Wrap width in layout units, or fill the enclosing column's content box. Keep `WrapText` in a column `Flow` / `Frame` slot so `"100%"` resolves. |
| `x`, `y` | `number` | `0` | Top-left of the block (paths + text) in layout units. |
| `gap` | `number` | `0` | Layout units kept between every float and the text. |
| `sizing` | `"screen" \| "layout"` | *Text default* | Forwarded to the inner `<Text>`. |
| `overflowWrap` | `OverflowWrap` | | Forwarded to text wrapping. |
| `onMeasure` | `(TextMeasurement) => void` | — | Fires once the block height settles. |

**`<Float>` props** *(inert outside a `WrapText` — renders nothing on its own)*

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `d` | `string` | — | SVG path data. Drawn as-is AND sampled for the wrap contour. |
| `side` | `"left" \| "right"` | `"left"` | Convenience anchor against a column edge. Explicit `anchor`/`x`/`y` override it. |
| `anchor` | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right" \| "center"` | follows `side` | Which point of the float `x`/`y` position. |
| `x`, `y` | `number \| "<n>%"` | `x` from `side`, `y=0` | Position of the `anchor` in the block. `"50%"` on `x` is half the column width; `"50%"` on `y` is half the *final* block height (resolved by a short fixed-point pass). |
| `width`, `height` | `number` | *auto-measured* | Bounding box override; pass only for pathological paths. |
| `fill`, `stroke`, `strokeWidth`, `filter` | `string` | — | Forwarded to the drawn `<path>`. |
| `children` | `string` | — | Optional text rendered *inside* the float's contour via shape-fit (interior occupancy). The surrounding body still wraps around the float. |
| `textStyle` | `TextStyle` | — | Required when `children` is set. |
| `textFill`, `textPadding` | `string`, `number` | — | Inside-text fill and contour inset. |
| `samples`, `yResolution`, `reachSteps` | `number` | | Forwarded to `intrusionFromPath` / `spanFromPath` for finer sampling. |

**Placement.** The summary in table form: a float is anchored by its
`anchor` point, placed at `(x, y)`. `side` is just sugar for the common
anchors — `side="left"` → top-left at `x=0`, `side="right"` → top-right at
`x="100%"`. The contour is *sampled* from the path; only reach for explicit
`width`/`height` to override the sampled box on a pathological path.

The lower tiers below stay available when you need an analytical intrusion or
hand-tuned profiles — `WrapText` is built on exactly this `flowAround` API.

`flowAround.intrusionAt(yTop, yBottom)` reports, in layout units, how far a
float reaches into each line band. The **shape kit** (public, imported from
`"vectorui"`) returns a path paired with a matching `intrusionAt` — use them
as a unit: `cornerBlob`, `accent`, `archFloat` (two-sided), `scoopCard`,
`triangleFloat`. The coordinate space for `intrusionAt` is the **Text block's
own** — `(0, 0)` is the Text's top-left, so build floats relative to that, not
to the scene.

```tsx
import { cornerBlob } from "vectorui";

const blob = cornerBlob({ width: 96, height: 104 });
<g>
  <Path d={blob.path} fill={tokens.color.accentSoft} />
  <Text {...tokens.type.body} maxWidth={400}
        flowAround={{ intrusionAt: blob.intrusionAt, gap: 16 }}>
    Text that wraps the blob's silhouette…
  </Text>
</g>
```

#### Wrapping a rectangle, and combining floats

For a rectangular float (an image, a callout, a pinned tag), `floatAroundRect`
builds the CSS-`float`-style profile. Its **rect is in the Text block's
coordinate space**, and accepts either `{ x, y, width, height }` or
`{ left, top, right, bottom }`. Compose multiple floats on the same side with
`combineIntrusions`.

```tsx
import { floatAroundRect, combineIntrusions } from "vectorui";

// Two callouts floated left at different heights, in Text-local coords.
const a = floatAroundRect({ x: 0, y: 0,   width: 64,  height: 64 }, 360);
const b = floatAroundRect({ x: 0, y: 140, width: 120, height: 40 }, 360);

<Text {...tokens.type.body} maxWidth={360}
      flowAround={{ intrusionAt: combineIntrusions(a.intrusionAt, b.intrusionAt) }}>
  …text indents past whichever callout it's beside, full width between them…
</Text>
```

`floatAroundRect(rect, columnWidth, opts?)` — `columnWidth` is the second
positional arg (it's what the right-side intrusion is measured from);
`opts.mode` is `"auto" | "left" | "right" | "none"` and `opts.padding` adds
breathing room around the rect. It returns `{ intrusionAt, rightIntrusionAt }`;
a left-leaning rect populates `intrusionAt`, a right-leaning one
`rightIntrusionAt`. To wrap text around a non-analytical / imported SVG path,
`intrusionFromPath(d, side, { width, height })` samples its silhouette.

### Animation

VectorUI has no animation API. Its primitives recompute from props each
render, so **animating reduces to driving a prop over time** and letting
React re-render. The library ships five RAF hooks to turn that pattern into
one line. All honor `usePrefersReducedMotion()` (snap to target, no easing,
no RAF). See Demo 9 for the three flavors side by side.

**Flavor A — animate a child's transform** (`useTween`, scalar):

```tsx
const [hovered, setHovered] = useState(false);
const scale = useTween(hovered ? 1.18 : 1);
return (
  <g transform={`scale(${scale})`}>
    <VectorButton shape={hex} onHoverChange={setHovered}>…</VectorButton>
  </g>
);
```

**Flavor B — animate a layout input** (`useTweenedPoints`, vertex array):

```tsx
// Both endpoints pre-resampled to the same vertex count.
const targetPts = bent ? ARC_POINTS : LINE_POINTS;
const points = useTweenedPoints(targetPts, { durationMs: 480 });
const curve = useMemo(() => polyline({ points }), [points]);
return <PathFlow curve={curve}>{children}</PathFlow>;
```

**Flavor C — animate a primitive's `shape`** (`useTweenedPath`, `d` string):

```tsx
// Both ds must tokenize identically — use the same generator on each side.
const d = useTweenedPath(deep ? DEEP_D : SHALLOW_D, { durationMs: 420 });
return <Card shape={() => d} width={CARD_W} height={CARD_H} body="…" />;
```

`useTweenedNumbers(targets, { staggerMs })` covers per-index arrays;
`useStaggeredReveal(count, open)` is sugar over it for Demo-3-style reveals.

**Easings.** All hooks accept an `easing` prop on `TweenOptions`. The five
named ones — `linear`, `easeIn`, `easeOut`, `easeInOut` (default),
`smoothstep` — are plain `(t: number) => number` functions; pass any
function you like. `tokens.motion.duration.*` provide the standard
durations for Layer-3 callers.

**When NOT to reach for these hooks.** For *viewport-driven* shape morphs
(the breakpoint case in Demo 4), use `breakpointMorph(width, threshold,
band)` + `morphPath(from, to, t)` — the viewport is the clock, no RAF
needed. For one-shot interpolation outside a render loop, `morphPath` and
`lerpPoints` work as pure functions.

---

## 16. Limitations & rough edges

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
- **Edit mode v1 is parameterised-only.** `DesignSurface` and the
  `useEditHandle` protocol expose draggable control points for components
  that opt in (`CurveSlider.editablePoints`, `Frame.onSlotEdit`). Editing an
  *arbitrary* user-supplied SVG path string is out of scope — the consumer
  rebuilds curves/shapes from their spec on each drag.
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

## 17. Edit mode (`CurveSlider`, `DesignSurface`)

Phase 3 added a small protocol for turning any VectorUI scene into a direct-
manipulation editor — drag a point in the running UI and the prop that
produced it updates. The runtime and the editor are the *same* component;
only the surrounding context decides whether handles draw.

### The two parts

- **`useEditHandle({ id, point, onDrag, axis?, label? })`** (Layer 2). A
  component (or its caller) declares an editable point: where the handle
  lives in layout units and what to do when it moves.
- **`<DesignSurface>`** (Layer 3). Wraps a subtree; any descendant that
  registers a handle gets a draggable visual in the surface's overlay.

Components that participate also accept an `edit` prop as sugar — it
self-wraps the component in a `<DesignSurface>` so a single instance can go
into edit mode without putting the whole scene there.

### `CurveSlider` — value selector whose track *is* the function

```tsx
import { CurveSlider, quadratic, type CurvePoint } from "vectorui";

const [spec, setSpec] = useState({
  p0: { x: 0, y: 100 },
  control: { x: 140, y: 100 },
  p1: { x: 300, y: 0 },
});
const [t, setT] = useState(0.4);
const curve = useMemo(() => quadratic(spec), [spec]);

<CurveSlider
  curve={curve}
  value={t}
  onChange={setT}
  label="Easing progress"
  // Optional: declare which points are editable. Stays inert unless inside
  // a <DesignSurface> or with `edit` set on this component.
  editablePoints={[
    { id: "p0",      point: spec.p0,      onDrag: (p) => setSpec((s) => ({ ...s, p0: p })) },
    { id: "control", point: spec.control, onDrag: (p) => setSpec((s) => ({ ...s, control: p })) },
    { id: "p1",      point: spec.p1,      onDrag: (p) => setSpec((s) => ({ ...s, p1: p })) },
  ]}
  edit  // or wrap a parent in <DesignSurface>
/>
```

Interactions:

- **Pointer** (mouse, pen, touch): press anywhere on the track or thumb; the
  pointer is mapped to the nearest point on the curve via
  `nearestPointOnCurve`. Pointer capture keeps drag alive past the bounds.
- **Keyboard**: arrow keys step `value` by `step` (default `0.05`),
  `Home`/`End` jump to `0`/`1`. Focus rendered as a path, not a CSS outline
  (so it respects the SVG transform).
- **A11y**: `role="slider"` with `aria-valuemin/max/now`, `aria-valuetext`
  from `formatValue`.

### `Frame` — slot anchors as edit handles

```tsx
<Frame
  shape={(w, h) => tokens.shapes.rectRounded(w, h)}
  width={320}
  height={150}
  slots={{
    title: { type: "region", x: slots.title.x, y: slots.title.y, width: 260, height: 28 },
    body:  { type: "region", x: slots.body.x,  y: slots.body.y,  width: 260, height: 60 },
  }}
  onSlotEdit={(name, next) =>
    setSlots((cur) => ({ ...cur, [name]: next }))
  }
  edit
>
  …
</Frame>
```

Passing `onSlotEdit` makes each slot's origin a draggable handle. The
consumer owns the SlotSpec map and decides how each `(x, y)` reconciles
with it — Frame doesn't try to write back into specs that use `{ after }`
or negative anchor coordinates.

### Authoring a new editable component

1. Decide which parameters are points in layout space — control points,
   anchors, gap markers, anything geometric.
2. Inside the component, for each editable parameter, call
   `useEditHandle({ id, point, onDrag })`. Keep IDs stable across renders.
3. Don't render the handle yourself — that's `DesignSurface`'s job. Your
   component only declares the data.
4. Optionally accept an `edit` prop and self-wrap in `<DesignSurface>` for
   the single-component sugar.

Handles render with a small focus halo and respect the pointer-capture
flow. Constraint is via `axis: "x" | "y" | "free"` (default `"free"`); the
rendering layer pins the orthogonal coordinate.

### Out of scope (Phase 3)

- Editing arbitrary `<path d="…">` strings — only parameterised curves and
  built-in shapes.
- Round-tripping edit-mode changes back to source code — Edit mode mutates
  in-memory props; "copy code" is a follow-up.
- Snap, grid, multi-select, undo — none of these in v1.

For the protocol internals (registry semantics, authoring a new editable
component), see [`edit-mode.md`](./edit-mode.md).

---

## 18. Coordinate model — intrinsic geometry vs placement

VectorUI uses two related but distinct coordinate splits. §1 covered the
first: **layout units vs CSS pixels** — `scale` reconciles them. This
section is about the second: **a shape's own local frame vs the
viewBox where it ends up sitting.**

The rule is simple, and Frame already enforces it for shapes:

> A shape generator, a curve, a sub-tree's geometry should be defined in
> its OWN local frame, anchored at a natural origin (top-left of its
> bbox, the center of an arc, the midpoint of a wave). The viewBox-
> relative placement happens in ONE outer wrapper at the call site —
> usually a `<g transform="translate(…)">` or a Frame slot.

### Why it matters

If the shape carries its placement, you can't swap shapes without
re-doing the placement math, and the geometry never composes. Demo 3 had
three curve variants — sine, square, straight — all defined with
`yMid: HEIGHT_B / 2`. When the viewBox auto-shrunk to fit the straight
line (which has no amplitude), `yMid` ended up near the bottom of the
viewBox instead of its middle, and the curve appeared to move when the
user swapped variants. The fix wasn't to clamp the viewBox; it was to
define each curve at local `y = 0` and place the whole layer with one
`<g transform="translate(MARGIN_X, HEIGHT_B/2)">` outside. Swap curves →
the centerline doesn't move.

### The pattern, in code

```tsx
// 1. INTRINSIC: shape/curve defined at the local origin, no viewBox refs.
const curve = arc({ cx: 0, cy: 0, radius: R, startAngle, endAngle });

// 2. PLACEMENT: one outer wrapper does the SVG-frame translate.
<VectorUIRoot width={W} height={H}>
  <g transform={`translate(${HUB_X} ${HUB_Y})`}>
    <path d={curve.toPathData()} />
    <PathFlow curve={curve}>{children}</PathFlow>
    {/* anything else that shares the curve's frame */}
  </g>
</VectorUIRoot>
```

### Frame is already the canonical example

`<Frame shape={…}>` already works exactly this way: the `ShapeGenerator`
is called with `(w, h)` and produces a path at `(0, 0)..(w, h)`; Frame
wraps it in a translate that sits the shape inside whichever Flow / slot
asked for it. Reuse that mental model when authoring curves or shapes
of your own.

### When you must use absolute coordinates

You sometimes do — Card slots are absolute relative to the Frame, ticks
on a clock face are absolute relative to the dial. The rule isn't "no
absolute coords ever"; it's "no MIXED-frame coords inside one
definition." A clock's hour ticks at absolute `(r·cos a, r·sin a)` are
fine — they're absolute IN THE DIAL'S LOCAL FRAME (origin at the dial
center). The dial then gets placed once via `<g transform="translate(CX,
CY)">`. Demo 7C is the worked example.

### Interaction (pointer events)

`CurveSlider` (and any future interactive primitive on a curve) uses
`getScreenCTM` on its own root group to invert pointer events back into
its local frame. Wrapping it in a `<g transform>` placement just works —
the cursor and the curve stay in lockstep through any ancestor
transform. (`src/components/CurveSlider.tsx` line 116 if you need to
verify.)

### Two coordinate splits, summarized

| Split | What changes | Reconciler |
|-------|--------------|------------|
| Layout units vs CSS pixels (§1) | The visual scale of the surface | `useCoordinateScale().scale`, applied by the library |
| Local frame vs viewBox (§18) | Where a shape sits in the SVG | A `<g transform>` (or Frame slot) at the call site |

They're orthogonal. Both apply at once.

---

## 19. Build & test

```bash
npm run dev      # dev server at http://localhost:5181
npm run build    # type-check (tsc) + production build
npm test         # vitest — pure layout/shape functions
```

Demos live at `/#/<demo-id>` and double as integration tests and worked
examples; each demo page has a **Code** tab showing its source. See
[`src/demos/README.md`](../src/demos/README.md).

For a live scratchpad — edit a real component file in the browser (or have
Claude Code edit it) and watch it hot-reload — open `/#/playground`. See
[`playground.md`](./playground.md).
