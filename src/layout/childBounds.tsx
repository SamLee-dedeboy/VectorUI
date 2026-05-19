import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  useMeasuredBounds,
  boundsEqual,
  type Bounds,
} from "./measureBounds";

/**
 * Layer 2 — child-bounds aggregation.
 *
 * `Frame`, `Flow` and `PathFlow` all need the same thing: render N children,
 * measure each one's rendered bounds, and collect the results into an indexed
 * array (de-duped so a settled layout does not re-render). This hook is that
 * shared core — built on the `useMeasuredBounds` leaf primitive.
 *
 * Usage:
 *   const { bounds, Measured } = useChildBounds();
 *   items.map((child, i) => <Measured key={i} index={i}>{child}</Measured>)
 *   // bounds[i] is child i's rendered bounds, or undefined until measured.
 */

export type ChildBounds = (Bounds | undefined)[];

export type ChildBoundsApi = {
  /** Rendered bounds per child, indexed; an entry is undefined until measured. */
  bounds: ChildBounds;
  /** Wrap each child in this so its bounds are collected. */
  Measured: (props: { index: number; children: ReactNode }) => ReactNode;
};

export function useChildBounds(): ChildBoundsApi {
  const [bounds, setBounds] = useState<ChildBounds>([]);

  const report = useCallback((index: number, b: Bounds) => {
    setBounds((prev) => {
      if (boundsEqual(prev[index], b)) return prev;
      const next = prev.slice();
      next[index] = b;
      return next;
    });
  }, []);

  // Memoized on the stable `report` so the component identity never changes —
  // a fresh identity every render would remount (and re-measure) every child.
  const Measured = useMemo(
    () =>
      function Measured({
        index,
        children,
      }: {
        index: number;
        children: ReactNode;
      }) {
        const ref = useMeasuredBounds<SVGGElement>((b) => report(index, b));
        return <g ref={ref}>{children}</g>;
      },
    [report],
  );

  return { bounds, Measured };
}

/** The content extent measured by `useFitToContent`, from the origin. */
export type FitSize = { width: number; height: number };

/**
 * Measure a subtree's rendered extent so a container can size itself to its
 * content — no `onMeasure` callback for the consumer to wire up.
 *
 * Attach `ref` to the content `<g>`; read `size` for the settled extent
 * (origin to bottom-right edge, in the element's own units). `size` is
 * `undefined` for the first paint only, then stays stable once layout settles.
 */
export function useFitToContent(): {
  ref: RefObject<SVGGElement | null>;
  size: FitSize | undefined;
} {
  const [size, setSize] = useState<FitSize | undefined>(undefined);
  const ref = useMeasuredBounds<SVGGElement>((b) => {
    const next: FitSize = { width: b.x + b.width, height: b.y + b.height };
    setSize((prev) =>
      prev && prev.width === next.width && prev.height === next.height
        ? prev
        : next,
    );
  });
  return { ref, size };
}
