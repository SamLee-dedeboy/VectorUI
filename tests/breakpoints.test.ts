import { describe, it, expect } from "vitest";
import { breakpointMorph } from "../src/layout/breakpoints";

describe("breakpointMorph", () => {
  // threshold 600, band 100 -> morphs across [550, 650].
  it("is 0 above the band (wide viewport)", () => {
    expect(breakpointMorph(700, 600, 100)).toBe(0);
    expect(breakpointMorph(650, 600, 100)).toBe(0);
  });

  it("is 1 below the band (narrow viewport)", () => {
    expect(breakpointMorph(500, 600, 100)).toBe(1);
    expect(breakpointMorph(550, 600, 100)).toBe(1);
  });

  it("is 0.5 exactly at the threshold", () => {
    expect(breakpointMorph(600, 600, 100)).toBeCloseTo(0.5);
  });

  it("rises monotonically as the viewport narrows", () => {
    expect(breakpointMorph(640, 600, 100)).toBeLessThan(
      breakpointMorph(560, 600, 100),
    );
  });

  it("snaps to a step when the band is zero", () => {
    expect(breakpointMorph(601, 600, 0)).toBe(0);
    expect(breakpointMorph(599, 600, 0)).toBe(1);
  });
});
