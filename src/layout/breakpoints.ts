import { useCoordinateScale } from "./coordinateScale";

/**
 * Layer 2 — breakpoints (SPEC §8, Mechanism B).
 *
 * Breakpoints are evaluated against the root SVG's REAL pixel width, which the
 * coordinate scale already tracks via a ResizeObserver. Because that width is
 * the element's own size, breakpoints are implicitly container-queried — a
 * VectorUI scene nested in a narrow column reports a narrow width.
 */

export type BreakpointStops = Record<string, number>;

/** Default named stops: `sm` < 600px ≤ `md` < 960px ≤ `lg`. */
export const defaultStops: BreakpointStops = { sm: 0, md: 600, lg: 960 };

/** The root SVG's current width in real CSS pixels. */
export function useViewportWidth(): number {
  const { scale, viewBoxWidth } = useCoordinateScale();
  return scale * viewBoxWidth;
}

/** The name of the active breakpoint for the current viewport width. */
export function useBreakpoint(stops: BreakpointStops = defaultStops): string {
  const width = useViewportWidth();
  let active = "";
  let activeMin = -Infinity;
  for (const [name, min] of Object.entries(stops)) {
    if (width >= min && min >= activeMin) {
      active = name;
      activeMin = min;
    }
  }
  return active;
}

/**
 * A continuous 0→1 morph factor across a breakpoint threshold.
 *
 * Returns 0 at or above `threshold + band/2` and 1 at or below
 * `threshold - band/2`, easing smoothly between — so a shape can morph
 * gradually as the viewport crosses the breakpoint rather than snapping.
 */
export function breakpointMorph(
  width: number,
  threshold: number,
  band: number,
): number {
  if (band <= 0) return width < threshold ? 1 : 0;
  const raw = (threshold + band / 2 - width) / band;
  return Math.max(0, Math.min(1, raw));
}
