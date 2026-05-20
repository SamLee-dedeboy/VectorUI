import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { tokens } from "../../tokens";
import { Controls } from "./Controls";
import { ProceduralPath } from "./ProceduralPath";
import { defaultState, type ProceduralState } from "./state";

/**
 * Demo 6 — procedural path with live text reflow.
 *
 * Sliders drive a closed-form left-edge wave (amplitude / frequency / phase).
 * One function emits the SVG path AND answers Text's `intrusionAt` query, so
 * every paragraph line wraps the exact contour drawn on the same frame. A DX
 * probe for the `ShapeGenerator` × `flowAround` seam — the bit of VectorUI
 * that earlier demos exercise only one side of at a time.
 */
export function Demo() {
  const [state, setState] = useState<ProceduralState>(defaultState);

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The card's left edge is procedurally generated from one closed-form
        function — amplitude, frequency, phase. That same function answers the
        <code> Text</code> component's <code>intrusionAt</code>, so every line
        below wraps the exact contour you see. Drag a slider and watch the
        silhouette morph and the paragraph reflow on a single frame.
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
    </div>
  );
}
