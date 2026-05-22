import type { SVGProps } from "react";
import { Path } from "../svg/Path";
import { Text } from "./Text";
import {
  useActualTextMetrics,
  useNaturalTextWidth,
} from "../layout/textWidth";
import { getFontMetrics } from "../layout/measureText";
import { tokens, type TextStyle } from "../tokens";
import type { ShapeGenerator } from "./Frame";

/**
 * Layer 3 — `Pill`: a text label shrink-wrapped in a shape.
 *
 * Folds the measure-a-label-then-size-a-shape ritual that buttons and tabs
 * kept re-implementing: it measures the label, sizes the shape to it, and
 * centers the label inside. Width is always derived from the label; height is
 * derived too unless you pin it. The shape defaults to a pill (fully rounded)
 * but any `ShapeGenerator` works — so "arbitrary-shape pills" are just a prop.
 *
 * The whole pill is rendered in LAYOUT units (`Text sizing="layout"`), so it
 * scales with the viewBox as one unit and there is no px↔layout boundary
 * inside it — which is what keeps the label centred at any scale, with no
 * `scale` arithmetic in this component at all.
 *
 * Presentational only — pass `role`/`onClick`/`fill` through for interaction
 * and per-state styling.
 */
export type PillProps = Omit<SVGProps<SVGGElement>, "children"> & {
  /** The label text. */
  children: string;
  /** Type token for the label. Its `lineHeight` is not used — the pill
   *  centers the single line within the (derived or given) height itself. */
  textStyle: TextStyle;
  /** Pill height, in layout units. Omit to derive it from the label's cap
   *  height + `paddingY` (the pill hugs the text). */
  height?: number;
  /** Horizontal padding around the label, in layout units. */
  paddingX?: number;
  /** Vertical padding above/below the label's cap height, in layout units.
   *  Only used when `height` is omitted. */
  paddingY?: number;
  /** Shape generator for the outline. Defaults to `tokens.shapes.pill`; pass
   *  e.g. `tokens.shapes.leaf` for a non-rectilinear chip. */
  shape?: ShapeGenerator;
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
  paddingY = 9,
  shape = tokens.shapes.pill,
  fill = tokens.color.accent,
  textFill = tokens.color.accentInk,
  origin = "top-left",
  ...gProps
}: PillProps) {
  // All in LAYOUT units. `sizing: "layout"` means the natural width is the
  // measured advance read directly as layout units (the font scales with the
  // viewBox), matching the `Text sizing="layout"` below — so the pill and its
  // label share one unit and stay in lockstep at any scale.
  const labelWidth = useNaturalTextWidth(
    children,
    textStyle.font,
    textStyle.letterSpacing,
    "layout",
  );
  const width = labelWidth + paddingX * 2;

  // Vertical centering by CAP HEIGHT, not font box.
  //
  // CSS-line-box centering (`halfLeading + ascent`) is right for a paragraph
  // but leaves a single-line label visibly low: a Latin font's box reserves
  // far more above the baseline (room for diacritics) than below. The button
  // convention is to centre the CAP HEIGHT — descenders then dip below the
  // visual centre, exactly how a CSS button renders. The reference is a fixed
  // capital ("H"), not the actual label, so every pill in a row shares one
  // baseline regardless of its own ascenders/descenders.
  //
  // In layout mode the canvas px metrics ARE the layout-unit metrics (the font
  // number is the same; only the unit label changes), so they're used raw —
  // no `scale` conversion, which is what retired the old px↔layout bridge.
  const fontBox = getFontMetrics(textStyle.font);
  const cap = useActualTextMetrics("H", textStyle.font);
  const baselineOffset =
    (cap.actAscPx - cap.actDescPx - fontBox.ascentPx + fontBox.descentPx) / 2;

  // Auto-height: cap height + symmetric vertical padding. Pinned height wins.
  const resolvedHeight = height ?? cap.actAscPx - cap.actDescPx + paddingY * 2;

  const ox = origin === "center" ? -width / 2 : 0;
  const oy = origin === "center" ? -resolvedHeight / 2 : 0;

  return (
    <g {...gProps}>
      <g transform={ox || oy ? `translate(${ox} ${oy})` : undefined}>
        <Path d={shape(width, resolvedHeight)} fill={fill} />
        {/* Left-aligned at paddingX (which centres it horizontally since
            width = label + 2·paddingX). `lineHeight` fills the shape; the `y`
            offset converts font-box centring into cap-height centring. */}
        <Text
          font={textStyle.font}
          lineHeight={resolvedHeight}
          letterSpacing={textStyle.letterSpacing}
          maxWidth={width}
          x={paddingX}
          y={baselineOffset}
          fill={textFill}
          sizing="layout"
        >
          {children}
        </Text>
      </g>
    </g>
  );
}
