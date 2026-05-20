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
        A UI component library rendered entirely in SVG.
      </p>

      <section className="concept">
        <h2>Why</h2>
        <p>
          VectorUI tries to escape from the "boxy" look of modern UI components. The concept is to create components entirely based on SVG elements. This unlocks features like using creative shapes as containers, text wraps around irregular
          silhouettes, and items distributed along curves. More to be discovered as this project moves forward.
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

      <section className="concept">
        
        <h2>What's next</h2>
        <ul>
          <li>
            More components leveraging svgs: radial pickers, shape
            knobs, orbit menus, constellation selectors. Which
            interactions benefit most from a vector-native component?
          </li>
          <li>
            Agent-authorability eval: give a coding agent the public API
            plus a natural-language UI description and see what it
            produces.
          </li>
          <li>
            Generalise the edit-handle protocol: snap, multi-select,
            undo, and a round-trip back to the source code so direct
            manipulation can feed (and be fed by) agent-generated UI.
          </li>
        </ul>
      </section>
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
