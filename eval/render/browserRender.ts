/**
 * High-fidelity render: mount a candidate in a REAL browser and screenshot it.
 *
 * The default `render.ts` path renders in jsdom with synthetic getBBox /
 * measureText shims — fast and API-key-free, but it can't catch *visual*
 * defects (a clean structural wiring can still overlap, mis-centre, or clip).
 * This path boots Vite, mounts the candidate's actual component with the real
 * library + real font metrics, and screenshots the rendered `<svg>`. The PNG
 * then goes to the judge as an image so it grades pixels, not just markup.
 *
 * Heavier (a Vite boot + a Chromium launch per call), so it's opt-in via
 * EVAL_BROWSER=1. Uses the system Google Chrome (channel: "chrome") so no
 * Playwright browser download is needed.
 */
import { createServer, type ViteDevServer } from "vite";
import { chromium, type Browser } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

export type BrowserRenderResult = {
  /** Outer <svg> markup as rendered by the real browser. */
  svg: string;
  /** Browser console errors captured during render. */
  errors: string[];
  /** Absolute path to the screenshot PNG, or null if nothing rendered. */
  pngPath: string | null;
};

const HOST_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#fff}
  #root{display:inline-block}
</style></head>
<body><div id="root"></div>
<script type="module" src="./host.tsx"></script></body></html>`;

const HOST_TSX = `/** @jsxRuntime automatic */ /** @jsxImportSource react */
import { createRoot } from "react-dom/client";
import Eval from "./Eval";
createRoot(document.getElementById("root")!).render(<Eval />);
`;

/**
 * Render the candidate at `candidatePath` (an `Eval.tsx` whose imports already
 * point at the local library source) and screenshot its `<svg>` to
 * `<runDir>/rendered.png`. Returns the markup + console errors + png path.
 */
export async function renderInBrowser(
  candidatePath: string,
): Promise<BrowserRenderResult> {
  const runDir = path.dirname(candidatePath);
  await fs.writeFile(path.join(runDir, "host.html"), HOST_HTML);
  await fs.writeFile(path.join(runDir, "host.tsx"), HOST_TSX);

  let server: ViteDevServer | null = null;
  let browser: Browser | null = null;
  const errors: string[] = [];
  try {
    server = await createServer({
      root: REPO_ROOT,
      configFile: path.join(REPO_ROOT, "vite.config.ts"),
      server: { port: 0 },
      logLevel: "error",
      // `command: serve` keeps base at "/" (the prod config switches to
      // /VectorUI/, which would 404 our absolute host URL).
      mode: "development",
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") {
      throw new Error("vite did not bind a TCP port");
    }
    const hostRel = path
      .relative(REPO_ROOT, path.join(runDir, "host.html"))
      .replace(/\\/g, "/");
    const url = `http://localhost:${address.port}/${hostRel}`;

    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    // Ignore benign network noise (the favicon Vite doesn't serve); keep real
    // script/render errors so they still flow to the judge.
    const benign = (t: string) =>
      /favicon/i.test(t) || /Failed to load resource.*404/i.test(t);
    page.on("console", (m) => {
      if (m.type() === "error" && !benign(m.text())) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
    // Wait for the component's <svg> and for fonts to settle (the library's
    // bounds-driven layout settles one frame after fonts load).
    await page
      .waitForSelector("svg", { timeout: 10000 })
      .catch(() => errors.push("no <svg> rendered within 10s"));
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await page.waitForTimeout(250);

    const svgEl = await page.$("svg");
    const svg = svgEl ? await page.evaluate((el) => el.outerHTML, svgEl) : "";

    let pngPath: string | null = null;
    if (svgEl) {
      pngPath = path.join(runDir, "rendered.png");
      await svgEl.screenshot({ path: pngPath });
    }
    return { svg, errors, pngPath };
  } finally {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
  }
}
