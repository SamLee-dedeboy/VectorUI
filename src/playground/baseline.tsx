import { VectorUIRoot } from "../components/VectorUIRoot";
import { Flow } from "../components/Flow";
import { Pill } from "../components/Pill";
import { Text } from "../components/Text";
import { tokens } from "../tokens";

/**
 * GOLDEN BASELINE — a frozen render specification, not a scratch file.
 *
 * This component captures the "text wraps to fit by default" behaviour: a root
 * with no `width`/`height`, a `Flow` with padding, and `Text` with no
 * `maxWidth`. Its rendered output is pinned by two golden artifacts that must
 * stay identical across library refactors:
 *
 *   • `baseline.golden.svg` / `baseline.golden.png` — the real-browser render
 *     (faithful font metrics). Regenerate intentionally with
 *     `npm run baseline:snapshot`.
 *   • `tests/__snapshots__/baseline.test.ts.snap` — a deterministic jsdom
 *     render (synthetic metrics) checked by `npm test`.
 *
 * Do NOT edit this to experiment — use `Sketch.tsx` for that. Only change this
 * (and then regenerate both goldens) when the baseline is *meant* to change.
 *
 * The render harnesses pin the measured width to 480px, so even though the root
 * is `width="auto"` the goldens are reproducible.
 */
export default function Baseline() {
  return (
    <VectorUIRoot
      style={{
        border: `1px solid ${tokens.color.line}`,
        background: tokens.color.surface,
        borderRadius: 12,
      }}
    >
      <Flow direction="column" padding={28} gap={16}>
        <Text {...tokens.type.title} maxWidth="100%" fill={tokens.color.ink}>
          Hello from the playground
        </Text>
        <Text {...tokens.type.body} fill={tokens.color.inkMuted}>
          Edit this file in the panel on the left, or ask Claude Code to edit
          src/playground/Sketch.tsx — the render updates live either way.
        </Text>
        <Flow direction="row" gap={10}>
          <Pill
            textStyle={tokens.type.label}
            fill={tokens.color.accent}
            textFill={tokens.color.accentInk}
          >
            Edit me
          </Pill>
          <Pill
            textStyle={tokens.type.label}
            fill={tokens.color.surfaceMuted}
            textFill={tokens.color.ink}
          >
            Then again
          </Pill>
        </Flow>
      </Flow>
    </VectorUIRoot>
  );
}
