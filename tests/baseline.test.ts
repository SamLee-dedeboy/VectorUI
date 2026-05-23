import { beforeAll, describe, expect, it } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { installBBoxShim } from "../eval/render/bboxShim";
import Baseline from "../src/playground/baseline";

/**
 * Deterministic regression guard for the Playground baseline
 * (src/playground/baseline.tsx). It renders the component in vitest's jsdom
 * with the same synthetic shims the eval harness uses — canvas `measureText`
 * (≈0.55em/char), `getBBox`, and a pinned 480px measured width — then snapshots
 * the resulting SVG markup. Any refactor that changes how the baseline lays out
 * (wrap width, line count, viewBox, Flow padding handling) changes this
 * snapshot and fails the test.
 *
 * The metrics are synthetic, so this does NOT match the real browser pixel for
 * pixel — that fidelity lives in baseline.golden.svg/.png (regenerate with
 * `npm run baseline:snapshot`). This test guards the *behaviour* deterministically.
 *
 * If you change baseline.tsx on purpose, update this snapshot (`vitest -u`) and
 * regenerate the goldens together.
 */

const MEASURED_WIDTH = 480;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

beforeAll(() => {
  // Silence React 19's "not wrapped in act(...)" warnings — we settle the tree
  // manually with timer ticks below, mirroring the eval render harness.
  g.IS_REACT_ACT_ENVIRONMENT = false;

  // pretext measures glyph widths through canvas; jsdom has no canvas, so stub
  // a 2D context whose measureText estimates width from the font-size string.
  g.HTMLCanvasElement.prototype.getContext = function getContext(kind: string) {
    if (kind !== "2d") return null;
    return {
      font: "14px sans-serif",
      measureText(text: string) {
        const m = /([\d.]+)px/.exec(this.font);
        const px = m ? parseFloat(m[1]) : 14;
        const width = text.length * px * 0.55;
        return {
          width,
          actualBoundingBoxAscent: px * 0.8,
          actualBoundingBoxDescent: px * 0.2,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: width,
          fontBoundingBoxAscent: px * 0.85,
          fontBoundingBoxDescent: px * 0.2,
        };
      },
    };
  };

  // jsdom ships no ResizeObserver; VectorUIRoot only needs the initial measure.
  if (!g.ResizeObserver) {
    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // VectorUIRoot reads the <svg>'s width via getBoundingClientRect. jsdom does
  // no layout (returns 0), so pin it to 480 — the `width="auto"` root then
  // resolves to a reproducible viewBox.
  g.SVGSVGElement.prototype.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: MEASURED_WIDTH,
      bottom: 0,
      width: MEASURED_WIDTH,
      height: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  installBBoxShim();
});

describe("playground baseline", () => {
  it("renders the same SVG as the committed snapshot", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await new Promise<void>((resolve) => {
      root.render(createElement(Baseline));
      // A few timer ticks let useLayoutEffect + measurement-driven re-renders
      // settle before we snapshot (same approach as eval/render/render.ts).
      let ticks = 0;
      const flush = () => (++ticks >= 8 ? resolve() : setTimeout(flush, 0));
      setTimeout(flush, 0);
    });

    const svg = container.querySelector("svg");
    expect(svg, "baseline rendered an <svg>").not.toBeNull();
    expect(svg!.outerHTML).toMatchSnapshot();

    root.unmount();
    container.remove();
  });
});
