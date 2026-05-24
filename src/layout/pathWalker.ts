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

/**
 * Sampled bounding box of a walker's silhouette. A detached `<path>`'s native
 * `getBBox` is unreliable across browsers, and we want the box to AGREE with
 * `intrusionFromPath`, which works by sampling `pointAtLength`. So we sample
 * the same walker and take the min/max — the box is therefore the silhouette's
 * *sampled* extent (the same approximation the intrusion already makes), which
 * is exactly what keeps a drawn shape and its wrap profile locked together.
 */
export function measureWalkerBBox(
  walker: PathWalker,
  samples = 512,
): { minX: number; minY: number; width: number; height: number } {
  const n = Math.max(2, samples);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= n; i++) {
    const s = walker.length === 0 ? 0 : (walker.length * i) / n;
    const p = walker.pointAtLength(s);
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, width: 0, height: 0 };
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/**
 * A `PathWalker` whose every sampled point is translated by `(dx, dy)`. Used to
 * move a path's bounding-box origin to `(0, 0)` so its intrusion lines up with
 * the text column's top-left, while the drawn path is shifted by the same
 * amount — the two stay in lockstep.
 */
export function shiftWalker(
  w: PathWalker,
  dx: number,
  dy: number,
): PathWalker {
  return {
    length: w.length,
    pointAtLength(s) {
      const p = w.pointAtLength(s);
      return { x: p.x + dx, y: p.y + dy };
    },
  };
}
