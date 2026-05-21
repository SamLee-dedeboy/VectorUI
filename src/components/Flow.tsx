import {
  Children,
  isValidElement,
  useEffect,
  type ReactNode,
  type SVGProps,
} from "react";
import { useChildBounds } from "../layout/childBounds";
import { useSlot } from "../layout/slot";
import {
  computeFlowLayout,
  type FlowDirection,
  type FlowAlign,
  type FlowDistribute,
} from "../layout/flowLayout";

export type { FlowDirection, FlowAlign, FlowDistribute };

/**
 * Layer 3 — `Flow`: linear layout of measured children.
 *
 * Children are placed one after another along the main axis (`direction`),
 * each positioned by its RENDERED bounds — so a child taller/wider than
 * expected never collides with its sibling. `padding` and cross-axis `align`
 * are first-class, which retires the hand-computed `OUTER + PAD` offsets and
 * `-w / 2` centering arithmetic that consumer code used to carry.
 *
 * This is the general linear-layout primitive; `Frame` handles shape-as-
 * container and `PathFlow` handles distribution along a genuine curve. The
 * placement maths lives in the pure `computeFlowLayout` (src/layout).
 */
export type FlowProps = Omit<SVGProps<SVGGElement>, "children"> & {
  /** Main axis. "column" stacks vertically (default), "row" horizontally. */
  direction?: FlowDirection;
  /** Gap between children, in layout units. */
  gap?: number;
  /** Inner inset: one number for all sides, or [vertical, horizontal]. */
  padding?: number | [number, number];
  /** Cross-axis alignment of children. */
  align?: FlowAlign;
  /** Main-axis distribution: `"pack"` (default), `"space-between"`, or
   *  `"space-around"`. The two spread modes need a `mainSize` — without one,
   *  the layout falls back to `"pack"`. */
  distribute?: FlowDistribute;
  /** Explicit main-axis extent — required for `distribute` other than
   *  `"pack"`. Layout never *shrinks* below this when set. `"100%"` fills the
   *  enclosing Frame slot's width (row direction only — see note below),
   *  mirroring `Text maxWidth="100%"`. */
  mainSize?: number | "100%";
  /** Explicit cross-axis extent; defaults to the widest/tallest child.
   *  `"100%"` fills the enclosing slot's width (column direction only). */
  crossSize?: number | "100%";
  /** Top-left of the flow, in layout units. */
  x?: number;
  y?: number;
  /** Reports the flow's resolved size once measured. */
  onMeasure?: (size: { width: number; height: number }) => void;
  children: ReactNode;
};

export function Flow({
  direction = "column",
  gap = 0,
  padding = 0,
  align = "start",
  distribute,
  mainSize,
  crossSize,
  x = 0,
  y = 0,
  onMeasure,
  children,
  ...gProps
}: FlowProps) {
  const items = Children.toArray(children).filter(isValidElement);
  const { bounds, Measured } = useChildBounds();
  const slot = useSlot();

  // `"100%"` fills the enclosing slot's width, the way `Text maxWidth="100%"`
  // does — which lets a row inside a `Frame width="auto"` slot distribute
  // `space-between` without the caller hand-computing the content width (the
  // auto-Frame chicken-and-egg). Only the horizontal axis is slot-constrained
  // (slots publish width only; height is content-driven), so `"100%"` resolves
  // on whichever axis is horizontal and is ignored — left to pack/auto — on
  // the vertical one.
  const isRow = direction === "row";
  const slotWidth = slot?.width;
  const resolvedMainSize =
    mainSize === "100%" ? (isRow ? slotWidth : undefined) : mainSize;
  const resolvedCrossSize =
    crossSize === "100%" ? (isRow ? undefined : slotWidth) : crossSize;

  const layout = computeFlowLayout(bounds, items.length, {
    direction,
    gap,
    align,
    distribute,
    mainSize: resolvedMainSize,
    crossSize: resolvedCrossSize,
    padding: Array.isArray(padding) ? padding : [padding, padding],
  });

  useEffect(() => {
    onMeasure?.({ width: layout.width, height: layout.height });
  }, [onMeasure, layout.width, layout.height]);

  return (
    <g transform={`translate(${x} ${y})`} {...gProps}>
      {/* An invisible rect at the Flow's full layout size — including padding.
          Padding is otherwise just an offset with no geometry, so a
          getBBox-based parent (VectorUIRoot height="content", Frame.Slot)
          would not see it and would clip the padded edges. */}
      <rect
        width={layout.width}
        height={layout.height}
        fill="none"
        pointerEvents="none"
        aria-hidden="true"
      />
      {items.map((child, i) => (
        <g
          key={i}
          transform={`translate(${layout.placements[i].tx} ${layout.placements[i].ty})`}
        >
          <Measured index={i}>{child}</Measured>
        </g>
      ))}
    </g>
  );
}
