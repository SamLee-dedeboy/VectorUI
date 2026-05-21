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
import { uniformResample } from "../../layout/curveMorph";

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
 * Evenly arc-length-resampled vertices for the chosen curve — exactly
 * `MORPH_SAMPLES + 1` of them, so the same index across two kinds picks
 * "equivalent" positions for a linear morph. `uniformResample` is the
 * library helper in `src/layout/curveMorph.ts` (promoted from this demo).
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
