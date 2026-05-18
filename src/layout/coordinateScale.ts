import { createContext, useContext } from "react";

/**
 * The two-coordinate-space reconciliation point (SPEC §5).
 *
 * `scale` is CSS pixels per layout unit — i.e. how many real pixels one unit
 * of the root SVG's viewBox currently occupies on screen. It is the *only*
 * number any component needs to convert between layout space (positions,
 * spacing, shapes) and pixel space (text size, stroke width).
 *
 * VectorUIRoot owns this value and keeps it current via a ResizeObserver.
 * Components must never recompute it themselves — they read it through
 * `useCoordinateScale()`.
 */
export type CoordinateScale = {
  /** CSS px per layout unit. 1 means layout space === pixel space. */
  scale: number;
  /** The root viewBox width, in layout units. */
  viewBoxWidth: number;
  /** The root viewBox height, in layout units. */
  viewBoxHeight: number;
};

const DEFAULT_SCALE: CoordinateScale = {
  scale: 1,
  viewBoxWidth: 0,
  viewBoxHeight: 0,
};

export const CoordinateScaleContext =
  createContext<CoordinateScale>(DEFAULT_SCALE);

/** Read the live coordinate scale. Must be used under a <VectorUIRoot>. */
export function useCoordinateScale(): CoordinateScale {
  return useContext(CoordinateScaleContext);
}

/** Layout units -> CSS pixels. */
export function layoutToPx(layoutUnits: number, scale: number): number {
  return layoutUnits * scale;
}

/** CSS pixels -> layout units. */
export function pxToLayout(px: number, scale: number): number {
  return scale === 0 ? 0 : px / scale;
}
