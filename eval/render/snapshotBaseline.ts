/**
 * Regenerate the real-browser golden render of the Playground baseline
 * (src/playground/baseline.tsx) — `baseline.golden.svg` + `baseline.golden.png`.
 *
 * These goldens are the faithful, font-accurate specification of how the
 * baseline must render; the deterministic CI guard lives in
 * tests/baseline.test.ts. Run this ONLY when the baseline is meant to change:
 *
 *   npm run baseline:snapshot
 *
 * Strategy mirrors browserRender.ts: boot Vite, mount the baseline in real
 * Chromium with real Inter metrics, pin the container to 480px (so the
 * `width="auto"` root resolves to a reproducible viewBox), screenshot the
 * `<svg>` and capture its markup.
 */
import { createServer, type ViteDevServer } from "vite";
import { chromium, type Browser } from "playwright-core";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PLAYGROUND = path.join(REPO_ROOT, "src", "playground");
const MEASURED_WIDTH = 480;

// A host page that mounts the baseline at a fixed 480px width with the real
// Inter faces loaded (matching the app), so the golden uses true metrics.
const HOST_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#fff}
  #root{width:${MEASURED_WIDTH}px}
</style></head>
<body><div id="root"></div>
<script type="module" src="./__baselineHost.tsx"></script></body></html>`;

const HOST_TSX = `import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { createRoot } from "react-dom/client";
import Baseline from "./baseline";
createRoot(document.getElementById("root")!).render(<Baseline />);
`;

async function main() {
  const htmlPath = path.join(PLAYGROUND, "__baselineHost.html");
  const tsxPath = path.join(PLAYGROUND, "__baselineHost.tsx");
  await fs.writeFile(htmlPath, HOST_HTML);
  await fs.writeFile(tsxPath, HOST_TSX);

  let server: ViteDevServer | null = null;
  let browser: Browser | null = null;
  try {
    server = await createServer({
      root: REPO_ROOT,
      configFile: path.join(REPO_ROOT, "vite.config.ts"),
      server: { port: 0 },
      logLevel: "error",
      mode: "development",
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") {
      throw new Error("vite did not bind a TCP port");
    }
    const url = `http://localhost:${address.port}/src/playground/__baselineHost.html`;

    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error" && !/favicon|404/i.test(m.text())) {
        errors.push(m.text());
      }
    });

    // `domcontentloaded` (not `networkidle`): Vite's HMR websocket can keep the
    // page from ever reaching network-idle, and a cold optimizeDeps pass is slow.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("svg", { timeout: 30000 });
    // The bounds-driven layout settles one frame after the real fonts load.
    await page.evaluate(() => (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready);
    await page.waitForTimeout(300);

    const svgEl = await page.$("svg");
    if (!svgEl) throw new Error("baseline rendered no <svg>");
    const svg = await page.evaluate((el) => el.outerHTML, svgEl);

    await svgEl.screenshot({ path: path.join(PLAYGROUND, "baseline.golden.png") });
    await fs.writeFile(
      path.join(PLAYGROUND, "baseline.golden.svg"),
      svg.trim() + "\n",
    );

    if (errors.length) {
      console.error("[baseline] render produced errors:\n" + errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log(
        "[baseline] wrote baseline.golden.svg + baseline.golden.png (480px)",
      );
    }
  } finally {
    await browser?.close().catch(() => {});
    await server?.close().catch(() => {});
    await fs.rm(htmlPath, { force: true });
    await fs.rm(tsxPath, { force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
