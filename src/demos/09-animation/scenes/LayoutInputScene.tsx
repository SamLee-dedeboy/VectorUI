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
 * Coordinate-system discipline: both source curves are defined in a LOCAL
 * frame (the line lives at `y = 0`, the arc bulges into `-y`). Placement
 * into the viewBox is a single `<g transform="translate(X0, BASELINE_Y)">`
 * at the render site — so "what the curve IS" stays separate from "where
 * it sits."
 */

const SAMPLES = 96;
const W = 380;
const H = 140;
const X0 = 30; // horizontal inset (viewBox-space placement)
const SPAN = W - X0 * 2; // 320 — intrinsic curve length
const BASELINE_Y = H / 2 + 18; // viewBox-y where the line / arc-chord sit

// Two source curves, both defined in a LOCAL frame (line at y=0, arc center
// at y=70 opening upward into −y). Resampled to the same vertex count so
// `useTweenedPoints` can lerp between them index-by-index.
function sample(curve: Curve): { x: number; y: number }[] {
  return uniformResample(curve, SAMPLES);
}

const LINE_POINTS = sample(line({ x1: 0, y1: 0, x2: SPAN, y2: 0 }));
const ARC_POINTS = sample(
  arc({
    cx: SPAN / 2,
    cy: 70, // local y below the baseline; the arc bulges toward −y
    radius: 100,
    startAngle: (-160 * Math.PI) / 180,
    endAngle: (-20 * Math.PI) / 180,
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
            local frame (line at y=0). */}
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
              <Circle key={i} r={11} fill={tokens.color.accent} />
            ))}
          </PathFlow>
        </g>
      </VectorUIRoot>
    </>
  );
}
