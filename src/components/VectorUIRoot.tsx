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
 */
export type VectorUIRootProps = Omit<
  SVGProps<SVGSVGElement>,
  "viewBox" | "width" | "height"
> & {
  /** viewBox width in layout units, or "auto" to track the real pixel width. */
  width: number | "auto";
  /** viewBox height, in layout units. */
  height: number;
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
  // In "auto" mode the viewBox width equals the pixel width, so scale is 1.
  const viewBoxWidth = isAuto ? Math.max(pixelWidth, 1) : width;
  const scale = isAuto
    ? 1
    : pixelWidth > 0
      ? pixelWidth / width
      : 1;

  const value = useMemo<CoordinateScale>(
    () => ({ scale, viewBoxWidth, viewBoxHeight: height }),
    [scale, viewBoxWidth, height],
  );

  return (
    <CoordinateScaleContext.Provider value={value}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${height}`}
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
        {children}
      </svg>
    </CoordinateScaleContext.Provider>
  );
}
