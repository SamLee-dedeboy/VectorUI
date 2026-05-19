import { describe, it, expect } from "vitest";
import { computeFlowLayout } from "../src/layout/flowLayout";
import type { Bounds } from "../src/layout/measureBounds";

/** A bounds box anchored at the origin. */
const box = (width: number, height: number): Bounds => ({
  x: 0,
  y: 0,
  width,
  height,
});

describe("computeFlowLayout", () => {
  it("stacks a column by rendered height plus gap", () => {
    const layout = computeFlowLayout([box(100, 30), box(100, 50)], 2, {
      direction: "column",
      gap: 10,
      padding: [0, 0],
      align: "start",
    });
    expect(layout.placements[0]).toEqual({ tx: 0, ty: 0 });
    expect(layout.placements[1]).toEqual({ tx: 0, ty: 40 }); // 30 + 10
    expect(layout.height).toBe(90); // 30 + 10 + 50
    expect(layout.width).toBe(100);
  });

  it("stacks a row along x", () => {
    const layout = computeFlowLayout([box(40, 20), box(60, 20)], 2, {
      direction: "row",
      gap: 8,
      padding: [0, 0],
      align: "start",
    });
    expect(layout.placements[1]).toEqual({ tx: 48, ty: 0 }); // 40 + 8
    expect(layout.width).toBe(108); // 40 + 8 + 60
  });

  it("applies [vertical, horizontal] padding and includes it in the size", () => {
    const layout = computeFlowLayout([box(100, 40)], 1, {
      direction: "column",
      gap: 0,
      padding: [12, 20],
      align: "start",
    });
    expect(layout.placements[0]).toEqual({ tx: 20, ty: 12 });
    expect(layout.width).toBe(140); // 100 + 20*2
    expect(layout.height).toBe(64); // 40 + 12*2
  });

  it("centers children on the cross axis against the widest child", () => {
    const layout = computeFlowLayout([box(100, 20), box(40, 20)], 2, {
      direction: "column",
      gap: 0,
      padding: [0, 0],
      align: "center",
    });
    expect(layout.placements[0].tx).toBe(0); // widest, no shift
    expect(layout.placements[1].tx).toBe(30); // (100 - 40) / 2
  });

  it("centers against an explicit crossSize", () => {
    const layout = computeFlowLayout([box(40, 20)], 1, {
      direction: "column",
      gap: 0,
      padding: [0, 0],
      align: "center",
      crossSize: 200,
    });
    expect(layout.placements[0].tx).toBe(80); // (200 - 40) / 2
    expect(layout.width).toBe(200);
  });

  it("offsets so a child drawn off its origin still lands at the cursor", () => {
    // A child whose content starts at y=-10 (e.g. centered on its origin).
    const layout = computeFlowLayout([{ x: 0, y: -10, width: 50, height: 20 }], 1, {
      direction: "column",
      gap: 0,
      padding: [0, 0],
      align: "start",
    });
    expect(layout.placements[0].ty).toBe(10); // 0 - (-10)
  });

  it("treats unmeasured children as zero extent", () => {
    const layout = computeFlowLayout([undefined, box(100, 30)], 2, {
      direction: "column",
      gap: 10,
      padding: [0, 0],
      align: "start",
    });
    expect(layout.placements[1].ty).toBe(10); // 0 + 0 + gap
    expect(layout.height).toBe(40);
  });
});
