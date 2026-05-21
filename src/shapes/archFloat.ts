/**
 * A hand-drawn archway for body text to pour THROUGH: a wavy top bar resting
 * on two wavy legs. Text begins just below the bar and is squeezed between the
 * legs — which intrude from BOTH sides — then widens once it clears them.
 *
 * The SAME leg functions feed the drawn path and the intrusion queries, so the
 * text provably wraps the exact contour rendered (cf. `cornerBlob`).
 *
 * All coordinates are in layout units, with the arch's top-left at (0, 0).
 */

import { intrusionFromReach, type IntrusionFn } from "../layout/intrusionSampling";
import { makeWobble, type WobbleProfile } from "./wobble";

const round = (n: number) => Math.round(n * 100) / 100;

export type ArchFloatOptions = {
  /** Overall width — also the text column width. */
  width?: number;
  /** Overall height of the arch. */
  height?: number;
  /** Outline sample count per wavy edge — higher is smoother. */
  samples?: number;
  /** Gap between the bar's underside and the start of the text column. */
  textGap?: number;
  /**
   * Override the leg-wobble profile. Defaults to the arch's own "thick"
   * profile — three mismatched harmonics tuned for visible bends on a tall
   * leg, distinct from the default Demo-2 hand-drawn look.
   */
  wobbleProfile?: WobbleProfile;
};

export type ArchFloat = {
  /** SVG path data for the arch outline. */
  path: string;
  width: number;
  height: number;
  /** Y at which the text column begins — just below the bar. */
  textTop: number;
  /** Left-leg intrusion over a band, in text-column coordinates. */
  intrusionAt: IntrusionFn;
  /** Right-leg intrusion over a band, in text-column coordinates. */
  rightIntrusionAt: IntrusionFn;
};

/**
 * The arch's leg-wobble character — taller, slower bends than the default
 * Demo-2 profile so the legs read as visibly hand-drawn at the chosen size.
 * Exported so callers can layer or replace it (B2 — wobble profiles).
 */
export const archLegWobbleProfile: WobbleProfile = {
  envelope: () => 1, // legs use their own taper envelope (`legReach`), not a sine.
  harmonics: [
    { freq: 6.3, amp: 0.6, phaseScale: 1.0 },
    { freq: 14.7, amp: 0.26, phaseScale: 2.1 },
    { freq: 27.0, amp: 0.14, phaseScale: 0.7 },
  ],
};

export function archFloat(opts: ArchFloatOptions = {}): ArchFloat {
  const width = opts.width ?? 520;
  const height = opts.height ?? 300;
  const samples = opts.samples ?? 64;

  const barH = height * 0.23; // thickness of the top bar
  const legBase = width * 0.135; // nominal leg width
  const textGap = opts.textGap ?? 4; // text starts this far clear of the bar
  const textTop = barH + textGap;

  // Deterministic hand-drawn wobble — mismatched harmonics, ∈ ~[-1, 1].
  const wobble = makeWobble(opts.wobbleProfile ?? archLegWobbleProfile);

  // Inward reach of a leg at card-y `y` — 0 outside the leg band. `phase`
  // differs per leg so the two are not mirror-identical.
  const legMinWidth = 3;
  const wobbleAmp = 9;
  const legReach = (y: number, phase: number): number => {
    if (y < barH || y > height) return 0;
    const t = (y - barH) / (height - barH);
    const envelope = 0.9 + 0.2 * t; // a touch thinner at the top
    return Math.max(legMinWidth, legBase * envelope + wobbleAmp * wobble(t, phase));
  };
  const leftReach = (y: number) => legReach(y, 0.4);
  const rightReach = (y: number) => legReach(y, 2.7);

  // Cosmetic edges — the bar's wavy lid and underside.
  const topY = (x: number) =>
    4 * Math.sin((x / width) * 6.4 + 0.3) + 2 * Math.sin((x / width) * 17 + 1);
  const ceilY = (x: number) =>
    barH - 6 + 5 * Math.sin((x / width) * 7.2 + 1.1);

  const p = round;
  const d: string[] = [];

  // Outer lid, left → right.
  d.push(`M 0 ${p(topY(0))}`);
  for (let i = 1; i <= samples; i++) {
    const x = (width * i) / samples;
    d.push(`L ${p(x)} ${p(topY(x))}`);
  }
  // Right outer edge down to the foot, then across the foot.
  d.push(`L ${p(width)} ${p(height)}`);
  d.push(`L ${p(width - rightReach(height))} ${p(height)}`);
  // Right leg inner edge, foot → bar.
  for (let i = 1; i <= samples; i++) {
    const y = height + ((barH - height) * i) / samples;
    d.push(`L ${p(width - rightReach(y))} ${p(y)}`);
  }
  // Bar underside (ceiling), right → left.
  const ceilFrom = width - rightReach(barH);
  const ceilTo = leftReach(barH);
  for (let i = 1; i <= samples; i++) {
    const x = ceilFrom + ((ceilTo - ceilFrom) * i) / samples;
    d.push(`L ${p(x)} ${p(ceilY(x))}`);
  }
  // Left leg inner edge, bar → foot.
  for (let i = 1; i <= samples; i++) {
    const y = barH + ((height - barH) * i) / samples;
    d.push(`L ${p(leftReach(y))} ${p(y)}`);
  }
  // Left foot, then `Z` runs the straight outer edge back to the start.
  d.push(`L 0 ${p(height)}`, "Z");

  // Intrusion queries — text-column coordinates (y 0 = textTop). The reach
  // functions take card-space y; translate by `textTop` so the band the
  // caller passes (column-local) lands in the right place.
  const buildIntrusion = (reach: (y: number) => number): IntrusionFn =>
    intrusionFromReach((yLocal) => reach(textTop + yLocal));

  return {
    path: d.join(" "),
    width,
    height,
    textTop,
    intrusionAt: buildIntrusion(leftReach),
    rightIntrusionAt: buildIntrusion(rightReach),
  };
}
