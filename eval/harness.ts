/**
 * VectorUI agent-authorability eval harness — minimum viable loop.
 *
 * Reads a task brief, asks the author model to write a VectorUI component
 * fulfilling it, renders the component to SVG via jsdom, asks the judge
 * model to score the result against a rubric, writes everything to a
 * timestamped run directory.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx harness.ts tasks/01-callout-card.md
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderCandidate } from "./render/render.ts";
import { renderInBrowser } from "./render/browserRender.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Load `eval/.env` into `process.env` if it exists. A six-line parser
 * (KEY=VALUE per line, `#` comments, blanks ignored) so we don't pull in
 * a dotenv dep for the one secret this harness needs. Skip variables
 * already set in the shell — explicit invocations win over the file.
 */
(function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Truthy-check (not `in` — some shells pre-set the var to "" as a
    // safety measure, which would otherwise hide the file value).
    if (!process.env[key]) process.env[key] = value;
  }
})();

const AUTHOR_MODEL = "claude-sonnet-4-6";
const JUDGE_MODEL = "claude-opus-4-7";

/** YYYY-MM-DDTHH-MM-SS — filesystem-safe; matches the spec. */
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
  );
}

async function readText(rel: string): Promise<string> {
  return fs.readFile(path.join(REPO_ROOT, rel), "utf8");
}

/** Strip ```...``` fences if the model added them despite being told not to. */
function stripFences(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n");
    // Drop the opening fence line (```tsx, ```typescript, etc.).
    lines.shift();
    // Drop a trailing ``` if present.
    if (lines.length && lines[lines.length - 1].trim().startsWith("```")) {
      lines.pop();
    }
    return lines.join("\n");
  }
  return s;
}

/**
 * Rewrite `from "vectorui"` to a relative path that resolves to the local
 * library source — the candidate is told to import from the public alias.
 */
/**
 * The JSX pragma forces tsx/esbuild to use the automatic runtime (`react/
 * jsx-runtime`), which is what the rest of the repo uses (`tsconfig.json`
 * sets `jsx: react-jsx`). Without it, esbuild defaults to the classic
 * transform and the candidate would need `import React from "react"` —
 * which the docs don't show.
 */
const JSX_PRAGMA =
  "/** @jsxRuntime automatic */\n/** @jsxImportSource react */\n";

