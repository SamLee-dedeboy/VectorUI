import { Frame } from "../../components/Frame";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { useViewportWidth } from "../../layout/breakpoints";
import { usePrefersReducedMotion } from "../../layout/motion";
import { morphPath } from "../../layout/morphPath";
import { smoothstep } from "../../layout/easings";
import { tokens } from "../../tokens";

/**
 * `MorphCard` — a reusable card whose shape responds to the viewport width.
 *
 * Pass an ordered list of `stops`: at each stop's `minWidth`, the card adopts
 * that stop's `shape`. Between two adjacent stops, the outline eases from one
 * to the next across a `band` of pixels centered on the upper stop's boundary.
 *
 * Because every shape generator in `tokens.shapes` emits the same
 * eight-quadratic command structure, the per-boundary morphs compose
 * iteratively — `morphPath(morphPath(A, B, t1), C, t2)` is well-defined and
 * collapses to a pure stop whenever the corresponding `t` saturates.
 *
 * Must be rendered under a `VectorUIRoot` (reads `useViewportWidth`).
 */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export type MorphStop = {
  /** Real-pixel viewport width at which this stop becomes the dominant shape. */
  minWidth: number;
  /** A shape generator from `tokens.shapes` (or any matched-structure path fn). */
  shape: (w: number, h: number) => string;
};

export type MorphCardProps = {
  title: string;
  caption: string;
  /** Card box size, in layout units. */
  width?: number;
  height?: number;
  /** Ordered ascending by `minWidth`. The first stop's `minWidth` is unused. */
  stops: MorphStop[];
  /** Viewport-pixel band over which each boundary eases. */
  band?: number;
  /** Card surface fill. */
  surface?: string;
  /** Title text color. */
  titleFill?: string;
  /** Caption text color. */
  captionFill?: string;
};

/** Activation 0→1 of a single boundary, centered on `threshold`. */
function boundaryActivation(width: number, threshold: number, band: number) {
  if (band <= 0) return width >= threshold ? 1 : 0;
  return clamp01((width - (threshold - band / 2)) / band);
}

export function MorphCard({
  title,
  caption,
  width = 430,
  height = 200,
  stops,
  band = 120,
  surface = tokens.color.surface,
  titleFill = tokens.color.ink,
  captionFill = tokens.color.inkMuted,
}: MorphCardProps) {
  const viewportWidth = useViewportWidth();
  const reduced = usePrefersReducedMotion();

  if (stops.length < 2) {
    throw new Error("MorphCard: requires at least two stops");
  }

  const shape = (w: number, h: number) => {
    let d = stops[0].shape(w, h);
    for (let i = 1; i < stops.length; i++) {
      const raw = boundaryActivation(viewportWidth, stops[i].minWidth, band);
      // Reduced motion: snap to the nearer shape instead of easing.
      const t = reduced ? (raw < 0.5 ? 0 : 1) : smoothstep(raw);
      d = morphPath(d, stops[i].shape(w, h), t);
    }
    return d;
  };

  return (
    <Frame
      shape={shape}
      width={width}
      height={height}
      slots={{
        label: {
          type: "region",
          x: 40,
          y: height / 2 - 28,
          width: width - 80,
          height: 56,
        },
      }}
      fill={surface}
      filter={tokens.filters.softShadow}
      title={title}
      role="region"
      aria-label="A card whose shape responds to viewport width"
    >
      <Frame.Slot name="label">
        {/* A Flow stacks the caption below the title by measured bounds —
            no scale-aware y-offset, even as the viewBox scales. */}
        <Flow gap={tokens.space.xs}>
          <Text {...tokens.type.title} maxWidth="100%" fill={titleFill}>
            {title}
          </Text>
          <Text {...tokens.type.caption} maxWidth="100%" fill={captionFill}>
            {caption}
          </Text>
        </Flow>
      </Frame.Slot>
    </Frame>
  );
}
