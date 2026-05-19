import { VectorUIRoot } from "../../components/VectorUIRoot";
import { useViewportWidth, useBreakpoint } from "../../layout/breakpoints";
import { tokens } from "../../tokens";
import { MorphCard } from "./MorphCard";

/**
 * Demo 4 — breakpoint shape-morph (SPEC §11).
 *
 * The demo page: a fixed scene that hosts the reusable `<MorphCard>` (see
 * MorphCard.tsx) plus a live viewport readout. Resize the browser window to
 * watch the card morph.
 *
 * Proves: the breakpoint system, path morphing, ResizeObserver wiring.
 */

const VIEW_W = 640;
const VIEW_H = 320;
const CARD_W = 430;
const CARD_TOP = 78;

/** A live readout of the root SVG's real width and active breakpoint. */
function Readout() {
  const width = useViewportWidth();
  const breakpoint = useBreakpoint();
  return (
    <text
      x={VIEW_W / 2}
      y={42}
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
        Resize the browser window. As the SVG's real width crosses 600px the
        card morphs between two shapes — interpolated path-by-path, eased across
        a transition band rather than snapped.
      </p>
      <VectorUIRoot
        width={VIEW_W}
        height={VIEW_H}
        style={{ background: tokens.color.surfaceMuted }}
      >
        <Readout />
        <g transform={`translate(${(VIEW_W - CARD_W) / 2} ${CARD_TOP})`}>
          <MorphCard
            title="Resize the window"
            caption="Below 600px this blob squares off into a card."
            width={CARD_W}
          />
        </g>
      </VectorUIRoot>
    </div>
  );
}
