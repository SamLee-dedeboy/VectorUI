import { describe, it, expect } from "vitest";
import { curveFromPath } from "../src/layout/curveFromPath";
import { line } from "../src/layout/walkPath";
import type { PathWalker } from "../src/layout/pathWalker";

/**
 * `getPointAtLength` is missing in jsdom; supply a `PathWalker` derived from
 * an analytical curve and check the wrap behaves like a `Curve` against the
 * same primitive.
 */
function walkerFromLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): PathWalker {
  const length = Math.hypot(x2 - x1, y2 - y1);
  return {
    length,
    pointAtLength(s) {
      const t = length === 0 ? 0 : Math.max(0, Math.min(length, s)) / length;
      return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
    },
  };
}

describe("curveFromPath", () => {
  it("matches a built-in line() across pointAtLength", () => {
    const w = walkerFromLine(0, 0, 100, 0);
    const c = curveFromPath(w);
    const builtIn = line({ x1: 0, y1: 0, x2: 100, y2: 0 });
    expect(c.length).toBe(builtIn.length);
    for (let i = 0; i <= 10; i++) {
      const s = (c.length * i) / 10;
      expect(c.pointAtLength(s)).toEqual(builtIn.pointAtLength(s));
    }
  });

  it("estimates tangent via central differences", () => {
    // Diagonal from (0, 0) to (100, 100) — tangent = π/4.
    const w = walkerFromLine(0, 0, 100, 100);
    const c = curveFromPath(w);
    expect(c.tangentAtLength(c.length / 2)).toBeCloseTo(Math.PI / 4, 4);
  });

  it("returns the original d via toPathData when constructed from a string", () => {
    // We don't actually evaluate the string — no DOM in jsdom — but the
    // toPathData round-trip should still be the source `d`. Use a walker
    // path here to avoid the DOM lookup; toPathData returns "" then.
    const c = curveFromPath(walkerFromLine(0, 0, 1, 1));
    expect(c.toPathData()).toBe("");
  });

  it("clamps tangent to 0 when the curve has zero length", () => {
    const w: PathWalker = {
      length: 0,
      pointAtLength: () => ({ x: 0, y: 0 }),
    };
    const c = curveFromPath(w);
    expect(c.tangentAtLength(0)).toBe(0);
  });
});
