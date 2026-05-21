/**
 * Layer 2 — wrap an arbitrary SVG path-d as a `Curve`.
 *
 * `walkPath.ts` ships four parametric curves (line, arc, polyline,
 * quadratic). Anything else — a cubic Bézier, an arc-then-line, a Figma-
 * exported squiggle — used to require porting the geometry into one of
 * those forms. With the browser's path engine doing the arc-length walk
 * for free via `getPointAtLength`, that translation is unnecessary.
 *
 * The returned `Curve` satisfies the same contract `PathFlow`, `CurveSlider`,
 * and `nearestPointOnCurve` consume; `toPathData` returns the original `d`,
 * so the rendered curve is whatever the caller drew.
 */

import type { Curve, CurvePoint } from "./walkPath";
import { pathWalkerFromData, type PathWalker } from "./pathWalker";

export type CurveFromPathOptions = {
  /**
   * Finite-difference step for `tangentAtLength`, in user units. Defaults to
   * `max(0.5, length * 1e-3)` — small enough for smooth curves, large enough
   * to dodge jitter where `getPointAtLength` quantises near corners.
   */
  tangentEps?: number;
};

/**
 * Build a `Curve` from raw SVG path data (or a pre-built `PathWalker`).
 *
 * Tangents are estimated via a central finite difference around the query
 * point. That's accurate for smooth curves and stable across the kinks of
 * a polyline-shaped d-string. Pass a smaller `tangentEps` if you're walking
 * an extremely short path; a larger one if your path has near-cusps that
 * report wildly differing tangents one sample apart.
 *
 * The default path string passed through `toPathData` is the original `d`
 * unchanged; if you constructed your own walker, `toPathData` returns an
 * empty string (you're presumably drawing the curve another way).
 */
export function curveFromPath(
  pathOrWalker: string | PathWalker,
  opts: CurveFromPathOptions = {},
): Curve {
  const walker =
    typeof pathOrWalker === "string"
      ? pathWalkerFromData(pathOrWalker)
      : pathOrWalker;
  const length = walker.length;
  const eps = opts.tangentEps ?? Math.max(0.5, length * 1e-3);

  const pointAtLength = (s: number): CurvePoint => walker.pointAtLength(s);

  const tangentAtLength = (s: number): number => {
    if (length === 0) return 0;
    const halfEps = eps / 2;
    // Central difference; clamp so the samples never escape the curve.
    const lo = Math.max(0, s - halfEps);
    const hi = Math.min(length, s + halfEps);
    if (hi <= lo) return 0;
    const a = pointAtLength(lo);
    const b = pointAtLength(hi);
    return Math.atan2(b.y - a.y, b.x - a.x);
  };

  return {
    length,
    pointAtLength,
    tangentAtLength,
    toPathData: () => (typeof pathOrWalker === "string" ? pathOrWalker : ""),
  };
}
