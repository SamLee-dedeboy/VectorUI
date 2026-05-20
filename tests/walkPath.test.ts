import { describe, it, expect } from "vitest";
import {
  arc,
  line,
  polyline,
  quadratic,
  distributeAlong,
  pointAt,
  nearestPointOnCurve,
} from "../src/layout/walkPath";

describe("line", () => {
  const l = line({ x1: 0, y1: 0, x2: 30, y2: 40 });

  it("has length = hypotenuse", () => {
    expect(l.length).toBe(50);
  });

  it("interpolates points along its length", () => {
    expect(l.pointAtLength(0)).toEqual({ x: 0, y: 0 });
    expect(l.pointAtLength(25)).toEqual({ x: 15, y: 20 });
    expect(l.pointAtLength(50)).toEqual({ x: 30, y: 40 });
  });

  it("clamps out-of-range arc-lengths", () => {
    expect(l.pointAtLength(-10)).toEqual({ x: 0, y: 0 });
    expect(l.pointAtLength(999)).toEqual({ x: 30, y: 40 });
  });

  it("has a constant tangent", () => {
    expect(l.tangentAtLength(10)).toBeCloseTo(Math.atan2(40, 30));
  });
});

describe("arc", () => {
  // Quarter circle, radius 10, from +x axis to +y axis.
  const a = arc({
    cx: 0,
    cy: 0,
    radius: 10,
    startAngle: 0,
    endAngle: Math.PI / 2,
  });

  it("has length = radius × angle", () => {
    expect(a.length).toBeCloseTo((Math.PI / 2) * 10);
  });

  it("places endpoints on the circle", () => {
    const start = a.pointAtLength(0);
    expect(start.x).toBeCloseTo(10);
    expect(start.y).toBeCloseTo(0);
    const end = a.pointAtLength(a.length);
    expect(end.x).toBeCloseTo(0);
    expect(end.y).toBeCloseTo(10);
  });

  it("tangent leads the radius by 90° in the sweep direction", () => {
    // At the start the radius points along +x, so the tangent points +y.
    expect(a.tangentAtLength(0)).toBeCloseTo(Math.PI / 2);
  });

  it("emits an A-command path", () => {
    expect(a.toPathData()).toMatch(/^M .* A /);
  });

  it("splits a full-circle sweep into two A-commands so it doesn't degenerate", () => {
    const full = arc({
      cx: 100,
      cy: 100,
      radius: 50,
      startAngle: -Math.PI / 2,
      endAngle: -Math.PI / 2 + 2 * Math.PI,
    });
    // Length should equal 2πr regardless of how the path is split.
    expect(full.length).toBeCloseTo(2 * Math.PI * 50);
    // The path must include two A-commands (a single A from a point to
    // itself is degenerate).
    const path = full.toPathData();
    const arcCount = (path.match(/ A /g) ?? []).length;
    expect(arcCount).toBe(2);
    // Start and end coincide (full sweep) — pointAtLength agrees.
    const start = full.pointAtLength(0);
    const end = full.pointAtLength(full.length);
    expect(end.x).toBeCloseTo(start.x);
    expect(end.y).toBeCloseTo(start.y);
  });
});

describe("quadratic", () => {
  // Control at the midpoint -> the curve is a straight line.
  const straight = quadratic({
    p0: { x: 0, y: 0 },
    control: { x: 50, y: 0 },
    p1: { x: 100, y: 0 },
  });

  it("degenerates to a line when the control is the midpoint", () => {
    expect(straight.length).toBeCloseTo(100, 1);
    expect(straight.pointAtLength(50).x).toBeCloseTo(50, 1);
    expect(straight.pointAtLength(50).y).toBeCloseTo(0, 3);
    expect(straight.tangentAtLength(50)).toBeCloseTo(0, 3);
  });

  it("bows away from the chord when the control is offset", () => {
    const bowed = quadratic({
      p0: { x: 0, y: 0 },
      control: { x: 50, y: -60 },
      p1: { x: 100, y: 0 },
    });
    expect(bowed.length).toBeGreaterThan(100);
    // Midpoint of a quadratic sits halfway to the control.
    expect(bowed.pointAtLength(bowed.length / 2).y).toBeCloseTo(-30, 0);
  });

  it("emits a Q-command path", () => {
    expect(straight.toPathData()).toMatch(/^M .* Q /);
  });
});

describe("polyline", () => {
  // An L-shape: right 30, then down 40. Total length 70.
  const L = polyline({
    points: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 40 },
    ],
  });

  it("sums segment lengths", () => {
    expect(L.length).toBe(70);
  });

  it("walks segments in order", () => {
    expect(L.pointAtLength(0)).toEqual({ x: 0, y: 0 });
    expect(L.pointAtLength(15)).toEqual({ x: 15, y: 0 });
    expect(L.pointAtLength(30)).toEqual({ x: 30, y: 0 });
    expect(L.pointAtLength(50)).toEqual({ x: 30, y: 20 });
    expect(L.pointAtLength(70)).toEqual({ x: 30, y: 40 });
  });

  it("returns the segment's tangent (no smoothing across corners)", () => {
    expect(L.tangentAtLength(10)).toBeCloseTo(0); // along +x
    expect(L.tangentAtLength(60)).toBeCloseTo(Math.PI / 2); // along +y
  });

  it("emits an M…L path through the vertices", () => {
    expect(L.toPathData()).toBe("M 0 0 L 30 0 L 30 40");
  });

  it("rejects fewer than two points", () => {
    expect(() => polyline({ points: [{ x: 0, y: 0 }] })).toThrow();
  });
});

