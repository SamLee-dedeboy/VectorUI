import { useMemo } from "react";
import { PathFlow } from "../../components/PathFlow";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";
import { Icon, type IconName } from "./Icon";
import { hexagon } from "./chrome";
import { curveFromPoints, type CurveKind, type CurveScene } from "./curves";
import { useMorphedCurve } from "./useMorphedCurve";

/**
 * `CurveMenu` — Demo 3's Version B sibling. It distributes items along a
 * picker-driven curve (sine, square, or straight line) to make the point
 * that the "radial" in a radial menu is just one path; `PathFlow` will run
 * along any of them. Switching kinds smoothly morphs the vertices, so the
 * items slide along the deforming curve naturally — no special-case code in
 * `PathFlow`, just a different point array per frame. Items stay upright
 * because square-wave corners would otherwise spin chips at the kinks.
 */

export type CurveMenuProps = {
  items: IconName[];
  /** Which curve to use as the layout path. */
  curve: CurveKind;
  /** Scene size, in layout units. */
  width?: number;
  height?: number;
  /** How many full cycles of the wave fit across the scene. */
  cycles?: number;
  /** Vertical amplitude of the wave, in layout units. */
  amplitude?: number;
  /** How long the curve-switch morph takes, in milliseconds. */
  morphMs?: number;
  /** Item chip fill. */
  itemFill?: string;
  /** Icon stroke color. */
  iconColor?: string;
  /** Color of the dashed curve guide. */
  curveStroke?: string;
};

export function CurveMenu({
  items,
  curve,
  width = 540,
  height = 240,
  cycles = 2,
  amplitude = 38,
  morphMs = 360,
  itemFill = "#efeafc",
  iconColor = "#3b2d6b",
  curveStroke = "#6c5ce0",
}: CurveMenuProps) {
  const scene: CurveScene = useMemo(
    () => ({
      x0: 70,
      x1: width - 70,
      yMid: height / 2,
      amplitude,
      cycles,
    }),
    [width, height, amplitude, cycles],
  );
  const points = useMorphedCurve(curve, scene, morphMs);
  const path = useMemo(() => curveFromPoints(points), [points]);

  return (
    <>
      {/* The chosen curve, drawn so the layout path is unmistakable on the
          violet background. A tinted dashed stroke reads as "guideline" but
          stays solid enough to follow at a glance. */}
      <path
        d={path.toPathData()}
        fill="none"
        stroke={curveStroke}
        strokeOpacity={0.55}
        strokeWidth={2}
        strokeDasharray="5 5"
        strokeLinecap="round"
        aria-hidden="true"
      />

      <PathFlow
        curve={path}
        distribute="even"
        orient="upright"
        role="menu"
        aria-label={`Menu along ${curve} curve`}
      >
        {items.map((name) => (
          <g
            key={name}
            role="menuitem"
            aria-label={name}
            style={{ cursor: "pointer" }}
          >
            <Path
              d={hexagon(27)}
              fill={itemFill}
              stroke={tokens.color.line}
              strokeWidth={1.5}
            />
            <Icon name={name} size={24} color={iconColor} />
          </g>
        ))}
      </PathFlow>
    </>
  );
}
