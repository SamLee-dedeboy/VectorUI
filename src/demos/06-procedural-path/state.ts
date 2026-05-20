/**
 * Demo 6 — slider state.
 *
 * One object lifted to the demo page (HTML form controls outside the SVG);
 * the same shape feeds both the path generator and the text-flow intrusion.
 */
export type ProceduralState = {
  /** Max horizontal reach of the left-edge wave, in layout units. */
  amplitude: number; // 0–56
  /** Wave cycles across the reference height (see proceduralShape.ts). */
  frequency: number; // 1–6, integer
  /** Phase shift in radians — slides the wave up/down without changing its shape. */
  phase: number; // 0–2π
  /** Mirror the wave on the right edge — decorative only, does not affect wrap. */
  mirrorRight: boolean;
  /** Outer wrapper width in CSS px; the SVG's `width="auto"` tracks it. */
  containerPx: number; // 360–720
};

export const defaultState: ProceduralState = {
  amplitude: 28,
  frequency: 2,
  phase: 0,
  mirrorRight: true,
  containerPx: 560,
};
