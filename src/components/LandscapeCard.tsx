import { useMemo, type SVGProps } from "react";
import { Frame, type ShapeGenerator } from "./Frame";
import { Text } from "./Text";
import { WrapText } from "./WrapText";
import { Float } from "./Float";
import { tokens, type TextStyle } from "../tokens";

/**
 * Layer 3 — `LandscapeCard`: a card whose interior carries a **feature shape**
 * (e.g. a triangle) that holds the title and is wrapped by the body.
 *
 * Both the outer card and the inner feature are passed in as `ShapeGenerator`
 * props — `LandscapeCard` knows nothing shape-specific. The title slot is a
 * **shape-fit** slot with the *feature* as its override shape: the title text
 * auto-fills the feature's interior contour. The body slot uses `WrapText` +
 * `Float` so the body paragraph flows AROUND the feature's silhouette (the
 * Float draws the feature once, and derives the wrap from the same path).
 *
 * ```tsx
 * <LandscapeCard
 *   outline={(w, h) => wobblyRect(w, h)}      // outer card
 *   feature={(w, h) => triangleFloat({ width: 220, height: 175 }).path}
 *   featureWidth={220} featureHeight={175}    // natural size for placement
 *   title="…"
 *   body="…"
 * />
 * ```
 */

const { space, type, filters } = tokens;

const DEFAULTS = {
  width: 420,
  padding: space.xl,
  flowGap: 4,
  titlePadding: 8,
} as const;

export type LandscapeCardProps = Omit<
  SVGProps<SVGGElement>,
  "width" | "height" | "fill" | "stroke" | "strokeWidth" | "children"
> & {
  /** The card's outer outline. */
  outline: ShapeGenerator;
  /** An inner shape that holds the title and is wrapped by the body. */
  feature: ShapeGenerator;
  /** Natural size of the feature, in layout units. Used to place it inside
   *  the card and as the title slot's column width. */
  featureWidth: number;
  featureHeight: number;
  /** Card width, in layout units. */
  width?: number | "auto";
  /** Card height. Defaults to `"auto"` (shrink-wraps to body height). */
  height?: number | "auto";
  /** Inner padding around the content, layout units. */
  padding?: number;
  /** Gap between the body text and the feature's contour. */
  flowGap?: number;
  /** Inset from the feature's slopes for the title text. */
  titlePadding?: number;

  title: string;
  body: string;
  titleStyle?: TextStyle;
  bodyStyle?: TextStyle;
  surface?: string;
  featureFill?: string;
  titleFill?: string;
  bodyFill?: string;
};

export function LandscapeCard({
  outline,
  feature,
  featureWidth,
  featureHeight,
  width = DEFAULTS.width,
  height = "auto",
  padding = DEFAULTS.padding,
  flowGap = DEFAULTS.flowGap,
  titlePadding = DEFAULTS.titlePadding,
  title,
  body,
  titleStyle = type.heading,
  bodyStyle = type.body,
  surface = tokens.color.surface,
  featureFill = tokens.color.ink,
  titleFill = tokens.color.surface,
  bodyFill = tokens.color.ink,
  ...gProps
}: LandscapeCardProps) {
  // Render the feature path once and share between title (shape-fit override)
  // and body (Float that draws + wraps).
  const featurePath = useMemo(
    () => feature(featureWidth, featureHeight),
    [feature, featureWidth, featureHeight],
  );

  return (
    <Frame
      shape={outline}
      width={width}
      height={height}
      padding={padding}
      slots={{
        // Title fits inside the feature's contour. Same origin as the body
        // slot so the title visually sits on the feature drawn there.
        title: {
          type: "shape-fit",
          mode: "text",
          x: padding,
          y: padding,
          width: featureWidth,
          height: "content",
          shape: () => featurePath,
          padding: titlePadding,
        },
        body: {
          type: "region",
          x: padding,
          y: padding,
          height: "content",
        },
      }}
      fill={surface}
      filter={filters.softShadow}
      title={title}
      role="region"
      {...gProps}
    >
      {/* Render body first so the title slot (rendered after) stacks on top
          of the feature path drawn inside the WrapText. */}
      <Frame.Slot name="body">
        <WrapText {...bodyStyle} fill={bodyFill} gap={flowGap}>
          <Float d={featurePath} fill={featureFill} />
          {body}
        </WrapText>
      </Frame.Slot>
      <Frame.Slot name="title">
        <Text {...titleStyle} fill={titleFill} overflowWrap="normal">
          {title}
        </Text>
      </Frame.Slot>
    </Frame>
  );
}
