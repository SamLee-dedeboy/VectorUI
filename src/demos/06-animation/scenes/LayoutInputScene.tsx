import { useMemo, useState } from "react";
import { VectorUIRoot } from "../../../components/VectorUIRoot";
import { PathFlow } from "../../../components/PathFlow";
import { Circle } from "../../../svg/Circle";
import { arc, line, polyline, type Curve } from "../../../layout/walkPath";
import { uniformResample } from "../../../layout/curveMorph";
import { useTweenedPoints } from "../../../layout/tween";
import { tokens } from "../../../tokens";

/**
 * Scene B — animate a layout input.
 *
 * The chips themselves are static React elements. What we animate is the
 * `Curve` PathFlow distributes them along — its vertices interpolate, and
 * PathFlow re-distributes each frame for free. `useTweenedPoints` returns
 * the vertex array; `polyline()` wraps it as a Curve. No per-chip animation
 * code anywhere.
 *
 * Coordinate-system discipline (Demo 3 / guide §18): both source curves
 * are defined in a LOCAL frame — line at `y = 0`, and the arc's chord also
 * at `y = 0` (so the arc bulges purely upward into −y, no endpoint dip).
 * The viewBox is a pinned design canvas whose `H` is DERIVED from the
 * curve's intrinsic upper extent + chip radius + breathing room. ONE outer
 * `<g transform>` does the placement — "what the curve IS" stays separate
 * from "where the curve SITS."
 */

const SAMPLES = 96;
const CHIP_R = 11;

// Arc geometry, in the LOCAL frame. We pick `cy` so that the arc's chord
// (its endpoints) lies exactly on `y = 0` — same baseline as the line.
// Then morphing line→arc is a pure bulge upward, no endpoint drift.
const ARC_R = 100;
const ARC_START = (-160 * Math.PI) / 180;
const ARC_END = (-20 * Math.PI) / 180;
//   endpointY = cy + ARC_R * sin(ARC_START) = 0  ⇒  cy = −ARC_R · sin(ARC_START)
const ARC_CY = -ARC_R * Math.sin(ARC_START);          // ≈ 34.2
const ARC_TOP_Y = ARC_CY - ARC_R;                     // ≈ −65.8 (peak of bulge)
const UPPER_EXTENT = Math.ceil(-ARC_TOP_Y + CHIP_R);  // 77 — above baseline at max bend

const W = 380;
const X0 = 30;                            // horizontal inset
const SPAN = W - X0 * 2;                  // 320 — intrinsic curve length

const VERT_PAD = 14;
const BASELINE_Y = VERT_PAD + UPPER_EXTENT;          // viewBox-y of local (0, 0)
const H = BASELINE_Y + CHIP_R + VERT_PAD;            // derived from intrinsic extents

// Two source curves, both in the LOCAL frame: line at y=0, arc chord also at
// y=0 with the bulge opening into −y. Resampled to the same vertex count so
// `useTweenedPoints` can lerp between them index-by-index.
function sample(curve: Curve): { x: number; y: number }[] {
  return uniformResample(curve, SAMPLES);
}

const LINE_POINTS = sample(line({ x1: 0, y1: 0, x2: SPAN, y2: 0 }));
const ARC_POINTS = sample(
  arc({
    cx: SPAN / 2,
    cy: ARC_CY,
    radius: ARC_R,
    startAngle: ARC_START,
    endAngle: ARC_END,
  }),
);

export function LayoutInputScene() {
  const [bent, setBent] = useState(false);
  const target = bent ? ARC_POINTS : LINE_POINTS;
  const points = useTweenedPoints(target, { durationMs: 480 });
  const curve = useMemo(() => polyline({ points }), [points]);

  return (
    <>
      <button
        type="button"
        onClick={() => setBent((b) => !b)}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: "1.5px solid #1f8a5c",
          background: bent ? "#1f8a5c" : "#ffffff",
          color: bent ? "#ffffff" : "#1f8a5c",
          font: "600 13px system-ui, sans-serif",
          cursor: "pointer",
          margin: "0 0 8px",
        }}
      >
        {bent ? "Flatten" : "Bend the path"}
      </button>
      <VectorUIRoot
        width={W}
        height={H}
        style={{ maxWidth: W, background: tokens.color.surfaceSunken }}
      >
        {/* ONE placement transform. Everything inside lives in the curve's
            local frame (line at y=0, arc chord at y=0). */}
        <g transform={`translate(${X0} ${BASELINE_Y})`}>
          <path
            d={curve.toPathData()}
            fill="none"
            stroke={tokens.color.line}
            strokeWidth={1.5}
            strokeDasharray="3 6"
            aria-hidden="true"
          />
          <PathFlow
            curve={curve}
            distribute="even"
            orient="upright"
            role="presentation"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Circle key={i} r={CHIP_R} fill={tokens.color.accent} />
            ))}
          </PathFlow>
        </g>
      </VectorUIRoot>
    </>
  );
}
