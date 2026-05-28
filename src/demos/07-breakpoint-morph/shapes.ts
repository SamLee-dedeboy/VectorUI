/**
 * Demo-scoped shape generators that exercise the expressiveness of a single
 * eight-quadratic path — per-corner radii AND per-edge bow control.
 *
 * They live in this demo (not in `tokens/shapes.ts`) because they're tuned for
 * Demo 7's "shapes that morph between breakpoints" narrative. Every generator
 * emits the same M + 8×Q + Z token sequence as `tokens.shapes.quad`, so
 * outputs from this file morph cleanly against each other AND against the
 * design-token shape family.
 */

const round = (n: number) => Math.round(n * 100) / 100;

type Radii = { tl: number; tr: number; br: number; bl: number };

/** Outward bow per edge, in layout units. Negative bows pull an edge inward. */
type Bows = { top: number; right: number; bottom: number; left: number };

/**
 * The expressive sibling of `tokens.shapes.quad`: a single `bow` scalar is
 * replaced by four per-edge bows. Token layout is otherwise identical, so any
 * output is morph-compatible with `quad`'s.
 */
function quadEdges(w: number, h: number, radii: Radii, bows: Bows): string {
  // Shrink radii uniformly if an edge can't fit its two corner radii (same
  // safety net as `tokens.shapes.quad`).
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
    `Q ${p((r.tl + w - r.tr) / 2)} ${p(-bows.top)} ${p(w - r.tr)} 0`,
    `Q ${p(w)} 0 ${p(w)} ${p(r.tr)}`,
    `Q ${p(w + bows.right)} ${p((r.tr + h - r.br) / 2)} ${p(w)} ${p(h - r.br)}`,
    `Q ${p(w)} ${p(h)} ${p(w - r.br)} ${p(h)}`,
    `Q ${p((w - r.br + r.bl) / 2)} ${p(h + bows.bottom)} ${p(r.bl)} ${p(h)}`,
    `Q 0 ${p(h)} 0 ${p(h - r.bl)}`,
    `Q ${p(-bows.left)} ${p((h - r.bl + r.tl) / 2)} 0 ${p(r.tl)}`,
    `Q 0 0 ${p(r.tl)} 0`,
    "Z",
  ].join(" ");
}

/**
 * `spark` — a four-pointed concave shape. Small corners + every edge pulled
 * inward give a "throwing-star" / pinched feel that suits a narrow viewport.
 */
export function spark(w: number, h: number): string {
  const m = Math.min(w, h);
  const r = m * 0.02;
  const inward = -m * 0.13;
  return quadEdges(
    w,
    h,
    { tl: r, tr: r, br: r, bl: r },
    { top: inward, right: inward, bottom: inward, left: inward },
  );
}

/**
 * `petal` — leaf-diagonal corners (big top-left + bottom-right, sharp points
 * at top-right + bottom-left) with every edge bowed gently outward. Reads as
 * a single blossoming petal at mid widths.
 */
export function petal(w: number, h: number): string {
  const m = Math.min(w, h);
  const big = m * 0.45;
  const point = m * 0.03;
  const breathe = m * 0.05;
  return quadEdges(
    w,
    h,
    { tl: big, tr: point, br: big, bl: point },
    { top: breathe, right: breathe, bottom: breathe, left: breathe },
  );
}

/**
 * `banner` — a wide, wave-like card. Modest equal corners; the top edge dips
 * inward (like fabric sagging from a curtain rod), the bottom edge bulges
 * outward (like a banner tail), the sides bow gently outward. Suits a wide
 * viewport that can absorb the horizontal motion.
 */
export function banner(w: number, h: number): string {
  const r = h * 0.085;
  return quadEdges(
    w,
    h,
    { tl: r, tr: r, br: r, bl: r },
    {
      top: -h * 0.11,
      right: w * 0.018,
      bottom: h * 0.16,
      left: w * 0.018,
    },
  );
}
