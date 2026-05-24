import { useEffect, useMemo, type SVGProps } from "react";
import { TextLine } from "../svg/TextLine";
import { useCoordinateScale } from "../layout/coordinateScale";
import { useSlot } from "../layout/slot";
import { useFontsReady } from "../layout/fonts";
import {
  layoutParagraph,
  layoutFlowParagraph,
  type OverflowWrap,
} from "../layout/measureText";

export type { OverflowWrap };

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
  intrusionAt?: (yTopLayout: number, yBottomLayout: number) => number;
  /** Right-edge intrusion, for a shape that wraps text on both sides. */
  rightIntrusionAt?: (yTopLayout: number, yBottomLayout: number) => number;
  /**
   * Occupied x-intervals (layout units, column coords) over a line band. When
   * given, supersedes `intrusionAt`/`rightIntrusionAt`: text flows into every
   * *free* segment of the line — left of, between, and right of the floats —
   * not just a single run inset from the edges.
   */
  occupancyAt?: (
    yTopLayout: number,
    yBottomLayout: number,
  ) => Array<[number, number]>;
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
  /** Wrap width in layout units, or "100%" to fill the available width.
   *  Defaults to `"100%"` — like a block element, text fills its container and
   *  wraps. "Available width" is the enclosing `Flow`'s content box (inside its
   *  padding) or `Frame` slot, falling back to the viewBox edge. */
  maxWidth?: number | "100%";
  /** Top-left of the text block, in layout units. Defaults to 0,0. */
  x?: number;
  y?: number;
  fill?: string;
  letterSpacing?: number;
  /**
   * Coordinate space the text is sized in:
   *  - `"screen"` (default) — `font`/`lineHeight` are CSS px and the text
   *    renders at a constant pixel size regardless of the viewBox scale
   *    (SPEC §5: body copy must not shrink when the surface scales).
   *  - `"layout"` — `font`/`lineHeight`/`letterSpacing` are read as LAYOUT
   *    units, so the text scales with the viewBox like the shapes around it.
   *    Use for labels that are part of a graphic (a `Pill`, a label placed on
   *    a curve) so the whole graphic scales as one unit and there is no
   *    px↔layout boundary inside the shape.
   */
  sizing?: "screen" | "layout";
  /** Wrap text around a floated shape instead of a plain rectangle. */
  flowAround?: FlowAround;
  /**
   * How long words are handled when they don't fit on a line — matches CSS
   * `overflow-wrap`. Defaults to `"break-word"` (split a word that overflows).
   * Set `"normal"` to keep words whole and let them spill past the contour —
   * useful when text is poured through a shape that pinches narrower than a
   * single word.
   */
  overflowWrap?: OverflowWrap;
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
  maxWidth = "100%",
  x = 0,
  y = 0,
  fill = "currentColor",
  letterSpacing,
  sizing = "screen",
  flowAround,
  overflowWrap,
  onMeasure,
  ...groupProps
}: TextProps) {
  const { scale, viewBoxWidth } = useCoordinateScale();
  const slot = useSlot();
  const fontsReady = useFontsReady();
  const parsed = useMemo(() => parseFont(font), [font]);

  // The factor that takes a layout-unit length into the space pretext measures
  // in. Screen mode measures in CSS px (so layout × scale); layout mode treats
  // the font's number as layout units directly and measures in that same space
  // (factor 1) — line-breaking is scale-invariant, so we measure at the font's
  // natural px size and simply relabel the results as layout units. The render
  // group then drops the inverse-scale wrapper so the text scales with the
  // viewBox. Net: one consistent unit inside the text, no px↔layout boundary.
  const isLayout = sizing === "layout";
  const mScale = isLayout ? 1 : scale;

  // maxWidth is in layout units. "100%" resolves to the enclosing slot's
  // width, or the viewBox edge when not inside a slot.
  const maxWidthLayout =
    maxWidth === "100%" ? (slot?.width ?? viewBoxWidth - x) : maxWidth;
  const maxWidthPx = maxWidthLayout * mScale;

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
          overflowWrap,
          gapPx: gap * mScale,
          // Convert the float's layout-unit profile(s) into the measurement
          // space (px in screen mode, layout units in layout mode).
          intrusionAtPx: flowAround.intrusionAt
            ? (yTopPx, yBottomPx) =>
                flowAround.intrusionAt!(yTopPx / mScale, yBottomPx / mScale) *
                mScale
            : undefined,
          rightIntrusionAtPx: flowAround.rightIntrusionAt
            ? (yTopPx, yBottomPx) =>
                flowAround.rightIntrusionAt!(
                  yTopPx / mScale,
                  yBottomPx / mScale,
                ) * mScale
            : undefined,
          occupancyAtPx: flowAround.occupancyAt
            ? (yTopPx, yBottomPx) =>
                flowAround
                  .occupancyAt!(yTopPx / mScale, yBottomPx / mScale)
                  .map(([s, e]): [number, number] => [s * mScale, e * mScale])
            : undefined,
        });
      }
      return layoutParagraph({
        text: children,
        font,
        maxWidthPx,
        lineHeightPx: lineHeight,
        letterSpacingPx: letterSpacing,
        overflowWrap,
      });
    },
    // fontsReady is a measurement dependency: caches flush when it flips.
    [children, font, maxWidthPx, lineHeight, letterSpacing, fontsReady, flowAround, overflowWrap, mScale],
  );

  // Report block size back to a parent (e.g. a height="auto" Frame). The
  // measured height is divided back by the same factor it was measured in.
  useEffect(() => {
    onMeasure?.({
      width: maxWidthLayout,
      height: mScale === 0 ? 0 : paragraph.heightPx / mScale,
    });
  }, [onMeasure, maxWidthLayout, paragraph.heightPx, mScale]);

  // Screen mode neutralises the viewBox scale (constant px). Layout mode does
  // not — the text scales with the viewBox. In layout mode the measured values
  // ARE the layout-unit values (we measured in the layout-unit space), so the
  // per-line coords/size pass through to TextLine unchanged in both modes.
  const invScale = scale === 0 ? 1 : 1 / scale;

  return (
    <g
      transform={
        isLayout
          ? `translate(${x} ${y})`
          : `translate(${x} ${y}) scale(${invScale})`
      }
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
