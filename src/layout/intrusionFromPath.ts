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

/** The horizontal extent `[minX, maxX]` a silhouette occupies over a band, or
 *  `null` when the band is clear of the path. Coordinates are in the path's
 *  own space (the same as the supplied walker). */
export type SpanFn = (
  yTop: number,
  yBottom: number,
) => [number, number] | null;

export type SpanFromPathOptions = {
  /** Bounding-box height; clips the silhouette query to `[0, height]`. */
  height: number;
  /** Path-walk sample count. Default 512. */
  samples?: number;
  /** Y-bucket resolution in layout units. Default 1. */
  yResolution?: number;
};

/**
 * Build a `SpanFn` for a path silhouette: the `[minX, maxX]` it covers at each
 * y. Where `intrusionFromPath` collapses a band to a single reach from one
 * edge, this keeps **both** edges — the raw material for letting text flow on
 * either side of a float (occupancy), not just inset from one side. Same
 * bucketed-sampling approach, so it composes with the same walkers.
 */
export function spanFromPath(
  pathOrWalker: string | PathWalker,
  opts: SpanFromPathOptions,
): SpanFn {
  const walker =
    typeof pathOrWalker === "string"
      ? pathWalkerFromData(pathOrWalker)
      : pathOrWalker;
  const samples = Math.max(32, opts.samples ?? 512);
  const yResolution = Math.max(0.1, opts.yResolution ?? 1);

  const bucketCount = Math.max(1, Math.ceil(opts.height / yResolution) + 1);
  const mins = new Array<number | undefined>(bucketCount);
  const maxs = new Array<number | undefined>(bucketCount);

  for (let i = 0; i <= samples; i++) {
    const s = walker.length === 0 ? 0 : (walker.length * i) / samples;
    const p = walker.pointAtLength(s);
    if (p.y < 0 || p.y > opts.height) continue;
    const b = Math.min(
      bucketCount - 1,
      Math.max(0, Math.round(p.y / yResolution)),
    );
    const lo = mins[b];
    const hi = maxs[b];
    if (lo === undefined || p.x < lo) mins[b] = p.x;
    if (hi === undefined || p.x > hi) maxs[b] = p.x;
  }

  // Nearest-neighbour gap fill, both directions (matches intrusionFromPath).
  const fill = (arr: (number | undefined)[]) => {
    let last: number | undefined;
    for (let i = 0; i < bucketCount; i++) {
      if (arr[i] === undefined) arr[i] = last;
      else last = arr[i];
    }
    last = undefined;
    for (let i = bucketCount - 1; i >= 0; i--) {
      if (arr[i] === undefined) arr[i] = last;
      else last = arr[i];
    }
  };
  fill(mins);
  fill(maxs);

  const spanAt = (y: number): [number, number] | null => {
    if (y < 0 || y > opts.height) return null;
    const b = Math.min(
      bucketCount - 1,
      Math.max(0, Math.round(y / yResolution)),
    );
    const lo = mins[b];
    const hi = maxs[b];
    if (lo === undefined || hi === undefined) return null;
    return [lo, hi];
  };

  // Union the per-sample spans across the band so a line as tall as several
  // buckets occupies the widest extent any of them reaches.
  return (yTop, yBottom) => {
    const steps = Math.max(1, Math.ceil((yBottom - yTop) / yResolution));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i <= steps; i++) {
      const y = yTop + ((yBottom - yTop) * i) / steps;
      const span = spanAt(y);
      if (!span) continue;
      if (span[0] < lo) lo = span[0];
      if (span[1] > hi) hi = span[1];
    }
    return Number.isFinite(lo) ? [lo, hi] : null;
  };
}
