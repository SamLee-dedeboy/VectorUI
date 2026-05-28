import { useState } from "react";
import { VectorUIRoot } from "../../../components/VectorUIRoot";
import { VectorButton } from "../../../components/VectorButton";
import { useTween } from "../../../layout/tween";
import { tokens } from "../../../tokens";

/**
 * Scene A — animate a child's transform.
 *
 * The only animated thing here is a scalar: how big the chip should be. A
 * `useTween` reads it; the `<g transform="scale(...)">` wrapping the button
 * spends it. PathFlow / Frame / Card aren't involved — this is the simplest
 * possible flavor of the recipe.
 *
 * Coordinate-system discipline (Demo 3 / guide §18): the hex is defined in
 * its own LOCAL frame, centered at `(0, 0)`. The viewBox is a pinned design
 * canvas whose `H` is DERIVED from the hex's max-scale extent + breathing
 * room — pinning it (rather than `height="content"`) keeps the viewBox from
 * jumping on hover when the hex grows. ONE outer `<g transform>` does the
 * placement; an inner `<g>` spends the tweened scale.
 */

const HEX_R = 36;
const MAX_SCALE = 1.18;
// Hex circumradius at max scale — the largest extent the chip ever reaches
// from its local origin. Used to size the viewBox so it doesn't reflow on
// hover when the scale tween runs.
const MAX_EXTENT = HEX_R * MAX_SCALE;
const VERT_PAD = 18;

const W = 320;
const H = Math.ceil(MAX_EXTENT * 2 + VERT_PAD * 2); // 121 — derived, not magic

const HEX = (() => {
  // A flat-topped regular hexagon of circumradius HEX_R, centered on the origin.
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(HEX_R * Math.cos(a)).toFixed(2)} ${(HEX_R * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
})();

export function TransformScene() {
  const [hovered, setHovered] = useState(false);
  const scale = useTween(hovered ? MAX_SCALE : 1, { durationMs: 220 });

  return (
    <VectorUIRoot
      width={W}
      height={H}
      style={{ maxWidth: W, background: tokens.color.surfaceSunken }}
    >
      {/* ONE placement transform → viewBox center. The inner <g> spends the
          tweened scalar so the hex grows around its own origin. */}
      <g transform={`translate(${W / 2} ${H / 2})`}>
        <g transform={`scale(${scale})`}>
          <VectorButton
            shape={HEX}
            fill={tokens.color.accent}
            onHoverChange={setHovered}
            aria-label="Hover me"
          >
            <text
              x={0}
              y={4}
              fontSize={11}
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fontWeight={600}
              fill={tokens.color.accentInk}
              aria-hidden="true"
            >
              hover
            </text>
          </VectorButton>
        </g>
      </g>
    </VectorUIRoot>
  );
}
