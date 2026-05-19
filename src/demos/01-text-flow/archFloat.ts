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

const round = (n: number) => Math.round(n * 100) / 100;

export type ArchFloatOptions = {
  /** Overall width — also the text column width. */
  width?: number;
  /** Overall height of the arch. */
  height?: number;
  /** Outline sample count per wavy edge — higher is smoother. */
  samples?: number;
};

export type ArchFloat = {
  /** SVG path data for the arch outline. */
  path: string;
  width: number;
  height: number;
  /** Y at which the text column begins — just below the bar. */
  textTop: number;
  /** Left-leg intrusion over a band, in text-column coordinates. */
  intrusionAt: (yTop: number, yBottom: number) => number;
  /** Right-leg intrusion over a band, in text-column coordinates. */
  rightIntrusionAt: (yTop: number, yBottom: number) => number;
};

export function archFloat(opts: ArchFloatOptions = {}): ArchFloat {
  const width = opts.width ?? 520;
  const height = opts.height ?? 300;
  const samples = opts.samples ?? 64;

  const barH = height * 0.23; // thickness of the top bar
  const legBase = width * 0.135; // nominal leg width
  const textTop = barH + 4; // text starts just clear of the bar

  // A deterministic hand-drawn wobble — a sum of mismatched sines, ∈ ~[-1, 1].
  const wobble = (t: number, phase: number): number =>
    Math.sin(t * 6.3 + phase) * 0.6 +
    Math.sin(t * 14.7 + phase * 2.1) * 0.26 +
    Math.sin(t * 27.0 + phase * 0.7) * 0.14;

  // Inward reach of a leg at card-y `y` — 0 outside the leg band. `phase`
  // differs per leg so the two are not mirror-identical.
  const legReach = (y: number, phase: number): number => {
    if (y < barH || y > height) return 0;
    const t = (y - barH) / (height - barH);
    const envelope = 0.9 + 0.2 * t; // a touch thinner at the top
    return Math.max(3, legBase * envelope + 9 * wobble(t, phase));
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

  // Intrusion queries — text-column coordinates (y 0 = textTop).
  const sampleBand = (
    reach: (y: number) => number,
    yTop: number,
    yBottom: number,
  ): number => {
    let max = 0;
    const STEPS = 6;
    for (let i = 0; i <= STEPS; i++) {
      const y = textTop + yTop + ((yBottom - yTop) * i) / STEPS;
      max = Math.max(max, reach(y));
    }
    return max;
  };

  return {
    path: d.join(" "),
    width,
    height,
    textTop,
    intrusionAt: (yTop, yBottom) => sampleBand(leftReach, yTop, yBottom),
    rightIntrusionAt: (yTop, yBottom) => sampleBand(rightReach, yTop, yBottom),
  };
}
