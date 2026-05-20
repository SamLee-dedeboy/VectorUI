# VectorUI — agent orientation

VectorUI is a React + TypeScript UI component library, rendered **entirely in
SVG** (shapes, not boxes, as layout containers). It is a feasibility prototype.

## Start here

**Read [`docs/guide.md`](docs/guide.md) before working with the components** —
it is the developer guide: the coordinate model, every component's props,
layout composition, tokens, hooks, recipes, and known limitations.

Other docs: [`README.md`](README.md) (project status), [`SPEC.md`](SPEC.md)
(the original Phase-1 spec — historical), [`src/demos/README.md`](src/demos/README.md).

## The one concept to know

VectorUI works in **two coordinate spaces**: layout units (positions, sizes,
spacing, the viewBox) and CSS pixels (text size, stroke width). A `scale`
reconciles them and the library applies it — consumer code should not divide by
`scale`. See guide §1.

## Layout of the code

| Path | What |
|------|------|
| `src/svg/` | Layer 1 — render primitives (`Group`, `Path`, `TextLine`). |
| `src/layout/` | Layer 2 — pure layout functions + hooks. Never imports tokens. |
| `src/components/` | Layer 3 — `VectorUIRoot`, `Text`, `Frame`, `Flow`, `PathFlow`, `Pill`. |
| `src/tokens/` | Design tokens — consumed at Layer 3 only. |
| `src/demos/` | Five demos (the de-facto consumer code) + verification pages. |
| `tests/` | Vitest — pure layout/shape functions only. |
| `src/index.ts` | Public API barrel. |

## Commands

```bash
npm run dev      # dev server at http://localhost:5181
npm run build    # tsc + production build
npm test         # vitest
```

## Constraints

- **Layers 1 and 2 must not import tokens.** Tokens are consumed at Layer 3 only.
- The two-coordinate model (layout units vs pixels) is load-bearing — seal its
  leaks behind ergonomic APIs; do not remove it.
- SPEC §16 items (Figma pipeline, full WCAG, HTML-overlay inputs, theming UI,
  performance) are deferred and out of scope.
- After changes, run `tsc`, `vitest`, and `npm run build`; verify demos in the
  browser (each demo page has a Code tab for before/after comparison).
