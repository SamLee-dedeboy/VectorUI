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
          d="M 40 100 q 60 -90 160 0 q 100 90 160 0"
          fill="none"
          stroke="#1f8a5c"
          strokeWidth={3}
        />
        <circle cx={40} cy={100} r={7} fill="#1f8a5c" />
        <circle cx={360} cy={100} r={7} fill="#1f8a5c" />
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
        <circle
          cx={150}
          cy={130}
          r={96}
          fill="none"
          stroke="#7fd6ad"
          strokeWidth={3}
        />
        <ScaleReadout fill="#eaf3ee" fontSize={13} />
      </VectorUIRoot>
    </div>
  );
}
