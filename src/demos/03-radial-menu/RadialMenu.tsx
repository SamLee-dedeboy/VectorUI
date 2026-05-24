import { Path } from "../../svg/Path";
import { Circle } from "../../svg/Circle";
import {
  distributeAlong,
  quadratic,
  type CurvePoint,
} from "../../layout/walkPath";
import { tokens } from "../../tokens";
import { useTween } from "../02-card/useTween";
import { Icon, type IconName } from "./Icon";
import { hexagon, cog } from "./chrome";
import { useStaggeredReveal } from "./useStaggeredReveal";

/**
 * `RadialMenu` — a reusable menu that distributes items along a curve.
 *
 * `mode` picks an arc (a fan around a hub) or a line (a row); switching is
 * animated — the curve is one quadratic Bézier with its control points tweened
 * between the two configurations.
 *
 * `open` controls a staggered reveal: the cog hub doubles as a "…" toggle, and
 * when it flips open the chips fly out from the hub along their radial
 * trajectory, one after the other (left-to-right). Toggling closed reverses
 * the path. Each chip's traversal takes `itemDurationMs`, neighbours start
 * `staggerMs` apart.
 */

export type RadialMenuMode = "arc" | "line";

export type RadialMenuProps = {
  /** Icons to place along the curve. */
  items: IconName[];
  /** "arc" fans the items around a hub; "line" lays them in a row. Animated. */
  mode: RadialMenuMode;
  /** Whether the menu is expanded. The cog hub toggles this via `onToggle`. */
  open?: boolean;
  /** Called when the user clicks the cog hub. */
  onToggle?: () => void;
  /** Per-item travel time for the reveal, in milliseconds. */
  itemDurationMs?: number;
  /** Delay between consecutive items in the reveal, in milliseconds. */
  staggerMs?: number;
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
  open = true,
  onToggle,
  itemDurationMs = 300,
  staggerMs = 60,
  orient = "along",
  width = 540,
  height = 400,
  hubFill = tokens.color.accent,
  itemFill = tokens.color.surface,
  iconColor = tokens.color.ink,
}: RadialMenuProps) {
  const hub: CurvePoint = { x: width / 2, y: height * 0.75 };
  const radius = height * 0.425;

  // t: 0 = line, 1 = arc. Tweened so the mode switch animates.
  const t = useTween(mode === "arc" ? 1 : 0, 380);

  // Per-item reveal progress; 1 = at the curve, 0 = tucked into the hub.
  const reveal = useStaggeredReveal(items.length, open, {
    itemDurationMs,
    staggerMs,
  });
  // Overall opacity for the guide line — first item to start animating wins.
  const guideAlpha = reveal[0] ?? (open ? 1 : 0);

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

  // Even-distributed arc-length offsets — the chips' final resting places.
  const offsets = distributeAlong(curve.length, items.length, {
    distribute: "even",
  });

  return (
    <>
      {/* The curve itself, drawn faintly as a guide — fades in with the reveal. */}
      <path
        d={curve.toPathData()}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={1.5}
        strokeDasharray="3 6"
        opacity={guideAlpha}
        aria-hidden="true"
      />

      {/* Items: each chip travels along the line from hub → final on its
          curve, with a stagger so they appear one-by-one. We don't use
          PathFlow here because PathFlow places chips at their static curve
          offsets — we need an animated lerp from the hub. */}
      <g role="menu" aria-label="Radial menu">
        {items.map((name, i) => {
          const p = reveal[i] ?? 0;
          if (p <= 0) return null;
          const final = curve.pointAtLength(offsets[i] ?? 0);
          const tangent = curve.tangentAtLength(offsets[i] ?? 0);
          const x = hub.x + (final.x - hub.x) * p;
          const y = hub.y + (final.y - hub.y) * p;
          const angleDeg = orient === "along" ? (tangent * 180) / Math.PI : 0;
          return (
            <g
              key={name}
              transform={`translate(${x} ${y}) rotate(${angleDeg}) scale(${p})`}
              opacity={p}
            >
              <MenuItem name={name} fill={itemFill} iconColor={iconColor} />
            </g>
          );
        })}
      </g>

      {/* The cog hub — also the "…" toggle. Three dots sit in the middle of a
          green cog; clicking it expands or collapses the menu. The cog itself
          only fully fills in once `mode` reaches `"arc"`. */}
      <g
        role={onToggle ? "button" : undefined}
        aria-label={onToggle ? (open ? "Close menu" : "Open menu") : undefined}
        aria-expanded={onToggle ? open : undefined}
        tabIndex={onToggle ? 0 : undefined}
        onClick={onToggle}
        onKeyDown={
          onToggle
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle();
                }
              }
            : undefined
        }
        style={onToggle ? { cursor: "pointer" } : undefined}
        transform={`translate(${hub.x} ${hub.y})`}
      >
        {/* When mode=line the cog softens to a plain disc — opacity rides `t`. */}
        <Circle r={34} fill={hubFill} />
        <Path d={cog(34)} fill={hubFill} opacity={t} />
        {[-10, 0, 10].map((dx) => (
          <Circle key={dx} cx={dx} r={3} fill={tokens.color.accentInk} />
        ))}
      </g>
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
