import { beforeAll, describe, it, expect } from "vitest";
import { occupancyFromPath } from "../src/layout/intrusionFromPath";
import { layoutFlowParagraph } from "../src/layout/measureText";
import type { PathWalker } from "../src/layout/pathWalker";
import type { CurvePoint } from "../src/layout/walkPath";

/** A walker over a polyline through the given points. */
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

describe("occupancyFromPath", () => {
  it("returns one occupied interval for a convex box", () => {
    // A box 20..120 in x, 0..100 in y.
    const w = polylineWalker([
      { x: 20, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 100 },
      { x: 20, y: 100 },
      { x: 20, y: 0 },
    ]);
    const occ = occupancyFromPath(w, { height: 100, samples: 2048 });
    const mid = occ(48, 52);
    expect(mid.length).toBe(1);
    expect(mid[0][0]).toBeCloseTo(20, 0);
    expect(mid[0][1]).toBeCloseTo(120, 0);
  });

  it("returns empty outside the path's vertical extent", () => {
    const w = polylineWalker([
      { x: 20, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 100 },
      { x: 20, y: 100 },
      { x: 20, y: 0 },
    ]);
    const occ = occupancyFromPath(w, { height: 100 });
    expect(occ(150, 160)).toEqual([]);
  });

  it("returns TWO intervals across a concave archway's legs (doorway free)", () => {
    // An archway: a solid bar (y 0..20) on two legs (x 0..30 and 90..120),
    // with the doorway (x 30..90) open below the bar (y 20..100).
    // Outline, traced as one closed concave polygon:
    const w = polylineWalker([
      { x: 0, y: 0 }, // outer top-left
      { x: 120, y: 0 }, // outer top-right
      { x: 120, y: 100 }, // right leg outer-bottom
      { x: 90, y: 100 }, // right leg inner-bottom
      { x: 90, y: 20 }, // up into the doorway (right jamb)
      { x: 30, y: 20 }, // across under the bar to the left jamb
      { x: 30, y: 100 }, // down the left leg inner edge
      { x: 0, y: 100 }, // left leg outer-bottom
      { x: 0, y: 0 }, // close
    ]);
    const occ = occupancyFromPath(w, { height: 100, samples: 4096 });

    // Under the bar, between the legs: two occupied intervals with a gap.
    const legBand = occ(58, 62);
    expect(legBand.length).toBe(2);
    expect(legBand[0][0]).toBeCloseTo(0, 0);
    expect(legBand[0][1]).toBeCloseTo(30, 0);
    expect(legBand[1][0]).toBeCloseTo(90, 0);
    expect(legBand[1][1]).toBeCloseTo(120, 0);

    // Across the solid bar: one full-width interval (doorway not yet open).
    const barBand = occ(8, 12);
    expect(barBand.length).toBe(1);
    expect(barBand[0][0]).toBeCloseTo(0, 0);
    expect(barBand[0][1]).toBeCloseTo(120, 0);
  });
});

describe("layoutFlowParagraph — multi-segment occupancy", () => {
  beforeAll(() => {
    // pretext measures glyph widths through canvas; jsdom has none, so stub a
    // 2D context at ≈0.55em/char (same shim the baseline test uses).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    g.HTMLCanvasElement.prototype.getContext = function getContext(
      kind: string,
    ) {
      if (kind !== "2d") return null;
      return {
        font: "16px sans-serif",
        measureText(text: string) {
          const m = /([\d.]+)px/.exec(this.font);
          const px = m ? parseFloat(m[1]) : 16;
          const width = text.length * px * 0.55;
          return {
            width,
            actualBoundingBoxAscent: px * 0.8,
            actualBoundingBoxDescent: px * 0.2,
            actualBoundingBoxLeft: 0,
            actualBoundingBoxRight: width,
            fontBoundingBoxAscent: px * 0.85,
            fontBoundingBoxDescent: px * 0.2,
          };
        },
      };
    };
  });

  it("pours text on both sides of a centred float (two runs per band)", () => {
    const text =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu " +
      "nu xi omicron pi rho sigma tau upsilon phi chi psi omega one two three";
    const columnWidthPx = 400;
    const lineHeightPx = 20;
    // A float occupying x∈[150,250] over the first three line bands (y<60).
    const para = layoutFlowParagraph({
      text,
      font: "16px sans-serif",
      columnWidthPx,
      lineHeightPx,
      occupancyAtPx: (yTop) =>
        yTop < 60 ? [[150, 250]] : [],
    });

    // Group runs by baseline; the first band should have a left run (xPx≈0) and
    // a right run (xPx≈250) — text flowing on both sides of the float.
    const byBaseline = new Map<number, number[]>();
    for (const l of para.lines) {
      const xs = byBaseline.get(l.baselineYPx) ?? [];
      xs.push(l.xPx);
      byBaseline.set(l.baselineYPx, xs);
    }
    const firstBaseline = Math.min(...byBaseline.keys());
    const firstRunXs = byBaseline.get(firstBaseline)!.sort((a, b) => a - b);
    expect(firstRunXs.length).toBe(2);
    expect(firstRunXs[0]).toBeCloseTo(0, 0);
    expect(firstRunXs[1]).toBeCloseTo(250, 0);

    // A band below the float (y≥60) is a single full-width run starting at 0.
    const lowerBaselines = [...byBaseline.keys()].filter(
      (b) => b > 60,
    );
    expect(lowerBaselines.length).toBeGreaterThan(0);
    for (const b of lowerBaselines) {
      expect(byBaseline.get(b)).toEqual([0]);
    }
  });

  it("skips free segments narrower than the minimum (no sliver runs)", () => {
    // Float leaves only a 30px gap on the right (< MIN_SEGMENT 48) → that
    // sliver is skipped; text uses the wide left segment only.
    const para = layoutFlowParagraph({
      text: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda",
      font: "16px sans-serif",
      columnWidthPx: 400,
      lineHeightPx: 20,
      occupancyAtPx: () => [[370, 400]],
    });
    // No run should start past the float's left edge (370).
    for (const l of para.lines) expect(l.xPx).toBeLessThan(370);
  });
});
