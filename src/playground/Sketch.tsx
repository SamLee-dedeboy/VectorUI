import { VectorUIRoot } from "../components/VectorUIRoot";
import { Flow } from "../components/Flow";
import { Text } from "../components/Text";
import { tokens } from "../tokens";

/**
 * The Playground sketch — a real, persistent file edited two ways:
 *   • in the browser, on the Playground page (#/playground), and
 *   • directly by Claude Code (just ask it to edit src/playground/Sketch.tsx).
 *
 * Either edit hot-reloads the render panel. Start sketching — it must keep a
 * default export of a React component. (For the frozen render spec, see
 * baseline.tsx; this file is free to change.)
 */
export default function Sketch() {
  return (
    <VectorUIRoot
      style={{
        border: `1px solid ${tokens.color.line}`,
        background: tokens.color.surface,
        borderRadius: 12,
      }}
    >
      <Flow direction="column" padding={28} gap={12}>
        <Text {...tokens.type.title} fill={tokens.color.ink}>
          Playground
        </Text>
        <Text {...tokens.type.body} fill={tokens.color.inkMuted}>
          Edit this file or ask Claude Code to edit src/playground/Sketch.tsx.
          With no width or maxWidth, the root reflows and text wraps to fit.
        </Text>
      </Flow>
    </VectorUIRoot>
  );
}
