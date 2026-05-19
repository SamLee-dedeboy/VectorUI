import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  CoordinateScaleContext,
  type CoordinateScale,
} from "../layout/coordinateScale";
import { useFitToContent } from "../layout/childBounds";
import { colorVars } from "../tokens";
import { TokenDefs } from "./TokenDefs";

/**
 * Layer 3 — the root of every VectorUI tree.
 *
 * Emits a single `<svg>` whose `viewBox` is expressed in layout units, with a
 * CSS width of 100% so the whole scene scales with its container (SPEC §8,
 * Mechanism A). A ResizeObserver tracks the element's real pixel width and
 * publishes the layout<->pixel `scale` through context so descendants — Text
 * especially — can reconcile the two coordinate spaces (SPEC §5).
 *
 * `width="auto"` opts out of uniform scaling: the viewBox width tracks the
 * real pixel width, pinning `scale` to 1. The scene then stays at 1:1 and a
 * layout reflows itself by reading `useViewportWidth()` — the right model for
 * a content surface (e.g. a settings page) that should not shrink-to-fit.
 *
 * `height="content"` sizes the viewBox height to the rendered content, so a
 * scene whose height is data-driven needs no `onMeasure`/`onLayout` callback
 * dance and no guessed fallback height.
 */
/**
 * A container narrower than this is treated as "not laid out yet" — the
 * element is detached, display:none, or in a collapsed flex track. The 1:1
 * placeholder scale is kept rather than deriving a degenerate one: a sub-pixel
 * `scale` would wrap text to sub-pixel columns and explode a height="content"
 * viewBox to millions of units.
 */
const MIN_REAL_WIDTH = 16;

export type VectorUIRootProps = Omit<
  SVGProps<SVGSVGElement>,
  "viewBox" | "width" | "height"
> & {
  /** viewBox width in layout units, or "auto" to track the real pixel width. */
  width: number | "auto";
  /** viewBox height in layout units, or "content" to fit the rendered content. */
  height: number | "content";
  children?: ReactNode;
  style?: CSSProperties;
};

export function VectorUIRoot({
  width,
  height,
  children,
  style,
  ...svgProps
}: VectorUIRootProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pixelWidth, setPixelWidth] = useState(0);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const measure = (w: number) => setPixelWidth(w > 0 ? w : 0);
    measure(el.getBoundingClientRect().width);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        measure(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isAuto = width === "auto";
  const measured = pixelWidth >= MIN_REAL_WIDTH;
  // In "auto" mode the viewBox width equals the pixel width, so scale is 1.
  const viewBoxWidth = isAuto ? Math.max(pixelWidth, MIN_REAL_WIDTH) : width;
  const scale = isAuto ? 1 : measured ? pixelWidth / width : 1;

  // When height is "content", the viewBox height tracks the rendered content.
  const isContentHeight = height === "content";
  const fit = useFitToContent();
  const viewBoxHeight = isContentHeight
    ? Math.max(fit.size?.height ?? 1, 1)
    : height;

  const value = useMemo<CoordinateScale>(
    () => ({ scale, viewBoxWidth, viewBoxHeight }),
    [scale, viewBoxWidth, viewBoxHeight],
  );

  return (
    <CoordinateScaleContext.Provider value={value}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          // Color tokens are CSS custom properties on the root SVG, so a theme
          // only has to override these variables (SPEC §9, §15).
          ...(colorVars as CSSProperties),
          ...style,
        }}
        {...svgProps}
      >
        {/* Token <filter> presets, declared once so tokens.filters.* resolve. */}
        <TokenDefs />
        {/* Until the ResizeObserver reports a width, scale is a placeholder 1;
            text measurement waits on `pixelWidth > 0` via the components. */}
        {isContentHeight ? <g ref={fit.ref}>{children}</g> : children}
      </svg>
    </CoordinateScaleContext.Provider>
  );
}
