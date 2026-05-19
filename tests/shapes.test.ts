import { describe, it, expect } from "vitest";
import {
  blob,
  rectRounded,
  sharp,
  leaf,
  pill,
  tabBackdrop,
} from "../src/tokens/shapes";

/** Count SVG path commands of a given letter. */
const count = (d: string, cmd: string) =>
  (d.match(new RegExp(`\\b${cmd}`, "g")) ?? []).length;

describe("shape tokens", () => {
  it("emit closed paths", () => {
    for (const d of [
      blob(300, 200),
      rectRounded(300, 200),
      sharp(300, 200),
      leaf(300, 200),
      pill(120, 34),
      tabBackdrop(120, 48),
    ]) {
      expect(d.startsWith("M ")).toBe(true);
      expect(d.trimEnd().endsWith("Z")).toBe(true);
    }
  });

  it("share an eight-quadratic structure across shapes and morph values", () => {
    // The shared structure is what makes any two morphable by morphPath.
    const all = [
      blob(300, 200, 0),
      blob(300, 200, 1),
      rectRounded(300, 200),
      sharp(300, 200),
      leaf(300, 200, 0),
      leaf(300, 200, 1),
      tabBackdrop(120, 48),
    ];
    for (const d of all) expect(count(d, "Q")).toBe(8);
    expect(blob(300, 200, 0)).not.toBe(blob(300, 200, 1));
    expect(leaf(300, 200, 0)).not.toBe(leaf(300, 200, 1));
  });

  it("never emit NaN coordinates, even for degenerate sizes", () => {
    for (const d of [blob(10, 8, 1), rectRounded(0, 0), pill(4, 40)]) {
      expect(d.includes("NaN")).toBe(false);
    }
  });
});
