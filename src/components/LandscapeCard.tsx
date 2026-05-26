import { useMemo, type SVGProps } from "react";
import { Card } from "./Card";
import { WrapText } from "./WrapText";
import { Float } from "./Float";
import { type ShapeGenerator } from "./Frame";
import { tokens, type TextStyle } from "../tokens";

/**
 * Layer 3 — `LandscapeCard`: a `Card` whose body wraps an inner **feature**
 * shape; the feature itself holds the title.
 *
 * This is a thin composition over the library's core components — no header,
 * no actions, just a body whose content is a `WrapText` around a `<Float>` that
 * draws the feature shape and renders the title text inside it via shape-fit:
 *
 * ```tsx
 * <Card shape={outline} body={
 *   <WrapText {...bodyStyle}>
 *     <Float d={featurePath} textStyle={titleStyle}>{title}</Float>
 *     {body}
 *   </WrapText>
 * }/>
 * ```
 *
 * The same `Float` does three jobs from one path: drawn shape, wrap contour
 * for the surrounding body (occupancy union), and interior contour for the
 * title (occupancy intersect). No bespoke slot, no per-shape intrusion.
 *
 * The legacy two-slot Frame implementation is preserved in
 * `LandscapeCard.legacy.tsx` as a fallback / diff reference.
 */

const { type } = tokens;

const DEFAULTS = {
  width: 420,
  flowGap: 4,
  titlePadding: 8,
} as const;

export type LandscapeCardProps = Omit<
  SVGProps<SVGGElement>,
  "width" | "height" | "fill" | "stroke" | "strokeWidth" | "children"
> & {
  /** The card's outer outline. */
  outline: ShapeGenerator;
  /** An inner shape: drawn as a Float, wrapped by the body, fills the title. */
  feature: ShapeGenerator;
  /** Natural size of the feature, in layout units. */
  featureWidth: number;
  featureHeight: number;
  /** Card width, in layout units. */
  width?: number | "auto";
  /** Card height. Defaults to `"auto"`. */
  height?: number | "auto";
  /** Inner padding around the content. */
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
  padding,
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
  const featurePath = useMemo(
    () => feature(featureWidth, featureHeight),
    [feature, featureWidth, featureHeight],
  );

  return (
    <Card
      shape={outline}
      width={width}
      height={height}
      {...(padding != null ? { padding } : {})}
      surface={surface}
      bodyStyle={bodyStyle}
      bodyFill={bodyFill}
      body={
        <WrapText {...bodyStyle} fill={bodyFill} gap={flowGap}>
          <Float
            d={featurePath}
            fill={featureFill}
            textStyle={titleStyle}
            textFill={titleFill}
            textPadding={titlePadding}
          >
            {title}
          </Float>
          {body}
        </WrapText>
      }
      {...gProps}
    />
  );
}
