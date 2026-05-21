/**
 * Tiny http server that surfaces eval runs in the browser.
 *
 * SSR template literals, no framework, no build step. Two routes:
 *   /             — table of every run under eval/runs/
 *   /run/<id>     — one run's report (judge score, rendering, candidate source)
 *
 * Runs are discovered by `fs.readdir` on each request — drop a new directory
 * in `runs/` and the next page load picks it up. Mid-grade aesthetic: a
 * single light theme, mono code blocks, no client-side JS beyond <details>.
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVAL_ROOT = path.resolve(__dirname, "..");
const RUNS_DIR = path.join(EVAL_ROOT, "runs");
const TASKS_DIR = path.join(EVAL_ROOT, "tasks");

const PORT = Number(process.env.EVAL_VIEWER_PORT) || 5182;

// --- types ---------------------------------------------------------------

type Summary = {
  task: string;
  authorModel: string;
  judgeModel: string;
  timings: { authorMs: number; renderMs: number; judgeMs: number };
  renderErrors: number;
  judgeReport:
    | {
        score: number;
        breakdown: Record<string, number>;
        reasoning: string;
      }
    | { error: string; raw?: string };
};

type RunMeta = {
  id: string; // directory name
  timestamp: string; // ISO-ish prefix
  task: string;
  summary: Summary | null;
};

// --- helpers -------------------------------------------------------------

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

async function readJSON<T>(p: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

async function readText(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

/** Parse the run directory name "YYYY-MM-DDTHH-MM-SS__<task>" into parts. */
function parseRunId(id: string): { timestamp: string; task: string } | null {
  const m = id.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})__(.+)$/);
  if (!m) return null;
  return { timestamp: m[1], task: m[2] };
}

async function listRuns(): Promise<RunMeta[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(RUNS_DIR);
  } catch {
    return [];
  }
  const runs: RunMeta[] = [];
  for (const id of entries) {
    if (id.startsWith(".")) continue;
    if (id.endsWith(".json")) continue; // variance aggregates, not runs
    const parsed = parseRunId(id);
    if (!parsed) continue;
    const summary = await readJSON<Summary>(
      path.join(RUNS_DIR, id, "summary.json"),
    );
    runs.push({
      id,
      timestamp: parsed.timestamp,
      task: parsed.task,
      summary,
    });
  }
  // Newest first.
  runs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return runs;
}

type VarianceBatch = {
  file: string;
  timestamp: string;
  task: string;
  samples: number;
  scored: number;
  scores: number[];
  mean: number;
  min: number;
  max: number;
  stddev: number;
  authorModel: string;
  judgeModel: string;
  runIds: string[];
};

async function listVariance(): Promise<VarianceBatch[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(RUNS_DIR);
  } catch {
    return [];
  }
  const out: VarianceBatch[] = [];
  for (const f of entries) {
    if (!f.endsWith("__variance.json")) continue;
    const data = await readJSON<Omit<VarianceBatch, "file" | "timestamp">>(
      path.join(RUNS_DIR, f),
    );
    if (!data) continue;
    const tsMatch = f.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})__/);
    out.push({
      file: f,
      timestamp: tsMatch ? tsMatch[1] : f,
      task: (data.task ?? "").replace(/^.*\//, "").replace(/\.md$/, ""),
      samples: data.samples,
      scored: data.scored,
      scores: data.scores ?? [],
      mean: data.mean,
      min: data.min,
      max: data.max,
      stddev: data.stddev,
      authorModel: data.authorModel,
      judgeModel: data.judgeModel,
      runIds: data.runIds ?? [],
    });
  }
  out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return out;
}

// --- presentation --------------------------------------------------------

