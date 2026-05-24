import type { ReactElement } from "react";

/**
 * Layer 3 — a declarative float for `<WrapText>`.
 *
 * `<Float>` is an inert marker: it renders nothing on its own. Placed inside a
 * `<WrapText>`, it tells the container to BOTH draw this path and derive its
 * text-wrap intrusion from the same `d` string — one source of truth for the
 * drawn shape and the contour the text hugs. Use `side` to wrap from the left
 * or right edge; combine a left and a right `<Float>` to wrap text down the
 * middle. See the guide §12 "Text wrapping a shape".
 */

export type FloatSide = "left" | "right";

/** A reference point on the float's bounding box — the point that `x`/`y`
 *  position. Four corners or the centre. */
export type FloatAnchor =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

/** A layout-unit number, or a percentage of the block (`"50%"`). */
export type FloatPosition = number | `${number}%`;

export type FloatProps = {
  /** SVG path data. Drawn as-is AND sampled for the wrap contour. */
  d: string;
  /**
   * Convenience anchor against a column edge, setting the defaults for
   * `anchor`/`x`: `"left"` → top-left at x=0, `"right"` → top-right at x=100%.
   * Explicit `anchor`/`x`/`y` override it. Default `"left"`.
   */
  side?: FloatSide;
  /**
   * Which point of the float `x`/`y` position. Default follows `side`
   * (`"top-left"`, or `"top-right"` for `side="right"`).
   */
  anchor?: FloatAnchor;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  filter?: string;
  /**
   * Bounding box, in layout units. Omit to auto-measure from `d` (the common
   * case). Pass explicitly only to override the sampled extent for a
   * pathological path.
   */
  width?: number;
  height?: number;
  /**
   * Where the float's `anchor` point sits in the block. A number is layout
   * units; a percentage places the anchor at that fraction of the column width
   * (`x`) or the final block height (`y`) — so `anchor="center" x="50%"
   * y="50%"` centres the float in the laid-out paragraph. `x` defaults from
   * `side`; `y` defaults to `0`.
   */
  x?: FloatPosition;
  y?: FloatPosition;
  /** Forwarded to `intrusionFromPath`/`spanFromPath` for finer sampling. */
  samples?: number;
  yResolution?: number;
  reachSteps?: number;
};

/**
 * Registry symbol stamped on the `Float` function so `WrapText` can recognise a
 * `<Float>` child by tag rather than reference equality — which survives HMR and
 * duplicate module copies, where `child.type === Float` would not.
 */
const FLOAT_MARKER = Symbol.for("vectorui.Float");

export function Float(_props: FloatProps): null {
  return null;
}
(Float as unknown as Record<symbol, boolean>)[FLOAT_MARKER] = true;

/** True for a React element produced by `<Float>`. */
export function isFloatElement(
  node: unknown,
): node is ReactElement<FloatProps> {
  return (
    !!node &&
    typeof node === "object" &&
    "type" in node &&
    !!(node as { type?: Record<symbol, boolean> }).type?.[FLOAT_MARKER]
  );
}
