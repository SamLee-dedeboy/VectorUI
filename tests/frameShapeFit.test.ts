import { describe, it, expect } from "vitest";
import { occupancyFromPath } from "../src/layout/intrusionFromPath";
import type { PathWalker } from "../src/layout/pathWalker";
import type { CurvePoint } from "../src/layout/walkPath";

/**
 * The Frame contour-fit logic (shape-fit slots) composes two pieces from the
 * occupancy engine: (1) the path's interior per band → "text" mode publishes
 * column-minus-interior as the slot's `flowAround.occupancyAt`; (2) the
 * conservative inscribed rect across a band → "safe" mode collapses the slot
 * to it. The text-pour layer is covered by `occupancyLayout.test`; here we
 * verify the two derivations directly against a synthetic concave shape so
 * the Frame's per-slot math is locked.
 */

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

/** A 100×100 box with a 30-wide right-side notch from y=20 to y=80. The
 *  notched band's interior is [0, 70]; outside the notch it's [0, 100]. */
function notchedBox(): PathWalker {
  return polylineWalker([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 20 },
    { x: 70, y: 20 },
    { x: 70, y: 80 },
    { x: 100, y: 80 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
    { x: 0, y: 0 },
  ]);
}

describe("Frame shape-fit derivations", () => {
  // The "text" mode publishes occupied = column minus interior, so the
  // multi-segment pour treats interior as the free region. Replicate that
  // complement so we lock the Frame's per-slot computation.
  function occupiedComplement(
    interior: Array<[number, number]>,
    colW: number,
  ): Array<[number, number]> {
    if (interior.length === 0) return [[0, colW]];
    const sorted = [...interior].sort((a, b) => a[0] - b[0]);
    const out: Array<[number, number]> = [];
    let cursor = 0;
    for (const [s, e] of sorted) {
      if (s > cursor) out.push([cursor, s]);
      if (e > cursor) cursor = e;
    }
    if (cursor < colW) out.push([cursor, colW]);
    return out;
  }

  it("text mode: column-minus-interior is empty when the band is fully inside the shape", () => {
    const occ = occupancyFromPath(notchedBox(), { height: 100, samples: 4096 });
    // y=5 sits in the un-notched top band → interior [0,100] → no occupied.
    const interior = occ(4, 6);
    expect(interior.length).toBe(1);
    expect(interior[0][0]).toBeCloseTo(0, 0);
    expect(interior[0][1]).toBeCloseTo(100, 0);
    expect(occupiedComplement(interior, 100)).toEqual([]);
  });

  it("text mode: a notch pokes into the column as an occupied interval on the right", () => {
    const occ = occupancyFromPath(notchedBox(), { height: 100, samples: 4096 });
    // y=50 is inside the notched band; interior is [0,70].
    const interior = occ(49, 51);
    expect(interior.length).toBe(1);
    expect(interior[0][0]).toBeCloseTo(0, 0);
    expect(interior[0][1]).toBeCloseTo(70, 0);
    const occupied = occupiedComplement(interior, 100);
    expect(occupied.length).toBe(1);
    expect(occupied[0][0]).toBeCloseTo(70, 0);
    expect(occupied[0][1]).toBeCloseTo(100, 0);
  });

  // The "safe" mode picks the conservative inscribed rect across a vertical
  // band: max(leftEdges), min(rightEdges) over the band's sub-samples.
  function conservativeRect(
    occ: ReturnType<typeof occupancyFromPath>,
    yTop: number,
    yBottom: number,
    samples = 16,
  ): { left: number; right: number } | null {
    let maxLeft = 0;
    let minRight = Infinity;
    for (let i = 0; i <= samples; i++) {
      const y = yTop + ((yBottom - yTop) * i) / samples;
      const intervals = occ(y, y + 1);
      if (intervals.length === 0) continue;
      let best = intervals[0];
      for (const iv of intervals) {
        if (iv[1] - iv[0] > best[1] - best[0]) best = iv;
      }
      if (best[0] > maxLeft) maxLeft = best[0];
      if (best[1] < minRight) minRight = best[1];
    }
    return Number.isFinite(minRight) ? { left: maxLeft, right: minRight } : null;
  }

  it("safe mode: a band straddling the notch collapses to the narrower interior", () => {
    const occ = occupancyFromPath(notchedBox(), { height: 100, samples: 4096 });
    // y=10..90 covers the notch (y 20..80) → conservative right = 70.
    const rect = conservativeRect(occ, 10, 90);
    expect(rect).not.toBeNull();
    expect(rect!.left).toBeCloseTo(0, 0);
    expect(rect!.right).toBeCloseTo(70, 0);
  });

  it("safe mode: a band entirely above the notch keeps the full width", () => {
    const occ = occupancyFromPath(notchedBox(), { height: 100, samples: 4096 });
    const rect = conservativeRect(occ, 2, 18);
    expect(rect).not.toBeNull();
    expect(rect!.left).toBeCloseTo(0, 0);
    expect(rect!.right).toBeCloseTo(100, 0);
  });
});
