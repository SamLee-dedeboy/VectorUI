/**
 * Curve generators for Demo 3, Version B — three shapes built on the
 * `polyline` curve primitive. Each takes INTRINSIC geometry only —
 * `span` (horizontal length), `amplitude` (peak from centerline),
 * `cycles` (full cycles across the span) — and emits the curve in its
 * own LOCAL coordinate frame: origin at `(0, 0)`, x running from `0` to
 * `span`, centerline at `y = 0`. Placement into the SVG viewBox is the
 * caller's job — wrap the consumer in a `<g transform>` (or hand the
 * curve to a Frame slot). This matches how the shape generators in
 * `src/shapes/*.ts` already work, and keeps "what the curve IS"
 * separable from "where the curve SITS."
 *
 * Each curve is exposed twice: once as a `Curve` (via `buildCurve`), and once
 * as an evenly-arc-length-resampled point array of fixed length (via
 * `curvePoints`). The second form has the same shape across all kinds, so
 * point-by-point linear interpolation morphs one curve into another — the
 * basis of the smooth switch via `useTweenedPoints`.
 */

import { polyline, type Curve, type CurvePoint } from "../../layout/walkPath";
import { uniformResample } from "../../layout/curveMorph";

export type CurveKind = "sine" | "square" | "straight";

/**
 * Intrinsic curve parameters. All in LOCAL units — the curve goes from
 * `x = 0` to `x = span`, with its centerline at `y = 0` and extents at
 * `y = ±amplitude`. Place the result via a `<g transform="translate(…)">`
 * at the demo's call site.
 */
export type CurveScene = {
  /** Horizontal length of the curve, in local layout units. */
  span: number;
  /** Vertical amplitude — peak deviation from the centerline at y=0. */
  amplitude: number;
  /** Number of full cycles across the span. */
  cycles: number;
};

/** All `curvePoints` results have exactly this many segments (this+1 vertices). */
export const MORPH_SAMPLES = 128;

const sineSamples = (s: CurveScene): CurvePoint[] => {
  // Two samples per degree across each cycle keep the curve visually smooth.
  const samples = Math.max(64, Math.round(s.cycles * 96));
  const pts: CurvePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    pts.push({
      x: s.span * u,
      y: s.amplitude * Math.sin(u * s.cycles * 2 * Math.PI),
    });
  }
  return pts;
};

const squareSamples = (s: CurveScene): CurvePoint[] => {
  // Half-cycle corners: horizontal run, vertical step, horizontal run, …
  const halfCycles = s.cycles * 2;
  const dx = s.span / halfCycles;
  const pts: CurvePoint[] = [];
  // Start one half-amplitude below the centerline so the wave is symmetric.
  let y = -s.amplitude;
  pts.push({ x: 0, y });
  for (let i = 1; i <= halfCycles; i++) {
    const xRight = dx * i;
    pts.push({ x: xRight, y });
    y = y === -s.amplitude ? s.amplitude : -s.amplitude;
    if (i < halfCycles) pts.push({ x: xRight, y });
  }
  return pts;
};

const straightSamples = (s: CurveScene): CurvePoint[] => [
  { x: 0, y: 0 },
  { x: s.span, y: 0 },
];

const rawSamples = (kind: CurveKind, scene: CurveScene): CurvePoint[] => {
  switch (kind) {
    case "sine":
      return sineSamples(scene);
    case "square":
      return squareSamples(scene);
    case "straight":
      return straightSamples(scene);
  }
};

/**
 * Evenly arc-length-resampled vertices for the chosen curve. Returns exactly
 * `samples + 1` vertices (default `MORPH_SAMPLES`), so the same index across
 * two kinds picks "equivalent" positions for a linear morph. `uniformResample`
 * is the library helper in `src/layout/curveMorph.ts` (promoted from this
 * demo). Dial `samples` up when morphing high-frequency curves where 128
 * vertices smooths out a crest you wanted to keep.
 */
export function curvePoints(
  kind: CurveKind,
  scene: CurveScene,
  samples: number = MORPH_SAMPLES,
): CurvePoint[] {
  return uniformResample(rawSamples(kind, scene), samples);
}

/** Build a `Curve` of the chosen kind across the given scene. */
export function buildCurve(
  kind: CurveKind,
  scene: CurveScene,
  samples?: number,
): Curve {
  return polyline({ points: curvePoints(kind, scene, samples) });
}

/** Build a `Curve` directly from an explicit list of vertices. */
export function curveFromPoints(points: CurvePoint[]): Curve {
  return polyline({ points });
}
