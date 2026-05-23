# Playground — a live, shared sketch surface

The **Playground** (route `#/playground`) is a scratchpad for building a
VectorUI component and seeing it render as you go. It has two panes:

- **Left** — a code editor over a real file, `src/playground/Sketch.tsx`.
- **Right** — that file's default-exported component, rendered live.

> Status: a **dev-only** tool. It needs the Vite dev server (`npm run dev`,
> port 5181). In a production build the editor is read-ish (saving is disabled —
> see [Limits](#limits)).

What makes it different from a typical in-browser playground: there is **no
in-browser compiler** (no Babel/esbuild-wasm). `Sketch.tsx` is a *real* file, so
Vite already compiles it with React Fast Refresh. That one decision is what lets
**a Claude Code session and the in-browser editor share the same surface** —
both just write the same file, and either write hot-reloads the render.

---

## Two ways to edit

### 1. In the browser

Type in the left pane. Edits **auto-save** to disk ~500ms after you stop typing
(`Cmd/Ctrl+S` forces an immediate save). The status line by the filename shows
`saving… → saved`. Each save writes `Sketch.tsx`, which Vite hot-reloads into the
right pane.

### 2. From Claude Code

Ask Claude Code to edit `src/playground/Sketch.tsx` directly — e.g. *"in the
playground, add a second pill and make the card wider."* Because it's a normal
file, Claude edits it with its ordinary Edit/Write tools. The change hot-reloads
the render **and** is pulled back into the browser editor (see
[Disk-change sync](#disk-change-sync)).

This is the intended loop: describe a component to Claude, watch it appear in the
right pane, then nudge it by hand in the editor — or vice versa.

---

## The one rule for `Sketch.tsx`

It must keep a **`default export` of a React component**:

```tsx
import { VectorUIRoot } from "../components/VectorUIRoot";
import { Flow } from "../components/Flow";
import { Text } from "../components/Text";
import { tokens } from "../tokens";

export default function Sketch() {
  return (
    <VectorUIRoot height="content" style={{ maxWidth: 420 }}>
      <Flow direction="column" padding={28} gap={16}>
        <Text {...tokens.type.title} maxWidth="100%">Hello</Text>
      </Flow>
    </VectorUIRoot>
  );
}
```

Import any VectorUI component or token with a relative path from
`src/playground/` (e.g. `../components/Pill`, `../tokens`). The component renders
exactly as it would inside any other demo. See [`guide.md`](./guide.md) for the
component reference and the two-coordinate model.

---

## How it works

```
                       writes file
  browser editor ───────────────────────►  src/playground/Sketch.tsx
   (CodeMirror)   POST /api/playground/sketch          │
        ▲                                              │ Vite watches +
        │  HMR: ?raw module update                     │ Fast Refresh
        │                                              ▼
        └──────────────────  Vite dev server  ──────► render pane (<Sketch/>)
                                   ▲
  Claude Code ─────────────────────┘
   (Edit/Write the file directly)
```

The pieces:

| File | Role |
|------|------|
| [`src/playground/Sketch.tsx`](../src/playground/Sketch.tsx) | The persistent, editable component. Lives in `src/playground/` (not under `demos/`) precisely so it has a stable path to edit. |
| [`src/playground/demo.tsx`](../src/playground/demo.tsx) | The page: the editor/render split, and an error boundary around `<Sketch/>`. |
| [`src/playground/Editor.tsx`](../src/playground/Editor.tsx) | The CodeMirror editor: seed, auto-save, disk sync, conflict banner. |
| [`src/playground/api.ts`](../src/playground/api.ts) | `saveSketch(code)` → `POST /api/playground/sketch`. |
| [`src/vite-playground-plugin.ts`](../src/vite-playground-plugin.ts) | The dev-only endpoint that writes the file. |

### The dev endpoint

The browser can't write files, so a tiny Vite plugin adds one route via
`configureServer`:

```
POST /api/playground/sketch    body = the new file contents → overwrites Sketch.tsx
```

The target path is **hardcoded** to `src/playground/Sketch.tsx` (resolved from
the project root) — the client sends no path, so the endpoint can only ever touch
that one file. The plugin is declared `apply: "serve"`, so it exists only under
`vite` dev and is absent from production builds.

### The editor

- **Seed.** The initial editor value comes from `import sketchRaw from
  "./Sketch.tsx?raw"` — Vite's `?raw` import returns the file's current text, so
  the editor opens on whatever is on disk (including edits Claude made before the
  page loaded).
- **Save.** Changes are debounced (500ms) and `POST`ed; `Cmd/Ctrl+S` flushes
  immediately. The status reads `saving / saved`, or `save failed` if the dev
  endpoint isn't there.

### Disk-change sync

The `?raw` import is itself hot-reloadable, so the editor subscribes to it:

```ts
import.meta.hot?.accept("./Sketch.tsx?raw", (mod) => { /* mod.default = new text */ });
```

When the file changes on disk from *outside* the editor (i.e. Claude Code), that
callback fires. The editor then:

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

## Limits

- **Dev-only.** No dev server → no save endpoint. The page still renders the
  committed `Sketch.tsx`, but edits can't persist (status shows `save failed —
  run npm run dev to edit`).
- **One file.** The playground is a single component file by design. To pull in
  helpers, add them elsewhere under `src/` and import them; only `Sketch.tsx` is
  the live-edited surface.
- **Must default-export a component.** Remove the default export and the render
  pane has nothing to mount.
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
