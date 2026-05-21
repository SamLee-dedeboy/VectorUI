import { describe, it, expect } from "vitest";
import {
  uniformResample,
  lerpPoints,
  polylineFromPoints,
  morphCurves,
} from "../src/layout/curveMorph";
import { line, polyline } from "../src/layout/walkPath";

describe("uniformResample", () => {
  it("preserves the endpoints", () => {
    const source = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 30, y: 0 },
    ];
    const out = uniformResample(source, 8);
    expect(out).toHaveLength(9);
    expect(out[0]).toEqual(source[0]);
    expect(out[out.length - 1]).toEqual(source[source.length - 1]);
  });

  it("spaces vertices evenly along arc length on a straight line", () => {
    const source = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const out = uniformResample(source, 10);
    expect(out).toHaveLength(11);
    out.forEach((p, i) => expect(p.x).toBeCloseTo((100 * i) / 10, 6));
  });

  it("accepts a Curve directly and equals its analytical points", () => {
    const curve = line({ x1: 0, y1: 0, x2: 100, y2: 0 });
    const out = uniformResample(curve, 5);
    expect(out.map((p) => p.x)).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("returns count+1 copies of the lone point for a zero-length input", () => {
    const out = uniformResample([{ x: 4, y: 4 }], 5);
    expect(out).toHaveLength(6);
    expect(out.every((p) => p.x === 4 && p.y === 4)).toBe(true);
  });

  it("collapses arc-length-zero polylines without dividing by zero", () => {
    const out = uniformResample(
      [
        { x: 4, y: 4 },
        { x: 4, y: 4 },
      ],
      4,
    );
    expect(out).toHaveLength(5);
    expect(out.every((p) => p.x === 4 && p.y === 4)).toBe(true);
  });
});

describe("lerpPoints", () => {
  it("interpolates per index, clamps t", () => {
    const a = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const b = [
      { x: 100, y: 100 },
      { x: 0, y: 20 },
    ];
    const mid = lerpPoints(a, b, 0.5);
    expect(mid).toEqual([
      { x: 50, y: 50 },
      { x: 5, y: 15 },
    ]);
    expect(lerpPoints(a, b, -1)).toEqual(a);
    expect(lerpPoints(a, b, 2)).toEqual(b);
  });

  it("throws on mismatched lengths", () => {
    expect(() =>
      lerpPoints([{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }], 0.5),
    ).toThrow();
  });
});

describe("morphCurves", () => {
  it("at t=0 matches the resampled source, at t=1 matches the target", () => {
    const a = line({ x1: 0, y1: 0, x2: 100, y2: 0 });
    const b = polyline({
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
        { x: 100, y: 0 },
      ],
    });
    const at0 = morphCurves(a, b, 0, 20);
    const at1 = morphCurves(a, b, 1, 20);
    // The line never bows; the morphed curve at t=0 is straight.
    expect(Math.abs(at0.pointAtLength(at0.length / 2).y)).toBeLessThan(1e-9);
    // At t=1, the midpoint sits at the bow peak.
    expect(at1.pointAtLength(at1.length / 2).y).toBeGreaterThan(20);
  });
});

describe("polylineFromPoints", () => {
  it("produces a curve whose start and end equal the array endpoints", () => {
    const curve = polylineFromPoints([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(curve.pointAtLength(0)).toEqual({ x: 0, y: 0 });
    expect(curve.pointAtLength(curve.length)).toEqual({ x: 10, y: 10 });
  });
});
