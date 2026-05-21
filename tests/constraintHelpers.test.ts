import { describe, it, expect } from "vitest";
import {
  makeAxisHandle,
  makeGapHandle,
  followerOf,
} from "../src/layout/constraintHelpers";

describe("makeAxisHandle", () => {
  it("renders at (scalar, fixed) for an x-axis handle with identity converters", () => {
    let value = 48;
    const h = makeAxisHandle({
      read: () => value,
      write: (n) => (value = n),
      axis: "x",
      fixed: 100,
    });
    expect(h.point).toEqual({ x: 48, y: 100 });
    expect(h.axis).toBe("x");
    h.onDrag({ x: 60, y: 200 }); // y is ignored on x-axis handles
    expect(value).toBe(60);
  });

  it("uses toScalar / toLive for a value measured from a reference edge", () => {
    const cardWidth = 300;
    let depth = 60;
    const h = makeAxisHandle({
      read: () => depth,
      write: (n) => (depth = n),
      axis: "x",
      fixed: 100,
      toScalar: (x) => cardWidth - x,
      toLive: (d) => cardWidth - d,
    });
    // current depth=60 means the handle sits at x = 300 - 60 = 240.
    expect(h.point.x).toBe(240);
    // Drag to x=200 → depth = 300 - 200 = 100.
    h.onDrag({ x: 200, y: 0 });
    expect(depth).toBe(100);
  });

  it("clamps via range", () => {
    let v = 5;
    const h = makeAxisHandle({
      read: () => v,
      write: (n) => (v = n),
      axis: "y",
      fixed: 0,
      range: { min: 0, max: 50 },
    });
    h.onDrag({ x: 0, y: 999 });
    expect(v).toBe(50);
    h.onDrag({ x: 0, y: -999 });
    expect(v).toBe(0);
  });
});

describe("makeGapHandle", () => {
  it("renders at the midpoint of the gap and doubles the drag distance", () => {
    let gap = 20;
    const h = makeGapHandle({
      topEdge: () => 100, // leader's bottom
      read: () => gap,
      write: (g) => (gap = g),
      x: 50,
    });
    // Mid-gap = topEdge + gap/2 = 110.
    expect(h.point).toEqual({ x: 50, y: 110 });
    // Drag the handle to y=120 → gap = (120 - 100) * 2 = 40.
    h.onDrag({ x: 0, y: 120 });
    expect(gap).toBe(40);
  });

  it("clamps gap to the supplied range", () => {
    let gap = 10;
    const h = makeGapHandle({
      topEdge: () => 0,
      read: () => gap,
      write: (g) => (gap = g),
      x: 0,
      range: { min: 0, max: 30 },
    });
    h.onDrag({ x: 0, y: 1000 });
    expect(gap).toBe(30);
    h.onDrag({ x: 0, y: -1000 });
    expect(gap).toBe(0);
  });
});

describe("followerOf", () => {
  it("adds the offset to the leader's current position", () => {
    expect(
      followerOf({ leader: () => ({ x: 10, y: 20 }), offset: { x: 5, y: 0 } }),
    ).toEqual({ x: 15, y: 20 });
  });
});