function rewriteImports(source: string, candidatePath: string): string {
  const srcIndex = path.join(REPO_ROOT, "src", "index.ts");
  let rel = path.relative(path.dirname(candidatePath), srcIndex);
  if (!rel.startsWith(".")) rel = "./" + rel;
  // Use forward slashes; node import specifiers don't care on macOS but it's
  // tidier and works on Windows too.
  rel = rel.replace(/\\/g, "/");
  const rewritten = source
    .replace(/from\s+["']vectorui["']/g, `from "${rel}"`)
    .replace(/from\s+["']vectorui\/(.+?)["']/g, (_m, sub) =>
      `from "${rel.replace(/\/index\.ts$/, "")}/${sub}"`,
    );
  return JSX_PRAGMA + rewritten;
}

async function buildAuthorPrompt(taskPath: string): Promise<{
  system: Anthropic.TextBlockParam[];
  userText: string;
}> {
  const guide = await readText("docs/guide.md");
  const index = await readText("src/index.ts");
  const claude = await readText("CLAUDE.md");
  const task = await fs.readFile(taskPath, "utf8");

  const templatePath = path.join(__dirname, "prompts", "author.md");
  const tpl = await fs.readFile(templatePath, "utf8");
  const filled = tpl
    .replace("{{GUIDE}}", guide)
    .replace("{{INDEX}}", index)
    .replace("{{CLAUDE}}", claude)
    .replace("{{TASK}}", task);

  // Split into a cacheable system prefix (everything before the task) and a
  // task-specific user message. The library docs don't change across tasks
  // and should hit the cache on the second task onward.
  const taskMarker = "# Task brief";
  const idx = filled.indexOf(taskMarker);
  const prefix = filled.slice(0, idx).trim();
  const userText = filled.slice(idx).trim();

  return {
    system: [
      {
        type: "text",
        text: prefix,
        cache_control: { type: "ephemeral" },
      },
    ],
    userText,
  };
}

async function callAuthor(taskPath: string): Promise<{
  source: string;
  raw: Anthropic.Message;
}> {
  // dangerouslyAllowBrowser: true is the right call here even though we're
  // in Node — jsdom (imported by the render step) sets `window`/`document`
  // on the Node global object, which trips the SDK's browser-detection
  // guard. The guard exists to stop browser apps from leaking the key via
  // window.fetch interception; in Node the key never crosses that boundary.
  const client = new Anthropic({ dangerouslyAllowBrowser: true });
  const { system, userText } = await buildAuthorPrompt(taskPath);

  const message = await client.messages.create({
    model: AUTHOR_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: userText }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { source: stripFences(text), raw: message };
}

async function buildJudgePrompt(
  taskPath: string,
  source: string,
  svg: string,
  errors: string[],
  hasScreenshot = false,
): Promise<{ system: Anthropic.TextBlockParam[]; userText: string }> {
  const task = await fs.readFile(taskPath, "utf8");
  const tpl = await fs.readFile(path.join(__dirname, "prompts", "judge.md"), "utf8");

  // The rubric (everything before "# Task brief") is stable across runs — cache it.
  const taskMarker = "# Task brief";
  const idx = tpl.indexOf(taskMarker);
  const rubricPrefix = tpl.slice(0, idx).trim();
  const screenshotNote = hasScreenshot
    ? "\nA real-browser SCREENSHOT of the rendered output is attached as the " +
      "first image in this message. Treat it as the ground truth for the " +
      "**visual** dimension: judge overlap, alignment, centring, clipping, and " +
      "spacing from the pixels, not from the markup. The markup below is " +
      "supporting evidence for *structure*, not pixel-accuracy.\n"
    : "";
  const tail =
    screenshotNote +
    tpl
      .slice(idx)
      .replace("{{TASK}}", task)
      .replace("{{SOURCE}}", source)
      .replace("{{SVG}}", svg || "(no SVG rendered)")
      .replace("{{ERRORS}}", errors.length ? errors.join("\n\n") : "(none)");

  return {
    system: [
      {
        type: "text",
        text: rubricPrefix,
        cache_control: { type: "ephemeral" },
      },
    ],
    userText: tail.trim(),
  };
}

type JudgeReport = {
  score: number;
  breakdown: Record<string, number>;
  reasoning: string;
};

async function callJudge(
  taskPath: string,
  source: string,
  svg: string,
  errors: string[],
  pngPath?: string | null,
): Promise<{ report: JudgeReport | { raw: string; parseError: string }; raw: Anthropic.Message }> {
  // dangerouslyAllowBrowser: true is the right call here even though we're
  // in Node — jsdom (imported by the render step) sets `window`/`document`
  // on the Node global object, which trips the SDK's browser-detection
  // guard. The guard exists to stop browser apps from leaking the key via
  // window.fetch interception; in Node the key never crosses that boundary.
  const client = new Anthropic({ dangerouslyAllowBrowser: true });
  const { system, userText } = await buildJudgePrompt(taskPath, source, svg, errors, !!pngPath);

  // When a real-browser screenshot exists, lead with it so the judge grades
  // pixels (overlap, alignment, centring) — the things markup can't reveal.
  const content: Anthropic.ContentBlockParam[] = [];
  if (pngPath) {
    const b64 = await fs.readFile(pngPath, { encoding: "base64" });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: b64 },
    });
  }
  content.push({ type: "text", text: userText });

  const message = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Pull the JSON object out — the judge may wrap it in prose despite the
  // instruction. Find the first balanced { … }.
  let parsed: JudgeReport | null = null;
  let parseError = "";
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      parsed = JSON.parse(text.slice(start, end + 1));
    } else {
      parseError = "No JSON object found in judge response";
    }
  } catch (e) {
    parseError = (e as Error).message;
  }

  return {
    report: parsed ?? { raw: text, parseError },
    raw: message,
  };
}

/** Stub author response for EVAL_DRY_RUN — the same composition as the smoke
 *  test, so the pipeline can be exercised without an API key. */
