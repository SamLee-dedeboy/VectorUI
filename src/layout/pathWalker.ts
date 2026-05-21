/**
 * Layer 2 — a duck-typed wrapper over `SVGGeometryElement.getPointAtLength`.
 *
 * The browser ships a battle-tested arc-length walker on every SVG path
 * element; `intrusionFromPath` and `curveFromPath` both want it. We don't
 * want either helper to be coupled to the DOM or to assume a particular
 * SVG renderer, so they take a `PathWalker` (the minimum interface they
 * need) instead. The DOM factory is supplied here for ergonomics.
 *
 * Test environments without `getPointAtLength` (jsdom, Node) can construct
 * a `PathWalker` directly — for a straight line, an arc, anything you can
 * sample analytically — and pass it in.
 */
import type { CurvePoint } from "./walkPath";

export type PathWalker = {
  /** Total arc length in user units. */
  length: number;
  /** Point at arc-length `s` (clamped to [0, length]). */
  pointAtLength: (s: number) => CurvePoint;
};

/**
 * Build a `PathWalker` from raw SVG path data, using the browser's native
 * `getPointAtLength`. Throws clearly if the runtime can't supply that —
 * jsdom and Node fall here today.
 */
export function pathWalkerFromData(d: string): PathWalker {
  if (typeof document === "undefined") {
    throw new Error(
      "pathWalkerFromData: no `document` in this runtime — pass a custom " +
        "PathWalker instead, or call this from a browser.",
    );
  }
  const el = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  ) as SVGPathElement;
  el.setAttribute("d", d);
  // jsdom omits getTotalLength; surface that clearly rather than NaN-ing later.
  const tl = (el as unknown as { getTotalLength?: () => number }).getTotalLength;
  if (typeof tl !== "function") {
    throw new Error(
      "pathWalkerFromData: this SVG runtime does not implement " +
        "getTotalLength (common in jsdom). Construct a PathWalker manually.",
    );
  }
  const length = el.getTotalLength();
  return {
    length,
    pointAtLength(s) {
      const clamped = Math.max(0, Math.min(length, s));
      const p = el.getPointAtLength(clamped);
      return { x: p.x, y: p.y };
    },
  };
}
