import { useMemo, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { PathFlow } from "../../components/PathFlow";
import { VectorButton } from "../../components/VectorButton";
import { Circle } from "../../svg/Circle";
import { arc, type Curve } from "../../layout/walkPath";
import {
  useStaggeredReveal,
  useTweenedPoints,
} from "../../layout/tween";
import { tokens } from "../../tokens";
import { Icon, type IconName } from "./Icon";
import { hexagon, cog } from "./chrome";
import {
  curveFromPoints,
  curvePoints,
  type CurveKind,
  type CurveScene,
} from "./curves";

/**
 * Demo 3 — `PathFlow` + `VectorButton`: a curve-as-layout core component, and
 * a path-as-button core component, composed.
 *
 * Both versions exercise the SAME core component, `<PathFlow>`. PathFlow takes
 * a `curve` (any `Curve`) and distributes its children along that curve's arc
 * length, optionally rotating each child to the tangent. Every child IS a
 * `<VectorButton>` — its `shape` prop is a hexagon, the icon rides on top, and
 * the button's click / hover / keyboard wiring comes for free.
 *
 * Coordinate-system discipline: every curve is defined in its own LOCAL frame
 * (arc centered at `(0, 0)`, wave centered on `y = 0`). The viewBox-relative
 * placement happens in ONE place per version — a `<g transform="translate(…)">`
 * wrapping the PathFlow + sibling buttons. This is the same separation
 * `<Frame>` already uses for shape-as-container; we just apply it to curves.
 *
 *   Version A — `<PathFlow curve={arc(...)}>`: a circular arc curve with a
 *   sibling cog `<VectorButton>`. The arc is built at LOCAL `(0, 0)`; the
 *   wrapping `<g translate(HUB)>` is what puts the hub (and the arc's center)
 *   where it lives in the viewBox. Clicking the hub flips `open`; each chip
 *   animates from the hub by translating along its PathFlow-local +y axis —
 *   which, for a circular arc, points exactly at the center.
 *
 *   Version B — `<PathFlow curve={curveFromPoints(...)}>`: the curve is a
 *   morphed polyline that interpolates between sine / square / straight wave
 *   vertices, all anchored at local `(0, 0)` with their centerline at local
 *   `y = 0`. The wrapping `<g translate(MARGIN_X, HEIGHT_B/2)>` places the
 *   centerline at the viewBox's middle — so the curve sits in the SAME
 *   vertical position across all three variants, by construction.
 */

const ITEMS_A: IconName[] = ["home", "search", "heart", "star", "bell", "user"];
const ITEMS_B: IconName[] = ["home", "search", "heart", "star", "user"];

const CURVE_OPTIONS: { value: CurveKind; label: string }[] = [
  { value: "sine", label: "Sine wave" },
  { value: "square", label: "Square wave" },
  { value: "straight", label: "Straight line" },
];

const deg = (d: number) => (d * Math.PI) / 180;

// ---- Version A: an arc curve, built in its OWN local frame ------------------
//
// The viewBox is a design canvas (WIDTH_A × HEIGHT_A). HUB is where the arc's
// LOCAL origin (= the arc's center, = the hub button's center) sits within
// the viewBox. The arc itself knows nothing about WIDTH_A / HEIGHT_A.

const WIDTH_A = 540;
const HEIGHT_A = 400;
const HUB = { x: WIDTH_A / 2, y: HEIGHT_A * 0.75 };
const RADIUS_A = HEIGHT_A * 0.425;

const arcCurve: Curve = arc({
  // LOCAL center at (0, 0). The wrapping `<g translate(HUB.x, HUB.y)>`
  // does the placement — see the JSX below.
  cx: 0,
  cy: 0,
  radius: RADIUS_A,
  // SVG y grows downward, so a fan that "opens upward" sweeps from -162° to -18°.
  startAngle: deg(-162),
  endAngle: deg(-18),
});

// ---- Version B: a wave curve, also in its own local frame --------------------
//
// MARGIN_X is the horizontal inset between the viewBox edge and the curve's
// local origin. The curve's centerline is at local `y = 0`; the wrapping
// `<g translate(MARGIN_X, HEIGHT_B/2)>` places that centerline at the
// viewBox's vertical middle — identical for all three curve kinds.

const WIDTH_B = 540;
const HEIGHT_B = 120;
const MARGIN_X = 70;

const HEX_CHIP = hexagon(27);
const COG_HUB = cog(34);

export function Demo() {
  const [openA, setOpenA] = useState(false);
  const [curveB, setCurveB] = useState<CurveKind>("sine");

  // Version A — per-chip reveal progress; 1 = on the arc, 0 = tucked at the hub.
  const revealA = useStaggeredReveal(ITEMS_A.length, openA, {
    itemDurationMs: 300,
    staggerMs: 50,
  });
  // First item to start animating wins for the guide-line fade.
  const guideAlphaA = revealA[0] ?? (openA ? 1 : 0);

  // Version B — INTRINSIC params only. Amplitude 35 (not 38) keeps the chips'
  // half-height (~23.4) safely inside the viewBox (HEIGHT_B/2 = 60).
  const sceneB: CurveScene = useMemo(
    () => ({
      span: WIDTH_B - MARGIN_X * 2,
      amplitude: 35,
      cycles: 2,
    }),
    [],
  );
  // The (kind, scene) → vertex-array mapping is Demo-3 vocabulary; the
  // library only ships `useTweenedPoints`. We memoize the target points and
  // hand them to the tween hook — it returns the interpolated vertices each
  // frame, and `curveFromPoints` wraps them as a `Curve` for `PathFlow`.
  const targetPointsB = useMemo(
    () => curvePoints(curveB, sceneB),
    [curveB, sceneB],
  );
  const pointsB = useTweenedPoints(targetPointsB, { durationMs: 360 });
  const curveBPath = useMemo(() => curveFromPoints(pointsB), [pointsB]);

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Both versions are built from two library core components.{" "}
        <code>PathFlow</code> takes a <code>curve</code> prop and distributes
        its children along the curve's arc length, optionally rotating each
        to the tangent. <code>VectorButton</code> takes a <code>shape</code>{" "}
        prop and turns that path into a clickable, hoverable, keyboard-
        activatable button with an icon (or anything) on top. The arc, the
        sine wave, the square wave, and the straight line are all just
        different <code>Curve</code>s passed to the same <code>PathFlow</code>.
      </p>
      <p style={{ color: "#555", maxWidth: 640 }}>
        <strong>Version A</strong> passes an <code>arc()</code> curve plus a
        cog-shaped <code>VectorButton</code> hub; the per-chip reveal pulls
        each item back along its local +y axis (which, on a circular arc,
        points at the hub). <strong>Version B</strong> passes a morphed{" "}
        <code>polyline</code> whose vertices interpolate between sine, square,
        and straight; the chips slide along the deforming curve for free.
        Both versions define their curves in a LOCAL frame and place them
        with a single <code>{`<g transform>`}</code>, so swapping curves
        doesn't move the centerline.
      </p>

      <p className="variant-label">
        Version A —{" "}
        <code>{"<PathFlow curve={arc(...)} orient=\"along\">"}</code> with a
        cog-shaped <code>{"<VectorButton>"}</code> toggle
      </p>
      <VectorUIRoot
        width={WIDTH_A}
        height={HEIGHT_A}
        style={{ maxWidth: WIDTH_A, background: "#f4f3ee" }}
      >
        {/* ONE placement transform. Everything inside lives in the arc's local
            frame, where (0, 0) is the hub / arc center. */}
        <g transform={`translate(${HUB.x} ${HUB.y})`}>
          {/* The arc itself, drawn faintly as a guide — fades in with the reveal. */}
          <path
            d={arcCurve.toPathData()}
            fill="none"
            stroke={tokens.color.line}
            strokeWidth={1.5}
            strokeDasharray="3 6"
            opacity={guideAlphaA}
            aria-hidden="true"
          />

          <PathFlow
            curve={arcCurve}
            distribute="even"
            orient="along"
            role="menu"
            aria-label="Radial menu"
          >
            {ITEMS_A.map((name, i) => {
              const p = revealA[i] ?? 0;
              if (p <= 0) return null;
              // PathFlow rotates our local frame so that +y points at the arc's
              // center (= local origin = the hub). One constant pull distance
              // does the job for every chip — no per-item placement math.
              return (
                <g
                  key={name}
                  transform={`translate(0 ${(1 - p) * RADIUS_A}) scale(${p})`}
                  opacity={p}
                >
                  <VectorButton
                    shape={HEX_CHIP}
                    fill={tokens.color.surface}
                    stroke={tokens.color.line}
                    strokeWidth={1.5}
                    role="menuitem"
                    aria-label={name}
                  >
                    <Icon name={name} size={24} color={tokens.color.ink} />
                  </VectorButton>
                </g>
              );
            })}
          </PathFlow>

          {/* The hub sits at the arc's center — local (0, 0) — so no
              per-button transform is needed. */}
          <VectorButton
            shape={COG_HUB}
            fill={tokens.color.accent}
            aria-label={openA ? "Close menu" : "Open menu"}
            aria-expanded={openA}
            onClick={() => setOpenA((v) => !v)}
          >
            {/* The "…" face — three dots ride the cog as its children. */}
            {[-10, 0, 10].map((dx) => (
              <Circle key={dx} cx={dx} r={3} fill={tokens.color.accentInk} />
            ))}
          </VectorButton>
        </g>
      </VectorUIRoot>

      <p className="variant-label">
        Version B —{" "}
        <code>
          {"<PathFlow curve={curveFromPoints(...)} orient=\"upright\">"}
        </code>{" "}
        with the curve morphing between <code>{curveB}</code>
      </p>
      <div
        role="radiogroup"
        aria-label="Curve type"
        style={{
          display: "flex",
          gap: 8,
          margin: "8px 0 12px",
          flexWrap: "wrap",
        }}
      >
        {CURVE_OPTIONS.map((opt) => {
          const active = opt.value === curveB;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCurveB(opt.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: active ? "1.5px solid #6c5ce0" : "1.5px solid #d4cee9",
                background: active ? "#6c5ce0" : "#ffffff",
                color: active ? "#ffffff" : "#3b2d6b",
                font: "600 13px system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <VectorUIRoot
        width={WIDTH_B}
        height={HEIGHT_B}
        style={{ maxWidth: WIDTH_B, background: "#f1eefb" }}
      >
        {/* ONE placement transform. The curve's local centerline (y = 0)
            lands at the viewBox's middle (HEIGHT_B / 2). Swap curve kinds
            and the centerline doesn't move — it's the same anchor. */}
        <g transform={`translate(${MARGIN_X} ${HEIGHT_B / 2})`}>
          {/* The morphed curve, drawn so the layout path is unmistakable. */}
          <path
            d={curveBPath.toPathData()}
            fill="none"
            stroke="#6c5ce0"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeLinecap="round"
            aria-hidden="true"
          />

          <PathFlow
            curve={curveBPath}
            distribute="even"
            orient="upright"
            role="menu"
            aria-label={`Menu along ${curveB} curve`}
          >
            {ITEMS_B.map((name) => (
              <VectorButton
                key={name}
                shape={HEX_CHIP}
                fill="#efeafc"
                stroke={tokens.color.line}
                strokeWidth={1.5}
                role="menuitem"
                aria-label={name}
              >
                <Icon name={name} size={24} color="#3b2d6b" />
              </VectorButton>
            ))}
          </PathFlow>
        </g>
      </VectorUIRoot>
    </div>
  );
}
