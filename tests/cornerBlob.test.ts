import { describe, it, expect } from "vitest";
import { cornerBlob } from "../src/shapes/cornerBlob";

describe("cornerBlob", () => {
  const blob = cornerBlob({ width: 160, height: 200 });

  it("emits a closed path string", () => {
    expect(blob.path.startsWith("M 0 0")).toBe(true);
    expect(blob.path.trimEnd().endsWith("Z")).toBe(true);
  });

  it("reaches its full width at the very top", () => {
    // The band [0, 1] sits at the blob's widest point.
    expect(blob.intrusionAt(0, 1)).toBeCloseTo(160, 0);
  });

  it("is clear of the column once below its height", () => {
    expect(blob.intrusionAt(200, 224)).toBe(0);
    expect(blob.intrusionAt(260, 286)).toBe(0);
  });

  it("never intrudes beyond its declared width", () => {
    for (let y = 0; y < 200; y += 8) {
      expect(blob.intrusionAt(y, y + 26)).toBeLessThanOrEqual(160 + 0.001);
      expect(blob.intrusionAt(y, y + 26)).toBeGreaterThanOrEqual(0);
    }
  });

  it("tapers toward the corner — narrower near the bottom than the top", () => {
    expect(blob.intrusionAt(180, 200)).toBeLessThan(blob.intrusionAt(0, 26));
  });
});
