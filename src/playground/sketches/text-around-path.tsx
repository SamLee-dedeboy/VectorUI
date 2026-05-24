import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { WrapText } from "../../components/WrapText";
import { Float } from "../../components/Float";
import { tokens } from "../../tokens";

/**
 * Text flowing around paths placed anywhere in the block.
 *
 * `<WrapText>` draws each `<Float>`'s path AND derives the wrap contour from the
 * same `d` — one source of truth. Text fills every open region of each line, so
 * a float in the middle has text on both sides and several floats fill the gaps
 * between them. Position a float by an `anchor` point (four corners or centre)
 * at `x`/`y`, which take layout units or percentages (`anchor="center" x="50%"
 * y="50%"` centres it in the laid-out paragraph; `y%` resolves against the
 * final block height). The bbox is auto-measured; the wrap width is inherited
 * from the enclosing column `Flow`.
 */

const BLOB =
  "M 8 14 C 40 -6, 96 2, 104 36 C 112 66, 78 78, 92 104 C 104 128, 64 156, 34 144 C 2 132, 14 104, 6 80 C -2 54, -10 30, 8 14 Z";

export default function TextAroundPath() {
  return (
    <VectorUIRoot
      style={{
        border: `1px solid ${tokens.color.line}`,
        background: tokens.color.surface,
        borderRadius: 12,
        maxWidth: 500,
      }}
    >
      <Flow direction="column" padding={28}>
        <WrapText {...tokens.type.body} fill={tokens.color.ink} gap={16}>
          <Float d={BLOB} x={"50%"} y={"50%"} anchor={"center"} fill={tokens.color.accent} />
          This paragraph wraps around the silhouette of an irregular path floated
          to its left. Each line indents by however far the blob reaches into it,
          so the text follows the curve's bulges and dips instead of a plain
          rectangle — and once the lines clear the bottom of the shape they snap
          back to the full column width and run edge to edge.
        </WrapText>
      </Flow>
    </VectorUIRoot>
  );
}
