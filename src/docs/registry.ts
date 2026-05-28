/**
 * Docs registry — METADATA ONLY. The markdown bodies are intentionally NOT
 * imported here so this module stays small enough to live in the main bundle.
 * The actual `.md` files (plus the `marked` parser) live in a separate chunk
 * loaded on demand by `src/docs/DocsView.tsx` (via `React.lazy`).
 */

export type DocMeta = {
  /** Route id: `#/docs/<id>`. */
  id: string;
  /** Display title (matches the file's first H1 when sensible). */
  title: string;
  /** Short one-line description for the docs index. */
  blurb: string;
  /** Source path under the repo. */
  source: string;
};

export const DOCS: DocMeta[] = [
  {
    id: "guide",
    title: "Developer guide",
    blurb:
      "The full developer guide — coordinate model, every component's props, layout composition, tokens, hooks, recipes, and known limitations.",
    source: "docs/guide.md",
  },
  {
    id: "edit-mode",
    title: "Edit mode",
    blurb:
      "The `useEditHandle` + `<DesignSurface>` protocol that powers Demo 9 — how a component declares draggable points and what an aggregating surface does with them.",
    source: "docs/edit-mode.md",
  },
  {
    id: "playground",
    title: "Playground",
    blurb:
      "How the in-browser sketch editor maps to real files in `src/playground/sketches/` — a shared editing surface for Claude Code and the live UI.",
    source: "docs/playground.md",
  },
  {
    id: "readme",
    title: "README",
    blurb:
      "Repository overview — phases, post-spec refinements, architecture, and how to run.",
    source: "README.md",
  },
  {
    id: "demos",
    title: "Demos overview",
    blurb:
      "What each demo proves, the folder convention, and where to start.",
    source: "src/demos/README.md",
  },
  {
    id: "spec",
    title: "SPEC (historical)",
    blurb:
      "The original Phase-1 specification — kept as a record of what the prototype set out to build.",
    source: "SPEC.md",
  },
];

export const isDocId = (id: string): boolean =>
  DOCS.some((d) => d.id === id);
