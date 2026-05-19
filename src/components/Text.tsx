import { useEffect, useMemo, type SVGProps } from "react";
import { TextLine } from "../svg/TextLine";
import { useCoordinateScale } from "../layout/coordinateScale";
import { useSlot } from "../layout/slot";
import { useFontsReady } from "../layout/fonts";
import { layoutParagraph, layoutFlowParagraph } from "../layout/measureText";

/**
 * A floated shape for text to wrap around (SPEC §6.3, `flowAround`).
 *
 * `intrusionAt` answers, in LAYOUT UNITS, how far the float reaches in from
 * the left edge of the text column over a vertical band — with coordinates
 * relative to this Text block's own top-left. `rightIntrusionAt` does the same
 * from the right edge, for a shape (such as an archway) that wraps text on
 * both sides. The Text component converts to pixel space internally.
 */
export type FlowAround = {
  intrusionAt: (yTopLayout: number, yBottomLayout: number) => number;
  /** Right-edge intrusion, for a shape that wraps text on both sides. */
  rightIntrusionAt?: (yTopLayout: number, yBottomLayout: number) => number;
  /** Gap between the float's edge and the text, in layout units. */
  gap?: number;
};

/**
 * Layer 3 — multi-line SVG text, powered by pretext.
 *
 * Text lives in PIXEL space (SPEC §5): it is measured and broken in real CSS
 * pixels so body copy does not shrink when the viewBox scales. The block is
 * positioned in layout units via `x`/`y`, then its contents are drawn inside a
 * `scale(1 / scale)` group — so a 16px font renders at 16 real pixels
 * regardless of the current viewBox scale.
 */

export type TextMeasurement = {
  /** Width actually used by the wrapped block, in layout units. */
  width: number;
  /** Height of the block, in layout units. */
  height: number;
};

export type TextProps = Omit<
  SVGProps<SVGGElement>,
  "x" | "y" | "color" | "children"
> & {
  children: string;
  /** CSS font shorthand, e.g. "16px Inter" or "600 18px Inter". */
  font: string;
  /** Line box height, in CSS px. */
  lineHeight: number;
  /** Wrap width in layout units, or "100%" to fill to the viewBox edge. */
  maxWidth: number | "100%";
  /** Top-left of the text block, in layout units. Defaults to 0,0. */
  x?: number;
  y?: number;
  fill?: string;
  letterSpacing?: number;
  /** Wrap text around a floated shape instead of a plain rectangle. */
  flowAround?: FlowAround;
  /** Reports the wrapped block size (layout units) once measured. */
  onMeasure?: (size: TextMeasurement) => void;
};

type ParsedFont = {
  sizePx: number;
  family: string;
  weight?: string;
  style?: string;
};

/** Parse a CSS font shorthand into the parts SVG <text> needs separately. */
function parseFont(font: string): ParsedFont {
  const m = font.match(
    /^\s*(?:(italic|oblique|normal)\s+)?(?:(\d{3}|bold|bolder|lighter|normal)\s+)?(\d+(?:\.\d+)?)px\s+(.+?)\s*$/i,
  );
  if (!m) return { sizePx: parseFloat(font) || 16, family: "sans-serif" };
  return {
    style: m[1],
    weight: m[2],
    sizePx: parseFloat(m[3]),
    family: m[4],
  };
}

export function Text({
  children,
  font,
  lineHeight,
  maxWidth,
  x = 0,
  y = 0,
  fill = "currentColor",
  letterSpacing,
  flowAround,
  onMeasure,
  ...groupProps
}: TextProps) {
  const { scale, viewBoxWidth } = useCoordinateScale();
  const slot = useSlot();
  const fontsReady = useFontsReady();
  const parsed = useMemo(() => parseFont(font), [font]);

  // maxWidth is in layout units; pretext works in px. "100%" resolves to the
  // enclosing slot's width, or the viewBox edge when not inside a slot.
  const maxWidthLayout =
    maxWidth === "100%" ? (slot?.width ?? viewBoxWidth - x) : maxWidth;
  const maxWidthPx = maxWidthLayout * scale;

  const paragraph = useMemo(
    () => {
      if (flowAround) {
        const gap = flowAround.gap ?? 0;
        return layoutFlowParagraph({
          text: children,
          font,
          columnWidthPx: maxWidthPx,
          lineHeightPx: lineHeight,
          letterSpacingPx: letterSpacing,
          gapPx: gap * scale,
          // Convert the float's layout-unit profile(s) into pixel space.
          intrusionAtPx: (yTopPx, yBottomPx) =>
            flowAround.intrusionAt(yTopPx / scale, yBottomPx / scale) * scale,
          rightIntrusionAtPx: flowAround.rightIntrusionAt
            ? (yTopPx, yBottomPx) =>
                flowAround.rightIntrusionAt!(
                  yTopPx / scale,
                  yBottomPx / scale,
                ) * scale
            : undefined,
        });
      }
      return layoutParagraph({
        text: children,
        font,
        maxWidthPx,
        lineHeightPx: lineHeight,
        letterSpacingPx: letterSpacing,
      });
    },
    // fontsReady is a measurement dependency: caches flush when it flips.
    [children, font, maxWidthPx, lineHeight, letterSpacing, fontsReady, flowAround, scale],
  );

  // Report block size back to a parent (e.g. a height="auto" Frame later).
  useEffect(() => {
    onMeasure?.({
      width: maxWidthLayout,
      height: scale === 0 ? 0 : paragraph.heightPx / scale,
    });
  }, [onMeasure, maxWidthLayout, paragraph.heightPx, scale]);

  const invScale = scale === 0 ? 1 : 1 / scale;

  return (
    <g
      transform={`translate(${x} ${y}) scale(${invScale})`}
      fill={fill}
      {...groupProps}
    >
      {paragraph.lines.map((line, i) => (
        <TextLine
          key={i}
          x={line.xPx}
          y={line.baselineYPx}
          fontFamily={parsed.family}
          fontSizePx={parsed.sizePx}
          fontWeight={parsed.weight}
          fontStyle={parsed.style}
          letterSpacingPx={letterSpacing}
          style={{ whiteSpace: "pre" }}
        >
          {line.text}
        </TextLine>
      ))}
    </g>
  );
}
