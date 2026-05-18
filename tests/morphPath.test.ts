import { describe, it, expect } from "vitest";
import { morphPath, tokenizePath } from "../src/layout/morphPath";
import { blob, sharp } from "../src/tokens/shapes";

describe("tokenizePath", () => {
  it("splits commands and numbers, keeping negatives", () => {
    expect(tokenizePath("M 0 0 Q 5 -3.5 10 0 Z")).toEqual([
      "M", "0", "0", "Q", "5", "-3.5", "10", "0", "Z",
    ]);
  });
});

describe("morphPath", () => {
  it("returns the endpoints at t = 0 and t = 1", () => {
    const a = "M 0 0 L 10 10";
    const b = "M 0 0 L 20 30";
    expect(morphPath(a, b, 0)).toBe("M 0 0 L 10 10");
    expect(morphPath(a, b, 1)).toBe("M 0 0 L 20 30");
  });

  it("interpolates numbers at the midpoint", () => {
    expect(morphPath("M 0 0 L 0 0", "M 0 0 L 100 40", 0.5)).toBe(
      "M 0 0 L 50 20",
    );
  });

  it("clamps t to [0, 1]", () => {
    const a = "M 0 0 L 0 0";
    const b = "M 0 0 L 10 10";
    expect(morphPath(a, b, -5)).toBe(morphPath(a, b, 0));
    expect(morphPath(a, b, 9)).toBe(morphPath(a, b, 1));
  });

  it("throws when path structures differ", () => {
    expect(() => morphPath("M 0 0 L 1 1", "M 0 0", 0.5)).toThrow();
    expect(() => morphPath("M 0 0 L 1 1", "M 0 0 Q 1 1 2 2", 0.5)).toThrow();
  });

  it("morphs two shape tokens (matched structure)", () => {
    // The whole point of the shared eight-quadratic structure.
    const a = blob(300, 200, 0.25);
    const b = sharp(300, 200);
    expect(() => morphPath(a, b, 0.5)).not.toThrow();
    const mid = morphPath(a, b, 0.5);
    expect(mid.startsWith("M ")).toBe(true);
    expect(mid.includes("NaN")).toBe(false);
  });
});
