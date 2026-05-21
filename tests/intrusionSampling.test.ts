import { describe, it, expect } from "vitest";
import {
  sampleBandMax,
  sampleBand,
  intrusionFromReach,
  combineIntrusions,
  BAND_SAMPLE_STEPS,
} from "../src/layout/intrusionSampling";

describe("sampleBandMax", () => {
  it("returns 0 when reach is flat zero", () => {
    expect(sampleBandMax(() => 0, 0, 10)).toBe(0);
  });

  it("returns the constant reach when reach is flat", () => {
    expect(sampleBandMax(() => 7, 4, 12)).toBe(7);
  });

  it("captures the widest reach across the band", () => {
    // A peak at the middle of [0, 10] is fully captured with default steps.
    const reach = (y: number) => Math.max(0, 5 - Math.abs(y - 5));
    expect(sampleBandMax(reach, 0, 10)).toBe(5);
  });

  it("default sample count matches BAND_SAMPLE_STEPS", () => {
    let calls = 0;
    sampleBandMax((y) => {
      calls++;
      return y;
    }, 0, 1);
    expect(calls).toBe(BAND_SAMPLE_STEPS + 1);
  });

  it("ignores a single negative sample (treated as outside the float)", () => {
    // -1 sentinel on the first sample, positive elsewhere.
    const reach = (y: number) => (y < 0.5 ? -1 : 3);
    expect(sampleBandMax(reach, 0, 1)).toBe(3);
  });
});

describe("intrusionFromReach", () => {
  it("matches the inline loop the shape providers used to carry", () => {
    const reach = (y: number) => Math.max(0, 10 - y);
    const fn = intrusionFromReach(reach);
    expect(fn(0, 2)).toBe(10);
    expect(fn(8, 10)).toBe(2);
    expect(fn(20, 22)).toBe(0);
  });

  it("respects yMin / yMax bounds", () => {
    const reach = () => 5; // would always answer 5 if asked
    const fn = intrusionFromReach(reach, { yMin: 0, yMax: 10 });
    // Band entirely below the float — no contribution.
    expect(fn(20, 22)).toBe(0);
    // Band straddling the top edge — clipped to [yMin, yBottom].
    expect(fn(-5, 5)).toBe(5);
    // Band entirely above the float.
    expect(fn(-10, -5)).toBe(0);
  });

  it("steps option dials sampling density", () => {
    let calls = 0;
    const fn = intrusionFromReach(() => (calls++, 1), { steps: 12 });
    fn(0, 1);
    expect(calls).toBe(13);
  });
});

describe("sampleBand", () => {
  it('reports hit=false when every sample is the "outside" sentinel', () => {
    expect(sampleBand(() => -1, 0, 10)).toEqual({ max: 0, hit: false });
  });

  it("reports hit=true and the widest positive reach", () => {
    const reach = (y: number) => (y < 0.5 ? -1 : 8 - y);
    expect(sampleBand(reach, 0, 10)).toMatchObject({ hit: true });
    expect(sampleBand(reach, 0, 10).max).toBeGreaterThan(0);
  });

  it("hit=true even when every positive sample is 0", () => {
    expect(sampleBand(() => 0, 0, 10)).toEqual({ max: 0, hit: true });
  });
});

describe("combineIntrusions", () => {
  it("returns a zero function with no inputs", () => {
    expect(combineIntrusions()(0, 1)).toBe(0);
  });

  it("returns the single input untouched", () => {
    const f = () => 7;
    expect(combineIntrusions(f)).toBe(f);
  });

  it("takes the widest reach across multiple inputs", () => {
    const a = () => 3;
    const b = () => 7;
    const c = () => 5;
    expect(combineIntrusions(a, b, c)(0, 1)).toBe(7);
  });
});
