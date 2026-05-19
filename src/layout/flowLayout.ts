import type { Bounds } from "./measureBounds";

/**
 * Layer 2 — pure placement math for `Flow`.
 *
 * Given each child's rendered bounds, stack them along the main axis and align
 * them on the cross axis. Kept pure (no DOM, no React) so the layout maths is
 * unit-testable; the `Flow` component is just this plus measurement wiring.
 */

export type FlowDirection = "column" | "row";
export type FlowAlign = "start" | "center" | "end";

export type FlowLayoutOptions = {
  direction: FlowDirection;
  gap: number;
  /** [vertical, horizontal] padding. */
  padding: [number, number];
  align: FlowAlign;
  /** Explicit cross-axis extent; defaults to the largest child. */
  crossSize?: number;
};

export type FlowPlacement = { tx: number; ty: number };

export type FlowLayout = {
  placements: FlowPlacement[];
  width: number;
  height: number;
};

/**
 * Compute child translations and the flow's total size. Children with no
 * measured bounds yet (`undefined`) contribute zero extent, so the first paint
 * collapses cleanly and settles on the next.
 */
export function computeFlowLayout(
  bounds: (Bounds | undefined)[],
  count: number,
  opts: FlowLayoutOptions,
): FlowLayout {
  const isRow = opts.direction === "row";
  const [padV, padH] = opts.padding;
  const mainPad = isRow ? padH : padV;
  const crossPad = isRow ? padV : padH;

  const mainExtent = (b?: Bounds) => (!b ? 0 : isRow ? b.width : b.height);
  const crossExtent = (b?: Bounds) => (!b ? 0 : isRow ? b.height : b.width);
  const mainStart = (b?: Bounds) => (!b ? 0 : isRow ? b.x : b.y);
  const crossStart = (b?: Bounds) => (!b ? 0 : isRow ? b.y : b.x);

  let widestCross = 0;
  for (let i = 0; i < count; i++) {
    widestCross = Math.max(widestCross, crossExtent(bounds[i]));
  }
  const contentCross = opts.crossSize ?? widestCross;

  let cursor = mainPad;
  const placements: FlowPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const b = bounds[i];
    // Translate so the child's content edge lands at `cursor`, regardless of
    // where the child draws relative to its own origin.
    const mainOffset = cursor - mainStart(b);
    let crossOffset = crossPad - crossStart(b);
    if (opts.align === "center") {
      crossOffset += (contentCross - crossExtent(b)) / 2;
    } else if (opts.align === "end") {
      crossOffset += contentCross - crossExtent(b);
    }
    cursor += mainExtent(b) + (i < count - 1 ? opts.gap : 0);
    placements.push(
      isRow
        ? { tx: mainOffset, ty: crossOffset }
        : { tx: crossOffset, ty: mainOffset },
    );
  }

  const mainTotal = cursor + mainPad;
  const crossTotal = contentCross + crossPad * 2;
  return {
    placements,
    width: isRow ? mainTotal : crossTotal,
    height: isRow ? crossTotal : mainTotal,
  };
}
