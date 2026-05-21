/**
 * Layer 2 — wrap text around a rectangular float, the way CSS `float` works.
 *
 * Demo 8 introduced an inline wrap-around-rect operator: if a text column's
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

/** A rectangle in the text column's coordinate space. */
export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

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

  // Padded rect — the indent target.
  const top = rect.top - padding;
  const bottom = rect.bottom + padding;
  const left = rect.left - padding;
  const right = rect.right + padding;
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