const STYLES = `
:root {
  color-scheme: light;
  --bg: #f5f5f1;
  --surface: #ffffff;
  --surface-sunken: #ebebe5;
  --ink: #1a1a1a;
  --ink-muted: #6a6a64;
  --ink-subtle: #9b9b93;
  --line: #dde0da;
  --accent: #1f8a5c;
  --accent-soft: #cfe9dd;
  --warn: #b1521a;
  --bad: #b81d35;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
body {
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.layout { max-width: 980px; margin: 0 auto; padding: 24px 24px 64px; }
header.page {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 24px;
}
header.page h1 {
  font: 600 18px/1.2 ui-sans-serif, system-ui, sans-serif;
  margin: 0;
}
header.page .meta { color: var(--ink-muted); font-size: 12px; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.nav-back {
  display: inline-block; margin-bottom: 12px; color: var(--ink-muted);
  font-size: 13px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px 20px;
  margin: 12px 0;
}
.card h2 {
  font: 600 13px/1.2 ui-sans-serif, system-ui, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-muted);
  margin: 0 0 12px;
}
table { width: 100%; border-collapse: collapse; }
table th, table td {
  text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line);
  font-size: 13px;
}
table th {
  color: var(--ink-muted); font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px;
}
table tr:last-child td { border-bottom: none; }
table tr.run-row:hover td { background: var(--surface-sunken); }
table tr.run-row[data-href] { cursor: pointer; }
.hint { margin: -4px 0 12px; font-size: 12px; color: var(--ink-muted); }
.mono-scores a { font-weight: 600; }
.score {
  display: flex; align-items: baseline; gap: 8px;
  font: 600 13px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.score.s5 { color: #166534; }
.score.s4 { color: #15803d; }
.score.s3 { color: var(--warn); }
.score.s2 { color: var(--bad); }
.score.s1, .score.s0 { color: var(--bad); }
.score-out { color: var(--ink-subtle); font-weight: 400; }
.score-hero {
  display: flex; align-items: baseline; gap: 16px;
  margin: 0 0 16px;
}
.score-hero .big {
  font: 600 48px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px 16px;
  margin: 12px 0 0;
  font-size: 13px;
}
.breakdown dt { color: var(--ink-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
.breakdown dd { margin: 0; font: 600 16px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
.reasoning { white-space: pre-wrap; }
.svg-host {
  display: flex; justify-content: center; align-items: center;
  background: var(--surface-sunken); padding: 24px; border-radius: 6px;
  overflow: auto;
}
.svg-host svg { max-width: 100%; height: auto; }
.svg-host img { max-width: 100%; height: auto; background: #fff; border-radius: 4px; }
pre.code {
  background: #0f1115; color: #e6e6e1;
  font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 16px 20px; border-radius: 6px;
  overflow-x: auto; margin: 0;
}
details { margin-top: 8px; }
details > summary {
  cursor: pointer; padding: 8px 0;
  font: 500 13px/1.2 ui-sans-serif, system-ui, sans-serif;
  color: var(--ink-muted);
}
details[open] > summary { color: var(--ink); }
.task-brief {
  background: var(--surface-sunken);
  border-left: 3px solid var(--accent);
  padding: 12px 16px; border-radius: 4px;
  font: 13px/1.55 ui-sans-serif, system-ui, sans-serif;
  white-space: pre-wrap;
}
.empty {
  text-align: center; padding: 48px 24px;
  color: var(--ink-muted);
}
.empty code {
  background: var(--surface-sunken);
  padding: 2px 6px; border-radius: 4px;
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.kvs { font-size: 12px; color: var(--ink-muted); }
.kvs span + span::before { content: " · "; }
.mono-scores { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em; }
.bar {
  display: inline-block; vertical-align: middle; margin-left: 8px;
  width: 96px; height: 6px; border-radius: 3px;
  background: var(--surface-sunken); overflow: hidden;
}
.bar-fill { display: block; height: 100%; border-radius: 3px; background: currentColor; }
.bar-fill.s5 { color: #166534; } .bar-fill.s4 { color: #15803d; }
.bar-fill.s3 { color: var(--warn); } .bar-fill.s2, .bar-fill.s1, .bar-fill.s0 { color: var(--bad); }
`;

