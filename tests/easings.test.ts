import { describe, it, expect } from "vitest";
import {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  smoothstep,
  type Easing,
} from "../src/layout/easings";

const ALL: { name: string; fn: Easing }[] = [
  { name: "linear", fn: linear },
  { name: "easeIn", fn: easeIn },
  { name: "easeOut", fn: easeOut },
  { name: "easeInOut", fn: easeInOut },
  { name: "smoothstep", fn: smoothstep },
];

describe("easings", () => {
  it.each(ALL)("$name pins 0 → 0 and 1 → 1", ({ fn }) => {
    expect(fn(0)).toBeCloseTo(0, 10);
    expect(fn(1)).toBeCloseTo(1, 10);
  });

  it.each(ALL)("$name is monotonically non-decreasing on [0, 1]", ({ fn }) => {
    let prev = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const v = fn(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it("easeInOut crosses 0.5 at t=0.5 (symmetric)", () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 10);
  });

  it("smoothstep crosses 0.5 at t=0.5 (Hermite is symmetric)", () => {
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 10);
  });

  it("easeOut overshoots linear at t<1 (head start), easeIn lags it", () => {
    expect(easeOut(0.25)).toBeGreaterThan(0.25);
    expect(easeIn(0.25)).toBeLessThan(0.25);
  });

  it("linear is identity", () => {
    for (const t of [0, 0.13, 0.5, 0.91, 1]) {
      expect(linear(t)).toBe(t);
    }
  });
});
