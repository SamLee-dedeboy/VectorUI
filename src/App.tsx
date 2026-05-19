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

type DemoTab = "demo" | "code";

function DemoView({ demo }: { demo: DemoEntry }) {
  const [tab, setTab] = useState<DemoTab>("demo");
  const Component = demo.Component!;
  return (
    <article>
      <a className="back" href="#/" onClick={() => navigate("")}>
        ← All demos
      </a>
      <h1>{demo.title}</h1>
      <p className="proves">{demo.proves}</p>

      <div className="view-tabs" role="tablist" aria-label="Demo or source">
        {(["demo", "code"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "view-tab active" : "view-tab"}
            onClick={() => setTab(id)}
          >
            {id === "demo" ? "Demo" : "Code"}
          </button>
        ))}
      </div>

      {tab === "demo" ? (
        <Component />
      ) : (
        <CodeView sources={demo.sources ?? []} />
      )}
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