async function stubAuthor(): Promise<{ source: string; raw: any }> {
  const source = [
    'import {',
    '  VectorUIRoot, Frame, Flow, Text, Pill, Path, tokens, cornerBlob,',
    '} from "vectorui";',
    '',
    'export default function Eval() {',
    '  const blob = cornerBlob({ width: 84, height: 96 });',
    '  const labels = ["Dismiss", "Learn more", "Got it"] as const;',
    '  return (',
    '    <VectorUIRoot width={480} height="content">',
    '      <Flow padding={32} align="center" crossSize={416}>',
    '        <Frame',
    '          shape={tokens.shapes.rectRounded}',
    '          width="auto" height="auto" padding={tokens.space.xl}',
    '          slots={{',
    '            body: { type: "region", x: tokens.space.xl, y: tokens.space.xl, width: 352, height: "content" },',
    '            actions: { type: "region", x: tokens.space.xl, y: { after: "body", gap: tokens.space.lg }, width: 352, height: "content" },',
    '          }}',
    '          fill={tokens.color.surface} filter={tokens.filters.softShadow}',
    '        >',
    '          <Frame.Slot name="body">',
    '            <g>',
    '              <Path d={blob.path} fill={tokens.color.accentSoft} />',
    '              <Text {...tokens.type.body} maxWidth="100%" fill={tokens.color.ink}',
    '                flowAround={{ intrusionAt: blob.intrusionAt, gap: tokens.space.md }}>',
    '                VectorUI text wraps around an arbitrary silhouette, not just a rectangle.',
    '              </Text>',
    '            </g>',
    '          </Frame.Slot>',
    '          <Frame.Slot name="actions">',
    '            <Flow direction="row" distribute="space-between" mainSize={352}>',
    '              {labels.map((l) => <Pill key={l} textStyle={tokens.type.label} height={32}>{l}</Pill>)}',
    '            </Flow>',
    '          </Frame.Slot>',
    '        </Frame>',
    '      </Flow>',
    '    </VectorUIRoot>',
    '  );',
    '}',
  ].join("\n");
  return { source, raw: { stub: true } };
}

async function stubJudge(): Promise<{ report: JudgeReport; raw: any }> {
  return {
    report: {
      score: 4.5,
      breakdown: { structural: 5, visual: 4, idiomatic: 5, errors: 5 },
      reasoning: "Dry-run stub. No real judge was invoked.",
    },
    raw: { stub: true },
  };
}

async function main() {
  const taskArg = process.argv[2];
  if (!taskArg) {
    console.error("Usage: tsx harness.ts <task-file.md>");
    process.exit(1);
  }
  const taskPath = path.resolve(taskArg);
  const taskName = path.basename(taskPath, ".md");

  const dryRun = process.env.EVAL_DRY_RUN === "1";
  if (!dryRun && !process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set (set EVAL_DRY_RUN=1 for a no-API smoke run)");
    process.exit(1);
  }

  // Variance: EVAL_SAMPLES > 1 runs the task N times (the author is
  // non-deterministic, so a single score can't resolve sub-point deltas).
  const samples = Math.max(1, Number(process.env.EVAL_SAMPLES) || 1);

  if (samples === 1) {
    await runOnce(taskPath, taskName, dryRun);
    return;
  }

  console.log(`[harness] variance run — ${samples} samples of ${taskName}\n`);
  const scores: number[] = [];
  const runIds: string[] = [];
  for (let i = 0; i < samples; i++) {
    console.log(`[harness] ── sample ${i + 1}/${samples} ──`);
    const summary = await runOnce(taskPath, taskName, dryRun, i + 1);
    runIds.push(summary.runId);
    const r = summary.judgeReport;
    if (r && "score" in r) scores.push(r.score);
    console.log("");
  }

  // Aggregate.
  const n = scores.length;
  const mean = n ? scores.reduce((a, b) => a + b, 0) / n : NaN;
  const min = n ? Math.min(...scores) : NaN;
  const max = n ? Math.max(...scores) : NaN;
  const sd = n
    ? Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / n)
    : NaN;
  const round2 = (x: number) => Math.round(x * 100) / 100;

  const variance = {
    task: path.relative(REPO_ROOT, taskPath),
    samples,
    scored: n,
    authorModel: AUTHOR_MODEL,
    judgeModel: JUDGE_MODEL,
    scores,
    mean: round2(mean),
    min,
    max,
    stddev: round2(sd),
    runIds,
  };
  const aggPath = path.join(
    __dirname,
    "runs",
    `${timestamp()}__${taskName}__variance.json`,
  );
  await fs.writeFile(aggPath, JSON.stringify(variance, null, 2));

  console.log(`[harness] ✓ variance complete → ${path.relative(process.cwd(), aggPath)}`);
  console.log(`[harness] scores: ${scores.map((s) => s.toFixed(1)).join(" ")}`);
  console.log(
    `[harness] mean ${round2(mean)}  min ${min}  max ${max}  sd ${round2(sd)}`,
  );
}

