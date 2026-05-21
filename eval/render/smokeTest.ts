/**
 * Smoke test for the render pipeline without calling Anthropic.
 *
 * Writes a known-good candidate to a temp file, runs renderCandidate, and
 * prints the rendered SVG + any errors. Run with:
 *   cd eval && npx tsx render/smokeTest.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderCandidate } from "./render.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const candidate = [
  'import {',
  '  VectorUIRoot,',
  '  Frame,',
  '  Flow,',
  '  Text,',
  '  Pill,',
  '  Path,',
  '  tokens,',
  '  cornerBlob,',
  '} from "vectorui";',
  '',
  'export default function Eval() {',
  '  const blob = cornerBlob({ width: 84, height: 96 });',
  '  const labels = ["Dismiss", "Learn more", "Got it"] as const;',
  '  return (',
  '    <VectorUIRoot width={480} height="content" style={{ background: tokens.color.surfaceSunken }}>',
  '      <Flow padding={40} align="center" crossSize={400}>',
  '        <Frame',
  '          shape={tokens.shapes.rectRounded}',
  '          width="auto"',
  '          height="auto"',
  '          padding={tokens.space.xl}',
  '          slots={{',
  '            body: { type: "region", x: tokens.space.xl, y: tokens.space.xl, width: 320, height: "content" },',
  '            actions: { type: "region", x: tokens.space.xl, y: { after: "body", gap: tokens.space.lg }, width: 320, height: "content" },',
  '          }}',
  '          fill={tokens.color.surface}',
  '          filter={tokens.filters.softShadow}',
  '        >',
  '          <Frame.Slot name="body">',
  '            <g>',
  '              <Path d={blob.path} fill={tokens.color.accentSoft} />',
  '              <Text',
  '                {...tokens.type.body}',
  '                maxWidth="100%"',
  '                fill={tokens.color.ink}',
  '                flowAround={{ intrusionAt: blob.intrusionAt, gap: tokens.space.md }}',
  '              >',
  '                VectorUI text wraps around an arbitrary silhouette, not just a rectangle. The blob to the left is a path, and the text follows its real contour.',
  '              </Text>',
  '            </g>',
  '          </Frame.Slot>',
  '          <Frame.Slot name="actions">',
  '            <Flow direction="row" distribute="space-between" mainSize={320}>',
  '              {labels.map((l) => (',
  '                <Pill key={l} textStyle={tokens.type.label} height={32}>{l}</Pill>',
  '              ))}',
  '            </Flow>',
  '          </Frame.Slot>',
  '        </Frame>',
  '      </Flow>',
  '    </VectorUIRoot>',
  '  );',
  '}',
  '',
].join("\n");

async function main() {
  const tmpDir = path.join(__dirname, "..", "runs", "_smoke");
  await fs.mkdir(tmpDir, { recursive: true });
  const file = path.join(tmpDir, "Eval.tsx");

  // Rewrite "vectorui" → relative path to the local source.
  const srcIndex = path.join(REPO_ROOT, "src", "index.ts");
  let rel = path.relative(path.dirname(file), srcIndex).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  const rewritten =
    "/** @jsxRuntime automatic */\n/** @jsxImportSource react */\n" +
    candidate.replace(/from\s+["']vectorui["']/g, `from "${rel}"`);
  await fs.writeFile(file, rewritten);

  console.log("[smoke] rendering…");
  const t0 = Date.now();
  const { svg, errors } = await renderCandidate(file);
  console.log(`[smoke] done in ${Date.now() - t0}ms`);
  console.log(`[smoke] svg: ${svg.length} chars`);
  console.log(`[smoke] errors: ${errors.length}`);
  for (const e of errors.slice(0, 5)) {
    console.log("  ----");
    console.log(e);
  }
  await fs.writeFile(path.join(tmpDir, "rendered.svg"), svg);
  console.log("[smoke] wrote", path.join(tmpDir, "rendered.svg"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
