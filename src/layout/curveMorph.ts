/**
 * Layer 2 — arc-length resampling and morphing for `Curve` / vertex arrays.
 *
 * Demo 3 carried both pieces inline: `uniformResample` to land any source
 * polyline on a fixed-count, arc-length-spaced vertex array, and a
 * point-by-point lerp the morph hook ran every frame. Those are independent
 * of the demo and a regular need for any "switch curves smoothly" effect, so
 * they belong here.
 *
 * The shared scheme: every kind of curve, no matter how many native vertices
 * it has (two for a line, hundreds for a smooth sine), is resampled to the
 * same `count + 1` vertices spaced equally along arc length. Two such arrays
 * lerp index-by-index, producing intermediate vertex arrays that `polyline()`
 * wraps as a `Curve`.
 */

import {
  polyline,
  type Curve,
  type CurvePoint,
} from "./walkPath";

/**
 * Resample a polyline source to `count + 1` vertices spaced evenly along
 * arc length. Accepts either a `Curve` (any kind — `pointAtLength` does the
 * arc-length work for us) or a raw vertex array (cheaper for the polyline
 * case since we can scan the cumulative chord-length table directly).
 *
 * Returns a fresh array. The first and last vertices coincide with the
 * source's endpoints; degenerate inputs (≤1 point, zero arc length) return
 * a copy that still satisfies the `count + 1` length contract by repeating
 * the lone point.
 */
export function uniformResample(
  source: Curve | CurvePoint[],
  count: number,
): CurvePoint[] {
  const n = Math.max(1, Math.floor(count));

  if (Array.isArray(source)) {
    return resampleVertices(source, n);
  }
  return resampleCurve(source, n);
}

function resampleVertices(source: CurvePoint[], n: number): CurvePoint[] {
  if (source.length === 0) {
    return Array.from({ length: n + 1 }, () => ({ x: 0, y: 0 }));
  }
  if (source.length === 1) {
    const p = source[0];
    return Array.from({ length: n + 1 }, () => ({ x: p.x, y: p.y }));
  }

  // Cumulative chord length.
  const cumulative: number[] = [0];
  for (let i = 1; i < source.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        Math.hypot(
          source[i].x - source[i - 1].x,
          source[i].y - source[i - 1].y,
        ),
    );
  }
  const total = cumulative[cumulative.length - 1];

  // A zero-length polyline (all points coincident) — repeat the first.
  if (total === 0) {
    const p = source[0];
    return Array.from({ length: n + 1 }, () => ({ x: p.x, y: p.y }));
  }

  const out: CurvePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * total;
    let j = 0;
    // Find the segment that contains `target`. `source.length - 2` is the
    // index of the last segment's start.
    while (j < source.length - 2 && cumulative[j + 1] < target) j++;
    const segLen = cumulative[j + 1] - cumulative[j];
    const t = segLen > 0 ? (target - cumulative[j]) / segLen : 0;
    out.push({
      x: source[j].x + (source[j + 1].x - source[j].x) * t,
      y: source[j].y + (source[j + 1].y - source[j].y) * t,
    });
  }
  return out;
}

function resampleCurve(curve: Curve, n: number): CurvePoint[] {
  const length = curve.length;
  if (length === 0) {
    const p = curve.pointAtLength(0);
    return Array.from({ length: n + 1 }, () => ({ x: p.x, y: p.y }));
  }
  const out: CurvePoint[] = [];
  for (let i = 0; i <= n; i++) {
    out.push(curve.pointAtLength((length * i) / n));
  }
  return out;
}

/**
 * Linearly interpolate two equal-length vertex arrays. Index-by-index — so
 * the caller is responsible for having `uniformResample`d both sides to a
 * matching count first.
 *
 * `t` is clamped to [0, 1]. Mismatched lengths throw: the morph wouldn't
 * make geometric sense and silently truncating papered over real bugs in
 * the Demo 3 prototype.
 */
export function lerpPoints(
  a: CurvePoint[],
  b: CurvePoint[],
  t: number,
): CurvePoint[] {
  if (a.length !== b.length) {
    throw new Error(
      `lerpPoints: arrays must match in length (${a.length} vs ${b.length})`,
    );
  }
  const clamped = Math.max(0, Math.min(1, t));
  return a.map((p, i) => {
    const q = b[i];
    return {
      x: p.x + (q.x - p.x) * clamped,
      y: p.y + (q.y - p.y) * clamped,
    };
  });
}

/**
 * Convenience: build a `polyline` Curve from a vertex array. Just `polyline`
 * under a name that makes intent obvious at the morph call site —
 * `polylineFromPoints(lerpPoints(a, b, t))` reads better than
 * `polyline({ points: lerp(a, b, t) })`.
 */
export function polylineFromPoints(points: CurvePoint[]): Curve {
  return polyline({ points });
}

/**
 * One-shot morph: resample two sources to the same `count`, lerp, return a
 * Curve. The slow path on every frame — keep both resamples outside the loop
 * in real animation code (see `useMorphedCurve` for the canonical pattern).
 */
export function morphCurves(
  from: Curve | CurvePoint[],
  to: Curve | CurvePoint[],
  t: number,
  count: number,
): Curve {
  const a = uniformResample(from, count);
  const b = uniformResample(to, count);
  return polylineFromPoints(lerpPoints(a, b, t));
}
