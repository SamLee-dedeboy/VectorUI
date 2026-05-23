import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { tokens } from "../../tokens";

/**
 * A Playground instance — a real, persistent file edited two ways:
 *   • in the browser, on the Playground page (#/playground), and
 *   • directly by Claude Code (ask it to edit this file by path).
 *
 * Add more instances with "+ New" on the page (or drop another *.tsx in this
 * folder). Each must keep a default export of a React component.
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
          Edit this file or ask Claude Code to edit it. With no width or
          maxWidth, the root reflows and text wraps to fit. Use the tabs above to
          add more instances.
        </Text>
      </Flow>
    </VectorUIRoot>
  );
}
