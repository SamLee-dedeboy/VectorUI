import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFontsReady } from "./fonts";

/**
 * Layer 2 — rendered-bounds measurement.
 *
 * The one mechanism for "how big did this subtree actually render?". Unlike a
 * component's self-measurement (e.g. Text reporting only its text height),
 * `getBBox` reports the true rendered extent of *everything* inside — shapes,
 * text, nested groups alike. `Flow`, `Frame.Slot` and `PathFlow` all stack
 * and place their children off this, so a tall floated shape or an
 * unexpectedly-wrapped paragraph is never undercounted.
 */

export type Bounds = {
  /** Left edge in the element's own user space. */
  x: number;
  /** Top edge in the element's own user space. */
  y: number;
  width: number;
  height: number;
};

/**
 * Attach the returned ref to an SVG element; `onBounds` fires after every
 * render with that element's `getBBox()`. Coordinates are in the element's own
 * user space, so they are unaffected by where an ancestor later places it —
 * which keeps measurement stable across the place/re-measure passes.
 */
export function useMeasuredBounds<T extends SVGGraphicsElement>(
  onBounds: (bounds: Bounds) => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  // A measured child can re-render *internally* — most commonly when the web
  // font loads and its text re-wraps — without this wrapper re-rendering.
  // Subscribing to font readiness forces a fresh getBBox once that happens,
  // so the new size is never missed.
  useFontsReady();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const box = el.getBBox();
      onBounds({ x: box.x, y: box.y, width: box.width, height: box.height });
    } catch {
      // element not yet in the render tree
    }
  });
  return ref;
}

/** True when two bounds are equal — used to skip no-op state updates. */
export function boundsEqual(a: Bounds | undefined, b: Bounds): boolean {
  return (
    a !== undefined &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  );
}
