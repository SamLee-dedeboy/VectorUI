# VectorUI — agent-authorability eval

A small harness that asks an LLM to author a VectorUI component to a task
brief, renders it in jsdom, then asks a stronger LLM to grade the result.
The minimum end-to-end loop for "can an agent compose VectorUI's helpers
to author UI?".

## Run

```bash
cd eval
npm install                                            # one-time
# Save the API key once (gitignored, persists across runs):
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
chmod 600 .env

npm run eval -- tasks/01-callout-card.md
```

An `eval/.env` file is loaded automatically by the harness (six-line parser,
no dotenv dep). Shell-set variables win, so a one-off `ANTHROPIC_API_KEY=... npm
run eval …` still overrides. `.env` is already covered by the repo's
top-level `.gitignore` — do not commit it.

> **Reproducing this eval elsewhere:** you need an Anthropic API key with
> access to `claude-sonnet-4-6` (author) and `claude-opus-4-7` (judge).
> Drop it in `eval/.env` as above. Without a key, `EVAL_DRY_RUN=1 npm run
> eval -- …` exercises the full pipeline against a stub author/judge.

The `npm run eval` wrapper sets `TSX_TSCONFIG_PATH=../tsconfig.json` so tsx
uses the repo's `jsx: react-jsx` setting when loading library `.tsx` files;
`npx tsx harness.ts …` works too as long as that env var is set.

`npm run smoke` renders a known-good candidate (no Anthropic call) — handy
for verifying the jsdom + shim pipeline after a library bump.

`npm run viewer` starts a tiny http server (default :5182) that lists every
run under `runs/` and renders the score, breakdown, reasoning, rendered
SVG, and candidate source in one page. SSR template literals — no build
step, no client framework. Override the port with `EVAL_VIEWER_PORT`.

Each run lands in `runs/<timestamp>__<task>/`:

| file | what |
|------|------|
| `Eval.raw.tsx` | the candidate's literal output (imports from `"vectorui"`) |
| `Eval.tsx` | the same, with the import path rewritten to the local source |
| `rendered.svg` | the jsdom-rendered outer `<svg>` markup |
| `render-errors.txt` | any thrown errors (omitted if none) |
| `author-raw.json` | full Anthropic message for the author call |
| `judge-raw.json` | full Anthropic message for the judge call |
| `judge-report.json` | parsed `{ score, breakdown, reasoning }` |
| `summary.json` | timings + judge report at a glance |

## The loop

1. **Author** (`claude-sonnet-4-6`) gets a system prompt containing
   `docs/guide.md`, `src/index.ts`, and `CLAUDE.md` (prompt-cached), plus
   the task brief, and is asked to emit a single TSX module that default-
   exports a component named `Eval`.
2. **Render** spins up jsdom, installs a `getBBox` shim (jsdom doesn't ship
   one — without it the bounds-driven layout never settles), imports the
   candidate module via `tsx`, and snapshots the resulting `<svg>` markup.
3. **Judge** (`claude-opus-4-7`) gets the brief, the candidate source, the
   rendered SVG, and the rubric (also cached) and returns a JSON report:
   `score` (0–5), `breakdown` for structural / visual / idiomatic / errors,
   and short reasoning.

## Adding a task

Drop `tasks/02-<slug>.md` describing the scene the candidate must author.
The prompts are task-agnostic; only the brief changes.

## Known limitations

- The `getBBox` shim is geometric (text width from font-size × charcount,
  path bounds from a number tokeniser). Close enough for "did the candidate
  pick the right helpers" — not for visual-fidelity grading.
- One author × one judge × one rubric. No variance runs, no multi-rubric
  comparison, no per-helper coverage report.
- The author is asked for a `.tsx` module; no fall-back if it returns
  prose. A `stripFences` pass handles `\`\`\`tsx … \`\`\`` wrapping.
