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

/**
 * Main-axis distribution policy. `"pack"` (the default) packs children at the
 * start with `gap` between them — the flex-row analogue. The two extras
 * borrow the CSS flexbox names:
 *
 *  - `"space-between"`: first child at the start, last at the end, equal gap
 *    between (degenerates to `"pack"` when given a fixed main-axis size and
 *    only one child).
 *  - `"space-around"`: equal gap between, plus half a gap at each end.
 *
 * Both require an explicit main-axis size — `mainSize`, since the layout
 * needs something to spread *into*. Without it (or when the content overflows
 * that size) the layout falls back to `"pack"` so the children stay readable.
 */
export type FlowDistribute = "pack" | "space-between" | "space-around";

export type FlowLayoutOptions = {
  direction: FlowDirection;
  gap: number;
  /** [vertical, horizontal] padding. */
  padding: [number, number];
  align: FlowAlign;
  /** Explicit cross-axis extent; defaults to the largest child. */
  crossSize?: number;
  /** Main-axis distribution policy. Defaults to `"pack"`. */
  distribute?: FlowDistribute;
  /** Explicit main-axis extent — required for non-pack distribute modes. */
  mainSize?: number;
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
  let totalMain = 0;
  for (let i = 0; i < count; i++) {
    widestCross = Math.max(widestCross, crossExtent(bounds[i]));
    totalMain += mainExtent(bounds[i]);
  }
  const contentCross = opts.crossSize ?? widestCross;

  // Resolve main-axis spacing. Pack mode (and the fallback) puts a fixed
  // `gap` between children; the spread modes compute per-position gaps from
  // the leftover space inside `mainSize`. The fallback to pack matters when
  // either there's no mainSize to spread into or the children already
  // overflow it — silently stacking them is the least surprising behaviour.
  const distribute = opts.distribute ?? "pack";
  const mainContentArea =
    opts.mainSize !== undefined ? opts.mainSize - mainPad * 2 : undefined;
  const slack =
    mainContentArea !== undefined ? mainContentArea - totalMain : undefined;

  type Spacing = {
    leading: number;
    trailing: number;
    gapAfter: (i: number) => number;
  };
  const packed: Spacing = {
    leading: 0,
    trailing: 0,
    gapAfter: (i) => (i < count - 1 ? opts.gap : 0),
  };

  let spacing: Spacing = packed;
  if (
    distribute === "space-between" &&
    slack !== undefined &&
    slack >= 0 &&
    count >= 2
  ) {
    const between = slack / (count - 1);
    spacing = {
      leading: 0,
      trailing: 0,
      gapAfter: (i) => (i < count - 1 ? between : 0),
    };
  } else if (
    distribute === "space-around" &&
    slack !== undefined &&
    slack >= 0 &&
    count >= 1
  ) {
    const slot = slack / count;
    spacing = {
      leading: slot / 2,
      trailing: slot / 2,
      gapAfter: (i) => (i < count - 1 ? slot : 0),
    };
  }

  let cursor = mainPad + spacing.leading;
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
    cursor += mainExtent(b) + spacing.gapAfter(i);
    placements.push(
      isRow
        ? { tx: mainOffset, ty: crossOffset }
        : { tx: crossOffset, ty: mainOffset },
    );
  }

  // Total main extent includes the trailing slack (for `space-around`) plus
  // the trailing padding. When a `mainSize` is set, honour it — the spread is
  // meaningless otherwise and even pack mode shouldn't *shrink* below the
  // requested size.
  const naturalExtent = cursor + spacing.trailing + mainPad;
  const mainTotal =
    opts.mainSize !== undefined
      ? Math.max(opts.mainSize, naturalExtent)
      : naturalExtent;
  const crossTotal = contentCross + crossPad * 2;
  return {
    placements,
    width: isRow ? mainTotal : crossTotal,
    height: isRow ? crossTotal : mainTotal,
  };
}
