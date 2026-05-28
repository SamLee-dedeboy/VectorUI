import { TransformScene } from "./scenes/TransformScene";
import { LayoutInputScene } from "./scenes/LayoutInputScene";
import { ShapePropScene } from "./scenes/ShapePropScene";

/**
 * Demo 6 — Animation as a render-time concern.
 *
 * VectorUI primitives are pure functions of props. To animate, drive a prop
 * over time and let React re-render — the library ships five RAF hooks
 * (`useTween`, `useTweenedNumbers`, `useTweenedPoints`, `useTweenedPath`,
 * `useStaggeredReveal`) that turn that into one line.
 *
 * Three sub-scenes, one recipe:
 *   A — animate a child's transform   (useTween, scalar)
 *   B — animate a layout input        (useTweenedPoints, vertex array → curve)
 *   C — animate a primitive's `shape` (useTweenedPath, d-string)
 *
 * Each scene's tagline is the same: "It's the same recipe."
 */

const CAPTION_STYLE: React.CSSProperties = {
  color: "#555",
  margin: "0 0 6px",
  font: "13px/1.5 system-ui, sans-serif",
};

const RECIPE_TAG: React.CSSProperties = {
  display: "inline-block",
  marginTop: 4,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#eef0ea",
  color: "#1f8a5c",
  font: "600 12px system-ui, sans-serif",
};

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        VectorUI has no animation API. Its primitives recompute from props
        each render, so animating is just <em>driving a prop over time</em>{" "}
        and letting React re-render. The library ships five RAF hooks that
        turn that pattern into one line. Three sub-scenes — three flavors of
        the recipe.
      </p>

      <p className="variant-label">
        A — animate a child's transform
      </p>
      <p style={CAPTION_STYLE}>
        <code>useTween(hovered ? 1.18 : 1)</code> returns the current eased
        scale. The wrapping <code>&lt;g transform="scale(...)"&gt;</code>
        spends it. PathFlow / Frame / Card aren't involved.
      </p>
      <TransformScene />
      <span style={RECIPE_TAG}>It's the same recipe.</span>

      <p className="variant-label" style={{ marginTop: 32 }}>
        B — animate a layout input
      </p>
      <p style={CAPTION_STYLE}>
        The chips are static. What's animated is the <code>Curve</code>{" "}
        PathFlow distributes along —{" "}
        <code>polyline({"{ points: useTweenedPoints(target) }"})</code>{" "}
        morphs its vertices, and PathFlow re-distributes each frame for free.
      </p>
      <LayoutInputScene />
      <span style={RECIPE_TAG}>It's the same recipe.</span>

      <p className="variant-label" style={{ marginTop: 32 }}>
        C — animate a Card's shape with text wrapping the morphing contour
      </p>
      <p style={CAPTION_STYLE}>
        Tween the shape's <em>parameters</em>, not the rendered <code>d</code>.
        Each frame, <code>scoopCard(...)</code> hands Card a bundle of{" "}
        <code>{`{ path, flowAround }`}</code>; Card's body slot consumes the
        closed-form <code>flowAround</code> directly and skips contour
        sampling — so the body re-flows around the morphing scoop at full 60
        fps. (<code>useTweenedPath</code> is also in the library for the case
        where you only have a <code>d</code> string from a non-parametric
        source.)
      </p>
      <ShapePropScene />
      <span style={RECIPE_TAG}>It's the same recipe.</span>
    </div>
  );
}
