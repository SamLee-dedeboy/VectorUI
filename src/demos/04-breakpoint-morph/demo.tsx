import { VectorUIRoot } from "../../components/VectorUIRoot";
import { useViewportWidth, useBreakpoint } from "../../layout/breakpoints";
import { MorphCard } from "./MorphCard";
import { banner, petal, spark } from "./shapes";

/**
 * Demo 4 — breakpoint shape-morph (SPEC §11).
 *
 * A single dark `<MorphCard>` driven by three stops — `sm`, `md`, `lg` —
 * each with a distinct shape that leans on what a single eight-quadratic
 * path can express: per-corner radii AND per-edge bow control.
 *
 *  sm  →  spark   — concave four-pointer (every edge pulled inward)
 *  md  →  petal   — leaf-diagonal corners, every edge bowed outward
 *  lg  →  banner  — top edge dipped inward, bottom bulged out (a wave)
 *
 * A live scale above the card maps real-pixel viewport widths to the named
 * stops; resize the browser window to watch the cursor cross each boundary
 * (shaded bands mark the eased blends).
 *
 * Proves: the breakpoint system, multi-step path morphing, ResizeObserver
 * wiring.
 */

const VIEW_W = 640;
const VIEW_H = 360;

const BAND = 120;

const STOPS = {
  sm: { minWidth: 0, shape: spark },
  md: { minWidth: 560, shape: petal },
  lg: { minWidth: 880, shape: banner },
} as const;

/** A live readout of the root SVG's real width and active breakpoint. */
function Readout() {
  const width = useViewportWidth();
  const breakpoint = useBreakpoint({
    sm: STOPS.sm.minWidth,
    md: STOPS.md.minWidth,
    lg: STOPS.lg.minWidth,
  });
  return (
    <text
      x={VIEW_W / 2}
      y={26}
      textAnchor="middle"
      fontFamily="ui-monospace, SFMono-Regular, monospace"
      fontSize={13}
      fill="#9aa7b8"
    >
      {`viewport ${Math.round(width)}px · breakpoint "${breakpoint}"`}
    </text>
  );
}

/**
 * A horizontal scale that maps real-pixel widths to stop regions. Cursor
 * tracks the current viewport width; shaded rectangles mark the eased band
 * around each boundary.
 */
function BreakpointScale() {
  const width = useViewportWidth();

  // Visible range of the scale, in real CSS pixels.
  const MIN_PX = 200;
  const MAX_PX = 1100;
  // Horizontal extent of the scale, in SVG layout units.
  const X0 = 70;
  const X1 = VIEW_W - 70;
  const Y = 64;

  const mapX = (px: number) =>
    X0 +
    ((Math.max(MIN_PX, Math.min(MAX_PX, px)) - MIN_PX) / (MAX_PX - MIN_PX)) *
      (X1 - X0);

  const boundaries = [
    { px: STOPS.md.minWidth, label: "md" },
    { px: STOPS.lg.minWidth, label: "lg" },
  ];

  return (
    <g
      fontFamily="ui-monospace, SFMono-Regular, monospace"
      aria-hidden="true"
    >
      {/* Eased-band shading on each boundary. */}
      {boundaries.map((b) => (
        <rect
          key={`band-${b.px}`}
          x={mapX(b.px - BAND / 2)}
          y={Y - 5}
          width={mapX(b.px + BAND / 2) - mapX(b.px - BAND / 2)}
          height={10}
          fill="#5cdca4"
          opacity={0.18}
        />
      ))}

      {/* Base line. */}
      <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="#3b4d63" strokeWidth={1} />

      {/* Stop-region names above the line. */}
      <text
        x={(X0 + mapX(STOPS.md.minWidth)) / 2}
        y={Y - 14}
        textAnchor="middle"
        fontSize={11}
        fill="#9aa7b8"
      >
        sm · spark
      </text>
      <text
        x={(mapX(STOPS.md.minWidth) + mapX(STOPS.lg.minWidth)) / 2}
        y={Y - 14}
        textAnchor="middle"
        fontSize={11}
        fill="#9aa7b8"
      >
        md · petal
      </text>
      <text
        x={(mapX(STOPS.lg.minWidth) + X1) / 2}
        y={Y - 14}
        textAnchor="middle"
        fontSize={11}
        fill="#9aa7b8"
      >
        lg · banner
      </text>

      {/* Boundary ticks + px labels below the line. */}
      {boundaries.map((b) => (
        <g key={`tick-${b.px}`}>
          <line
            x1={mapX(b.px)}
            y1={Y - 7}
            x2={mapX(b.px)}
            y2={Y + 7}
            stroke="#eef2f7"
            strokeWidth={1}
          />
          <text
            x={mapX(b.px)}
            y={Y + 22}
            textAnchor="middle"
            fontSize={11}
            fill="#eef2f7"
          >
            {`${b.px}px`}
          </text>
        </g>
      ))}

      {/* Endpoint hint labels — show the visible range. */}
      <text
        x={X0}
        y={Y + 22}
        textAnchor="start"
        fontSize={10}
        fill="#5b6b80"
      >
        {`${MIN_PX}px`}
      </text>
      <text
        x={X1}
        y={Y + 22}
        textAnchor="end"
        fontSize={10}
        fill="#5b6b80"
      >
        {`${MAX_PX}px`}
      </text>

      {/* Live cursor. */}
      <line
        x1={mapX(width)}
        y1={Y - 13}
        x2={mapX(width)}
        y2={Y + 13}
        stroke="#5cdca4"
        strokeWidth={2}
      />
      <circle cx={mapX(width)} cy={Y} r={3.5} fill="#5cdca4" />
    </g>
  );
}

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Resize the browser window. The card has three stops —{" "}
        <code>sm</code> (spark), <code>md</code> (petal),{" "}
        <code>lg</code> (banner) — three shapes that ride a single
        eight-quadratic path: per-corner radii plus per-edge bow control.
        The scale above the card shows where each stop begins; the shaded
        regions are the {BAND}px bands the morph eases across.
      </p>

      <VectorUIRoot
        width={VIEW_W}
        height={VIEW_H}
        style={{ background: "#1a222d" }}
      >
        <Readout />
        <BreakpointScale />
        <g transform={`translate(${(VIEW_W - 420) / 2} 120)`}>
          <MorphCard
            title="spark · petal · banner"
            caption="Per-corner radii + per-edge bow — one morphing path."
            width={420}
            height={200}
            stops={[STOPS.sm, STOPS.md, STOPS.lg]}
            band={BAND}
            surface="#2b3a4d"
            titleFill="#eef2f7"
            captionFill="#9aa7b8"
          />
        </g>
      </VectorUIRoot>
    </div>
  );
}
