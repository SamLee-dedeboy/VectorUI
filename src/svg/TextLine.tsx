import type { SVGProps } from "react";

/**
 * Layer 1 render primitive: one line of text as a single `<text>` element.
 *
 * The layout engine (Layer 2) decides where each line goes; this primitive
 * just emits it. Coordinates and `fontSizePx` are whatever the caller passes
 * — TextLine does no coordinate conversion.
 */
export type TextLineProps = Omit<SVGProps<SVGTextElement>, "x" | "y"> & {
  x: number;
  /** Baseline y of the line. */
  y: number;
  fontFamily: string;
  fontSizePx: number;
  fontWeight?: number | string;
  letterSpacingPx?: number;
  children: string;
};

export function TextLine({
  x,
  y,
  fontFamily,
  fontSizePx,
  fontWeight,
  letterSpacingPx,
  children,
  ...rest
}: TextLineProps) {
  return (
    <text
      x={x}
      y={y}
      fontFamily={fontFamily}
      fontSize={fontSizePx}
      fontWeight={fontWeight}
      letterSpacing={letterSpacingPx}
      // The layout engine already positioned the baseline precisely.
      dominantBaseline="alphabetic"
      {...rest}
    >
      {children}
    </text>
  );
}
