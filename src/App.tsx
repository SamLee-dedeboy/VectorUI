import { lazy, Suspense, useState } from "react";
import { useRoute, navigate } from "./router";
import { CodeView } from "./CodeView";
import { DEMOS, PLANNED, type DemoEntry } from "./demos/registry";

// The docs route is code-split: the markdown bodies + `marked` parser only
// ship when a `#/docs` URL is visited, so demos (and the index) don't pay
// for ~200 KB of doc weight on first paint.
const DocsRoute = lazy(() => import("./docs/DocsView"));

export function App() {
  const route = useRoute();
  const active = DEMOS.find((d) => d.id === route);
  // Docs route convention: `#/docs` for the index, `#/docs/<id>` for a doc.
  const docMatch = route.match(/^docs(?:\/(.+))?$/);
  const docId = docMatch ? (docMatch[1] ?? null) : undefined;

  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="#/" onClick={() => navigate("")}>
          VectorUI
        </a>
        <span className="tagline">SVG-first UI — feasibility prototype</span>
        <nav className="app-nav">
          <a href="#/docs" onClick={() => navigate("docs")}>
            Docs
          </a>
        </nav>
      </header>
      <main className="app-main">
        {docId !== undefined ? (
          <Suspense fallback={<DocsLoading />}>
            <DocsRoute docId={docId} />
          </Suspense>
        ) : active && active.Component ? (
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
  // The playground page is itself an editor, so it ships no `sources` — and
  // the Show code toggle would just show an empty panel. Hide it in that case.
  const hasSources = (demo.sources?.length ?? 0) > 0;
  return (
    <article>
      <a className="back" href="#/" onClick={() => navigate("")}>
        ← All demos
      </a>
      <h1>{demo.title}</h1>
      <p className="proves">{demo.proves}</p>

      {hasSources ? (
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
      ) : null}

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
              href="#/04-curve-slider"
              onClick={() => navigate("04-curve-slider")}
            >
              demo 4
            </a>
            ).
          </li>
          <li>
            <strong>Geometry and layout from one source.</strong> A
            procedural shape's parameters drive its silhouette AND the
            contour text wraps to — slide a knob, both update in lockstep,
            no per-frame contour sampling (
            <a
              href="#/05-procedural-path"
              onClick={() => navigate("05-procedural-path")}
            >
              demo 5
            </a>
            ).
          </li>
          <li>
            <strong>Animation as a render-time concern.</strong> Components
            are pure functions of props, so animating reduces to driving a
            prop over time and re-rendering. No animation API, no DOM
            mutation — just RAF hooks (
            <a href="#/06-animation" onClick={() => navigate("06-animation")}>
              demo 6
            </a>
            ).
          </li>
          <li>
            <strong>Path morphing across breakpoints.</strong> Shapes
            cross-fade instead of binary swap (
            <a
              href="#/07-breakpoint-morph"
              onClick={() => navigate("07-breakpoint-morph")}
            >
              demo 7
            </a>
            ).
          </li>
          <li>
            <strong>Container queries that reflow, not shrink.</strong> One
            knob drives <code>Flow</code> distribute, <code>Frame</code>
            shrink-wrap, and <code>PathFlow</code> distribution side by side
            — the layout system reacting to its container, not uniformly
            scaling (
            <a
              href="#/08-layout-playground"
              onClick={() => navigate("08-layout-playground")}
            >
              demo 8
            </a>
            ).
          </li>
          <li>
            <strong>Direct manipulation as a layer.</strong> Drag handles for
            shape parameters and slot anchors; the edit UI and the runtime UI
            share geometry (
            <a
              href="#/09-design-surface"
              onClick={() => navigate("09-design-surface")}
            >
              demo 9
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

function DocsLoading() {
  return (
    <article>
      <p className="lede" style={{ color: "var(--muted)" }}>
        Loading docs…
      </p>
    </article>
  );
}
