# Playground — a live, shared sketch surface

The **Playground** (route `#/playground`) is a scratchpad for building VectorUI
components and seeing them render as you go. A tab bar lists **instances** —
each a real file under `src/playground/sketches/*.tsx`. The selected instance
shows two panes:

- **Left** — a code editor over that instance's real file.
- **Right** — its default-exported component, rendered live.

Use **+ New** to add an instance, double-click a tab to rename it, and the **×**
to delete it.

> Status: a **dev-only** tool. It needs the Vite dev server (`npm run dev`,
> port 5181). In a production build the editor is read-only (saving and
> add/rename/delete are disabled — see [Limits](#limits)).

What makes it different from a typical in-browser playground: there is **no
in-browser compiler** (no Babel/esbuild-wasm). Each instance is a *real* file, so
Vite already compiles it with React Fast Refresh. That one decision is what lets
**a Claude Code session and the in-browser editor share the same surface** —
both just write the same files, and either write hot-reloads the render.

---

## Two ways to edit

### 1. In the browser

Type in the left pane. Edits **auto-save** to disk ~500ms after you stop typing
(`Cmd/Ctrl+S` forces an immediate save). The status line by the filename shows
`saving… → saved`. Each save writes the instance file, which Vite hot-reloads
into the right pane.

### 2. From Claude Code

Ask Claude Code to edit an instance file directly — e.g. *"in the playground's
`card` instance, add a second pill and make it wider"* → it edits
`src/playground/sketches/card.tsx`. Because it's a normal file, Claude uses its
ordinary Edit/Write tools. The change hot-reloads the render **and** is pulled
back into the browser editor (see [Disk-change sync](#disk-change-sync)).

This is the intended loop: describe a component to Claude, watch it appear in the
right pane, then nudge it by hand in the editor — or vice versa.

---

## The one rule for an instance

Each `sketches/*.tsx` must keep a **`default export` of a React component**:

```tsx
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { tokens } from "../../tokens";

export default function Sketch() {
  return (
    <VectorUIRoot style={{ maxWidth: 420 }}>
      <Flow direction="column" padding={28} gap={16}>
        <Text {...tokens.type.title}>Hello</Text>
      </Flow>
    </VectorUIRoot>
  );
}
```

Import any VectorUI component or token with a relative path from
`src/playground/sketches/` (e.g. `../../components/Pill`, `../../tokens`). The
component renders exactly as it would inside any other demo. See
[`guide.md`](./guide.md) for the component reference and the two-coordinate model.

---

## How it works

```
                    PUT  …/instances/<name>  (save)
  browser editor ───────────────────────────►  src/playground/sketches/<name>.tsx
   (CodeMirror)   POST/DELETE …/instances     (add/rename/delete)   │
        ▲                                                           │ Vite watches +
        │  diskContent prop ← ?raw glob (HMR)                       │ Fast Refresh
        │                                                           ▼
        └────────────────────  Vite dev server  ──────►  render pane (<Selected/>)
                                     ▲
  Claude Code ───────────────────────┘
   (Edit/Write any instance file directly)
```

The pieces:

| File | Role |
|------|------|
| [`src/playground/sketches/*.tsx`](../src/playground/sketches/) | The instances — persistent, editable components, one per tab. |
| [`src/playground/demo.tsx`](../src/playground/demo.tsx) | The page: discovers instances via `import.meta.glob`, the tab bar, the editor/render split, and the error boundary. |
| [`src/playground/Editor.tsx`](../src/playground/Editor.tsx) | The CodeMirror editor for one instance: auto-save, disk sync, conflict banner. |
| [`src/playground/api.ts`](../src/playground/api.ts) | `createInstance` / `saveInstance` / `deleteInstance` / `renameInstance`. |
| [`src/vite-playground-plugin.ts`](../src/vite-playground-plugin.ts) | The dev-only CRUD endpoints that read/write the files. |

### Discovery (the glob)

The page lists and renders instances with eager globs over the folder:

```ts
import.meta.glob("./sketches/*.tsx", { eager: true });               // components
import.meta.glob("./sketches/*.tsx", { eager: true, query: "?raw" }); // source text
```

Eager globs are static imports, so Vite compiles every instance with Fast
Refresh (great for live editing) and keeps each one's `?raw` source live for the
editor. The glob is the source of truth for the tab list.

### The dev endpoints

The browser can't touch the filesystem, so a Vite plugin adds CRUD routes via
`configureServer`:

```
GET    /api/playground/instances              → { names }
POST   /api/playground/instances              → create { name } (starter template)
PUT    /api/playground/instances/<name>       → overwrite with the body (save)
DELETE /api/playground/instances/<name>       → delete
POST   /api/playground/instances/<name>/rename → rename to { to }
```

Names are validated (`[A-Za-z0-9_-]`) and every path is confined to
`src/playground/sketches/`, so the API can only touch `<valid-name>.tsx` there.
The plugin is `apply: "serve"`, so it exists only under `vite` dev.

**Adding/removing files vs. Fast Refresh.** A `PUT` (save) is just an edit, so it
rides Fast Refresh — the render and editor update in place. But create / delete /
rename change the *set* of files the glob sees, and hot-updating an `import.meta.glob`
set mid-session can wedge React Fast Refresh. So after those three the plugin
invalidates the module graph and sends a Vite **full reload**; the page reboots
cleanly against the fresh glob, and `demo.tsx` restores the intended selection
from `localStorage`. (Saves never reload — that would kill the live-edit loop.)

### The editor

- **Seed.** The editor (keyed by instance name, so switching tabs reseeds it) is
  given the file's current text via the `?raw` glob — it opens on whatever is on
  disk, including edits Claude made before the page loaded.
- **Save.** Changes are debounced (500ms) and `PUT`; `Cmd/Ctrl+S` flushes
  immediately. The status reads `saving / saved`, or `save failed` if the dev
  endpoint isn't there.

### Disk-change sync

The editor receives the file's on-disk text as a `diskContent` prop, kept live by
HMR on the `?raw` glob. When the file changes from *outside* the editor (i.e.
Claude Code), that prop changes and the editor:

- **adopts** the new contents silently **if you have no unsaved local edits**, or
- shows a **conflict banner** — *"File changed on disk (e.g. by Claude) … Load
  disk version / Keep mine"* — if your editor has diverged, so an external edit
  never clobbers what you were typing.

(The editor ignores the echo of its *own* saves by remembering the last text it
synced.)

### Error handling

- **Runtime errors** in the sketch are caught by an error boundary in
  `demo.tsx`, which shows the message instead of blanking the page. Fast Refresh
  clears it on the next successful edit.
- **Syntax / compile errors** surface through Vite's standard dev error overlay;
  fix the code and it recovers.

---

## The render baseline (regression spec)

Alongside the live `Sketch.tsx` sits a **frozen** sibling,
[`baseline.tsx`](../src/playground/baseline.tsx) — a fixed component whose
rendered output is a specification: it must stay identical across library
refactors. It exercises the "text wraps to fit by default" behaviour (a root
with no `width`/`height`, a padded `Flow`, `Text` with no `maxWidth`). Two
goldens pin it, both measured at a reproducible **480px** width:

| Golden | Fidelity | Checked by |
|--------|----------|-----------|
| `baseline.golden.svg` / `baseline.golden.png` | Real browser, true Inter metrics — what you actually see. | Eye / diff after a change. Regenerate with `npm run baseline:snapshot`. |
| `tests/__snapshots__/baseline.test.ts.snap` | Deterministic jsdom render (synthetic ≈0.55em metrics). | `npm test` automatically. |

The two use different font metrics, so their line breaks differ — that's
expected. The SVG/PNG is the human-facing truth; the `.snap` is the automated
CI guard that fails on any structural/sizing regression (viewBox, wrap width,
line count, padding handling).

**Changing the baseline on purpose:** edit `baseline.tsx`, then update both
goldens together — `npm run baseline:snapshot` (real browser) and `npm test -- -u`
(the jsdom snapshot). Don't use `baseline.tsx` as a scratchpad — that's what the
`sketches/` instances are for. (`baseline.tsx` lives outside `sketches/`, so it
is not a Playground instance.)

---

## Limits

- **Dev-only.** No dev server → no API. The page still renders the committed
  instances, but edits can't persist and add/rename/delete fail (saving shows
  `save failed — run npm run dev to edit`).
- **One component per instance.** An instance is a single file. To share helpers,
  add them elsewhere under `src/` and import them; only `sketches/*.tsx` are the
  live-edited surfaces.
- **Must default-export a component.** Remove the default export and the render
  pane shows a “No default export” notice.
- **New files created outside the UI.** Adding/removing an instance via the UI
  triggers a clean full reload. If you create a *new* file directly (e.g. Claude
  adds `sketches/foo.tsx`), Vite may hot-update the glob instead — if the page
  misbehaves, just reload. Editing *existing* instances is always Fast-Refresh.
- **No Code tab.** Unlike the numbered demos, the Playground ships no `sources`
  in the registry — the page *is* the editor — so `App.tsx` hides the Show-code
  toggle for it.

---

## Dependencies

The editor uses CodeMirror 6 via
[`@uiw/react-codemirror`](https://www.npmjs.com/package/@uiw/react-codemirror)
with `@codemirror/lang-javascript` (JSX/TSX) and `@codemirror/theme-one-dark`.
The dev plugin uses Node's `fs`/`path`; `@types/node` is a devDependency,
confined to the plugin file with `/// <reference types="node" />` so Node globals
don't leak into the browser type-check.
