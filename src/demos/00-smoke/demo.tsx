import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Path } from "../../svg/Path";
import { ScaleReadout } from "./ScaleReadout";

/**
 * Demo 0 — implementation steps 1 & 2.
 *
 * Two scenes, both using the reusable `<ScaleReadout>` (see ScaleReadout.tsx).
 * Each VectorUIRoot has a different viewBox and rendered size, so the live
 * layout↔pixel scale the component reports differs between them.
 */

/**
 * A star/burst polygon centred at (cx, cy): `spikes` points, the radius
 * alternating between `outer` and `inner`. Returned as plain SVG path data.
 */
function star(
  cx: number,
  cy: number,
  spikes: number,
  outer: number,
  inner: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(
      `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`,
    );
  }
  return `M ${pts.join(" L ")} Z`;
}

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 560 }}>
        Both scenes below render the same <code>ScaleReadout</code> component;
        because each <code>VectorUIRoot</code> has a different viewBox and size,
        the live coordinate scale differs. Resize the browser to watch both.
      </p>

      <p className="variant-label">Version A — 400×200 scene, default readout</p>
      <VectorUIRoot
        width={400}
        height={200}
        style={{
          maxWidth: 480,
          border: "1px solid #ddd",
          background: "#fbfbf9",
        }}
      >
        <Path
          d={star(200, 100, 5, 82, 34)}
          fill="none"
          stroke="#1f8a5c"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <ScaleReadout />
      </VectorUIRoot>

      <p className="variant-label">
        Version B — 300×260 scene, restyled readout
      </p>
      <VectorUIRoot
        width={300}
        height={260}
        style={{
          maxWidth: 300,
          border: "1px solid #1f2733",
          background: "#1f2733",
        }}
      >
        <Path
          d={star(150, 130, 12, 98, 80)}
          fill="none"
          stroke="#7fd6ad"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <ScaleReadout fill="#eaf3ee" fontSize={13} />
      </VectorUIRoot>
    </div>
  );
}
