import { describe, it, expect } from "vitest";
import { fitLine, fitArc, distributeAlong } from "../src/layout/walkPath";

describe("fitLine", () => {
  it("realizes a curve of exactly the requested length", () => {
    const f = fitLine({ x1: 10, y1: 20, angle: 0 });
    expect(f(120).length).toBeCloseTo(120, 6);
    expect(f(0).length).toBe(0);
  });

  it("runs from the start point along the angle", () => {
    const f = fitLine({ x1: 0, y1: 0, angle: Math.PI / 2 }); // straight down
    const c = f(50);
    expect(c.pointAtLength(0)).toEqual({ x: 0, y: 0 });
    const end = c.pointAtLength(50);
    expect(end.x).toBeCloseTo(0, 6);
    expect(end.y).toBeCloseTo(50, 6);
  });
});

describe("fitArc", () => {
  it("with a fixed radius, solves sweep so length matches", () => {
    const f = fitArc({ cx: 0, cy: 0, startAngle: 0, radius: 100 });
    const c = f(50);
    expect(c.length).toBeCloseTo(50, 6); // length = |sweep|·radius
  });

  it("with a fixed sweep, solves radius so length matches", () => {
    const f = fitArc({ cx: 0, cy: 0, startAngle: 0, sweep: Math.PI / 2 });
    const c = f(157.0796); // ≈ (π/2)·100 → radius ~100
    expect(c.length).toBeCloseTo(157.0796, 3);
  });

  it("direction flips the sweep sign without changing length", () => {
    const cw = fitArc({ cx: 0, cy: 0, startAngle: 0, radius: 80, direction: 1 })(40);
    const ccw = fitArc({ cx: 0, cy: 0, startAngle: 0, radius: 80, direction: -1 })(40);
    expect(cw.length).toBeCloseTo(40, 6);
    expect(ccw.length).toBeCloseTo(40, 6);
    // Opposite sweep → end points mirror across the start tangent.
    expect(cw.pointAtLength(40).y).toBeCloseTo(-ccw.pointAtLength(40).y, 4);
  });

  it("is safe at length 0 (radius and sweep variants)", () => {
    expect(fitArc({ cx: 5, cy: 5, startAngle: 0, radius: 100 })(0).length).toBe(0);
    const z = fitArc({ cx: 5, cy: 5, startAngle: 0, sweep: 1 })(0);
    expect(z.length).toBe(0);
    expect(Number.isNaN(z.pointAtLength(0).x)).toBe(false);
  });
});

describe("distributeAlong padStart", () => {
  it("packs from padStart and never overflows a content-fitted curve", () => {
    const widths = [40, 60, 50];
    const gap = 10;
    const padding = 12;
    const content = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
    const length = content + padding * 2;
    const offsets = distributeAlong(length, widths.length, {
      distribute: "start",
      gap,
      itemWidths: widths,
      padStart: padding,
    });
    // First item's left edge sits at exactly `padding`.
    expect(offsets[0] - widths[0] / 2).toBeCloseTo(padding, 6);
    // Last item's right edge sits at length - padding (symmetric).
    const last = offsets.length - 1;
    expect(offsets[last] + widths[last] / 2).toBeCloseTo(length - padding, 6);
    // No item exceeds the curve.
    offsets.forEach((o, i) =>
      expect(o + widths[i] / 2).toBeLessThanOrEqual(length + 1e-6),
    );
  });

  it("padStart defaults to 0 (unchanged behaviour)", () => {
    const offsets = distributeAlong(200, 2, {
      distribute: "start",
      gap: 0,
      itemWidths: [40, 40],
    });
    expect(offsets[0]).toBeCloseTo(20, 6); // w0/2, no inset
  });
});
