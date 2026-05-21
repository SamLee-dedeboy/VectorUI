import { wobbleAt } from "./wobble";
import { sampleBandMax } from "../layout/intrusionSampling";
import type { IntrusionFn } from "../layout/intrusionSampling";

/**
 * `triangleFloat` — an isoceles triangle (peak at top centre, base at bottom)
 * with optionally wobbly edges. Pairs the drawn path with intrusion profiles
 * for two use cases:
 *
 *   • `intrusionInto(...)` — RIGHT-slope intrusion, for body text that wraps
 *     the triangle from the outside (sits to the right of it).
 *   • `fitInside(...)` — LEFT + RIGHT intrusions, for a `Text` whose body
 *     FILLS the triangle's interior. Hand the returned pair to `flowAround`,
 *     and set the `Text`'s `maxWidth` to the triangle's `width` — pretext
 *     will narrow each line to the interior width at that y.
 *
 * Same wobble functions feed the drawn path and the queries, so the text
 * provably follows the rendered contour, never an approximation of it.
 *
 * Coordinates are in layout units, with the triangle's bounding-box top-left
 * at (0, 0).
 */

const round = (n: number) => Math.round(n * 100) / 100;

export type TriangleFloatOptions = {
  /** Width of the base, in layout units. */
  width: number;
  /** Height from base to peak, in layout units. */
  height: number;
  /** Wobble amplitude on the three edges, in layout units. */
  wobble?: number;
  /** Outline sample count per edge — higher is smoother. */
  samples?: number;
};

export type TriangleFloat = {
  /** SVG path data for the triangle outline. */
  path: string;
  width: number;
  height: number;
  /**
   * Right-slope intrusion, for body text that wraps the triangle from the
   * right side (the triangle floats in the column's upper-left). Pass the
   * triangle's offset relative to the text column's top-left; the returned
   * profile takes coordinates relative to the text block.
   */
  intrusionInto: (offsetX: number, offsetY: number) => IntrusionFn;
  /**
   * Both intrusion profiles for a `Text` whose body fills the triangle's
   * interior. Pair the returned `{ intrusionAt, rightIntrusionAt }` with the
   * Text's `flowAround`, and set its `maxWidth` to `width` (the triangle's
   * full width — pretext will narrow each line to the interior at that y).
   *
   * `padding` insets the text from each slope by that many layout units
   * (matches CSS-style padding on a container — applied to both slopes), so
   * the text has visual breathing room from the contour rather than touching
   * it. `offsetX`/`offsetY` give the triangle's position relative to the
   * text column's top-left; `offsetX` is 0 when the column's left edge sits
   * at the triangle's left edge.
   */
  fitInside: (
    offsetX: number,
    offsetY: number,
    padding?: number,
  ) => { intrusionAt: IntrusionFn; rightIntrusionAt: IntrusionFn };
};

const RIGHT_PHASE = 1.4;
const LEFT_PHASE = 2.7;