type RunSummary = {
  runId: string;
  task: string;
  authorModel: string;
  judgeModel: string;
  timings: { authorMs: number; renderMs: number; judgeMs: number };
  renderErrors: number;
  judgeReport: JudgeReport | { raw: string; parseError: string };
};

/** One author→render→judge cycle. Writes its own run dir; returns the
 *  summary so a variance loop can aggregate. `sample` (1-based) tags the
 *  run dir when part of a multi-sample run. */
async function runOnce(
  taskPath: string,
  taskName: string,
  dryRun: boolean,
  sample?: number,
): Promise<RunSummary> {
  const suffix = sample ? `__s${String(sample).padStart(2, "0")}` : "";
  const runId = `${timestamp()}__${taskName}${suffix}`;
  const runDir = path.join(__dirname, "runs", runId);
  await fs.mkdir(runDir, { recursive: true });

  console.log(`[harness] run ${runId}`);
  console.log(`[harness] author model: ${AUTHOR_MODEL}`);

  // 1. Author.
  console.log(`[harness] calling author…`);
  const authorStart = Date.now();
  const { source, raw: authorRaw } = dryRun
    ? await stubAuthor()
    : await callAuthor(taskPath);
  const authorMs = Date.now() - authorStart;
  console.log(`[harness] author returned in ${authorMs}ms (${source.length} chars)`);

  await fs.writeFile(path.join(runDir, "author-raw.json"), JSON.stringify(authorRaw, null, 2));
  await fs.writeFile(path.join(runDir, "Eval.raw.tsx"), source);

  // 2. Rewrite imports + write the file the renderer will load.
  const candidatePath = path.join(runDir, "Eval.tsx");
  const rewritten = rewriteImports(source, candidatePath);
  await fs.writeFile(candidatePath, rewritten);

  // 3. Render. Default: jsdom shim (fast, no browser). EVAL_BROWSER=1: a real
  // Chromium render + screenshot, so the judge can grade visual quality.
  const useBrowser = process.env.EVAL_BROWSER === "1";
  console.log(`[harness] rendering candidate… (${useBrowser ? "real browser" : "jsdom"})`);
  const renderStart = Date.now();
  let svg: string;
  let renderErrors: string[];
  let pngPath: string | null = null;
  if (useBrowser) {
    const r = await renderInBrowser(candidatePath);
    svg = r.svg;
    renderErrors = r.errors;
    pngPath = r.pngPath;
  } else {
    const r = await renderCandidate(candidatePath);
    svg = r.svg;
    renderErrors = r.errors;
  }
  const renderMs = Date.now() - renderStart;
  console.log(
    `[harness] render done in ${renderMs}ms (svg=${svg.length} chars, errors=${renderErrors.length}${pngPath ? ", png ✓" : ""})`,
  );

  await fs.writeFile(path.join(runDir, "rendered.svg"), svg || "");
  if (renderErrors.length) {
    await fs.writeFile(
      path.join(runDir, "render-errors.txt"),
      renderErrors.join("\n\n---\n\n"),
    );
  }

  // 4. Judge.
  console.log(`[harness] calling judge (${JUDGE_MODEL})…`);
  const judgeStart = Date.now();
  const { report, raw: judgeRaw } = dryRun
    ? await stubJudge()
    : await callJudge(taskPath, source, svg, renderErrors, pngPath);
  const judgeMs = Date.now() - judgeStart;
  console.log(`[harness] judge returned in ${judgeMs}ms`);

  await fs.writeFile(path.join(runDir, "judge-raw.json"), JSON.stringify(judgeRaw, null, 2));
  await fs.writeFile(path.join(runDir, "judge-report.json"), JSON.stringify(report, null, 2));

  // 5. Run summary.
  const summary = {
    runId,
    task: path.relative(REPO_ROOT, taskPath),
    authorModel: AUTHOR_MODEL,
    judgeModel: JUDGE_MODEL,
    timings: { authorMs, renderMs, judgeMs },
    renderErrors: renderErrors.length,
    judgeReport: report,
  };
  await fs.writeFile(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));

  console.log(`\n[harness] ✓ run complete → ${path.relative(process.cwd(), runDir)}`);
  console.log(`[harness] judge score: ${"score" in report ? report.score : "(unparsed)"}`);
  if ("reasoning" in report) {
    console.log(`[harness] reasoning: ${report.reasoning.slice(0, 200)}…`);
  }
  return summary;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
