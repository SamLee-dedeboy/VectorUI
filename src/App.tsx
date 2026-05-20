import { useState } from "react";
import { useRoute, navigate } from "./router";
import { CodeView } from "./CodeView";
import { DEMOS, PLANNED, type DemoEntry } from "./demos/registry";

export function App() {
  const route = useRoute();
  const active = DEMOS.find((d) => d.id === route);

  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="#/" onClick={() => navigate("")}>
          VectorUI
        </a>
        <span className="tagline">SVG-first UI — feasibility prototype</span>
      </header>
      <main className="app-main">
        {active && active.Component ? (
          <DemoView demo={active} />
        ) : (
          <DemoIndex />
        )}
      </main>
    </div>
  );
}

function DemoView({ demo }: { demo: DemoEntry }) {
  // When on, the source opens in a panel BESIDE the demo — both stay visible.
  const [showCode, setShowCode] = useState(false);
  const Component = demo.Component!;
  return (
    <article>
      <a className="back" href="#/" onClick={() => navigate("")}>
        ← All demos
      </a>
      <h1>{demo.title}</h1>
      <p className="proves">{demo.proves}</p>

      <div className="view-toolbar">
        <button
          type="button"
          className={showCode ? "code-toggle active" : "code-toggle"}
          aria-pressed={showCode}
          onClick={() => setShowCode((s) => !s)}
        >
          {showCode ? "Hide code" : "Show code"}
        </button>
      </div>

      <div className={showCode ? "demo-split is-split" : "demo-split"}>
        <div className="demo-pane">
          <Component />
        </div>
        {showCode ? (
          <div className="code-pane">
            <CodeView sources={demo.sources ?? []} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function DemoIndex() {
  return (
    <article>
      <h1>VectorUI</h1>
      <p className="lede">
        A UI component model rendered entirely in SVG — shapes, not boxes, as
        the primary layout container.
      </p>

      <section className="concept">
        <h2>Why</h2>
        <p>
          Web UIs treat the page as nested rectangles. HTML/CSS lets you wrap
          text inside a box and float a few images, but containers stay
          rectangular and shape doesn't drive structure. VectorUI puts SVG in
          the layout role — shapes are containers, text wraps around
          silhouettes, items distribute along curves. The geometry that draws
          the UI is the same geometry that lays it out, which collapses a
          class of "can't do that in CSS" into "the path does it directly".
        </p>

        <h2>Where it shines</h2>
        <ul>
          <li>
            <strong>Shape as container.</strong> A card with a carved-out
            silhouette; text inside wraps to the contour, not its bounding
            box (
            <a href="#/01-text-flow" onClick={() => navigate("01-text-flow")}>
              demo 1
            </a>
            ,{" "}
            <a href="#/02-card" onClick={() => navigate("02-card")}>
              demo 2
            </a>
            ).
          </li>
          <li>
            <strong>Layout along curves.</strong> A radial menu, a clock face,
            a slider whose track <em>is</em> the transfer function. Same
            primitive (<code>PathFlow</code>), any curve (
            <a
              href="#/03-radial-menu"
              onClick={() => navigate("03-radial-menu")}
            >
              demo 3
            </a>
            ,{" "}
            <a
              href="#/07-curve-slider"
              onClick={() => navigate("07-curve-slider")}
            >
              demo 7
            </a>
            ).
          </li>
          <li>
            <strong>Path morphing across breakpoints.</strong> Shapes
            cross-fade instead of binary swap (
            <a
              href="#/04-breakpoint-morph"
              onClick={() => navigate("04-breakpoint-morph")}
            >
              demo 4
            </a>
            ).
          </li>
          <li>
            <strong>Direct manipulation as a layer.</strong> Drag handles for
            shape parameters and slot anchors; the edit UI and the runtime UI
            share geometry (
            <a
              href="#/08-design-surface"
              onClick={() => navigate("08-design-surface")}
            >
              demo 8
            </a>
            ).
          </li>
        </ul>

        <h2>Trade-offs</h2>
        <ul>
          <li>
            A two-coordinate model — layout units for positions/sizes, CSS
            pixels for text/strokes — that you have to internalize.
          </li>
          <li>
            Bounds via <code>getBBox</code> settle one frame after paint and
            ignore filter ink (blur/shadow).
          </li>
          <li>
            No native <code>&lt;input&gt;</code> parity yet —{" "}
            <code>foreignObject</code> form controls are deferred.
          </li>
          <li>
            ARIA + keyboard for primitives; a full WCAG pass, RTL, and
            forced-colors handling are deferred.
          </li>
          <li>
            Performance unverified at scale; no SSR or virtualization yet.
          </li>
        </ul>

        <h2>Where we are</h2>
        <p>
          Three phases shipped. <strong>Phase 1</strong> proved the four hard
          problems (text fidelity vs native <code>&lt;p&gt;</code>, shape-as-
          container, curve layout, breakpoint morph).{" "}
          <strong>Phase 2</strong> retired the consumer-side coordinate-math
          footguns — across all demos: zero <code>/scale</code> divisions,
          zero guessed fallback heights, zero <code>onMeasure</code>{" "}
          callbacks. <strong>Phase 3</strong> added first-principles
          components (<code>CurveSlider</code> — the curve <em>is</em> the
          function) and a direct-manipulation edit mode (
          <code>&lt;DesignSurface&gt;</code> + <code>useEditHandle</code>)
          where drags pass through the layout system rather than around it.
          61 unit tests across pure-function coverage.
        </p>
      </section>

      <h2>Demos</h2>
      <ul className="demo-list">
        {DEMOS.map((d) => (
          <li key={d.id}>
            <a href={`#/${d.id}`} onClick={() => navigate(d.id)}>
              <strong>{d.title}</strong>
              <span>{d.blurb}</span>
              <em>{d.proves}</em>
            </a>
          </li>
        ))}
      </ul>
      {PLANNED.length > 0 ? (
        <>
          <h2>Planned</h2>
          <ul className="demo-list planned">
            {PLANNED.map((d) => (
              <li key={d.id}>
                <div>
                  <strong>{d.title}</strong>
                  <span>{d.blurb}</span>
                  <em>{d.proves}</em>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </article>
  );
}
