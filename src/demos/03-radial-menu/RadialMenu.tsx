import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { PathFlow } from "../../components/PathFlow";
import { quadratic, type CurvePoint } from "../../layout/walkPath";
import { tokens } from "../../tokens";
import { useTween } from "../02-card/useTween";
import { Icon, type IconName } from "./Icon";

/**
 * Demo 3 — radial menu (SPEC §11).
 *
 * Six items distributed along a curve and rotated to its tangent. Switching
 * between "arc" and "line" animates: the curve is a quadratic Bézier whose
 * three control points are tweened between a straight-line configuration and
 * an arched one, so the items slide and rotate smoothly between the two.
 *
 * Proves: `PathFlow`, arc-length distribution, tangent rotation.
 */

const ITEMS: IconName[] = ["home", "search", "heart", "star", "bell", "user"];

const ROOT_W = 540;
const ROOT_H = 400;
const HUB: CurvePoint = { x: 270, y: 300 };
const RADIUS = 170;

const deg = (d: number) => (d * Math.PI) / 180;
const onCircle = (a: number): CurvePoint => ({
  x: HUB.x + RADIUS * Math.cos(a),
  y: HUB.y + RADIUS * Math.sin(a),
});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: CurvePoint, b: CurvePoint, t: number): CurvePoint => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

// Arc configuration — a fan centered straight up, spread ±72°.
const ARC_START = onCircle(deg(-162));
const ARC_END = onCircle(deg(-18));
const ARC_MID = onCircle(deg(-90));
// Control point that makes a quadratic pass through the arc's midpoint.
const ARC_CTRL: CurvePoint = {
  x: 2 * ARC_MID.x - (ARC_START.x + ARC_END.x) / 2,
  y: 2 * ARC_MID.y - (ARC_START.y + ARC_END.y) / 2,
};

// Line configuration — control at the midpoint makes the quadratic straight.
const LINE_Y = 150;
const LINE_START: CurvePoint = { x: 70, y: LINE_Y };
const LINE_END: CurvePoint = { x: ROOT_W - 70, y: LINE_Y };
const LINE_CTRL: CurvePoint = { x: ROOT_W / 2, y: LINE_Y };

type Mode = "arc" | "line";

export function RadialMenu() {
  const [mode, setMode] = useState<Mode>("arc");
  const [orient, setOrient] = useState<"along" | "upright">("along");

  // t: 0 = line, 1 = arc. Tweened so the switch animates.
  const t = useTween(mode === "arc" ? 1 : 0, 380);

  const curve = quadratic({
    p0: lerpPt(LINE_START, ARC_START, t),
    control: lerpPt(LINE_CTRL, ARC_CTRL, t),
    p1: lerpPt(LINE_END, ARC_END, t),
  });

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Six items placed along a curve and rotated to its tangent. Switch the
        curve and watch them animate — the line and the arc are the same
        quadratic with its control points tweened.
      </p>

      <div style={{ display: "flex", gap: 20, padding: "8px 0 16px" }}>
        <label>
          Curve{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="arc">Arc (radial menu)</option>
            <option value="line">Line (flex row)</option>
          </select>
        </label>
        <label>
          Orient{" "}
          <select
            value={orient}
            onChange={(e) =>
              setOrient(e.target.value as "along" | "upright")
            }
          >
            <option value="along">Along (tangent)</option>
            <option value="upright">Upright</option>
          </select>
        </label>
      </div>

      <VectorUIRoot
        width={ROOT_W}
        height={ROOT_H}
        style={{ maxWidth: ROOT_W, background: tokens.color.surfaceSunken }}
      >
        {/* The curve itself, drawn faintly as a guide. */}
        <path
          d={curve.toPathData()}
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={1.5}
          strokeDasharray="3 6"
          aria-hidden="true"
        />

        {/* The hub fades in with the arc. */}
        <g aria-hidden="true" opacity={t}>
          <circle cx={HUB.x} cy={HUB.y} r={36} fill={tokens.color.accent} />
          {[-10, 0, 10].map((dx) => (
            <circle
              key={dx}
              cx={HUB.x + dx}
              cy={HUB.y}
              r={3}
              fill={tokens.color.accentInk}
            />
          ))}
        </g>

        <PathFlow
          curve={curve}
          distribute="even"
          orient={orient}
          role="menu"
          aria-label="Radial menu"
        >
          {ITEMS.map((name) => (
            <MenuItem key={name} name={name} />
          ))}
        </PathFlow>
      </VectorUIRoot>
    </div>
  );
}

/** One menu item: a circular chip with a centered icon. */
function MenuItem({ name }: { name: IconName }) {
  return (
    <g role="menuitem" aria-label={name} style={{ cursor: "pointer" }}>
      <circle
        r={24}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
        strokeWidth={1.5}
      />
      <Icon name={name} size={25} color={tokens.color.ink} />
    </g>
  );
}
