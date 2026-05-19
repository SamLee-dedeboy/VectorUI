import type { SVGProps } from "react";
import { Path } from "../svg/Path";
import { Text } from "./Text";
import { useNaturalTextWidth } from "../layout/textWidth";
import { tokens, type TextStyle } from "../tokens";

/**
 * Layer 3 — `Pill`: a text label shrink-wrapped in a pill shape.
 *
 * Folds the measure-a-label-then-size-a-shape ritual that buttons and tabs
 * kept re-implementing: it measures the label (in layout units, via
 * `useNaturalTextWidth` — no `scale` in sight), sizes the pill to it, and
 * centers the label inside.
 *
 * Presentational only — pass `role`/`onClick`/`fill` through for interaction
 * and per-state styling.
 */
export type PillProps = Omit<SVGProps<SVGGElement>, "children"> & {
  /** The label text. */
  children: string;
  /** Type token for the label. Its `lineHeight` is not used — the pill
   *  centers the single line within `height` itself. */
  textStyle: TextStyle;
  /** Pill height, in layout units. */
  height: number;
  /** Horizontal padding around the label, in layout units. */
  paddingX?: number;
  /** Pill fill. */
  fill?: string;
  /** Label color. */
  textFill?: string;
  /** Where the pill sits relative to the component's origin. "center" is
   *  handy when a parent (e.g. PathFlow) places the origin on a point. */
  origin?: "top-left" | "center";
};

export function Pill({
  children,
  textStyle,
  height,
  paddingX = 16,
  fill = tokens.color.accent,
  textFill = tokens.color.accentInk,
  origin = "top-left",
  ...gProps
}: PillProps) {
  const labelWidth = useNaturalTextWidth(children, textStyle.font);
  const width = labelWidth + paddingX * 2;
  const ox = origin === "center" ? -width / 2 : 0;
  const oy = origin === "center" ? -height / 2 : 0;

  return (
    <g {...gProps}>
      <g transform={ox || oy ? `translate(${ox} ${oy})` : undefined}>
        <Path d={tokens.shapes.pill(width, height)} fill={fill} />
        {/* Setting lineHeight to the pill height vertically-centers the single
            line via half-leading; the label is left-aligned at paddingX,
            which — since width = label + 2·paddingX — centers it too. */}
        <Text
          font={textStyle.font}
          lineHeight={height}
          letterSpacing={textStyle.letterSpacing}
          maxWidth={width}
          x={paddingX}
          fill={textFill}
        >
          {children}
        </Text>
      </g>
    </g>
  );
}
