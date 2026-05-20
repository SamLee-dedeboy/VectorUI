import type { ShapeGenerator } from "../../components/Frame";
import type { FlowAround } from "../../components/Text";

/**
 * A vertical container whose LEFT edge undulates inward (and, optionally,
 * mirrors on the right purely for decoration). The same `leftOffset(y)`
 * closed-form drives the rendered SVG path AND the `Text` component's
 * `intrusionAt` query — so every text line wraps the exact contour you see.
 *
 * This is the dynamic-slider counterpart to 01-text-flow/cornerBlob.ts: the
 * single-source trick (one curve, two consumers) is what keeps wrap and shape
 * in lockstep across every slider tick.
 *
 * All coordinates are in layout units (y=0 at the frame top).
 */

export type ShapeParams = {
  amplitude: number;
  frequency: number;
  phase: number;
  mirrorRight: boolean;
};

/**
 * The wave is expressed against a *reference* height rather than the measured
 * frame height. Decoupling wavelength from the auto-derived height avoids a
 * feedback loop: text wraps → height changes → wavelength would shift →
 * wrap would change → height would change → … . Holding it constant means
 * both the path generator and the intrusion query see one stable curve.
 */
const WAVE_REFERENCE_HEIGHT = 320;

/** How far the left edge reaches inward at frame-y, in layout units. */
function makeLeftOffset({ amplitude, frequency, phase }: ShapeParams) {
  const omega = (2 * Math.PI * frequency) / WAVE_REFERENCE_HEIGHT;
  return (y: number): number =>
    amplitude * (0.5 + 0.5 * Math.sin(omega * y + phase));
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Closed outline: top edge, sampled right edge, bottom edge, sampled left edge. */
export function makeShape(params: ShapeParams): ShapeGenerator {
  const leftOffset = makeLeftOffset(params);
  const rightOffset = params.mirrorRight ? leftOffset : () => 0;
  const SAMPLES = 64;

  return (width, height) => {
    let d = `M ${round(leftOffset(0))} 0 L ${round(width - rightOffset(0))} 0`;
    // Right edge, top → bottom.
    for (let i = 1; i <= SAMPLES; i++) {
      const y = (i / SAMPLES) * height;
      d += ` L ${round(width - rightOffset(y))} ${round(y)}`;
    }
    // Bottom edge across to the left wave.
    d += ` L ${round(leftOffset(height))} ${round(height)}`;
    // Left edge, bottom → top.
    for (let i = SAMPLES - 1; i >= 0; i--) {
      const y = (i / SAMPLES) * height;
      d += ` L ${round(leftOffset(y))} ${round(y)}`;
    }
    return d + " Z";
  };
}

/**
 * Build the FlowAround for a Text slot positioned at `textTopInFrame` /
 * `textLeftInFrame` within the Frame. `intrusionAt` is queried in text-local
 * coords; we translate up into frame coords, query the same `leftOffset` the
 * path used, and subtract the slot's own x-inset to get how far the wave
 * actually eats INTO the text column.
 *
 * Like cornerBlob, we sample across the band and return the max so a wave
 * crest never pokes through a line that nominally sits between two samples.
 */
export function makeFlow(
  params: ShapeParams,
  textTopInFrame: number,
  textLeftInFrame: number,
  gap: number,
): FlowAround {
  const leftOffset = makeLeftOffset(params);
  return {
    gap,
    intrusionAt(yTopLocal, yBottomLocal) {
      const top = yTopLocal + textTopInFrame;
      const bot = yBottomLocal + textTopInFrame;
      let max = 0;
      const STEPS = 6;
      for (let i = 0; i <= STEPS; i++) {
        const y = top + ((bot - top) * i) / STEPS;
        max = Math.max(max, leftOffset(y));
      }
      return Math.max(0, max - textLeftInFrame);
    },
  };
}
