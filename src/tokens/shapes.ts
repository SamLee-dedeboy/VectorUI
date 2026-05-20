/**
 * Shape tokens (SPEC §9) — the "shape language" of the design system.
 *
 * Each generator is `(w, h, morph?) => string`: SVG path data for a (w, h)
 * box. They all emit the SAME eight-quadratic command structure (four edges,
 * four corners), so any two outputs are matched-vertex and morph cleanly via
 * `morphPath` — no path-morphing library needed.
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round = (n: number) => Math.round(n * 100) / 100;

type Radii = { tl: number; tr: number; br: number; bl: number };

/** A rounded quad with per-corner radii and an optional outward edge `bow`. */
function quad(w: number, h: number, radii: Radii, bow: number): string {
  // Shrink radii uniformly if an edge can't fit its two corner radii.
  // A zero-size edge contributes no constraint (avoids a 0/0 NaN).
  const wDenom = Math.max(w, radii.tl + radii.tr, radii.bl + radii.br);
  const hDenom = Math.max(h, radii.tl + radii.bl, radii.tr + radii.br);
  const s = Math.min(
    1,
    wDenom > 0 ? w / wDenom : 1,
    hDenom > 0 ? h / hDenom : 1,
  );
  const r = {
    tl: radii.tl * s,
    tr: radii.tr * s,
    br: radii.br * s,
    bl: radii.bl * s,
  };
  const p = round;

  return [
    `M ${p(r.tl)} 0`,
    `Q ${p((r.tl + w - r.tr) / 2)} ${p(-bow)} ${p(w - r.tr)} 0`,
    `Q ${p(w)} 0 ${p(w)} ${p(r.tr)}`,
    `Q ${p(w + bow)} ${p((r.tr + h - r.br) / 2)} ${p(w)} ${p(h - r.br)}`,
    `Q ${p(w)} ${p(h)} ${p(w - r.br)} ${p(h)}`,
    `Q ${p((w - r.br + r.bl) / 2)} ${p(h + bow)} ${p(r.bl)} ${p(h)}`,
    `Q 0 ${p(h)} 0 ${p(h - r.bl)}`,
    `Q ${p(-bow)} ${p((h - r.bl + r.tl) / 2)} 0 ${p(r.tl)}`,
    `Q 0 0 ${p(r.tl)} 0`,
    "Z",
  ].join(" ");
}

/** An organic blob: asymmetric corner radii, edges that bow outward.
 *  `morph` ∈ [0, 1] inflates the radii and the bow. */
export function blob(w: number, h: number, morph = 0): string {
  const m = clamp01(morph);
  const base = Math.min(w, h) * 0.17;
  const grow = 1 + m * 0.5;
  const radii: Radii = {
    tl: base * 1.0 * grow,
    tr: base * 1.55 * grow,
    br: base * 0.8 * grow,
    bl: base * 1.3 * grow,
  };
  return quad(w, h, radii, m * Math.min(w, h) * 0.055);
}

/** A rounded rectangle. `morph` gently rounds the corners further. */
export function rectRounded(w: number, h: number, morph = 0): string {
  const m = clamp01(morph);
  const r = Math.min(w, h) * 0.1 * (1 + m * 0.35);
  return quad(w, h, { tl: r, tr: r, br: r, bl: r }, 0);
}

/** A sharp-cornered rounded rectangle — the morph counterpart of `blob`. */
export function sharp(w: number, h: number): string {
  const r = Math.min(w, h) * 0.045;
  return quad(w, h, { tl: r, tr: r, br: r, bl: r }, 0);
}

/**
 * A leaf: two opposite corners drawn to a soft point, the other two swept
 * into a generous quarter-round. `morph` ∈ [0, 1] relaxes the points back
 * toward an ordinary rounded rectangle. Shares the eight-quadratic structure,
 * so it morphs cleanly against the rest of the family.
 */
export function leaf(w: number, h: number, morph = 0): string {
  const m = clamp01(morph);
  const big = Math.min(w, h) * 0.5 * (1 - m * 0.82);
  const point = Math.min(w, h) * 0.04 * (1 + m * 5);
  return quad(w, h, { tl: big, tr: point, br: big, bl: point }, 0);
}

/** A pill: a rectangle with fully rounded ends. */
export function pill(w: number, h: number): string {
  const r = h / 2;
  return quad(w, h, { tl: r, tr: r, br: r, bl: r }, 0);
}

/** A backdrop for a tab: rounded top corners, square bottom. */
export function tabBackdrop(w: number, h: number): string {
  const r = Math.min(w, h) * 0.32;
  return quad(w, h, { tl: r, tr: r, br: 0, bl: 0 }, 0);
}

/** The named shape language consumed by Layer 3 components. */
export const shapes = {
  blob,
  rectRounded,
  sharp,
  leaf,
  pill,
  tabBackdrop,
} as const;

export type ShapeToken = keyof typeof shapes;
