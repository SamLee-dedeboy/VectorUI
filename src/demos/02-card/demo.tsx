import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { Card } from "./Card";

/**
 * Demo 2 — non-rectangular card (SPEC §11).
 *
 * Two versions of the same reusable `<Card>` (see Card.tsx): the only
 * difference is the props each is given — size, scoop depth, content, theme.
 *
 * Proves: `Frame`, the slot system, path-as-container — and that body text
 * follows a non-rectangular contour, not just a bounding rectangle.
 */

const BODY_A =
  "The card's left edge is not straight: a smooth scoop is carved out of it, and this paragraph is poured to follow that exact curve. The lines step inward as the scoop deepens, then square off below it. The very same function generates the drawn outline and the wrap profile, so the text hugs the contour that is rendered — not an approximation of it. Hover the card and the scoop deepens; the text re-flows around the new shape as it animates.";

const BODY_B =
  "Same component, a shallower scoop, a narrower width, a dark surface and a warm accent. The paragraph still wraps the carved left edge — no new code, only props. Hover to watch the contour, and the text with it, breathe.";

const ROOT_WIDTH = 520;
const MARGIN = 56;

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The card's outline is a generated path, not a <code>&lt;div&gt;</code> —
        and the body text wraps the scoop carved into its left edge. Both cards
        are the <em>same</em> <code>Card</code> component; only the props
        differ. Hover either card to deepen the scoop and watch the text reflow.
      </p>

      <p className="variant-label">
        Version A — deep scoop, default theme, wide
      </p>
      <VectorUIRoot
        width={ROOT_WIDTH}
        height="content"
        style={{ maxWidth: ROOT_WIDTH, background: "#f0efe9" }}
      >
        <Flow padding={MARGIN} align="center" crossSize={ROOT_WIDTH - MARGIN * 2}>
          <Card
            width={400}
            scoopDepth={104}
            title="Text follows the path"
            body={BODY_A}
            actionLabel="Got it"
          />
        </Flow>
      </VectorUIRoot>

      <p className="variant-label">
        Version B — shallow scoop, dark restyle, narrow
      </p>
      <VectorUIRoot
        width={ROOT_WIDTH}
        height="content"
        style={{ maxWidth: ROOT_WIDTH, background: "#ece9f2" }}
      >
        <Flow padding={MARGIN} align="center" crossSize={ROOT_WIDTH - MARGIN * 2}>
          <Card
            width={340}
            scoopDepth={66}
            title="Restyled, same code"
            body={BODY_B}
            actionLabel="Done"
            surface="#2e2740"
            titleFill="#f3f0fa"
            bodyFill="#c4bcd9"
            accent="#e0995c"
            accentInk="#2e2740"
          />
        </Flow>
      </VectorUIRoot>
    </div>
  );
}
