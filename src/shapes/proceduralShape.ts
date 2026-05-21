import type { ShapeGenerator } from "../components/Frame";
import type { FlowAround } from "../components/Text";
import { intrusionFromReach } from "../layout/intrusionSampling";

/**
 * A vertical container whose LEFT edge undulates inward (and, optionally,
 * mirrors on the right purely for decoration). The same `leftOffset(y)`
 * closed-form drives the rendered SVG path AND the `Text` component's
 * `intrusionAt` query — so every text line wraps the exact contour you see.
 *
 * This is the dynamic-slider counterpart to `cornerBlob`: the single-source
 * trick (one curve, two consumers) is what keeps wrap and shape in lockstep
 * across every slider tick.
 *
 * All coordinates are in layout units (y=0 at the frame top).
 */

export type ShapeParams = {
  amplitude: number;
  frequency: number;
  phase: number;
  mirrorRight: boolean;
};

export type ProceduralShapeOptions = {
  /**
   * Reference height used to compute the wave's angular frequency. Decoupling
   * the wavelength from the auto-derived frame height prevents a feedback
   * loop (text wraps → height changes → wavelength would shift → wrap would
   * change → …). The default (320) matches Demo 6's tuning; expose it as a
   * prop if you're pouring text through a shape much taller or shorter and
   * the per-frame wavelength visibly changes character.
   */
  waveReferenceHeight?: number;
};

const DEFAULT_WAVE_REFERENCE_HEIGHT = 320;

/** How far the left edge reaches inward at frame-y, in layout units. */
function makeLeftOffset(
  { amplitude, frequency, phase }: ShapeParams,
  referenceHeight: number,
) {
  const omega = (2 * Math.PI * frequency) / referenceHeight;
  return (y: number): number =>
    amplitude * (0.5 + 0.5 * Math.sin(omega * y + phase));
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Closed outline: top edge, sampled right edge, bottom edge, sampled left edge. */
export function makeShape(
  params: ShapeParams,
  options: ProceduralShapeOptions = {},
): ShapeGenerator {
  const referenceHeight =
    options.waveReferenceHeight ?? DEFAULT_WAVE_REFERENCE_HEIGHT;
  const leftOffset = makeLeftOffset(params, referenceHeight);
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
 * `textLeftInFrame` within the Frame. The reach function queries the same
 * `leftOffset` the path used and subtracts the slot's own x-inset to get how
 * far the wave actually eats INTO the text column.
 */
export function makeFlow(
  params: ShapeParams,
  textTopInFrame: number,
  textLeftInFrame: number,
  gap: number,
  options: ProceduralShapeOptions = {},
): FlowAround {
  const referenceHeight =
    options.waveReferenceHeight ?? DEFAULT_WAVE_REFERENCE_HEIGHT;
  const leftOffset = makeLeftOffset(params, referenceHeight);
  return {
    gap,
    intrusionAt: intrusionFromReach((yLocal) =>
      Math.max(0, leftOffset(yLocal + textTopInFrame) - textLeftInFrame),
    ),
  };
}
