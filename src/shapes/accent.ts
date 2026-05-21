/**
 * The body slot's accent shape — a smooth quarter-wedge anchored in the
 * top-left of the text column. The text wraps its curved right edge.
 *
 * Mirrors the pattern set by `cornerBlob.ts`: the SAME parameterization that
 * generates the rendered path also answers the `intrusionAt` query the
 * `Text` `flowAround` uses — so the wrap provably follows the drawn curve to
 * pixel precision, not an approximation of it.
 */

import { intrusionFromReach } from "../layout/intrusionSampling";
import type { IntrusionFn } from "../layout/intrusionSampling";

const round = (n: number) => Math.round(n * 100) / 100;

export type Accent = {
  /** SVG path data for the accent outline. */
  path: string;
  /** Bounding-box width, in layout units. */
  width: number;
  /** Bounding-box height, in layout units. */
  height: number;
  /**
   * Left intrusion of the accent over the vertical band [yTop, yBottom], in
   * layout units. 0 once the band clears the accent's bottom.
   */
  intrusionAt: IntrusionFn;
};

export type AccentOptions = {
  /** The wedge fills a `size × size` square in the column's top-left. */
  size?: number;
};

/**
 * Quarter-circle wedge drawn as a single quadratic Bézier.
 *
 * The Bézier from (size, 0) via control (size, size) to (0, size) has the
 * parameterization `x(t) = size(1 - t²)`, `y(t) = size(2t - t²)`. We invert
 * `y` exactly to compute `edgeX(y)` — so the intrusion profile is the math
 * the path is actually drawn from, not a circular approximation of it.
 */
export function accent({ size = 92 }: AccentOptions = {}): Accent {
  const r = size;

  // Quarter-wedge: top edge, curved right→bottom edge, left edge back up.
  // The single Q is the entire diagonal silhouette; the flat edges close it.
  const path = [
    `M 0 0`,
    `L ${round(r)} 0`,
    `Q ${round(r)} ${round(r)} 0 ${round(r)}`,
    `L 0 0`,
    `Z`,
  ].join(" ");

  /** Exact edge from the Bézier parameterization, given y ∈ [0, r]. */
  const edgeX = (y: number): number => {
    if (y <= 0) return r;
    if (y >= r) return 0;
    // Invert y = r(2t - t²) for t ∈ [0, 1]: t = 1 - √(1 - y/r).
    const t = 1 - Math.sqrt(Math.max(0, 1 - y / r));
    return r * (1 - t * t);
  };

  const intrusionAt = intrusionFromReach(edgeX, { yMin: 0, yMax: r });

  return { path, width: r, height: r, intrusionAt };
}
