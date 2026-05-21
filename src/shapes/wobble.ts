/**
 * Hand-drawn wobble utilities for shape providers.
 *
 * The wobble is a deterministic sum-of-sines whose envelope fades to 0 at each
 * endpoint, so a wobbly straight edge meets the next segment cleanly — no
 * gaps, no kinks where it joins a corner curve. Used by `scoopCard` (on hover)
 * and by `LandscapeCard` (as the resting hand-drawn aesthetic).
 *
 * For a profile-based variant — pick your own harmonics, swap the envelope —
 * see `makeWobble` below; both `wobbleAt` and `wobbleEdge` are wrappers over
 * the default profile, so existing callers can opt into a different character
 * by swapping in their own.
 */

const round = (n: number) => Math.round(n * 100) / 100;

/** A single sinusoidal layer of a wobble profile. */
export type WobbleHarmonic = {
  /** Angular frequency multiplier on `t`. */
  freq: number;
  /** Amplitude weight applied to this layer's contribution. */
  amp: number;
  /**
   * How the layer's phase shifts with the caller's `phase`. The defaults
   * (1.0, 1.9, 0.5 in the canonical profile) deliberately disagree so the
   * harmonics never realign — that's what keeps every wobble band looking
   * unique even when the same `phase` is passed.
   */
  phaseScale?: number;
};

/** A reusable wobble character — envelope + harmonics. */
export type WobbleProfile = {
  /** Shape envelope on [0, 1]; defaults to `sin(πt)` (zero at both ends). */
  envelope?: (t: number) => number;
  /** Sum-of-sines layers. The default profile uses three. */
  harmonics: WobbleHarmonic[];
};

const defaultEnvelope = (t: number) => Math.sin(Math.PI * t);

/**
 * The canonical Demo-2 profile: three mismatched harmonics under a sin(πt)
 * envelope, total amplitude ≈ 1. Used by `wobbleAt` / `wobbleEdge` by default
 * so the hand-drawn look matches the original prototype byte-for-byte.
 */
export const defaultWobbleProfile: WobbleProfile = {
  envelope: defaultEnvelope,
  harmonics: [
    { freq: 8.1, amp: 0.55, phaseScale: 1.0 },
    { freq: 19.3, amp: 0.3, phaseScale: 1.9 },
    { freq: 31.0, amp: 0.15, phaseScale: 0.5 },
  ],
};

/**
 * Build a `(t, phase) → jitter` function from a profile. The output is in
 * roughly [-1, 1] when the harmonics' amplitudes sum to one — callers
 * multiply by their own amplitude to land in layout units.
 */
export function makeWobble(
  profile: WobbleProfile = defaultWobbleProfile,
): (t: number, phase: number) => number {
  const envelope = profile.envelope ?? defaultEnvelope;
  const harmonics = profile.harmonics;
  return (t, phase) => {
    const env = envelope(t);
    let sum = 0;
    for (const h of harmonics) {
      sum += Math.sin(t * h.freq + phase * (h.phaseScale ?? 1)) * h.amp;
    }
    return env * sum;
  };
}

/**
 * Jitter at parameter t ∈ [0, 1], in ~[-1, 1]. `phase` differs per edge so
 * the four sides of a rectangle are not visibly identical. Uses the default
 * profile; for a different character, build your own via `makeWobble`.
 */
export const wobbleAt = makeWobble();

/**
 * Push a sampled, wobbly polyline from (x1, y1) to (x2, y2) onto `d`. The
 * wobble is applied perpendicular to the segment; when `amp <= 0`, emits a
 * single straight `L` instead. Optionally accepts a custom profile via the
 * `wobble` argument — defaults to `wobbleAt`.
 */
export function wobbleEdge(
  d: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
  phase: number,
  samples = 16,
  wobble: (t: number, phase: number) => number = wobbleAt,
): void {
  if (amp <= 0) {
    d.push(`L ${round(x2)} ${round(y2)}`);
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular unit vector (90° CCW from the segment direction).
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const tx = x1 + dx * t;
    const ty = y1 + dy * t;
    const j = wobble(t, phase) * amp;
    d.push(`L ${round(tx + nx * j)} ${round(ty + ny * j)}`);
  }
}
