import { VectorUIRoot } from "../components/VectorUIRoot";
import { Flow } from "../components/Flow";
import { Pill } from "../components/Pill";
import { Text } from "../components/Text";
import { tokens } from "../tokens";

/**
 * The Playground sketch — a real, persistent file edited two ways:
 *   • in the browser, on the Playground page (#/playground), and
 *   • directly by Claude Code (just ask it to edit src/playground/Sketch.tsx).
 *
 * Either edit hot-reloads the render panel. Start sketching: it must keep a
 * default export of a React component.
 */
export default function Sketch() {
  return (
    <VectorUIRoot
      width={420}
      height="content"
      style={{
        maxWidth: 420,
        border: `1px solid ${tokens.color.line}`,
        background: tokens.color.surface,
        borderRadius: 12,
      }}
    >
      <Flow direction="column" padding={28} gap={16}>
        <Text {...tokens.type.title} maxWidth="100%" fill={tokens.color.ink}>
          Hello from the playground
        </Text>
        <Text
          {...tokens.type.body}
          maxWidth="100%"
          fill={tokens.color.inkMuted}
        >
          Edit this file in the panel on the left, or ask Claude Code to edit
          src/playground/Sketch.tsx — the render updates live either way.
        </Text>
        <Flow direction="row" gap={10}>
          <Pill
            textStyle={tokens.type.label}
            fill={tokens.color.accent}
            textFill={tokens.color.accentInk}
            paddingX={14}
          >
            Edit me
          </Pill>
          <Pill
            textStyle={tokens.type.label}
            fill={tokens.color.surfaceMuted}
            textFill={tokens.color.ink}
            paddingX={14}
          >
            Then again
          </Pill>
        </Flow>
      </Flow>
    </VectorUIRoot>
  );
}
