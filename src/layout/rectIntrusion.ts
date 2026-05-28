/**
 * Layer 2 — wrap text around a rectangular float, the way CSS `float` works.
 *
 * Demo 9 introduced an inline wrap-around-rect operator: if a text column's
 * left half is occupied by a rectangle, body text indents past the rect's
 * right edge; mirror for the right. That logic generalises — every overlay,
 * call-out, or pinned image is a rectangle once it's measured — so it lives
 * here as a library helper instead of a per-demo callback.
 *
 * Coordinate model: `rect` is in the same layout-unit space the column's text
 * uses. `(0, 0)` is the column's top-left; positive y goes down; positive x
 * is rightward. The returned `intrusionAt` / `rightIntrusionAt` follow the
 * `FlowAround` contract (yTop/yBottom in column-local layout units).
 */
import type { IntrusionFn } from "./intrusionSampling";

/**
 * A rectangle in the text column's coordinate space — `(0, 0)` is the
 * column's top-left, the same units the column's `Text` lays out in.
 *
 * Accepts either edge form (`{ left, top, right, bottom }`) or the
 * `{ x, y, width, height }` form the rest of the library uses (Frame slots,
 * anchor specs). They're interchangeable — pass whichever you have.
 */
export type RectEdges = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
export type RectBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type Rect = RectEdges | RectBox;

/** Normalise either rect form to edges. */
function toEdges(r: Rect): RectEdges {
  if ("width" in r) {
    return {
      left: r.x,
      top: r.y,
      right: r.x + r.width,
      bottom: r.y + r.height,
    };
  }
  return r;
}

export type FloatAroundRectOptions = {
  /**
   * Side the rect floats to. `"auto"` picks based on the rect's midX vs the
   * column midpoint — the CSS-float behaviour. `"left"` / `"right"` force one
   * side; `"none"` returns zero intrusion on both sides (useful when toggling
   * the wrap off without unmounting). Default `"auto"`.
   */
  mode?: "auto" | "left" | "right" | "none";
  /** Extra padding around the rect, in layout units. Default 0. */
  padding?: number;
};

export type RectIntrusionPair = {
  intrusionAt: IntrusionFn;
  rightIntrusionAt: IntrusionFn;
};

/**
 * Build an `(intrusionAt, rightIntrusionAt)` pair that flows column text
 * around `rect`. Hand straight to `FlowAround` — the column's `Text`
 * narrows each line on the side the rect leans toward.
 *
 * The intrusion is *full-row*: a rect intruding from the left clips every
 * line whose vertical band overlaps `rect`, all the way to the rect's right
 * edge (the CSS float model, not the contour model — which lives in
 * `intrusionFromReach`).
 */
export function floatAroundRect(
  rect: Rect,
  columnWidth: number,
  opts: FloatAroundRectOptions = {},
): RectIntrusionPair {
  const { mode = "auto", padding = 0 } = opts;
  const edges = toEdges(rect);

  // Padded rect — the indent target.
  const top = edges.top - padding;
  const bottom = edges.bottom + padding;
  const left = edges.left - padding;
  const right = edges.right + padding;
  const midX = (left + right) / 2;

  // Resolve "auto" once: a column-midX comparison is cheap but consistent
  // across every band query, so the float doesn't flip mid-paragraph.
  let resolved: "left" | "right" | "none";
  if (mode === "none") {
    resolved = "none";
  } else if (mode === "auto") {
    // Outside the column entirely — nothing to wrap.
    if (right <= 0 || left >= columnWidth) {
      resolved = "none";
    } else {
      resolved = midX < columnWidth / 2 ? "left" : "right";
    }
  } else {
    resolved = mode;
  }

  // Whether the band intersects the rect's vertical extent.
  const overlapsBand = (yTop: number, yBot: number) =>
    yBot > top && yTop < bottom;
  // Whether the rect is currently inside the column at all.
  const inColumn = right > 0 && left < columnWidth;

  const zero: IntrusionFn = () => 0;

  if (resolved === "none" || !inColumn) {
    return { intrusionAt: zero, rightIntrusionAt: zero };
  }

  if (resolved === "left") {
    return {
      intrusionAt: (yTop, yBot) =>
        overlapsBand(yTop, yBot) ? Math.max(0, right) : 0,
      rightIntrusionAt: zero,
    };
  }
  // resolved === "right"
  return {
    intrusionAt: zero,
    rightIntrusionAt: (yTop, yBot) =>
      overlapsBand(yTop, yBot) ? Math.max(0, columnWidth - left) : 0,
  };
}
