import { describe, it, expect } from "vitest";
import { floatAroundRect } from "../src/layout/rectIntrusion";

describe("floatAroundRect", () => {
  const columnWidth = 200;

  it("returns zero on both sides for a rect outside the column", () => {
    const offLeft = floatAroundRect(
      { left: -100, right: -10, top: 0, bottom: 30 },
      columnWidth,
    );
    expect(offLeft.intrusionAt(10, 20)).toBe(0);
    expect(offLeft.rightIntrusionAt(10, 20)).toBe(0);

    const offRight = floatAroundRect(
      { left: 210, right: 260, top: 0, bottom: 30 },
      columnWidth,
    );
    expect(offRight.intrusionAt(10, 20)).toBe(0);
    expect(offRight.rightIntrusionAt(10, 20)).toBe(0);
  });

  it('auto-floats left when the rect leans left', () => {
    const rect = { left: 0, right: 60, top: 10, bottom: 30 };
    const { intrusionAt, rightIntrusionAt } = floatAroundRect(rect, columnWidth);
    expect(intrusionAt(15, 25)).toBe(60);
    expect(rightIntrusionAt(15, 25)).toBe(0);
    // Above and below the rect: no indent.
    expect(intrusionAt(0, 9)).toBe(0);
    expect(intrusionAt(31, 40)).toBe(0);
  });

  it('auto-floats right when the rect leans right', () => {
    const rect = { left: 140, right: 200, top: 10, bottom: 30 };
    const { intrusionAt, rightIntrusionAt } = floatAroundRect(rect, columnWidth);
    expect(intrusionAt(15, 25)).toBe(0);
    expect(rightIntrusionAt(15, 25)).toBe(columnWidth - 140);
  });

  it("padding inflates the rect on both axes", () => {
    const rect = { left: 0, right: 50, top: 10, bottom: 30 };
    const { intrusionAt } = floatAroundRect(rect, columnWidth, { padding: 6 });
    // Right edge picks up +6; the band must clear by padding on both sides.
    expect(intrusionAt(15, 25)).toBe(56);
    // Band that would touch top edge but now intersects the padded top.
    expect(intrusionAt(5, 8)).toBe(56);
    // Band fully outside the padded vertical extent.
    expect(intrusionAt(-10, -7)).toBe(0);
  });

  it('mode: "none" returns zero intrusions even for an in-column rect', () => {
    const rect = { left: 0, right: 60, top: 10, bottom: 30 };
    const { intrusionAt, rightIntrusionAt } = floatAroundRect(
      rect,
      columnWidth,
      { mode: "none" },
    );
    expect(intrusionAt(15, 25)).toBe(0);
    expect(rightIntrusionAt(15, 25)).toBe(0);
  });

  it('mode: "left" / "right" override the auto pick', () => {
    // A rect leaning right, but forced to float left.
    const rect = { left: 140, right: 200, top: 0, bottom: 20 };
    const forcedLeft = floatAroundRect(rect, columnWidth, { mode: "left" });
    expect(forcedLeft.intrusionAt(0, 10)).toBe(200);
    expect(forcedLeft.rightIntrusionAt(0, 10)).toBe(0);

    const rect2 = { left: 0, right: 60, top: 0, bottom: 20 };
    const forcedRight = floatAroundRect(rect2, columnWidth, { mode: "right" });
    expect(forcedRight.intrusionAt(0, 10)).toBe(0);
    expect(forcedRight.rightIntrusionAt(0, 10)).toBe(columnWidth - 0);
  });
});