describe("distributeAlong", () => {
  it("'even' spaces centers equally, ignoring widths", () => {
    expect(distributeAlong(100, 4, { distribute: "even" })).toEqual([
      12.5, 37.5, 62.5, 87.5,
    ]);
  });

  it("'start' packs from 0 with a fixed gap", () => {
    const offsets = distributeAlong(200, 3, {
      distribute: "start",
      gap: 10,
      itemWidths: [20, 20, 20],
    });
    // centers: 10, then 20+10+10=40, then 70
    expect(offsets).toEqual([10, 40, 70]);
  });

  it("'spread' pins the first and last items to the ends", () => {
    const offsets = distributeAlong(100, 3, {
      distribute: "spread",
      itemWidths: [10, 10, 10],
    });
    expect(offsets[0]).toBeCloseTo(5); // first item flush at start
    expect(offsets[2]).toBeCloseTo(95); // last item flush at end
  });

  it("returns an empty array for zero items", () => {
    expect(distributeAlong(100, 0, { distribute: "even" })).toEqual([]);
  });
});

describe("pointAt", () => {
  const l = line({ x1: 0, y1: 0, x2: 100, y2: 0 });

  it("maps t=0 to the curve start", () => {
    const sample = pointAt(l, 0);
    expect(sample.s).toBe(0);
    expect(sample.point).toEqual({ x: 0, y: 0 });
  });

  it("maps t=1 to the curve end", () => {
    const sample = pointAt(l, 1);
    expect(sample.s).toBe(l.length);
    expect(sample.point).toEqual({ x: 100, y: 0 });
  });

  it("clamps t outside [0, 1]", () => {
    expect(pointAt(l, -1).t).toBe(0);
    expect(pointAt(l, 2).t).toBe(1);
  });

  it("returns the curve's tangent at t", () => {
    expect(pointAt(l, 0.5).tangent).toBeCloseTo(0);
  });
});

describe("nearestPointOnCurve", () => {
  const horiz = line({ x1: 0, y1: 0, x2: 100, y2: 0 });

  it("snaps a point above the line to its foot of perpendicular", () => {
    const n = nearestPointOnCurve(horiz, { x: 50, y: 20 });
    expect(n.point.x).toBeCloseTo(50, 1);
    expect(n.point.y).toBeCloseTo(0, 1);
    expect(n.distance).toBeCloseTo(20, 1);
    expect(n.t).toBeCloseTo(0.5, 2);
  });

  it("clamps past the line's endpoints", () => {
    const before = nearestPointOnCurve(horiz, { x: -50, y: 0 });
    expect(before.t).toBeCloseTo(0, 3);
    expect(before.point.x).toBeCloseTo(0, 1);
    const after = nearestPointOnCurve(horiz, { x: 999, y: 0 });
    expect(after.t).toBeCloseTo(1, 3);
    expect(after.point.x).toBeCloseTo(100, 1);
  });

  it("returns the only point on a zero-length curve", () => {
    const degenerate = line({ x1: 5, y1: 5, x2: 5, y2: 5 });
    const n = nearestPointOnCurve(degenerate, { x: 10, y: 10 });
    expect(n.s).toBe(0);
    expect(n.t).toBe(0);
    expect(n.point).toEqual({ x: 5, y: 5 });
    expect(n.distance).toBeCloseTo(Math.hypot(5, 5));
  });

  it("snaps to a circular arc — radius from the point", () => {
    // Half circle of radius 10 about the origin, top half.
    const a = arc({
      cx: 0,
      cy: 0,
      radius: 10,
      startAngle: 0,
      endAngle: Math.PI,
    });
    // A point directly above the centre lies on the +y radius at (0, 10) — but
    // SVG's y axis grows downward, so endAngle=PI sweeps to (-10, 0). The
    // nearest point to (0, 20) on this arc is at angle PI/2, i.e. (0, 10).
    const n = nearestPointOnCurve(a, { x: 0, y: 20 });
    expect(n.point.x).toBeCloseTo(0, 1);
    expect(n.point.y).toBeCloseTo(10, 1);
    expect(n.distance).toBeCloseTo(10, 1);
  });

  it("snaps to a quadratic curve near its apex", () => {
    // Symmetric arch: y is most negative around the midpoint.
    const q = quadratic({
      p0: { x: 0, y: 0 },
      control: { x: 50, y: -60 },
      p1: { x: 100, y: 0 },
    });
    const n = nearestPointOnCurve(q, { x: 50, y: -100 });
    // The apex sits at y = -30 (midpoint between chord and control).
    expect(n.point.x).toBeCloseTo(50, 1);
    expect(n.point.y).toBeCloseTo(-30, 0);
    expect(n.t).toBeCloseTo(0.5, 1);
  });
});
