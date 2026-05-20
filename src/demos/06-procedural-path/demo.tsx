import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { tokens } from "../../tokens";
import { Controls } from "./Controls";
import { ProceduralPath } from "./ProceduralPath";
import { ContouredMenu } from "./ContouredMenu";
import { defaultState, type ProceduralState } from "./state";

/**
 * Demo 6 — procedural path × live layout. Two takes on one idea.
 *
 * Version A: sliders drive a closed-form left-edge wave; the SAME function
 * answers `Text`'s `intrusionAt`, so the paragraph wraps the exact contour
 * the path draws. A DX probe for the `ShapeGenerator` × `flowAround` seam.
 *
 * Version B: a vertical menu whose items have varying widths. One array of
 * labels feeds both the measured row widths AND the silhouette path that
 * shelves to each row's right edge — click a row, the label widens, the path
 * morphs in lockstep. Same single-source trick, expressed as a step function
 * instead of a wave.
 */
export function Demo() {
  const [state, setState] = useState<ProceduralState>(defaultState);

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Two probes of the same idea: one closed-form function feeds both what
        the path draws and what the layout consumes, so geometry and layout
        stay in lockstep through every frame.
      </p>

      <p className="variant-label">
        Version A — slider-driven wave; <code>Text</code> wraps the contour
      </p>
      <Controls state={state} onChange={setState} />
      <div
        style={{
          width: state.containerPx,
          maxWidth: "100%",
          marginTop: 8,
        }}
      >
        <VectorUIRoot
          width="auto"
          height="content"
          style={{ background: tokens.color.surfaceSunken }}
        >
          <ProceduralPath params={state} width={state.containerPx} />
        </VectorUIRoot>
      </div>

      <p className="variant-label">
        Version B — vertical menu of varying-width items; path shelves to each
        row (click to activate)
      </p>
      <ContouredMenu />
    </div>
  );
}
