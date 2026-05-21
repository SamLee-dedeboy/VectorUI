You are authoring a single React + TypeScript component using VectorUI, a UI
component library whose layout containers are SVG shapes, not HTML boxes.

Your job: write ONE TSX module that default-exports a component named `Eval`
with no required props. The component should fulfil the task brief that
follows.

Hard rules:

- Import only from `"vectorui"` — the public API barrel. Do not import from
  deeper paths.
- Use design tokens (`tokens.color.*`, `tokens.type.*`, `tokens.space.*`,
  `tokens.shapes.*`, `tokens.filters.*`) wherever a token exists. Don't
  hardcode colors / font strings if a token covers them.
- Never divide by `scale` in consumer code. The library handles the two
  coordinate spaces; you work in layout units everywhere except `font` /
  `lineHeight` (CSS pixels).
- Prefer composing the library's existing helpers over hand-rolling new
  primitives. The shape kit (`cornerBlob`, `archFloat`, `scoopCard`,
  `triangleFloat`, `accent`, `makeShape`, etc.) returns paths paired with
  matching `FlowAround` profiles — use them as a unit.
- Use `Flow` for linear stacking and rows; `Frame` only when you need a shape
  *around* the content. A `Frame` with `width="auto"` shrink-wraps width;
  `height="auto"` shrink-wraps height; both can be used together.
- Output the module SOURCE ONLY. No markdown fences, no preamble, no trailing
  prose. Begin with the first `import` line.
- The module must `export default function Eval()` (or `export default Eval`
  via a named function). The component takes no props.

---

# VectorUI documentation (reference — read carefully)

## docs/guide.md

{{GUIDE}}

## src/index.ts — full public API barrel

{{INDEX}}

## CLAUDE.md — project orientation

{{CLAUDE}}

---

# Task brief

{{TASK}}
