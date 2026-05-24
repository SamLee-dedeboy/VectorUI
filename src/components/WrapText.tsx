import { Children, useMemo, type ReactNode } from "react";
import { Group } from "../svg/Group";
import { Path } from "../svg/Path";
import { Text, type FlowAround, type TextMeasurement } from "./Text";
import { layoutFlowParagraph, type OverflowWrap } from "../layout/measureText";
import { useCoordinateScale } from "../layout/coordinateScale";
import { useSlot } from "../layout/slot";
import { useFontsReady } from "../layout/fonts";
import {
  pathWalkerFromData,
  measureWalkerBBox,
  shiftWalker,
} from "../layout/pathWalker";
import { spanFromPath, type SpanFn } from "../layout/intrusionFromPath";
import {
  isFloatElement,
  type FloatProps,
  type FloatAnchor,
  type FloatPosition,
} from "./Float";

/**
 * Layer 3 — text wrapped around one or more `<Float>` shapes.
 *
 * The high-level answer to "draw a shape AND flow text around its silhouette".
 * Each `<Float>` child is declared once: `WrapText` renders its path and derives
 * the wrap contour from the SAME path data, so the drawn shape and the contour
 * the text hugs can never drift apart. Text flows into every *open* region of
 * each line — left of, between, and right of the floats — so a float in the
 * middle has text on both sides, and several floats fill the gaps between them.
 *
 * A float is positioned by an `anchor` point (four corners or centre) placed at
 * `x`/`y`. Those accept layout-unit numbers or percentages: `x="50%"` is half
 * the column width; `y="50%"` is half the *final* block height, resolved by a
 * short fixed-point pass (a paragraph's height depends on how text flows around
 * its floats, and vice-versa — but line count barely depends on a float's
 * vertical position, so it converges in a pass or two).
 *
 *   <Flow direction="column" padding={28}>
 *     <WrapText {...tokens.type.body} fill={tokens.color.ink} gap={16}>
 *       <Float d={BLOB} anchor="center" x="50%" y="50%" fill={tokens.color.accent} />
 *       Body text that flows around the blob on both sides…
 *     </WrapText>
 *   </Flow>
 *
 * `maxWidth` defaults to `"100%"`: like `Text`, the wrap width is the enclosing
 * column `Flow`'s content box (or `Frame` slot), so it never overruns. Keep
 * `WrapText` in a column context (or pass a numeric `maxWidth`) — a row `Flow`
 * does not publish a width to its children and the text would overflow.
 */
export type WrapTextProps = {
  /** `<Float>` elements and the body text, intermixed. */
  children: ReactNode;
  /** CSS font shorthand, e.g. "16px Inter" or "600 18px Inter". */
  font: string;
  /** Line box height, in CSS px. */
  lineHeight: number;
  letterSpacing?: number;
  fill?: string;
  /** Wrap width in layout units, or "100%" to fill the available width. */
  maxWidth?: number | "100%";
  /** Top-left of the block (paths + text), in layout units. Defaults to 0,0. */
  x?: number;
  y?: number;
  sizing?: "screen" | "layout";
  overflowWrap?: OverflowWrap;
  /** Gap between every float's edge and the text, in layout units. */
  gap?: number;
  onMeasure?: (size: TextMeasurement) => void;
};

/** A `<Float>` resolved to the parts that don't depend on the block height:
 *  bounding box, anchor offsets, and a local-coordinate silhouette sampler. */
type FloatGeometry = {
  props: FloatProps;
  rawMinX: number;
  rawMinY: number;
  w: number;
  h: number;
  /** Anchor point offset within the bbox (top-left origin). */
  ax: number;
  ay: number;
  /** Silhouette span sampler, in bbox-local coords (origin 0,0). */
  span: SpanFn;
};

const MAX_CONVERGE_PASSES = 4;

function anchorOffsets(
  anchor: FloatAnchor,
  w: number,
  h: number,
): { ax: number; ay: number } {
  const ax = anchor.endsWith("right") ? w : anchor === "center" ? w / 2 : 0;
  const ay = anchor.startsWith("bottom") ? h : anchor === "center" ? h / 2 : 0;
  return { ax, ay };
}

/** Resolve a number-or-percentage position against a basis (column width / block
 *  height). `undefined` falls back to `fallback`. */
