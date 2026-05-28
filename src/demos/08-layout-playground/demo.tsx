import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { tokens } from "../../tokens";
import { Controls } from "./Controls";
import { Playground, type FrameLayoutSize } from "./Playground";
import { defaultState, type PlaygroundState } from "./state";

/**
 * Demo 8 — Layout playground (SPEC §11).
 *
 * One composed scene whose inputs are wired to HTML controls. Every knob
 * targets exactly one layout-system capability:
 *
 *  - container slider  →  container-query reflow (the `width="auto"` Root
 *                         reads its own pixel width via ResizeObserver)
 *  - tabs ±            →  `PathFlow` arc-length redistribution on a quadratic
 *  - tags ±            →  `PathFlow` redistribution on a line
 *  - distribute radio  →  exercises every `distributeAlong` strategy
 *  - body length       →  `Frame height="auto"` shrink-wrap via a slot whose
 *                         `height="content"` re-measures the body
 *  - footer ±          →  `Flow` re-flowing on dynamic content change
 *  - inspect           →  overlay showing slot rects, curves, intrusion
 *
 * Counterpart to Demo 1 (impossible-in-HTML text flow) and Demo 7
 * (impossible-in-HTML shape morphing): here the headline is that the entire
 * surface is *one* layout system the consumer drives with declarative props.
 */
export function Demo() {
  const [state, setState] = useState<PlaygroundState>(defaultState);
  // The Frame's resolved size is hoisted here so this Demo component
  // re-renders after the Frame settles, which in turn re-renders the
  // `<VectorUIRoot>` below — letting its `useFitToContent` re-measure the
  // freshly-grown DOM. Without this hand-off the Root sees only the
  // pre-settle Frame height, and `viewBox` stays one frame stale (e.g.
  // changing body length from "medium" to "long" leaves the footer
  // outside the viewBox until the next user input forces another render).
  const [, setFrameSize] = useState<FrameLayoutSize>({ width: 0, height: 0 });

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        One composed scene; every knob below targets a single layout-system
        capability. Drag the <code>container</code> slider (or the resize
        handle on the right edge of the panel) to drive the panel's own width —
        the breakpoint badge in its top-right updates live, the footer pivots
        between row and column, and the Frame regenerates its path as its
        height changes. Slot <code>height="fill"</code> is the dual of{" "}
        <code>"content"</code>; it isn't shown here so the auto-Frame story
        stays clean — see <code>docs/guide.md</code>.
      </p>

      <Controls state={state} onChange={setState} />

      {/* The wrapper carries the slider-driven width AND a native resize
          handle, so dragging the panel's edge is equivalent to moving the
          slider. The inner SVG has width:100% and tracks the wrapper via its
          own ResizeObserver — `useViewportWidth()` then reads the *panel's*
          width, not the window's, which is the container-query mechanic. */}
      <div
        style={{
          width: state.containerPx,
          maxWidth: "100%",
          minWidth: 320,
          resize: "horizontal",
          overflow: "auto",
          border: "1px dashed #c4c8be",
          padding: 8,
          background: tokens.color.surfaceSunken,
        }}
      >
        <VectorUIRoot
          width="auto"
          height="content"
          style={{
            background: tokens.color.surface,
            borderRadius: 4,
            display: "block",
          }}
        >
          <Playground state={state} onFrameLayout={setFrameSize} />
        </VectorUIRoot>
      </div>
    </div>
  );
}
