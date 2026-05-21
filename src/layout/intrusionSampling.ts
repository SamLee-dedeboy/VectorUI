/**
 * Layer 2 — band-sampling for `FlowAround`.
 *
 * Six shape providers across the demos each used to ship the same loop: walk
 * a line band [yTop, yBottom], sample a per-y reach function at a handful of
 * positions, return the widest reach. That's the canonical way to turn a
 * continuous edge contour into a `FlowAround.intrusionAt` — and now it lives
 * here, so every shape gets it for free.
 *
 * `BAND_SAMPLE_STEPS = 6` (so seven samples per band) has empirically been
 * enough for body-text line heights against organic silhouettes: a single
 * lobe between samples would have to peak with sub-line-height precision to
 * poke through, and we'd see it as a wobble on the rendered path too. Callers
 * with extra-tall lines (or near-cusp shapes) can dial it up via the `steps`
 * option without forking the loop.
 */
import type { FlowAround } from "../components/Text";

/** Default sample count per band. Used by every shape kit provider. */
export const BAND_SAMPLE_STEPS = 6;

/** A function from a layout-y to the float's reach at that y. */
export type ReachFn = (y: number) => number;

/** A `FlowAround.intrusionAt` (or `rightIntrusionAt`) signature. */
export type IntrusionFn = (yTopLayout: number, yBottomLayout: number) => number;

/**
 * Sample `reach(y)` across `[yTop, yBottom]` and return the widest value. A
 * single negative sample is treated as "outside the float" and skipped — the
 * caller can return -1 from `reach` to opt a band out. With no positive
 * samples the result is 0.
 *
 * `steps` is the number of *intervals* between samples; the loop evaluates
 * `steps + 1` points. Defaults to `BAND_SAMPLE_STEPS`.
 */
export function sampleBandMax(
  reach: ReachFn,
  yTop: number,
  yBottom: number,
  steps: number = BAND_SAMPLE_STEPS,
): number {
  let max = 0;
  for (let i = 0; i <= steps; i++) {
    const y = yTop + ((yBottom - yTop) * i) / steps;
    const v = reach(y);
    if (v > max) max = v;
  }
  return max;
}

/** Result of `sampleBand`. `hit` is true if any sample was inside the float
 *  (i.e. `reach(y) >= 0`). `max` is the widest positive reach, or 0 when no
 *  sample was inside or the float reach was 0 throughout. */
export type SampleBandResult = { max: number; hit: boolean };

/**
 * Same scan as `sampleBandMax`, but also tells you whether *any* sample
 * actually landed inside the float. Useful when "no contact" means
 * something different from "zero intrusion" — e.g. a sloped float where
 * a row that doesn't touch the slope should add no padding at all, while
 * a row that grazes it should add the full breathing space. `triangleFloat`
 * uses this; the inline version it had before this helper landed was
 * literally this loop plus a `hit` flag.
 */
export function sampleBand(
  reach: ReachFn,
  yTop: number,
  yBottom: number,
  steps: number = BAND_SAMPLE_STEPS,
): SampleBandResult {
  let max = 0;
  let hit = false;
  for (let i = 0; i <= steps; i++) {
    const y = yTop + ((yBottom - yTop) * i) / steps;
    const v = reach(y);
    if (v < 0) continue;
    hit = true;
    if (v > max) max = v;
  }
  return { max, hit };
}

export type IntrusionFromReachOptions = {
  /** Band-sample count. Defaults to `BAND_SAMPLE_STEPS`. */
  steps?: number;
  /**
   * Clip the band against the float's vertical extent — `reach(y)` is only
   * evaluated inside `[yMin, yMax]`. When omitted, every sample is forwarded.
   * Use this to opt out of querying a `reach` function that returns garbage
   * (or expensive nothing) outside its band.
   */
  yMin?: number;
  yMax?: number;
};

/**
 * Promote a `reach(y)` into a full `IntrusionFn`. Equivalent to the inline
 * "loop and take the max" the shape providers used to carry — minus the
 * scaffolding around it.
 */
export function intrusionFromReach(
  reach: ReachFn,
  opts: IntrusionFromReachOptions = {},
): IntrusionFn {
  const { steps = BAND_SAMPLE_STEPS, yMin, yMax } = opts;
  if (yMin === undefined && yMax === undefined) {
    return (yTop, yBottom) => sampleBandMax(reach, yTop, yBottom, steps);
  }
  const lo = yMin ?? -Infinity;
  const hi = yMax ?? Infinity;
  return (yTop, yBottom) => {
    // Whole band outside the float's vertical extent — no contribution.
    if (yBottom <= lo || yTop >= hi) return 0;
    const top = Math.max(yTop, lo);
    const bot = Math.min(yBottom, hi);
    return sampleBandMax(reach, top, bot, steps);
  };
}

/**
 * Take the widest reach across multiple `IntrusionFn`s at each band — the
 * union operator for floats. Useful when more than one shape can intrude
 * over the same column (a scoop AND a wrap-around-title rect, for example).
 * Returns a function that calls every input on each band.
 */
export function combineIntrusions(...fns: IntrusionFn[]): IntrusionFn {
  if (fns.length === 0) return () => 0;
  if (fns.length === 1) return fns[0];
  return (yTop, yBottom) => {
    let max = 0;
    for (const fn of fns) {
      const v = fn(yTop, yBottom);
      if (v > max) max = v;
    }
    return max;
  };
}

export type { FlowAround };
