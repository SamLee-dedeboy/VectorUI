import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Path } from "../../svg/Path";
import { useCoordinateScale } from "../../layout/coordinateScale";

/**
 * Demo 0 — implementation steps 1 & 2.
 *
 * Step 1: a trivial SVG primitive on screen.
 * Step 2: VectorUIRoot + useCoordinateScale — resize the window and watch the
 *         layout<->pixel scale update live.
 */

/** Reads the live scale and prints it inside the SVG (layout space). */
function ScaleReadout() {
  const { scale, viewBoxWidth, viewBoxHeight } = useCoordinateScale();
  return (
    <text
      x={viewBoxWidth / 2}
      y={viewBoxHeight / 2 + 6}
      textAnchor="middle"
      fontFamily="ui-monospace, monospace"
      fontSize={16}
      fill="#0b3d2e"
    >
      scale = {scale.toFixed(4)} px / layout unit
    </text>
  );
}

export function Smoke() {
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
        style={{ maxWidth: 720, border: "1px solid #ddd", background: "#fbfbf9" }}
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
