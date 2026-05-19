import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { tokens } from "../../tokens";
import { Card } from "./Card";

/**
 * Demo 2 — non-rectangular card (SPEC §11).
 *
 * Two versions of the same reusable `<Card>` (see Card.tsx): the only
 * difference is the props each is given — shape, size, content, and theme.
 *
 * Proves: `Frame`, the slot system, path-as-container — and that Card is
 * reusable and restylable.
 */

const BODY_A =
  "A Frame is a closed path plus named slots. This card's interior is one Flow — header, body and actions — and the Flow's measured height feeds the Frame's automatic height. Hover the card to morph the blob.";

const BODY_B =
  "Same component, different arguments: a rounded-rect shape, a dark surface, a warm accent, a narrower width. No new code — only props.";

const ROOT_WIDTH = 520;
const MARGIN = 64;

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The card's outline is a generated path, not a `&lt;div&gt;`. Both
        versions below are the <em>same</em> <code>Card</code> component — only
        the props differ. Hover either card to morph its shape.
      </p>

      <p className="variant-label">
        Version A — blob shape, default theme, wide
      </p>
      <VectorUIRoot
        width={ROOT_WIDTH}
        height="content"
        style={{ maxWidth: ROOT_WIDTH, background: "#f0efe9" }}
      >
        <Flow
          padding={MARGIN}
          align="center"
          crossSize={ROOT_WIDTH - MARGIN * 2}
        >
          <Card
            shape={tokens.shapes.blob}
            width={348}
            title="Shape as container"
            body={BODY_A}
            actionLabel="Got it"
          />
        </Flow>
      </VectorUIRoot>

      <p className="variant-label">
        Version B — rounded rect, dark restyle, narrow
      </p>
      <VectorUIRoot
        width={ROOT_WIDTH}
        height="content"
        style={{ maxWidth: ROOT_WIDTH, background: "#ece9f2" }}
      >
        <Flow
          padding={MARGIN}
          align="center"
          crossSize={ROOT_WIDTH - MARGIN * 2}
        >
          <Card
            shape={tokens.shapes.rectRounded}
            width={300}
            title="Restyled, same code"
            body={BODY_B}
            actionLabel="Done"
            surface="#2e2740"
            titleFill="#f3f0fa"
            bodyFill="#b9b1cf"
            accent="#e0995c"
            accentInk="#2e2740"
          />
        </Flow>
      </VectorUIRoot>
    </div>
  );
}
