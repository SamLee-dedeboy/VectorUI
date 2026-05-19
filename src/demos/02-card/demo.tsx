import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { tokens } from "../../tokens";
import { Card } from "./Card";

/**
 * Demo 2 — non-rectangular card (SPEC §11).
 *
 * The demo page: it owns the controls and the demo content, and renders the
 * reusable `<Card>` (see Card.tsx) with those as arguments.
 *
 * Proves: `Frame`, the slot system, path-as-container.
 */

const BODY_SHORT =
  "The path is generated after layout — so this card is exactly as tall as its text needs.";

const BODY_LONG =
  "A Frame is a closed path plus named slots. This card's interior is one Flow — header, body and actions — and the Flow's measured height feeds the Frame's automatic height. Only then does the shape generator run with the final width and height. Hover the card to morph the blob.";

const CARD_WIDTH = 348;
const ROOT_WIDTH = 520;
const MARGIN = 64;

type ShapeKind = "blob" | "rect";

export function Demo() {
  const [shapeKind, setShapeKind] = useState<ShapeKind>("blob");
  const [longBody, setLongBody] = useState(true);

  const shape =
    shapeKind === "blob" ? tokens.shapes.blob : tokens.shapes.rectRounded;

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The card's outline is a generated path, not a `&lt;div&gt;`. Its height
        is the measured height of its content `Flow`; hover it to morph the
        shape.
      </p>

      <div style={{ display: "flex", gap: 20, padding: "8px 0 16px" }}>
        <label>
          Shape{" "}
          <select
            value={shapeKind}
            onChange={(e) => setShapeKind(e.target.value as ShapeKind)}
          >
            <option value="blob">Blob</option>
            <option value="rect">Rounded rect</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={longBody}
            onChange={(e) => setLongBody(e.target.checked)}
          />{" "}
          Longer body text
        </label>
      </div>

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
            shape={shape}
            width={CARD_WIDTH}
            title="Shape as container"
            body={longBody ? BODY_LONG : BODY_SHORT}
            actionLabel="Got it"
          />
        </Flow>
      </VectorUIRoot>
    </div>
  );
}
