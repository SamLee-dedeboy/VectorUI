import type { ShapeGenerator } from "../components/Frame";

/**
 * A vertical menu silhouette whose right edge "shelves" to the exact width of
 * each item. One source of truth — the array of per-item widths — drives both
 * the rendered outline AND the column the labels paint into, so a width that
 * grows (e.g. the active item gets a suffix) carries the path with it.
 *
 * The dynamic-slider version (`proceduralShape.ts`) varies the contour with a
 * closed-form curve sampled densely; this one expresses the contour as a
 * piecewise step function of `y`, which is what a menu actually wants — sharp
 * shelves between rows, smoothed only at the joints by `cornerRadius`.
 *
 * All coordinates are in layout units; the menu's top-left sits at (0, 0).
 */

export type MenuShapeOptions = {
  /** Per-item widths in layout units. One entry per row, top → bottom. */
  itemWidths: number[];
  /** Uniform row height in layout units. */
  itemHeight: number;
  /** Maximum corner-rounding radius. Clamped per joint to fit available space. */
  cornerRadius: number;
};

/**
 * Build the closed outline of the menu. The frame `width` / `height` arguments
 * the `ShapeGenerator` contract supplies are ignored — the items dictate the
 * extents on their own (the caller sizes the surrounding viewBox to match).
 */
export function makeMenuShape({
  itemWidths,
  itemHeight,
  cornerRadius,
}: MenuShapeOptions): ShapeGenerator {
  const n = itemWidths.length;
  if (n === 0) return () => "";

  const totalH = n * itemHeight;
  // Outer-corner radii: also bounded by item width so a very short row can't
  // round itself out of existence.
  const rTopOuter = Math.min(
    cornerRadius,
    itemHeight / 2,
    itemWidths[0] / 2,
  );
  const rBotOuter = Math.min(
    cornerRadius,
    itemHeight / 2,
    itemWidths[n - 1] / 2,
  );

  return () => {
    // CCW walk: top-left → across top → down the right (stepping at each
    // boundary) → across bottom → up the left → close.
    let d = `M 0 ${round(rTopOuter)}`;
    d += ` Q 0 0 ${round(rTopOuter)} 0`;
    d += ` L ${round(itemWidths[0] - rTopOuter)} 0`;
    d += ` Q ${round(itemWidths[0])} 0 ${round(itemWidths[0])} ${round(rTopOuter)}`;

    // Right edge, stepping between adjacent rows of differing widths. When two
    // neighbours share a width the path just falls through — the closing
    // `L … totalH-rBotOuter` below sweeps the whole vertical run in one segment.
    for (let i = 0; i < n - 1; i++) {
      const wTop = itemWidths[i];
      const wBot = itemWidths[i + 1];
      if (wTop === wBot) continue;
      const yBound = (i + 1) * itemHeight;
      // Joint radius shrinks if the step is small or the row is thin — the two
      // 90° corners at a joint share a horizontal segment whose half-length is
      // |Δw|/2, so the radius can't exceed that.
      const r = Math.min(
        cornerRadius,
        itemHeight / 2,
        Math.abs(wTop - wBot) / 2,
      );
      if (wBot < wTop) {
        // Step inward (the next row is narrower). The right edge first turns
        // LEFT across the joint, then DOWN onto the narrower row.
        d += ` L ${round(wTop)} ${round(yBound - r)}`;
        d += ` Q ${round(wTop)} ${round(yBound)} ${round(wTop - r)} ${round(yBound)}`;
        d += ` L ${round(wBot + r)} ${round(yBound)}`;
        d += ` Q ${round(wBot)} ${round(yBound)} ${round(wBot)} ${round(yBound + r)}`;
      } else {
        // Step outward (next row is wider).
        d += ` L ${round(wTop)} ${round(yBound - r)}`;
        d += ` Q ${round(wTop)} ${round(yBound)} ${round(wTop + r)} ${round(yBound)}`;
        d += ` L ${round(wBot - r)} ${round(yBound)}`;
        d += ` Q ${round(wBot)} ${round(yBound)} ${round(wBot)} ${round(yBound + r)}`;
      }
    }

    // Bottom row right edge → bottom-right corner → across → bottom-left → up.
    d += ` L ${round(itemWidths[n - 1])} ${round(totalH - rBotOuter)}`;
    d += ` Q ${round(itemWidths[n - 1])} ${round(totalH)} ${round(itemWidths[n - 1] - rBotOuter)} ${round(totalH)}`;
    d += ` L ${round(rBotOuter)} ${round(totalH)}`;
    d += ` Q 0 ${round(totalH)} 0 ${round(totalH - rBotOuter)}`;
    d += ` L 0 ${round(rTopOuter)}`;
    return d + " Z";
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
