import { PathFlow } from "../../components/PathFlow";
import { Path } from "../../svg/Path";
import { quadratic, type CurvePoint } from "../../layout/walkPath";
import { tokens } from "../../tokens";
import { useTween } from "../02-card/useTween";
import { Icon, type IconName } from "./Icon";
import { hexagon, cog } from "./chrome";

/**
 * `RadialMenu` — a reusable menu that distributes items along a curve.
 *
 * `mode` picks an arc (a fan around a hub) or a line (a row); switching is
 * animated — the curve is one quadratic Bézier with its control points tweened
 * between the two configurations. Items, mode and orientation are props. The
 * item chips are hexagons and the hub a cog — both plain generated paths.
 */

export type RadialMenuMode = "arc" | "line";

export type RadialMenuProps = {
  /** Icons to place along the curve. */
  items: IconName[];
  /** "arc" fans the items around a hub; "line" lays them in a row. Animated. */
  mode: RadialMenuMode;
  /** Rotate each item to the curve tangent, or keep it upright. */
  orient?: "along" | "upright";
  /** Scene size, in layout units. */
  width?: number;
  height?: number;
  /** Center hub fill. */
  hubFill?: string;
  /** Item chip fill. */
  itemFill?: string;
  /** Icon stroke color. */
  iconColor?: string;
};

const deg = (d: number) => (d * Math.PI) / 180;
const lerpPt = (a: CurvePoint, b: CurvePoint, t: number): CurvePoint => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export function RadialMenu({
  items,
  mode,
  orient = "along",
  width = 540,
  height = 400,
  hubFill = tokens.color.accent,
  itemFill = tokens.color.surface,
  iconColor = tokens.color.ink,
}: RadialMenuProps) {
  const hub: CurvePoint = { x: width / 2, y: height * 0.75 };
  const radius = height * 0.425;

  // t: 0 = line, 1 = arc. Tweened so the switch animates.
  const t = useTween(mode === "arc" ? 1 : 0, 380);

  const onCircle = (a: number): CurvePoint => ({
    x: hub.x + radius * Math.cos(a),
    y: hub.y + radius * Math.sin(a),
  });
  // Arc — a fan centered straight up, spread ±72°.
  const arcStart = onCircle(deg(-162));
  const arcEnd = onCircle(deg(-18));
  const arcMid = onCircle(deg(-90));
  const arcCtrl: CurvePoint = {
    x: 2 * arcMid.x - (arcStart.x + arcEnd.x) / 2,
    y: 2 * arcMid.y - (arcStart.y + arcEnd.y) / 2,
  };
  // Line — control at the midpoint makes the quadratic straight.
  const lineY = height * 0.375;
  const lineStart: CurvePoint = { x: 70, y: lineY };
  const lineEnd: CurvePoint = { x: width - 70, y: lineY };
  const lineCtrl: CurvePoint = { x: width / 2, y: lineY };

  const curve = quadratic({
    p0: lerpPt(lineStart, arcStart, t),
    control: lerpPt(lineCtrl, arcCtrl, t),
    p1: lerpPt(lineEnd, arcEnd, t),
  });

  return (
    <>
      {/* The curve itself, drawn faintly as a guide. */}
      <path
        d={curve.toPathData()}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={1.5}
        strokeDasharray="3 6"
        aria-hidden="true"
      />

      {/* The hub — a cog path — fades in with the arc. */}
      <g
        aria-hidden="true"
        opacity={t}
        transform={`translate(${hub.x} ${hub.y})`}
      >
        <Path d={cog(34)} fill={hubFill} />
        {[-10, 0, 10].map((dx) => (
          <circle key={dx} cx={dx} cy={0} r={3} fill={tokens.color.accentInk} />
        ))}
      </g>

      <PathFlow
        curve={curve}
        distribute="even"
        orient={orient}
        role="menu"
        aria-label="Radial menu"
      >
        {items.map((name) => (
          <MenuItem
            key={name}
            name={name}
            fill={itemFill}
            iconColor={iconColor}
          />
        ))}
      </PathFlow>
    </>
  );
}

/** One menu item: a hexagonal chip with a centered icon. */
function MenuItem({
  name,
  fill,
  iconColor,
}: {
  name: IconName;
  fill: string;
  iconColor: string;
}) {
  return (
    <g role="menuitem" aria-label={name} style={{ cursor: "pointer" }}>
      <Path
        d={hexagon(27)}
        fill={fill}
        stroke={tokens.color.line}
        strokeWidth={1.5}
      />
      <Icon name={name} size={24} color={iconColor} />
    </g>
  );
}