export function triangleFloat(opts: TriangleFloatOptions): TriangleFloat {
  const { width, height } = opts;
  const wobble = opts.wobble ?? 0;
  const samples = opts.samples ?? 36;

  // Vertices: bottom-left A, top peak P, bottom-right B.
  const A = { x: 0, y: height };
  const P = { x: width / 2, y: 0 };
  const B = { x: width, y: height };

  // Right slope direction and its 90°-CCW perpendicular unit vector.
  const dxR = B.x - P.x;
  const dyR = B.y - P.y;
  const lenR = Math.hypot(dxR, dyR) || 1;
  const nxR = -dyR / lenR;
  const nyR = dxR / lenR;

  // Left slope direction and the x-component of its perpendicular unit
  // vector (the y-component isn't needed — `leftSlopeXAt` returns x only).
  const dxL = P.x - A.x;
  const dyL = P.y - A.y;
  const lenL = Math.hypot(dxL, dyL) || 1;
  const nxL = -dyL / lenL;

  /** Wobbled x of the right slope at float-local y. -1 if y is outside. */
  const rightSlopeXAt = (y: number): number => {
    if (y < 0 || y > height) return -1;
    const t = y / height;
    const baseX = P.x + dxR * t;
    const j = wobbleAt(t, RIGHT_PHASE) * wobble;
    return baseX + nxR * j;
  };

  /** Wobbled x of the left slope at float-local y. -1 if y is outside. */
  const leftSlopeXAt = (y: number): number => {
    if (y < 0 || y > height) return -1;
    // walkSeg parameterises A → P with t ∈ [0,1]; at t, y = height·(1 − t).
    const t = 1 - y / height;
    const baseX = A.x + dxL * t;
    const j = wobbleAt(t, LEFT_PHASE) * wobble;
    return baseX + nxL * j;
  };

  const p = round;
  const d: string[] = [`M ${p(A.x)} ${p(A.y)}`];

  /** Walk a wobbled line segment from `from` to `to`, appending L commands. */
  const walkSeg = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    phase: number,
  ) => {
    if (wobble <= 0) {
      d.push(`L ${p(to.x)} ${p(to.y)}`);
      return;
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      const j = wobbleAt(t, phase) * wobble;
      d.push(`L ${p(x + nx * j)} ${p(y + ny * j)}`);
    }
  };

  // Left slope (A → P). Phase matches `leftSlopeXAt`, so path and query agree.
  walkSeg(A, P, LEFT_PHASE);

  // Right slope (P → B). Sampled with the SAME function `rightSlopeXAt`
  // uses, so the path and the intrusion query agree point-for-point.
  if (wobble > 0) {
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const baseX = P.x + dxR * t;
      const baseY = P.y + dyR * t;
      const j = wobbleAt(t, RIGHT_PHASE) * wobble;
      d.push(`L ${p(baseX + nxR * j)} ${p(baseY + nyR * j)}`);
    }
  } else {
    d.push(`L ${p(B.x)} ${p(B.y)}`);
  }

  // Base (B → A).
  walkSeg(B, A, 4.1);
  d.push("Z");

  /** Sample a per-y slope function across a line band, take the widest reach. */
  const sample = (
    fn: (y: number) => number,
    yTop: number,
    yBottom: number,
    offsetY: number,
  ): number =>
    sampleBandMax(
      (colY) => {
        const v = fn(colY - offsetY);
        // -1 sentinel means "outside the triangle band"; sampleBandMax skips
        // negative samples and clamps the resulting max to 0 if every sample
        // is outside.
        return v < 0 ? -1 : v;
      },
      yTop,
      yBottom,
    );

  const intrusionInto =
    (offsetX: number, offsetY: number): IntrusionFn =>
    (yTop, yBottom) =>
      Math.max(0, offsetX + sample(rightSlopeXAt, yTop, yBottom, offsetY));

  /**
   * Build a band-sampling intrusion that walks the line band and tracks both
   * the widest reach and whether any sample actually hit the triangle —
   * padding is only added when the line genuinely intersects a slope, so a
   * line entirely below the base reads as zero intrusion (no path, no
   * padding to keep clear of).
   */
  const buildIntrusion =
    (
      slopeXAt: (y: number) => number,
      offsetX: number,
      offsetY: number,
      padding: number,
      transformReach: (r: number) => number,
    ): IntrusionFn =>
    (yTop, yBottom) => {
      let max = 0;
      let hit = false;
      const STEPS = 6;
      for (let i = 0; i <= STEPS; i++) {
        const colY = yTop + ((yBottom - yTop) * i) / STEPS;
        const triY = colY - offsetY;
        const v = slopeXAt(triY);
        if (v < 0) continue;
        hit = true;
        const reach = transformReach(v);
        if (reach > max) max = reach;
      }
      if (!hit) return 0;
      return Math.max(0, offsetX + max + padding);
    };

  const fitInside = (
    offsetX: number,
    offsetY: number,
    padding: number = 0,
  ) => ({
    /** Left intrusion: column's left edge → triangle's left slope, + padding. */
    intrusionAt: buildIntrusion(
      leftSlopeXAt,
      offsetX,
      offsetY,
      padding,
      (l) => l,
    ),
    /** Right intrusion: column's right edge → triangle's right slope, + padding.
     *  Assumes the column's width equals the triangle's width. */
    rightIntrusionAt: buildIntrusion(
      rightSlopeXAt,
      0, // right intrusion is measured from the column's right edge, not its left
      offsetY,
      padding,
      (r) => width - r,
    ),
  });

  return {
    path: d.join(" "),
    width,
    height,
    intrusionInto,
    fitInside,
  };
}
