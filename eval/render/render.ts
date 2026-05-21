/**
 * Render a candidate VectorUI component to SVG markup in jsdom.
 *
 * Usage (from harness.ts):
 *   const result = await renderCandidate(candidatePath);
 *   result.svg     // string — outer SVG markup, or empty if errored
 *   result.errors  // string[] — anything thrown during render
 *
 * Strategy: spin up a jsdom window, install the getBBox shim, render the
 * default-exported component into a real DOM element with createRoot, let
 * useLayoutEffects run, snapshot the resulting <svg> outerHTML.
 */
import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";
import path from "node:path";

export type RenderResult = {
  svg: string;
  errors: string[];
};

export async function renderCandidate(candidatePath: string): Promise<RenderResult> {
  const errors: string[] = [];

  // ---- jsdom global wiring ----
  const dom = new JSDOM(
    `<!doctype html><html><body><div id="root" style="width: 480px"></div></body></html>`,
    { pretendToBeVisual: true, url: "http://localhost/" },
  );
  const { window } = dom;

  // Patch globals so React + VectorUI hooks have a DOM to talk to. Some
  // properties (navigator) are read-only getters on globalThis in Node 22+
  // — use defineProperty to overwrite them.
  const g = globalThis as any;
  const assign = (key: string, value: unknown) => {
    try {
      g[key] = value;
    } catch {
      Object.defineProperty(g, key, { value, configurable: true, writable: true });
    }
  };
  assign("window", window);
  assign("document", window.document);
  assign("navigator", window.navigator);
  assign("HTMLElement", window.HTMLElement);
  assign("Element", window.Element);
  assign("Node", window.Node);
  assign("SVGElement", window.SVGElement);
  assign("SVGGraphicsElement", window.SVGGraphicsElement);
  assign("SVGSVGElement", window.SVGSVGElement);
  assign("getComputedStyle", window.getComputedStyle.bind(window));
  assign("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  assign("cancelAnimationFrame", (id: number) =>
    clearTimeout(id as unknown as NodeJS.Timeout),
  );

  // ResizeObserver — jsdom doesn't ship one. Stub it; VectorUIRoot uses it to
  // measure pixel width, which we feed via the container's getBoundingClientRect.
  if (!g.ResizeObserver) {
    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // jsdom doesn't ship HTMLCanvasElement.getContext, which @chenglou/pretext
  // uses for font measurement. Stub a 2D context with a measureText that
  // estimates width from the font-size string (charcount × 0.55em). This
  // makes text layout finish without a `not implemented` throw — line breaks
  // will land at slightly different positions than the real browser, which
  // is fine for the "did the agent compose the right helpers" judgement.
  const proto = window.HTMLCanvasElement.prototype as any;
  proto.getContext = function getContext(this: HTMLCanvasElement, kind: string) {
    if (kind !== "2d") return null;
    const ctx = {
      font: "14px sans-serif",
      measureText(text: string) {
        const m = /([\d.]+)px/.exec(this.font);
        const px = m ? parseFloat(m[1]) : 14;
        return {
          width: text.length * px * 0.55,
          actualBoundingBoxAscent: px * 0.8,
          actualBoundingBoxDescent: px * 0.2,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: text.length * px * 0.55,
          fontBoundingBoxAscent: px * 0.85,
          fontBoundingBoxDescent: px * 0.2,
        } as unknown as TextMetrics;
      },
    };
    return ctx as unknown as CanvasRenderingContext2D;
  };

  // Force a stable container width so VectorUIRoot picks 480 as its pixel width.
  const container = window.document.getElementById("root") as HTMLElement;
  container.getBoundingClientRect = (() =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 480,
      bottom: 0,
      width: 480,
      height: 0,
      toJSON: () => ({}),
    }) as DOMRect) as () => DOMRect;

  // Install the getBBox shim once SVG prototype is reachable on the global.
  const { installBBoxShim } = await import("./bboxShim.js");
  installBBoxShim();

  // Bridge any errors the React tree throws to our errors[] list.
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args
      .map((a) => (a instanceof Error ? a.stack || a.message : String(a)))
      .join(" ");
    errors.push(msg);
  };

  let svg = "";
  try {
    // Dynamic import the candidate module — tsx handles TS+JSX on the fly.
    const url = pathToFileURL(path.resolve(candidatePath)).href + `?t=${Date.now()}`;
    const mod = await import(url);
    const Eval = mod.default;
    if (typeof Eval !== "function") {
      throw new Error(
        "Candidate module did not default-export a component (got " + typeof Eval + ")",
      );
    }

    const React = await import("react");
    const ReactDOMClient = await import("react-dom/client");
    const root = ReactDOMClient.createRoot(container);
    await new Promise<void>((resolve) => {
      // React 19 batches: render + a microtask is enough for useLayoutEffect.
      // Add a few extra ticks to let measurement-driven re-renders settle.
      root.render(React.createElement(Eval));
      let ticks = 0;
      const flush = () => {
        ticks++;
        if (ticks >= 6) {
          resolve();
        } else {
          setTimeout(flush, 0);
        }
      };
      setTimeout(flush, 0);
    });

    const svgEl = container.querySelector("svg");
    if (svgEl) {
      svg = svgEl.outerHTML;
    } else {
      errors.push("Candidate rendered no <svg> element");
    }
    root.unmount();
  } catch (e) {
    const err = e as Error;
    errors.push("RENDER_THROW: " + (err.stack || err.message));
  } finally {
    console.error = origConsoleError;
  }

  return { svg, errors };
}
