import { Frame } from "../../components/Frame";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { useViewportWidth } from "../../layout/breakpoints";
import { breakpointMorph } from "../../layout/breakpoints";
import { usePrefersReducedMotion } from "../../layout/motion";
import { morphPath } from "../../layout/morphPath";
import { tokens } from "../../tokens";

/**
 * `MorphCard` — a reusable card whose shape responds to the viewport width.
 *
 * As the real pixel width crosses `threshold`, the outline morphs from a blob
 * to a sharp rounded rectangle, eased across `band`. Must be rendered under a
 * `VectorUIRoot` (it reads `useViewportWidth`).
 */

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export type MorphCardProps = {
  title: string;
  caption: string;
  /** Card box size, in layout units. */
  width?: number;
  height?: number;
  /** Viewport width (px) at which the shape is half-morphed. */
  threshold?: number;
  /** Viewport-width band (px) over which the morph eases. */
  band?: number;
};

export function MorphCard({
  title,
  caption,
  width = 430,
  height = 200,
  threshold = 600,
  band = 150,
}: MorphCardProps) {
  const viewportWidth = useViewportWidth();
  const reduced = usePrefersReducedMotion();

  const raw = breakpointMorph(viewportWidth, threshold, band);
  // Reduced motion: snap to one shape or the other instead of easing.
  const t = reduced ? (raw < 0.5 ? 0 : 1) : smoothstep(raw);

  const shape = (w: number, h: number) =>
    morphPath(tokens.shapes.blob(w, h, 0.25), tokens.shapes.sharp(w, h), t);

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
      fill={tokens.color.surface}
      filter={tokens.filters.softShadow}
      title={title}
      role="region"
      aria-label="A card whose shape responds to viewport width"
    >
      <Frame.Slot name="label">
        {/* A Flow stacks the caption below the title by measured bounds —
            no scale-aware y-offset, even as the viewBox scales. */}
        <Flow gap={tokens.space.xs}>
          <Text {...tokens.type.title} maxWidth="100%" fill={tokens.color.ink}>
            {title}
          </Text>
          <Text
            {...tokens.type.caption}
            maxWidth="100%"
            fill={tokens.color.inkMuted}
          >
            {caption}
          </Text>
        </Flow>
      </Frame.Slot>
    </Frame>
  );
}
