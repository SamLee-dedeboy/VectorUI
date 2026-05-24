/**
 * Layer 2 — synthesise a `FlowAround` intrusion from an arbitrary SVG path.
 *
 * The shape providers in `src/shapes/` pair a closed-form path generator with
 * a closed-form `intrusionAt`. That's the right tradeoff when the silhouette
 * is analytical (a quarter-circle, a Bézier, a sum of sines). For a path you
 * *imported* — Figma SVG export, a hand-drawn outline, anything traced
 * offline — there's no closed-form to differentiate. This walker bridges the
 * gap: sample the path's silhouette at fixed arc-length intervals, bucket
 * the samples by y, return the widest x in each bucket. Hand that off to
 * `intrusionFromReach` and any path can wrap text.
 *
 * Lower precision than the analytical shape kit — the silhouette is sampled,
 * not solved — but the API is the same `IntrusionFn` everything else returns,
 * so it composes with `combineIntrusions`, slots in beside the closed-form
 * providers, and lets a designer's drawing wrap text without writing math.
 */

import {
  intrusionFromReach,
  type IntrusionFn,
  type IntrusionFromReachOptions,
} from "./intrusionSampling";
import {
  pathWalkerFromData,
  type PathWalker,
} from "./pathWalker";

export type IntrusionFromPathSide = "left" | "right";

export type IntrusionFromPathOptions = {
  /** Bounding-box width the path lives in, in layout units. Required for
   *  `side: "right"` (right intrusion = `width - leftmostX(y)`). */
  width: number;
  /** Bounding-box height; clips the silhouette query to [0, height]. */
  height: number;
  /** Path-walk sample count. Higher catches finer wiggles. Default 512. */
  samples?: number;
  /** Y-bucket resolution in layout units. Default 1 — one bucket per unit. */
  yResolution?: number;
  /** Forwarded to `intrusionFromReach` — band-sample density per text row. */
  reachSteps?: number;
};

/**
 * Build an `IntrusionFn` for a path silhouette. Accepts either an SVG
 * path-data string (uses the DOM via `pathWalkerFromData`) or a pre-built
 * `PathWalker` (handy for tests, or to share one walker across multiple
 * intrusion functions).
 *
 * `side: "left"` produces an intrusion suitable for a shape floated to the
 * column's left edge — the reach at y is the *rightmost* x of the silhouette
 * at that y. `side: "right"` mirrors: the reach is `width - leftmostX(y)`.
 *
 * The shape's bounding-box origin is assumed to coincide with the column's
 * top-left (the same convention the shape kit uses). Offset paths by
 * shifting the column or by translating the d-string ahead of time.
 */
export function intrusionFromPath(
  pathOrWalker: string | PathWalker,
  side: IntrusionFromPathSide,
  opts: IntrusionFromPathOptions,
): IntrusionFn {
  const walker =
    typeof pathOrWalker === "string"
      ? pathWalkerFromData(pathOrWalker)
      : pathOrWalker;
  const samples = Math.max(32, opts.samples ?? 512);
  const yResolution = Math.max(0.1, opts.yResolution ?? 1);

  // Sample uniformly along arc length and bucket samples by y. For "left"
  // we keep the max x at each y (the right edge of a left-side float); for
  // "right" we keep the min x (the left edge of a right-side float).
  const bucketCount = Math.max(1, Math.ceil(opts.height / yResolution) + 1);
  const buckets = new Array<number | undefined>(bucketCount);
  const accept = (cur: number | undefined, x: number) =>
    side === "left"
      ? cur === undefined || x > cur
        ? x
        : cur
      : cur === undefined || x < cur
        ? x
        : cur;

  for (let i = 0; i <= samples; i++) {
    const s = walker.length === 0 ? 0 : (walker.length * i) / samples;
    const p = walker.pointAtLength(s);
    if (p.y < 0 || p.y > opts.height) continue;
    const b = Math.min(
      bucketCount - 1,
      Math.max(0, Math.round(p.y / yResolution)),
    );
    buckets[b] = accept(buckets[b], p.x);
  }

  // Fill any gaps via nearest-neighbour scan from both ends, so a y that
  // happened to fall between sample buckets still reports a sensible reach.
  let last: number | undefined;
  for (let i = 0; i < bucketCount; i++) {
    if (buckets[i] === undefined) buckets[i] = last;
    else last = buckets[i];
  }
  last = undefined;
  for (let i = bucketCount - 1; i >= 0; i--) {
    if (buckets[i] === undefined) buckets[i] = last;
    else last = buckets[i];
  }

  const reach = (y: number): number => {
    if (y < 0 || y > opts.height) return 0;
    const b = Math.min(
      bucketCount - 1,
      Math.max(0, Math.round(y / yResolution)),
    );
    const v = buckets[b];
    if (v === undefined) return 0;
    return side === "left"
      ? Math.max(0, v)
      : Math.max(0, opts.width - v);
  };

  const reachOpts: IntrusionFromReachOptions = {
    yMin: 0,
    yMax: opts.height,
  };
  if (opts.reachSteps !== undefined) reachOpts.steps = opts.reachSteps;
  return intrusionFromReach(reach, reachOpts);
}

