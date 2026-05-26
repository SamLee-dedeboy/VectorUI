import { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import { navigate } from "../router";
import { DOCS, isDocId, type DocMeta } from "./registry";

// All .md bodies pulled in HERE — this module is the lazy chunk, so the
// markdown weight only ships when a /docs route is actually visited.
import guideSrc from "../../docs/guide.md?raw";
import editModeSrc from "../../docs/edit-mode.md?raw";
import playgroundSrc from "../../docs/playground.md?raw";
import readmeSrc from "../../README.md?raw";
import demosReadmeSrc from "../demos/README.md?raw";
import specSrc from "../../SPEC.md?raw";

/**
 * Docs viewer — renders one of the registry's markdown files. Marked emits
 * HTML; we drop it into a styled article and rewrite anchor clicks so links
 * INSIDE the doc (e.g. cross-references in `guide.md`) stay in-app, and
 * links to other docs (`docs/edit-mode.md`) route through the hash router.
 *
 * This module is loaded via `React.lazy` from `App.tsx` so the markdown
 * weight (parser + ~2,000 lines of doc text) is split out of the main
 * bundle and only fetched on the first `/docs` visit.
 */

marked.setOptions({ gfm: true, breaks: false });

const MARKDOWN_BY_ID: Record<string, string> = {
  guide: guideSrc,
  "edit-mode": editModeSrc,
  playground: playgroundSrc,
  readme: readmeSrc,
  demos: demosReadmeSrc,
  spec: specSrc,
};

function basenameNoExt(href: string): string | null {
  const name = href.split("/").pop();
  if (!name) return null;
  const m = name.match(/^(.+?)\.md(?:#.*)?$/i);
  return m ? m[1] : null;
}

export function DocsIndex() {
  return (
    <article>
      <a className="back" href="#/" onClick={() => navigate("")}>
        ← All demos
      </a>
      <h1>Docs</h1>
      <p className="lede">
        The repo's markdown files, rendered. Pick one — the source path under
        each title links back to the file on disk.
      </p>
      <ul className="demo-list">
        {DOCS.map((d) => (
          <li key={d.id}>
            <a
              href={`#/docs/${d.id}`}
              onClick={() => navigate(`docs/${d.id}`)}
            >
              <strong>{d.title}</strong>
              <span>{d.blurb}</span>
              <em>{d.source}</em>
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * Router-facing dispatcher. Takes the doc id from the route; renders either
 * a single doc or a "not found" stub. App.tsx renders this inside a Suspense
 * boundary so the chunk fetch shows a quiet placeholder.
 */
export default function DocsRoute({ docId }: { docId: string | null }) {
  // Empty id (just `#/docs`) → the docs index.
  if (docId === null) return <DocsIndex />;
  const meta = DOCS.find((d) => d.id === docId);
  if (!meta) return <DocsNotFound id={docId} />;
  return <DocsView doc={meta} />;
}

function DocsNotFound({ id }: { id: string }) {
  return (
    <article>
      <a className="back" href="#/docs" onClick={() => navigate("docs")}>
        ← All docs
      </a>
      <h1>Doc not found</h1>
      <p className="lede">
        No doc with id <code>{id}</code>. See the{" "}
        <a href="#/docs" onClick={() => navigate("docs")}>docs index</a>.
      </p>
    </article>
  );
}

function DocsView({ doc }: { doc: DocMeta }) {
  const markdown = MARKDOWN_BY_ID[doc.id] ?? "";
  const html = useMemo(() => marked.parse(markdown) as string, [markdown]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intercept clicks on rendered links so:
  //   - links to other docs (./edit-mode.md, ../README.md) route in-app
  //   - in-document anchors (#section-id) jump without a full reload
  //   - external links open in a new tab
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";

      if (href.startsWith("#")) return; // in-document anchor

      if (
        href.startsWith("./") ||
        href.startsWith("../") ||
        href.endsWith(".md") ||
        href.includes(".md#")
      ) {
        const id = basenameNoExt(href);
        if (id && isDocId(id)) {
          e.preventDefault();
          navigate(`docs/${id}`);
          return;
        }
      }

      if (/^https?:\/\//.test(href) && anchor.target !== "_blank") {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [html]);

  return (
    <article className="docs-article">
      <a className="back" href="#/docs" onClick={() => navigate("docs")}>
        ← All docs
      </a>
      <header className="docs-header">
        <h1>{doc.title}</h1>
        <p className="docs-source">
          <code>{doc.source}</code>
        </p>
      </header>
      <div
        ref={containerRef}
        className="docs-body"
        // Source is our own repo's markdown, not user input — no XSS surface.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
