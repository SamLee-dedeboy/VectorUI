import { describe, it, expect } from "vitest";
import { intrusionFromPath } from "../src/layout/intrusionFromPath";
import type { PathWalker } from "../src/layout/pathWalker";
import type { CurvePoint } from "../src/layout/walkPath";

/**
 * jsdom doesn't ship `getPointAtLength`, so we feed `intrusionFromPath` a
 * custom `PathWalker` built around analytical samplers. That's the whole
 * point of the duck-typed interface — the path math is tested in real
 * browsers; the silhouette → reach pipeline is tested here.
 */

/** Triangle from (0, 0) to (100, 0) to (100, 100) — right-angle triangle
 *  filling the right half of a 100×100 box. */
function triangleWalker(): PathWalker {
  // Three edges, each 100 long along its own axis. Total length ~341.
  const edges: Array<{ from: CurvePoint; to: CurvePoint; len: number }> = [
    { from: { x: 0, y: 0 }, to: { x: 100, y: 0 }, len: 100 },
    { from: { x: 100, y: 0 }, to: { x: 100, y: 100 }, len: 100 },
    { from: { x: 100, y: 100 }, to: { x: 0, y: 0 }, len: Math.hypot(100, 100) },
  ];
  const total = edges.reduce((a, e) => a + e.len, 0);
  return {
    length: total,
    pointAtLength(s) {
      const clamped = Math.max(0, Math.min(total, s));
      let acc = 0;
      for (const e of edges) {
        if (clamped <= acc + e.len) {
          const t = e.len === 0 ? 0 : (clamped - acc) / e.len;
          return {
            x: e.from.x + (e.to.x - e.from.x) * t,
            y: e.from.y + (e.to.y - e.from.y) * t,
          };
        }
        acc += e.len;
      }
      return edges[edges.length - 1].to;
    },
  };
}

describe("intrusionFromPath", () => {
  it('side="left" returns the rightmost x at each y', () => {
    const wrap = intrusionFromPath(triangleWalker(), "left", {
      width: 100,
      height: 100,
      samples: 2048,
    });
    // At y=0 the triangle's right edge is at x=100. Sample a band centred
    // on y=0 — the maximum x in that band is the apex.
    expect(wrap(0, 1)).toBeCloseTo(100, 0);
    // At y=50 the diagonal sits at x=50; the rightmost x is the vertical edge
    // at x=100.
    expect(wrap(49, 51)).toBeCloseTo(100, 0);
    // At y=99 the only sample is the very tip of the vertical edge (x=100).
    expect(wrap(99, 100)).toBeCloseTo(100, 0);
  });

  it('side="right" returns width - leftmostX at each y', () => {
    const wrap = intrusionFromPath(triangleWalker(), "right", {
      width: 100,
      height: 100,
      samples: 2048,
    });
    // At y=0 the leftmost x is the start vertex (0). Right intrusion =
    // 100 - 0 = 100 (the whole column).
    expect(wrap(0, 1)).toBeCloseTo(100, 0);
    // At y=50 the leftmost x is on the diagonal at ~50 (samples may not
    // land exactly on 50, so allow modest tolerance). Right intrusion ≈ 50.
    expect(wrap(49, 51)).toBeGreaterThan(45);
    expect(wrap(49, 51)).toBeLessThan(55);
  });

  it("returns 0 outside the path's vertical extent", () => {
    const wrap = intrusionFromPath(triangleWalker(), "left", {
      width: 100,
      height: 100,
    });
    expect(wrap(-10, -5)).toBe(0);
    expect(wrap(120, 130)).toBe(0);
  });
});