function scoreClass(s: number): string {
  if (s >= 4.5) return "s5";
  if (s >= 3.5) return "s4";
  if (s >= 2.5) return "s3";
  if (s >= 1.5) return "s2";
  return "s1";
}

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="layout">${body}</div>
</body>
</html>`;
}

function renderIndex(runs: RunMeta[], variance: VarianceBatch[]): string {
  const body = `
    <header class="page">
      <h1>VectorUI — agent-authorability eval</h1>
      <div class="meta">${variance.length} variance batch${
        variance.length === 1 ? "" : "es"
      } · ${runs.length} run${runs.length === 1 ? "" : "s"}</div>
    </header>
    ${variance.length ? renderVarianceSection(variance) : ""}
    ${
      runs.length === 0
        ? `<div class="empty">
            <p>No runs yet.</p>
            <p>Run <code>npm run eval -- tasks/01-callout-card.md</code> to see one here.</p>
          </div>`
        : `<div class="card">
            <h2>All runs</h2>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Task</th>
                  <th>Score</th>
                  <th>Models</th>
                </tr>
              </thead>
              <tbody>
                ${runs.map(renderRunRow).join("")}
              </tbody>
            </table>
          </div>`
    }
  `;
  return shell("VectorUI eval — runs", body);
}

/** A 0–5 score as a proportional bar, coloured by band. */
function scoreBar(score: number): string {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return `<span class="bar"><span class="bar-fill ${scoreClass(
    score,
  )}" style="width:${pct}%"></span></span>`;
}

