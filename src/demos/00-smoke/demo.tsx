import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Path } from "../../svg/Path";
import { ScaleReadout } from "./ScaleReadout";

/**
 * Demo 0 — implementation steps 1 & 2.
 *
 * Step 1: a trivial SVG primitive on screen.
 * Step 2: VectorUIRoot + useCoordinateScale — the reusable `<ScaleReadout>`
 *         (see ScaleReadout.tsx) prints the live layout↔pixel scale; resize
 *         the window to watch it update.
 */
export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 560 }}>
        A 400×200 layout-unit scene with CSS width 100%. The number below is the
        live coordinate scale — resize the browser and it updates via the
        ResizeObserver in <code>VectorUIRoot</code>.
      </p>
      <VectorUIRoot
        width={400}
        height={200}
        style={{
          maxWidth: 720,
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
    </div>
  );
}
