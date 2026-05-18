/**
 * Layer 2 — path morphing for breakpoint shape transitions (SPEC §8).
 *
 * A hand-written, matched-vertex interpolator: it tweens between two SVG path
 * strings that share an identical command structure (same command letters in
 * the same order). VectorUI's `card()` family of generators all emit the same
 * eight-quadratic structure, so any two of their outputs morph cleanly without
 * a heavier library like flubber.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Split path data into command-letter and number tokens. */
export function tokenizePath(d: string): string[] {
  return d.match(/-?\d*\.?\d+(?:e[+-]?\d+)?|[A-Za-z]/g) ?? [];
}

/**
 * Interpolate between two path strings at `t` ∈ [0, 1].
 *
 * Both paths must tokenize to the same length with identical command letters
 * at each command position — otherwise the structures are not morphable and
 * this throws. (Use generators from the same family to guarantee this.)
 */
export function morphPath(from: string, to: string, t: number): string {
  const a = tokenizePath(from);
  const b = tokenizePath(to);

  if (a.length !== b.length) {
    throw new Error(
      `morphPath: path structures differ (${a.length} vs ${b.length} tokens)`,
    );
  }

  const k = clamp01(t);
  const out: string[] = [];

  for (let i = 0; i < a.length; i++) {
    const na = Number(a[i]);
    const nb = Number(b[i]);
    const aIsNum = !Number.isNaN(na);
    const bIsNum = !Number.isNaN(nb);

    if (aIsNum !== bIsNum || (!aIsNum && a[i] !== b[i])) {
      throw new Error(
        `morphPath: command mismatch at token ${i} ("${a[i]}" vs "${b[i]}")`,
      );
    }
    out.push(aIsNum ? String(round(na + (nb - na) * k)) : a[i]);
  }

  return out.join(" ");
}
