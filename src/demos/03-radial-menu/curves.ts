/**
 * Curve generators for Demo 3, Version B — three shapes built on the
 * `polyline` curve primitive. Each takes a horizontal span `[x0, x1]` and a
 * centerline `yMid`, and returns a `Curve` that `PathFlow` can distribute
 * items along (SPEC §6.2). Together they make the point that the "radial" in
 * a radial menu is just one choice of path — any curve will do.
 *
 * Each curve is exposed twice: once as a `Curve` (via `buildCurve`), and once
 * as an evenly-arc-length-resampled point array of fixed length (via
 * `curvePoints`). The second form has the same shape across all kinds, so
 * point-by-point linear interpolation morphs one curve into another — the
 * basis of the smooth switch in `useMorphedPoints`.
 */

import { polyline, type Curve, type CurvePoint } from "../../layout/walkPath";

export type CurveKind = "sine" | "square" | "straight";

export type CurveScene = {
  x0: number;
  x1: number;
  yMid: number;
  amplitude: number;
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
      x: s.x0 + (s.x1 - s.x0) * u,
      y: s.yMid + s.amplitude * Math.sin(u * s.cycles * 2 * Math.PI),
    });
  }
  return pts;
};

const squareSamples = (s: CurveScene): CurvePoint[] => {
  // Half-cycle corners: horizontal run, vertical step, horizontal run, …
  const halfCycles = s.cycles * 2;
  const dx = (s.x1 - s.x0) / halfCycles;
  const pts: CurvePoint[] = [];
  // Start one half-amplitude below center so the wave is symmetric about yMid.
  let y = s.yMid - s.amplitude;
  pts.push({ x: s.x0, y });
  for (let i = 1; i <= halfCycles; i++) {
    const xRight = s.x0 + dx * i;
    pts.push({ x: xRight, y });
    y = y === s.yMid - s.amplitude ? s.yMid + s.amplitude : s.yMid - s.amplitude;
    if (i < halfCycles) pts.push({ x: xRight, y });
  }
  return pts;
};

const straightSamples = (s: CurveScene): CurvePoint[] => [
  { x: s.x0, y: s.yMid },
  { x: s.x1, y: s.yMid },
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
 * Resample a polyline to `n + 1` vertices spaced evenly by arc length. The
 * raw samples for each curve kind have wildly different vertex counts
 * (hundreds for sine, a handful for square, two for straight); resampling to
 * a fixed length is what makes a point-by-point morph between them possible.
 */
function uniformResample(source: CurvePoint[], n: number): CurvePoint[] {
  if (source.length < 2) return source.slice();
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
  const out: CurvePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const target = total === 0 ? 0 : (i / n) * total;
    let j = 0;
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

/**
 * Evenly arc-length-resampled vertices for the chosen curve — exactly
 * `MORPH_SAMPLES + 1` of them, so the same index across two kinds picks
 * "equivalent" positions for a linear morph.
 */
export function curvePoints(
  kind: CurveKind,
  scene: CurveScene,
): CurvePoint[] {
  return uniformResample(rawSamples(kind, scene), MORPH_SAMPLES);
}

/** Build a `Curve` of the chosen kind across the given scene. */
export function buildCurve(kind: CurveKind, scene: CurveScene): Curve {
  return polyline({ points: curvePoints(kind, scene) });
}

/** Build a `Curve` directly from an explicit list of vertices. */
export function curveFromPoints(points: CurvePoint[]): Curve {
  return polyline({ points });
}
