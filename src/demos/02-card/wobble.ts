/**
 * Hand-drawn wobble utilities for Demo 2's card outlines.
 *
 * The wobble is a deterministic sum-of-sines whose envelope fades to 0 at each
 * endpoint, so a wobbly straight edge meets the next segment cleanly — no
 * gaps, no kinks where it joins a corner curve. Used by `scoopCard` (on hover)
 * and by `LandscapeCard` (as the resting hand-drawn aesthetic).
 */

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Jitter at parameter t ∈ [0, 1], in ~[-1, 1]. `phase` differs per edge so the
 * four sides of a rectangle are not visibly identical.
 */
export function wobbleAt(t: number, phase: number): number {
  const envelope = Math.sin(Math.PI * t); // 0 at the ends, 1 at the middle
  return (
    envelope *
    (Math.sin(t * 8.1 + phase) * 0.55 +
      Math.sin(t * 19.3 + phase * 1.9) * 0.3 +
      Math.sin(t * 31.0 + phase * 0.5) * 0.15)
  );
}

/**
 * Push a sampled, wobbly polyline from (x1, y1) to (x2, y2) onto `d`. The
 * wobble is applied perpendicular to the segment; when `amp <= 0`, emits a
 * single straight `L` instead.
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
    const j = wobbleAt(t, phase) * amp;
    d.push(`L ${round(tx + nx * j)} ${round(ty + ny * j)}`);
  }
}