function resolvePos(
  v: FloatPosition | undefined,
  basis: number,
  fallback: number,
): number {
  if (v === undefined) return fallback;
  if (typeof v === "number") return v;
  const m = /^\s*(-?[\d.]+)%\s*$/.exec(v);
  if (m) return (parseFloat(m[1]) / 100) * basis;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function WrapText({
  children,
  gap = 0,
  x = 0,
  y = 0,
  maxWidth = "100%",
  font,
  lineHeight,
  letterSpacing,
  sizing = "screen",
  overflowWrap,
  ...textProps
}: WrapTextProps) {
  const { scale, viewBoxWidth } = useCoordinateScale();
  const slot = useSlot();
  const fontsReady = useFontsReady();

  // The column width, resolved the same way Text does. We anchor floats and run
  // their occupancy in this coordinate space, then hand the exact number to Text
  // as maxWidth so the drawn shapes and the wrap agree on where the column ends.
  const columnWidth =
    maxWidth === "100%" ? (slot?.width ?? viewBoxWidth - x) : maxWidth;

  // Split children: <Float> elements vs the body text (Text takes one string).
  const { floats, text } = useMemo(() => {
    const fs: FloatProps[] = [];
    const parts: string[] = [];
    Children.forEach(children, (child) => {
      if (isFloatElement(child)) fs.push(child.props);
      else if (typeof child === "string" || typeof child === "number") {
        parts.push(String(child));
      }
    });
    return { floats: fs, text: parts.join("") };
  }, [children]);

  // Height-independent per-float geometry: bbox + a local silhouette sampler.
  const geometry = useMemo<FloatGeometry[]>(
    () =>
      floats.map((p) => {
        const walker = pathWalkerFromData(p.d);
        const bbox = measureWalkerBBox(walker);
        const w = p.width ?? bbox.width;
        const h = p.height ?? bbox.height;
        const anchor: FloatAnchor =
          p.anchor ?? (p.side === "right" ? "top-right" : "top-left");
        const { ax, ay } = anchorOffsets(anchor, w, h);
        // Sample in bbox-local coords (origin 0,0) so placement is just a shift.
        const local = shiftWalker(walker, -bbox.minX, -bbox.minY);
        const span = spanFromPath(local, {
          height: bbox.height,
          ...(p.samples != null ? { samples: p.samples } : {}),
          ...(p.yResolution != null ? { yResolution: p.yResolution } : {}),
        });
        return {
          props: p,
          rawMinX: bbox.minX,
          rawMinY: bbox.minY,
          w,
          h,
          ax,
          ay,
          span,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      floats
        .map(
          (p) =>
            `${p.d}|${p.side ?? ""}|${p.anchor ?? ""}|${p.width ?? ""}|${p.height ?? ""}`,
        )
        .join("¦"),
    ],
  );

  // Resolve float placements + the wrap occupancy, converging on the block
  // height for percentage-y floats. The occupancy is in layout units, column
  // coords; Text converts it to px and lays out once more, identically.
  const { occupancyAt, placements, hasFloats } = useMemo(() => {
    const mScale = sizing === "layout" ? 1 : scale;

    // Each float's bbox top-left in column coords, given a block height H.
    const placeAt = (H: number) =>
      geometry.map((f) => {
        const tx = resolvePos(
          f.props.x,
          columnWidth,
          f.props.side === "right" ? columnWidth : 0,
        );
        const ty = resolvePos(f.props.y, H, 0);
        return { left: tx - f.ax, top: ty - f.ay };
      });

    const occupancyFor =
      (places: { left: number; top: number }[]): FlowAround["occupancyAt"] =>
      (yTop, yBot) => {
        const intervals: Array<[number, number]> = [];
        geometry.forEach((f, i) => {
          const { left, top } = places[i];
          const s = f.span(yTop - top, yBot - top);
          if (!s) return;
          intervals.push([left + s[0], left + s[1]]);
        });
        return intervals;
      };

    if (geometry.length === 0) {
      return { occupancyAt: undefined, placements: [], hasFloats: false };
    }

    // Fixed-point on H. Seed at 0 (percentage-y floats sit at the top first
    // pass); since line count barely tracks vertical float position, H settles
    // in a pass or two. Numeric/percentage-x-only floats converge immediately.
    let H = 0;
    for (let k = 0; k < MAX_CONVERGE_PASSES; k++) {
      const occLayout = occupancyFor(placeAt(H));
      const occupancyAtPx = (yTopPx: number, yBotPx: number) =>
        occLayout!(yTopPx / mScale, yBotPx / mScale).map(
          ([s, e]): [number, number] => [s * mScale, e * mScale],
        );
      const para = layoutFlowParagraph({
        text,
        font,
        columnWidthPx: columnWidth * mScale,
        lineHeightPx: lineHeight,
        ...(letterSpacing != null ? { letterSpacingPx: letterSpacing } : {}),
        ...(overflowWrap ? { overflowWrap } : {}),
        gapPx: gap * mScale,
        occupancyAtPx,
      });
      const Hnew = mScale === 0 ? 0 : para.heightPx / mScale;
      if (Math.abs(Hnew - H) < 0.5) {
        H = Hnew;
        break;
      }
      H = Hnew;
    }

    const places = placeAt(H);
    return {
      occupancyAt: occupancyFor(places),
      placements: places,
      hasFloats: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geometry,
    columnWidth,
    gap,
    text,
    font,
    lineHeight,
    letterSpacing,
    sizing,
    scale,
    overflowWrap,
    fontsReady,
  ]);

  const flowAround = useMemo<FlowAround | undefined>(
    () => (hasFloats ? { occupancyAt, gap } : undefined),
    [hasFloats, occupancyAt, gap],
  );

  return (
    <Group transform={x !== 0 || y !== 0 ? `translate(${x} ${y})` : undefined}>
      {geometry.map((f, i) => (
        <Path
          key={i}
          d={f.props.d}
          transform={`translate(${placements[i].left - f.rawMinX} ${
            placements[i].top - f.rawMinY
          })`}
          fill={f.props.fill}
          stroke={f.props.stroke}
          strokeWidth={f.props.strokeWidth}
          filter={f.props.filter}
        />
      ))}
      <Text
        {...textProps}
        font={font}
        lineHeight={lineHeight}
        {...(letterSpacing != null ? { letterSpacing } : {})}
        sizing={sizing}
        {...(overflowWrap ? { overflowWrap } : {})}
        maxWidth={columnWidth}
        {...(flowAround ? { flowAround } : {})}
      >
        {text}
      </Text>
    </Group>
  );
}