/** The occupied x-intervals a (possibly concave) silhouette covers over a band,
 *  in the path's own coordinate space. Empty when the band is clear of the path.
 *  A convex shape yields one interval; an archway/donut yields several, with the
 *  gaps between them free for text to flow through. */
export type OccupancyFn = (
  yTop: number,
  yBottom: number,
) => Array<[number, number]>;

export type OccupancyFromPathOptions = {
  /** Bounding-box height; clips the silhouette query to `[0, height]`. */
  height: number;
  /** Path-walk sample count (polyline resolution). Default 512. */
  samples?: number;
  /** Sub-samples per text band when unioning. Default derived from band height. */
  yResolution?: number;
};

/** Merge sorted, possibly-overlapping intervals in place into a disjoint set. */
function mergeIntervals(
  ivals: Array<[number, number]>,
): Array<[number, number]> {
  if (ivals.length <= 1) return ivals;
  ivals.sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [ivals[0]];
  for (let i = 1; i < ivals.length; i++) {
    const last = out[out.length - 1];
    const cur = ivals[i];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push(cur);
  }
  return out;
}

/**
 * Build an `OccupancyFn` for a path silhouette. Where `intrusionFromPath`
 * collapses a band to a single reach from one edge, this returns the full set
 * of occupied x-intervals — so text can flow on *either* side of a float AND
 * through interior holes (an archway's doorway, a donut's centre).
 *
 * The path is sampled into a dense polyline once; each band is filled by the
 * even-odd scanline rule (sort the polyline's crossings at a y, pair them into
 * inside intervals), then the sub-samples across the band are unioned. This
 * handles concave outlines a min/max hull can't.
 */
export function occupancyFromPath(
  pathOrWalker: string | PathWalker,
  opts: OccupancyFromPathOptions,
): OccupancyFn {
  const walker =
    typeof pathOrWalker === "string"
      ? pathWalkerFromData(pathOrWalker)
      : pathOrWalker;
  const samples = Math.max(32, opts.samples ?? 512);
  const yResolution = Math.max(0.1, opts.yResolution ?? 1);

  // Dense polyline approximation of the (closed) outline.
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const s = walker.length === 0 ? 0 : (walker.length * i) / samples;
    pts.push(walker.pointAtLength(s));
  }

  // Even-odd scanline crossings at a single y → inside intervals.
  const intervalsAtY = (y: number): Array<[number, number]> => {
    const xs: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const ay = a.y;
      const by = b.y;
      // Edge straddles the scanline (half-open to avoid double-counting vertices).
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        const t = (y - ay) / (by - ay);
        xs.push(a.x + t * (b.x - a.x));
      }
    }
    if (xs.length < 2) return [];
    xs.sort((p, q) => p - q);
    const out: Array<[number, number]> = [];
    // Pair consecutively (even-odd); drop an unpaired trailing crossing.
    for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
    return out;
  };

  return (yTop, yBottom) => {
    if (yBottom <= 0 || yTop >= opts.height) return [];
    const top = Math.max(0, yTop);
    const bot = Math.min(opts.height, yBottom);
    const steps = Math.max(1, Math.ceil((bot - top) / yResolution));
    const all: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
      const y = top + ((bot - top) * i) / steps;
      for (const iv of intervalsAtY(y)) all.push(iv);
    }
    return mergeIntervals(all);
  };
}
