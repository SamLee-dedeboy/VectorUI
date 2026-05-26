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
 */

const HEX = (() => {
  // A flat-topped regular hexagon of circumradius 36, centered on the origin.
  const r = 36;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
})();

export function TransformScene() {
  const [hovered, setHovered] = useState(false);
  const scale = useTween(hovered ? 1.18 : 1, { durationMs: 220 });

  return (
    <VectorUIRoot
      width={320}
      height={140}
      style={{ maxWidth: 320, background: tokens.color.surfaceSunken }}
    >
      <g transform={`translate(160 70) scale(${scale})`}>
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
    </VectorUIRoot>
  );
}