function renderVarianceSection(batches: VarianceBatch[]): string {
  // Keep only the newest batch per task (the headline result), but show all
  // in a compact table so older batches are still visible.
  const rows = batches
    .map((b) => {
      // Each per-sample score links to that sample's detail page (where the
      // rendered SVG of the agent's interface lives). Falls back to plain
      // text if a runId is missing.
      const spread = b.scores.length
        ? b.scores
            .map((s, i) => {
              const id = b.runIds[i];
              const label = s.toFixed(1);
              return id
                ? `<a href="/run/${esc(id)}">${label}</a>`
                : label;
            })
            .join(" ")
        : "—";
      const firstId = b.runIds[0];
      const view = firstId
        ? `<a href="/run/${esc(firstId)}">view →</a>`
        : "";
      return `
      <tr class="run-row">
        <td>${esc(b.task)}</td>
        <td>
          <div class="score ${scoreClass(b.mean)}">${b.mean.toFixed(2)}
            <span class="score-out">± ${b.stddev.toFixed(2)}</span>
          </div>
          ${scoreBar(b.mean)}
        </td>
        <td class="kvs">${b.min}–${b.max}</td>
        <td class="kvs mono-scores">${spread}</td>
        <td class="kvs">${b.scored}/${b.samples}</td>
        <td class="kvs">${view}</td>
      </tr>`;
    })
    .join("");
  return `
    <div class="card">
      <h2>Variance batches — mean ± sd over N samples</h2>
      <p class="hint">Click any per-sample score, a run timestamp below, or
        “view” to open that run — each detail page shows the rendered
        interface the agent produced.</p>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Mean score</th>
            <th>Range</th>
            <th>Samples</th>
            <th>N</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderRunRow(run: RunMeta): string {
  const s = run.summary;
  const score = s && "score" in (s.judgeReport ?? {})
    ? (s.judgeReport as { score: number }).score
    : null;
  const scoreCell =
    score === null
      ? `<span class="score-out">—</span>`
      : `<div class="score ${scoreClass(score)}">${score.toFixed(1)} <span class="score-out">/ 5</span></div>`;
  const models = s ? `${s.authorModel} → ${s.judgeModel}` : "—";
  const href = `/run/${esc(run.id)}`;
  return `
    <tr class="run-row" data-href="${href}" onclick="location.href='${href}'">
      <td><a href="${href}">${esc(run.timestamp)}</a></td>
      <td>${esc(run.task)}</td>
      <td>${scoreCell}</td>
      <td class="kvs">${esc(models)}</td>
    </tr>
  `;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function renderRun(run: RunMeta): Promise<string> {
  const dir = path.join(RUNS_DIR, run.id);
  const [taskMd, candidateSrc, renderedSvg, renderErrors, hasPng] =
    await Promise.all([
      readText(path.join(TASKS_DIR, run.task + ".md")),
      readText(path.join(dir, "Eval.raw.tsx")),
      readText(path.join(dir, "rendered.svg")),
      readText(path.join(dir, "render-errors.txt")),
      fileExists(path.join(dir, "rendered.png")),
    ]);
  const s = run.summary;
  const report = s?.judgeReport;
  const hasScore = report && "score" in (report as object);
  const score = hasScore ? (report as { score: number }).score : null;

  const body = `
    <a class="nav-back" href="/">← All runs</a>
    <header class="page">
      <h1>${esc(run.task)}</h1>
      <div class="meta">${esc(run.timestamp)}</div>
    </header>

    ${
      taskMd
        ? `<div class="card">
            <h2>Task brief</h2>
            <div class="task-brief">${esc(taskMd.trim())}</div>
          </div>`
        : ""
    }

    <div class="card">
      <h2>Judge report</h2>
      ${
        score === null
          ? `<p class="reasoning">${esc(
              report && "error" in report ? report.error : "no judge report",
            )}</p>`
          : `
            <div class="score-hero">
              <div class="big score ${scoreClass(score)}">${score.toFixed(1)}<span class="score-out"> / 5</span></div>
            </div>
            <dl class="breakdown">
              ${Object.entries((report as { breakdown: Record<string, number> }).breakdown)
                .map(
                  ([k, v]) => `
                <div>
                  <dt>${esc(k)}</dt>
                  <dd class="score ${scoreClass(v)}">${v}<span class="score-out"> / 5</span></dd>
                </div>`,
                )
                .join("")}
            </dl>
            <p class="reasoning" style="margin-top: 16px;">${esc(
              (report as { reasoning: string }).reasoning,
            )}</p>
          `
      }
      ${
        s
          ? `<div class="kvs" style="margin-top: 14px;">
              <span>author: ${esc(s.authorModel)} (${s.timings.authorMs} ms)</span>
              <span>render: ${s.timings.renderMs} ms${
                s.renderErrors ? `, ${s.renderErrors} error${s.renderErrors === 1 ? "" : "s"}` : ""
              }</span>
              <span>judge: ${esc(s.judgeModel)} (${s.timings.judgeMs} ms)</span>
            </div>`
          : ""
      }
    </div>

    <div class="card">
      <h2>Rendered output${hasPng ? " — real browser" : " — jsdom shim"}</h2>
      <div class="svg-host">${
        hasPng
          ? `<img src="/run/${esc(run.id)}/rendered.png" alt="rendered output" />`
          : (renderedSvg ?? "<em>no rendered svg</em>")
      }</div>
      ${
        hasPng
          ? `<details><summary>jsdom SVG markup</summary><pre class="code">${esc(
              renderedSvg ?? "",
            )}</pre></details>`
          : ""
      }
    </div>

    ${
      renderErrors
        ? `<div class="card">
            <h2>Render errors</h2>
            <pre class="code">${esc(renderErrors)}</pre>
          </div>`
        : ""
    }

    <div class="card">
      <h2>Candidate source</h2>
      <pre class="code">${esc(candidateSrc ?? "<missing>")}</pre>
    </div>
  `;
  return shell(`${run.task} — ${run.timestamp}`, body);
}

// --- server --------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname === "/") {
      const [runs, variance] = await Promise.all([listRuns(), listVariance()]);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(renderIndex(runs, variance));
      return;
    }
    // Serve a run's screenshot PNG.
    const pngMatch = url.pathname.match(/^\/run\/(.+?)\/rendered\.png$/);
    if (pngMatch) {
      const id = decodeURIComponent(pngMatch[1]);
      if (!parseRunId(id)) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
        return;
      }
      try {
        const png = await fs.readFile(path.join(RUNS_DIR, id, "rendered.png"));
        res.writeHead(200, { "content-type": "image/png" });
        res.end(png);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("no screenshot");
      }
      return;
    }
    const runMatch = url.pathname.match(/^\/run\/(.+?)\/?$/);
    if (runMatch) {
      const id = decodeURIComponent(runMatch[1]);
      const parsed = parseRunId(id);
      if (!parsed) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
        return;
      }
      const summary = await readJSON<Summary>(
        path.join(RUNS_DIR, id, "summary.json"),
      );
      const run: RunMeta = {
        id,
        timestamp: parsed.timestamp,
        task: parsed.task,
        summary,
      };
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(await renderRun(run));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`server error: ${(e as Error).message}`);
  }
});

server.listen(PORT, () => {
  console.log(`[viewer] listening on http://localhost:${PORT}`);
});
