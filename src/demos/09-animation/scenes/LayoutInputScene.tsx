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
 * PathFlow re-distributes each frame for free. `useTweenedPoints` returns the
 * vertex array; `polyline()` wraps it as a Curve. No per-chip animation code
 * anywhere.
 */

const SAMPLES = 96;
const W = 380;
const H = 140;
const X0 = 30;
const X1 = W - 30;
const Y = H / 2 + 18;

// Two source curves — a flat row and a gentle upward arc — resampled to the
// same vertex count so `useTweenedPoints` can lerp between them index-by-index.
function sample(curve: Curve): { x: number; y: number }[] {
  return uniformResample(curve, SAMPLES);
}

const LINE_POINTS = sample(line({ x1: X0, y1: Y, x2: X1, y2: Y }));
const ARC_POINTS = sample(
  arc({
    cx: W / 2,
    cy: Y + 70,
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
      </VectorUIRoot>
    </>
  );
}
