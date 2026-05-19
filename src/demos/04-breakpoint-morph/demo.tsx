import { VectorUIRoot } from "../../components/VectorUIRoot";
import { useViewportWidth, useBreakpoint } from "../../layout/breakpoints";
import { tokens } from "../../tokens";
import { MorphCard } from "./MorphCard";

/**
 * Demo 4 — breakpoint shape-morph (SPEC §11).
 *
 * Two versions of the reusable `<MorphCard>` (see MorphCard.tsx) — they morph
 * at different thresholds and carry different themes. Resize the browser
 * window: each card crosses its own threshold independently.
 *
 * Proves: the breakpoint system, path morphing, ResizeObserver wiring.
 */

const VIEW_W = 640;
const VIEW_H = 320;

/** A live readout of the root SVG's real width and active breakpoint. */
function Readout() {
  const width = useViewportWidth();
  const breakpoint = useBreakpoint();
  return (
    <text
      x={VIEW_W / 2}
      y={40}
      textAnchor="middle"
      fontFamily="ui-monospace, SFMono-Regular, monospace"
      fontSize={14}
      fill="#37463e"
    >
      {`viewport ${Math.round(width)}px · breakpoint "${breakpoint}"`}
    </text>
  );
}

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Resize the browser window. Both cards are the same{" "}
        <code>MorphCard</code> component — but they are given different morph
        thresholds, so they square off at different widths.
      </p>

      <p className="variant-label">Version A — morphs at 600px, default theme</p>
      <VectorUIRoot
        width={VIEW_W}
        height={VIEW_H}
        style={{ background: tokens.color.surfaceMuted }}
      >
        <Readout />
        <g transform={`translate(${(VIEW_W - 430) / 2} 78)`}>
          <MorphCard
            title="Threshold 600"
            caption="Below 600px this leaf squares off."
            width={430}
            threshold={600}
          />
        </g>
      </VectorUIRoot>

      <p className="variant-label">
        Version B — morphs at 460px, dark restyle, smaller
      </p>
      <VectorUIRoot
        width={VIEW_W}
        height={VIEW_H}
        style={{ background: "#dfe3e8" }}
      >
        <Readout />
        <g transform={`translate(${(VIEW_W - 360) / 2} 96)`}>
          <MorphCard
            title="Threshold 460"
            caption="This one holds its leaf longer."
            width={360}
            height={170}
            threshold={460}
            band={120}
            surface="#1f2a37"
            titleFill="#eef2f7"
            captionFill="#9aa7b8"
          />
        </g>
      </VectorUIRoot>
    </div>
  );
}
