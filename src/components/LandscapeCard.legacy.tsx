/**
 * **Archived original implementation of `LandscapeCard`.**
 *
 * Preserved as the ground-truth reference for the simpler `Card`-composition
 * version (current `src/components/LandscapeCard.tsx`). Not exported from
 * `src/index.ts`; not used by any demo. Kept so the original two-slot Frame
 * design (title slot is a shape-fit override on the inner feature; body slot
 * uses WrapText/Float around it) can be diffed against the new composition,
 * and so we can fall back to it if the composition's title-fills-feature
 * behaviour drifts visually.
 *
 * Diff vs the new version:
 *  - This one declares its own Frame and two slots (title + body) directly.
 *  - The new one is a thin `<Card body={<WrapText>…<Float>title</Float>…</WrapText>}/>`,
 *    where the title-fills-feature comes from `<Float>` accepting text
 *    children that fill its interior via shape-fit (occupancy intersect).
 */

import { useMemo, type SVGProps } from "react";
import { Frame, type ShapeGenerator } from "./Frame";
import { Text } from "./Text";
import { WrapText } from "./WrapText";
import { Float } from "./Float";
import { tokens, type TextStyle } from "../tokens";

const { space, type, filters } = tokens;

const DEFAULTS = {
  width: 420,
  padding: space.xl,
  flowGap: 4,
  titlePadding: 8,
} as const;

export type LandscapeCardLegacyProps = Omit<
  SVGProps<SVGGElement>,
  "width" | "height" | "fill" | "stroke" | "strokeWidth" | "children"
> & {
  outline: ShapeGenerator;
  feature: ShapeGenerator;
  featureWidth: number;
  featureHeight: number;
  width?: number | "auto";
  height?: number | "auto";
  padding?: number;
  flowGap?: number;
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

export function LandscapeCardLegacy({
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
}: LandscapeCardLegacyProps) {
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
