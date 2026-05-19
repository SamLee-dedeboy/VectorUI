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
      <h1>Demos</h1>
      <p className="lede">
        Each demo is the integration test for one or more primitives. Built
        demos are live; the rest are the SPEC §11 roadmap.
      </p>
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
