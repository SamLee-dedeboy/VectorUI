import type { SVGProps } from "react";
import { Path } from "../svg/Path";
import { Text } from "./Text";
import {
  useActualTextMetrics,
  useNaturalTextWidth,
} from "../layout/textWidth";
import { getFontMetrics } from "../layout/measureText";
import { useCoordinateScale } from "../layout/coordinateScale";
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
  const labelWidth = useNaturalTextWidth(
    children,
    textStyle.font,
    textStyle.letterSpacing,
  );
  const width = labelWidth + paddingX * 2;
  const ox = origin === "center" ? -width / 2 : 0;
  const oy = origin === "center" ? -height / 2 : 0;

  // Vertical centering by CAP HEIGHT, not font box.
  //
  // `Text` defaults to CSS-line-box centering — `halfLeading + ascentPx` —
  // which is correct for a paragraph but leaves a single-line label *visibly
  // off-centre* inside its shape: Inter's font bounding box reserves ~13px
  // above the baseline (room for diacritics) and ~3px below, so centring
  // the asymmetric box drops the ink ~0.3-1.5px low.
  //
  // The standard button-typography convention is to centre the CAP HEIGHT
  // rather than the whole ink box — descenders then dip *below* the visual
  // centre, exactly how a CSS button renders text. The reference is a fixed
  // capital-only string (`"H"`), NOT the pill's actual label, so every pill
  // in a row shares one baseline: "Save" and "Library" align at the cap-top
  // and baseline, and Library's "y" descender simply extends below.
  const fontBox = getFontMetrics(textStyle.font);
  const cap = useActualTextMetrics("H", textStyle.font);
  const baselineOffsetPx =
    (cap.actAscPx - cap.actDescPx - fontBox.ascentPx + fontBox.descentPx) / 2;

  // Bridge the two coordinate spaces. `height` (the pill) is in LAYOUT units;
  // `Text.lineHeight` and the metrics above are in CSS PX. They coincide only
  // at scale 1 — at any other viewBox scale, passing the layout-unit height
  // straight in as a px line-height makes the line box `height/scale` tall, so
  // the label rides high/low. Convert: the line box must be `height * scale`
  // px to fill the pill, and the px baseline correction becomes a layout-unit
  // `y` once divided back by scale.
  const { scale } = useCoordinateScale();
  const s = scale || 1;

  return (
    <g {...gProps}>
      <g transform={ox || oy ? `translate(${ox} ${oy})` : undefined}>
        <Path d={tokens.shapes.pill(width, height)} fill={fill} />
        {/* The label is left-aligned at paddingX (which centres it
            horizontally since width = label + 2·paddingX). `lineHeight`
            fills the pill in px; the `y` offset converts font-box centring
            into cap-height centring — see the comment above. */}
        <Text
          font={textStyle.font}
          lineHeight={height * s}
          letterSpacing={textStyle.letterSpacing}
          maxWidth={width}
          x={paddingX}
          y={baselineOffsetPx / s}
          fill={textFill}
        >
          {children}
        </Text>
      </g>
    </g>
  );
}
