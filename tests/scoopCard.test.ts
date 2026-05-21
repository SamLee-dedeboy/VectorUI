import { describe, it, expect } from "vitest";
import { scoopCard } from "../src/shapes/scoopCard";

/**
 * `intrusionInto(columnLeft, columnTop)` must answer the wrap query in
 * COLUMN-local y but evaluate the scoop curve at CARD-local y. A regression
 * here drove Demo 2A's text to wrap a phantom scoop shifted up by `columnTop`.
 */
describe("scoopCard.intrusionInto", () => {
  const card = scoopCard({
    cornerRadius: 22,
    scoopTop: 100, // scoop band in CARD coords: [100, 250]
    scoopHeight: 150,
    depth: 80,
  });

  it("translates column-local y to card-y via columnTop", () => {
    // Column starts at card-y 80 (e.g. body slot sits 80 below card top).
    const wrap = card.intrusionInto(0, 80);
    // The scoop peaks at card-y 175 — column-local y = 175 - 80 = 95.
    // At the peak, intrusion = depth = 80.
    expect(wrap(94, 96)).toBeCloseTo(80, 0);
  });

  it("returns 0 above the scoop band in column-local coords", () => {
    const wrap = card.intrusionInto(0, 80);
    // Top of scoop = card-y 100 → column-local y = 20. Above it → no reach.
    expect(wrap(0, 10)).toBe(0);
  });

  it("returns 0 below the scoop band in column-local coords", () => {
    const wrap = card.intrusionInto(0, 80);
    // Bottom of scoop = card-y 250 → column-local y = 170. Below → no reach.
    expect(wrap(200, 220)).toBe(0);
  });

  it("subtracts columnLeft so an inset column wraps a narrower slice", () => {
    const wrap = card.intrusionInto(30, 80);
    // Same peak band, but the column starts 30 px right of the card edge.
    expect(wrap(94, 96)).toBeCloseTo(50, 0); // 80 - 30
  });
});
