# Edit mode — the direct-manipulation protocol

Phase 3 added a small protocol that lets any VectorUI component expose
draggable points in layout space. The runtime UI and the editor are the
*same* component — only the surrounding context decides whether handles
draw. This page documents the protocol; see
[`guide.md` §14](./guide.md#14-edit-mode-curveslider-designsurface) for the
consumer-facing recipes.

## The two parts

### `useEditHandle({ id, point, onDrag, axis?, label? })` — Layer 2

```ts
import { useEditHandle, type EditHandle } from "vectorui";

useEditHandle({
  id: "control",                    // stable across renders
  point: spec.control,              // layout units
  onDrag: (next) => setSpec((s) => ({ ...s, control: next })),
  axis: "free",                     // "x" | "y" | "free", default "free"
  label: "Control point",           // optional, screen-readers
});
```

What it does:

1. Registers a ref to the latest `EditHandle` on mount; unregisters on
   unmount (or on `id` change).
2. Refreshes the ref's `.current` on every render, so the surface always
   reads the current `point` and `onDrag` without forcing the caller to
   memoise either.
3. Returns `{ active }` so a component can branch on edit-mode without
   rendering handles itself.

What it does *not* do:

- It does not render anything. Handles are drawn by the surrounding
  `DesignSurface`.

### `<DesignSurface>` — Layer 3

Wraps a subtree, owns a registry, and renders a handle overlay above its
children:

```tsx
<DesignSurface>
  <SomeComponentThatRegistersHandles />
</DesignSurface>
```

Any descendant call to `useEditHandle` shows up as a draggable visual in
the surface's overlay layer. Multiple components share one surface, so a
"design tool" mode lights up all editable points at once.

For single-component editing, prefer the per-component `edit` prop where
the component supports it — by convention, `edit` self-wraps the component
in a scoped `<DesignSurface>`, surfacing only that component's handles.

## Coordinate model

Handle `point`s are in **layout units**, the same space as
`VectorUIRoot`'s viewBox. The visual handle's drag math reconciles screen
coordinates with layout coordinates via the SVG's `getScreenCTM().inverse()`
— so handles drag accurately whether the scene is scaled, zoomed, or sized
with `width="auto"`.

## Registry semantics

`createEditRegistry()` (also exported, used by tests and custom surfaces):

- Keyed by handle `id`, stores a ref to the latest `EditHandle`.
- Bumps a version on register/unregister, and on each `ping()` call
  (`useEditHandle` calls `ping` in a post-render effect so the surface
  re-renders with the latest data).
- `snapshot()` returns a referentially-stable array between version bumps
  (required by `useSyncExternalStore`).
- A stale `unregister()` cleanup is a no-op if a remount has already
  re-registered the same id with a new ref — guards against the
  effect-cleanup ordering that React StrictMode exercises.

## Authoring an editable component

1. Identify which parameters are points in layout space — control points,
   anchors, gap markers, any geometry the consumer might want to drag.
2. For each, call `useEditHandle({ id, point, onDrag })`. Use a stable
   id; the consumer's `onDrag` decides how to update the underlying spec.
3. Don't render the handle yourself.
4. Optionally accept an `edit` prop; when set, wrap the component's
   subtree in `<DesignSurface>`. Pattern:

   ```tsx
   export function MyComp({ edit, ...rest }) {
     const inner = <MyCompInner {...rest} />;
     return edit ? <DesignSurface>{inner}</DesignSurface> : inner;
   }
   ```

5. If your component has a list of editable points whose length varies,
   render each as a tiny `RegisterHandle` subcomponent so each
   `useEditHandle` call sits in a stable hook scope. See
   [`CurveSlider.tsx`](../src/components/CurveSlider.tsx) and
   [`Frame.tsx`](../src/components/Frame.tsx) for the pattern.

## Out of scope (Phase 3)

- Editing arbitrary `<path d="…">` strings — only parameterised curves and
  built-in shapes.
- Round-tripping edit-mode changes back to source code — Edit mode mutates
  in-memory props; "copy code" is a follow-up.
- Snap, grid, multi-select, undo — none of these in v1.
- Handle constraint beyond axis-pinning (no min/max, no constraint to
  another point).
