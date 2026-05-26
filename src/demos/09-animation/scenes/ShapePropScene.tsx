import { useState } from "react";
import { VectorUIRoot } from "../../../components/VectorUIRoot";
import { Card } from "../../../components/Card";
import { Flow } from "../../../components/Flow";
import { scoopCard } from "../../../shapes";
import { useTween } from "../../../layout/tween";
import { tokens } from "../../../tokens";

/**
 * Scene C — animate a primitive's `shape` prop, with text wrapping the
 * morphing contour at 60 fps.
 *
 * The trick: don't tween the rendered `d` string. Tween the shape's
 * PARAMETERS, and let the parametric generator emit BOTH the path AND its
 * closed-form `flowAround` every frame. `<Card>`'s body slot consumes the
 * bundle directly and skips contour sampling — turning per-frame text wrap
 * from "O(path tokens × bands)" into "O(line count × intrusion query)".
 *
 *   const shape = scoopCard(lerpedParams);   // { path, flowAround, … }
 *   <Card shape={shape} title=… body=… />
 *
 * The library still ships `useTweenedPath` for the (rarer) case where all
 * you have is a `d` string from a non-parametric source.
 */

const CARD_W = 340;
const CARD_H = 220;

// Two scoop configurations — we interpolate their params (not the rendered
// d string), so every frame's `scoopCard(...)` call yields a fresh bundle
// whose `flowAround` Card consumes without sampling the contour.
const SHALLOW = {
  cornerRadius: 22,
  scoopTop: 60,
  scoopHeight: 80,
  depth: 18,
} as const;
const DEEP = {
  cornerRadius: 22,
  scoopTop: 35,
  scoopHeight: 145,
  depth: 110,
} as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const ROOT_W = 440;
const MARGIN = 50;

const BODY =
  "Each frame we lerp scoopTop, scoopHeight, and depth — scoopCard hands Card a bundle with a closed-form flowAround, so the body re-wraps the morphing contour with no per-frame contour sampling.";

export function ShapePropScene() {
  const [deep, setDeep] = useState(false);
  // Tween a SCALAR (0 = shallow, 1 = deep). All the layout primitives
  // downstream are pure functions of their props — they don't care that the
  // shape is moving.
  const progress = useTween(deep ? 1 : 0, { durationMs: 480 });

  // One scoopCard call → a bundle that ships path + closed-form flowAround.
  const shape = scoopCard({
    cornerRadius: 22,
    scoopTop: lerp(SHALLOW.scoopTop, DEEP.scoopTop, progress),
    scoopHeight: lerp(SHALLOW.scoopHeight, DEEP.scoopHeight, progress),
    depth: lerp(SHALLOW.depth, DEEP.depth, progress),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setDeep((v) => !v)}
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: "1.5px solid #1f8a5c",
          background: deep ? "#1f8a5c" : "#ffffff",
          color: deep ? "#ffffff" : "#1f8a5c",
          font: "600 13px system-ui, sans-serif",
          cursor: "pointer",
          margin: "0 0 8px",
        }}
      >
        {deep ? "Shallow scoop" : "Deepen the scoop"}
      </button>
      <VectorUIRoot
        width={ROOT_W}
        height="content"
        style={{ maxWidth: ROOT_W, background: tokens.color.surfaceSunken }}
      >
        <Flow
          padding={MARGIN}
          align="center"
          crossSize={ROOT_W - MARGIN * 2}
        >
          <Card
            shape={shape}
            width={CARD_W}
            height={CARD_H}
            title="Text follows the path"
            body={BODY}
          />
        </Flow>
      </VectorUIRoot>
    </>
  );
}
