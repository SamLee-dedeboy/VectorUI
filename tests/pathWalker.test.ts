import { describe, it, expect } from "vitest";
import { measureWalkerBBox, shiftWalker } from "../src/layout/pathWalker";
import type { PathWalker } from "../src/layout/pathWalker";
import type { CurvePoint } from "../src/layout/walkPath";

/**
 * jsdom doesn't ship `getPointAtLength`, so — like `intrusionFromPath`'s test —
 * we feed the helpers a synthetic `PathWalker`. These cover the pure sampling
 * math (bbox, point translation), independent of any browser path engine.
 */

/** A walker over a polyline through the given points (closed by the caller). */
function polylineWalker(pts: CurvePoint[]): PathWalker {
  const segs = pts.slice(1).map((p, i) => ({
    from: pts[i],
    to: p,
    len: Math.hypot(p.x - pts[i].x, p.y - pts[i].y),
  }));
  const total = segs.reduce((a, s) => a + s.len, 0);
  return {
    length: total,
    pointAtLength(s) {
      const clamped = Math.max(0, Math.min(total, s));
      let acc = 0;
      for (const seg of segs) {
        if (clamped <= acc + seg.len) {
          const t = seg.len === 0 ? 0 : (clamped - acc) / seg.len;
          return {
            x: seg.from.x + (seg.to.x - seg.from.x) * t,
            y: seg.from.y + (seg.to.y - seg.from.y) * t,
          };
        }
        acc += seg.len;
      }
      return segs[segs.length - 1].to;
    },
  };
}

describe("measureWalkerBBox", () => {
  it("returns the sampled min/max extent of the silhouette", () => {
    // A box offset from the origin: (20,10) → (70,10) → (70,40) → (20,40).
    const w = polylineWalker([
      { x: 20, y: 10 },
      { x: 70, y: 10 },
      { x: 70, y: 40 },
      { x: 20, y: 40 },
      { x: 20, y: 10 },
    ]);
    const bbox = measureWalkerBBox(w);
    expect(bbox.minX).toBeCloseTo(20, 0);
    expect(bbox.minY).toBeCloseTo(10, 0);
    expect(bbox.width).toBeCloseTo(50, 0);
    expect(bbox.height).toBeCloseTo(30, 0);
  });

  it("returns a zero box for an empty (zero-length) walker", () => {
    const w: PathWalker = { length: 0, pointAtLength: () => ({ x: 5, y: 5 }) };
    const bbox = measureWalkerBBox(w);
    // A zero-length walker samples one point repeatedly → zero-size box there.
    expect(bbox.width).toBe(0);
    expect(bbox.height).toBe(0);
  });
});

describe("shiftWalker", () => {
  it("translates every sampled point and preserves length", () => {
    const base = polylineWalker([
      { x: 20, y: 10 },
      { x: 70, y: 10 },
    ]);
    const shifted = shiftWalker(base, -20, -10);
    expect(shifted.length).toBeCloseTo(base.length, 6);
    expect(shifted.pointAtLength(0)).toEqual({ x: 0, y: 0 });
    expect(shifted.pointAtLength(base.length)).toEqual({ x: 50, y: 0 });
  });

  it("moves a measured bbox origin to (0,0)", () => {
    const w = polylineWalker([
      { x: 20, y: 10 },
      { x: 70, y: 10 },
      { x: 70, y: 40 },
      { x: 20, y: 40 },
      { x: 20, y: 10 },
    ]);
    const bbox = measureWalkerBBox(w);
    const local = shiftWalker(w, -bbox.minX, -bbox.minY);
    const localBox = measureWalkerBBox(local);
    expect(localBox.minX).toBeCloseTo(0, 6);
    expect(localBox.minY).toBeCloseTo(0, 6);
    expect(localBox.width).toBeCloseTo(bbox.width, 6);
    expect(localBox.height).toBeCloseTo(bbox.height, 6);
  });
});
