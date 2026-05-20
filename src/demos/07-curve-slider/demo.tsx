import { useMemo, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { CurveSlider } from "../../components/CurveSlider";
import {
  arc,
  polyline,
  pointAt,
  type Curve,
  type CurvePoint,
} from "../../layout/walkPath";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";

/**
 * Demo 7 — CurveSlider: a value selector whose track *is* the function.
 *
 * Three sub-demos, all using the same primitive, each with a different real
 * meaning carried by the curve:
 *
 *  A — Volume control with a "sweet spot." The curve is a cusp (sharp peak)
 *      over the volume axis. A button press is a constant arc-length step
 *      along the curve, so the change in volume — the projection of that
 *      step onto the horizontal axis — collapses near the cusp (where the
 *      tangent is nearly vertical) and grows toward the ends. The shape of
 *      the curve *is* the sensitivity function: fine control near the sweet
 *      spot, coarse at the extremes.
 *
 *      (Note on geometry: a smooth bell / inverted parabola is flat at the
 *      top — its tangent is horizontal there, so an arc-length step projects
 *      to its FULL x-distance. That gives the opposite of "fine near tip".
 *      The cusp inverts that: the tangent goes vertical at the peak, so the
 *      x-projection vanishes there.)
 *
 *  B — Hike elevation profile. The curve isn't an abstract function — it's
 *      the trail. Sliding the thumb walks the route. Readouts: distance
 *      covered (arc length) and altitude (the curve's y, inverted because
 *      SVG y grows downward).
 *
 *  C — Full-circle clock. A 2π arc as the track makes the slider literally
 *      a clock face. Twelve tick marks; arrow keys nudge by one hour.
 */

// ---------- A — Volume with a sweet spot ------------------------------------

const VOLUME_W = 320;
const VOLUME_H = 80;
/** Cusp exponent. < 1 makes the curve cuspy at u=0 (tangent goes vertical);
 *  smaller = sharper. 0.4 reads visibly peaked without being a hairline. */
const CUSP_P = 0.4;
const VOLUME_STEP = 0.025; // one button press = 2.5% of curve arc length

/** Reverse-U with a CUSP at the tip — see the header note. */
function volumeCurve(): Curve {
  const points: CurvePoint[] = [];
  // Sample non-uniformly: denser near the cusp so the polyline captures the
  // near-vertical tangent there.
  const SAMPLES = 96;
  for (let i = 0; i <= SAMPLES; i++) {
    // Bias samples toward the middle (u=0) by squaring around 0.5.
    const lin = i / SAMPLES;
    const biased = lin < 0.5 ? 0.5 - Math.pow(1 - 2 * lin, 2) / 2 : 0.5 + Math.pow(2 * lin - 1, 2) / 2;
    const u = 2 * biased - 1; // u in [-1, 1]
    const x = VOLUME_W / 2 + u * (VOLUME_W / 2);
    const y = VOLUME_H * Math.pow(Math.abs(u), CUSP_P);
    points.push({ x, y });
  }
  return polyline({ points });
}

function VolumeSweetSpot() {
  const curve = useMemo(() => volumeCurve(), []);
  const [t, setT] = useState(0.5);

  // Volume is the x-coordinate of the curve at the slider's current
  // position, normalised to 0–100%.
  const sample = useMemo(() => pointAt(curve, t), [curve, t]);
  const volumePct = ((sample.point.x / VOLUME_W)*100).toFixed(2);

  const bump = (delta: number) => setT((cur) => Math.max(0, Math.min(1, cur + delta)));

  return (
    <div>
      <p className="variant-label">A — Volume with a sweet spot</p>
      <p style={{ color: "#555", margin: "4px 0 8px" }}>
        Volume: <strong>{volumePct}%</strong>. At the cusp the curve is nearly vertical,
        so the volume barely moves (fine control). Toward the ends the curve
        flattens, so each press jumps further (coarse control).
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
        <button
          type="button"
          onClick={() => bump(-VOLUME_STEP)}
          aria-label="Decrease volume"
          style={pillBtn}
        >
          − Vol
        </button>
        <button
          type="button"
          onClick={() => bump(VOLUME_STEP)}
          aria-label="Increase volume"
          style={pillBtn}
        >
          + Vol
        </button>
      </div>

      <VectorUIRoot
        width={VOLUME_W + 40}
        height={VOLUME_H + 30}
        style={{ background: tokens.color.surfaceSunken, maxWidth: VOLUME_W + 40 }}
      >
        <g transform={`translate(20 12)`}>
          {/* Baseline at the bottom of the chart, decorative. */}
          <Path
            d={`M 0 ${VOLUME_H} L ${VOLUME_W} ${VOLUME_H}`}
            stroke={tokens.color.line}
            strokeWidth={1.5}
            fill="none"
          />
          {/* A vertical guide at the sweet spot to show the cusp axis. */}
          <Path
            d={`M ${VOLUME_W / 2} 0 L ${VOLUME_W / 2} ${VOLUME_H}`}
            stroke={tokens.color.accent}
            strokeWidth={1}
            strokeDasharray="2 3"
            strokeOpacity={0.35}
            fill="none"
          />
          <CurveSlider
            curve={curve}
            value={t}
            onChange={setT}
            label="Volume"
            formatValue={() => `${volumePct}%`}
            step={VOLUME_STEP}
          />
        </g>
      </VectorUIRoot>
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  border: "1.5px solid #d4cee9",
  background: "#ffffff",
  color: "#3b2d6b",
  font: "600 13px system-ui, sans-serif",
  cursor: "pointer",
};

// ---------- B — Hike elevation profile --------------------------------------

const TRAIL_W = 360;
const TRAIL_H = 90;
/** Total trail length in km, used to label distance. */
const TRAIL_KM = 8.4;
/** Elevation range — `y = 0` at the top of the chart maps to ALT_TOP_M,
 *  `y = TRAIL_H` at the bottom maps to ALT_BASE_M. */
const ALT_BASE_M = 480;
const ALT_TOP_M = 1280;
/** One button press is 4% of the trail's arc length (≈ 25 steps across). */
const TRAIL_STEP = 0.04;

function ElevationProfile() {
  // A representative trail: gentle climb, steeper push to a ridge, summit,
  // and a long descent back to base elevation.
  const curve = useMemo(
    () =>
      polyline({
        points: [
          { x: 0, y: 78 }, // trailhead
          { x: 36, y: 70 },
          { x: 72, y: 58 },
          { x: 108, y: 38 },
          { x: 150, y: 18 },
          { x: 192, y: 8 }, // summit
          { x: 234, y: 24 },
          { x: 276, y: 48 },
          { x: 312, y: 66 },
          { x: 360, y: 76 }, // trail end
        ],
      }),
    [],
  );
  const [t, setT] = useState(0.36);
  const sample = useMemo(() => pointAt(curve, t), [curve, t]);

  const distanceKm = (t * TRAIL_KM).toFixed(1);
  const altitudeM = Math.round(
    ALT_BASE_M + (1 - sample.point.y / TRAIL_H) * (ALT_TOP_M - ALT_BASE_M),
  );

  const bump = (delta: number) =>
    setT((cur) => Math.max(0, Math.min(1, cur + delta)));

  // A filled "ground" polygon under the trail, for the at-a-glance shape.
  const groundPath = useMemo(() => {
    const head = curve.toPathData();
    return `${head} L ${TRAIL_W} ${TRAIL_H} L 0 ${TRAIL_H} Z`;
  }, [curve]);

  return (
    <div>
      <p className="variant-label">B — Hike elevation profile</p>
      <p style={{ color: "#555", margin: "4px 0 8px" }}>
        Distance: <strong>{distanceKm} km</strong> · Altitude:{" "}
        <strong>{altitudeM} m</strong>. The curve isn't a function — it's the
        trail itself. Step backward or forward with the buttons, or drag the
        thumb to walk the route freely.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
        <button
          type="button"
          onClick={() => bump(-TRAIL_STEP)}
          aria-label="Step back along the trail"
          style={pillBtn}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => bump(TRAIL_STEP)}
          aria-label="Step forward along the trail"
          style={pillBtn}
        >
          Forward →
        </button>
      </div>

      <VectorUIRoot
        width={TRAIL_W + 40}
        height={TRAIL_H + 30}
        style={{ background: tokens.color.surfaceSunken, maxWidth: TRAIL_W + 40 }}
      >
        <g transform={`translate(20 12)`}>
          {/* Ground fill — softens the trail's silhouette. */}
          <Path
            d={groundPath}
            fill={tokens.color.accentSoft}
            stroke="none"
            fillOpacity={0.55}
          />
          {/* Reference lines back to the axes from the current position. */}
          <Path
            d={`M ${sample.point.x} ${TRAIL_H} L ${sample.point.x} ${sample.point.y}`}
            stroke={tokens.color.accent}
            strokeWidth={1}
            strokeDasharray="2 3"
            strokeOpacity={0.55}
            fill="none"
          />
          <CurveSlider
            curve={curve}
            value={t}
            onChange={setT}
            label="Trail position"
            formatValue={() => `${distanceKm} km, ${altitudeM} m`}
          />
        </g>
      </VectorUIRoot>
    </div>
  );
}

// ---------- C — Full-circle clock -------------------------------------------

const CLOCK_R = 80;
const CLOCK_CX = 110;
const CLOCK_CY = 110;
const HOURS = 12;
/** Place 12 at the top: start angle = -π/2 (12 o'clock), sweep clockwise. */
const CLOCK_START = -Math.PI / 2;
const CLOCK_SWEEP = 2 * Math.PI;

function ClockFace() {
  const curve = useMemo(
    () =>
      arc({
        cx: CLOCK_CX,
        cy: CLOCK_CY,
        radius: CLOCK_R,
        startAngle: CLOCK_START,
        endAngle: CLOCK_START + CLOCK_SWEEP,
      }),
    [],
  );

  // Snap to whole hours, and wrap 12 / 0 → 12 visually.
  const [t, setT] = useState(3 / HOURS); // 3 o'clock
  const onChange = (next: number) => {
    let snapped = Math.round(next * HOURS) / HOURS;
    if (snapped >= 1) snapped = 0; // wrap to 12 o'clock
    setT(snapped);
  };

  const hourIndex = Math.round(t * HOURS) % HOURS;
  const hourLabel = hourIndex === 0 ? 12 : hourIndex;

  // Hour ticks and numerals around the clock face.
  const ticks = Array.from({ length: HOURS }, (_, i) => {
    const a = CLOCK_START + (i / HOURS) * CLOCK_SWEEP;
    const r1 = CLOCK_R - 6;
    const r2 = CLOCK_R + 6;
    const labelR = CLOCK_R + 18;
    const tx = CLOCK_CX + r1 * Math.cos(a);
    const ty = CLOCK_CY + r1 * Math.sin(a);
    const ux = CLOCK_CX + r2 * Math.cos(a);
    const uy = CLOCK_CY + r2 * Math.sin(a);
    const lx = CLOCK_CX + labelR * Math.cos(a);
    const ly = CLOCK_CY + labelR * Math.sin(a);
    const label = i === 0 ? 12 : i;
    return { i, tx, ty, ux, uy, lx, ly, label };
  });

  return (
    <div>
      <p className="variant-label">C — Hour selector on a full clock face</p>
      <p style={{ color: "#555", margin: "4px 0 8px" }}>
        Hour: <strong>{hourLabel}</strong>. The arc is a full 2π — the slider
        track <em>is</em> the clock. Arrow keys nudge by one hour;
        <code> step</code> is <code>1/12</code>.
      </p>
      <VectorUIRoot
        width={280}
        height={240}
        style={{ background: tokens.color.surfaceSunken, maxWidth: 280 }}
      >
        {/* Hour ticks behind the slider track. */}
        <g aria-hidden>
          {ticks.map(({ i, tx, ty, ux, uy, lx, ly, label }) => (
            <g key={i}>
              <Path
                d={`M ${tx} ${ty} L ${ux} ${uy}`}
                stroke={tokens.color.inkMuted}
                strokeWidth={i % 3 === 0 ? 2 : 1.25}
                strokeLinecap="round"
                fill="none"
              />
              <text
                x={lx}
                y={ly}
                fontFamily="Inter, system-ui, sans-serif"
                fontSize={11}
                fontWeight={i % 3 === 0 ? 700 : 500}
                fill={tokens.color.inkMuted}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {label}
              </text>
            </g>
          ))}
        </g>
        <CurveSlider
          curve={curve}
          value={t}
          onChange={onChange}
          step={1 / HOURS}
          label="Hour"
          formatValue={() => `${hourLabel}`}
          trackWidth={6}
        />
      </VectorUIRoot>
    </div>
  );
}

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 680 }}>
        One primitive — <code>CurveSlider</code> — placed on three different
        curves. Each curve <em>is</em> what the value means, so the slider
        never needs a separate readout to explain itself. Drag with a mouse,
        tap on touch, or focus the thumb and use the arrow keys.
      </p>
      <VolumeSweetSpot />
      <ElevationProfile />
      <ClockFace />
    </div>
  );
}
