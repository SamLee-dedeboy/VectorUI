import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  useMeasuredBounds,
  boundsEqual,
  type Bounds,
} from "../layout/measureBounds";

/**
 * Layer 3 — `Stack`: vertical flow of measured children.
 *
 * Each child is measured by its *rendered* bounds (`getBBox`), and the next is
 * placed below it plus `gap`. Because measurement is by rendered extent, a
 * child that is taller than expected — a floated shape outsizing its text, a
 * paragraph that wrapped to extra lines — is accounted for automatically; the
 * sibling below never collides with it.
 *
 * This is the general counterpart to `Frame`'s slot stacking, for laying out
 * a page (tabs, body, rows) rather than a single shape's interior.
 */
export type StackProps = Omit<SVGProps<SVGGElement>, "children"> & {
  /** Vertical gap between children, in layout units. */
  gap?: number;
  /** Top-left of the stack, in layout units. */
  x?: number;
  y?: number;
  /** Reports the stack's resolved size once measured. */
  onMeasure?: (size: { width: number; height: number }) => void;
  children: ReactNode;
};

export function Stack({
  gap = 0,
  x = 0,
  y = 0,
  onMeasure,
  children,
  ...gProps
}: StackProps) {
  const items = Children.toArray(children).filter(isValidElement);

  const [bounds, setBounds] = useState<(Bounds | undefined)[]>([]);
  const report = useCallback((index: number, b: Bounds) => {
    setBounds((prev) => {
      if (boundsEqual(prev[index], b)) return prev;
      const next = prev.slice();
      next[index] = b;
      return next;
    });
  }, []);

  // Stack each child below the previous one's rendered height.
  let cursor = 0;
  let maxWidth = 0;
  const offsets = items.map((_, i) => {
    const b = bounds[i];
    // Translate so the child's content TOP lands at `cursor`, regardless of
    // where the child draws relative to its own origin.
    const offsetY = cursor - (b?.y ?? 0);
    if (b) maxWidth = Math.max(maxWidth, b.width);
    cursor += (b?.height ?? 0) + (i < items.length - 1 ? gap : 0);
    return offsetY;
  });
  const totalHeight = cursor;

  useEffect(() => {
    onMeasure?.({ width: maxWidth, height: totalHeight });
  }, [onMeasure, maxWidth, totalHeight]);

  return (
    <g transform={`translate(${x} ${y})`} {...gProps}>
      {items.map((child, i) => (
        <StackItem key={i} index={i} offsetY={offsets[i]} onBounds={report}>
          {child}
        </StackItem>
      ))}
    </g>
  );
}

type StackItemProps = {
  index: number;
  offsetY: number;
  onBounds: (index: number, b: Bounds) => void;
  children: ReactNode;
};

function StackItem({ index, offsetY, onBounds, children }: StackItemProps) {
  const ref = useMeasuredBounds<SVGGElement>((b) => onBounds(index, b));
  return (
    <g transform={`translate(0 ${offsetY})`}>
      <g ref={ref}>{children}</g>
    </g>
  );
}
