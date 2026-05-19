import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Frame } from "../../components/Frame";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { tokens } from "../../tokens";
import { Button } from "./Button";
import { useTween } from "./useTween";

/**
 * Demo 2 — non-rectangular card (SPEC §11).
 *
 * A blob-shaped card with a header / body / actions column. The body text
 * shrink-wraps the card's height (Frame `height="auto"`), the card carries a
 * soft-shadow filter, and hovering morphs the blob.
 *
 * The card's interior is a single `Flow` inside one content slot — its height
 * rolls up into the Frame's auto height — and an outer `Flow` centers and pads
 * the card, so there is no `onLayout`/`rootHeight` plumbing.
 *
 * Proves: `Frame`, the slot system, path-as-container.
 */

const { space, color, type, shapes, filters } = tokens;

const BODY_SHORT =
  "The path is generated after layout — so this card is exactly as tall as its text needs.";

const BODY_LONG =
  "A Frame is a closed path plus named slots. This card's interior is one Flow — header, body and actions — and the Flow's measured height feeds the Frame's automatic height. Only then does the shape generator run with the final width and height. Hover the card to morph the blob.";

const CARD_WIDTH = 348;
const ROOT_WIDTH = 520;
const MARGIN = 64;

type ShapeKind = "blob" | "rect";

export function Card() {
  const [shapeKind, setShapeKind] = useState<ShapeKind>("blob");
  const [longBody, setLongBody] = useState(true);
  const [hovered, setHovered] = useState(false);

  const morph = useTween(hovered ? 1 : 0);
  const generator = shapeKind === "blob" ? shapes.blob : shapes.rectRounded;
  const shape = (w: number, h: number) => generator(w, h, morph);

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

      {/* Outer Flow centers + pads the card; height="content" sizes the root. */}
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
          <Frame
            shape={shape}
            width={CARD_WIDTH}
            height="auto"
            padding={space.xl}
            slots={{
              content: {
                type: "region",
                x: space.xl,
                y: space.xl,
                width: CARD_WIDTH - space.xl * 2,
                height: "content",
              },
            }}
            fill={color.surface}
            filter={filters.softShadow}
            title="Account card"
            role="region"
            aria-labelledby="card-title"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: "default" }}
          >
            <Frame.Slot name="content">
              <Flow gap={space.md}>
                <Text
                  id="card-title"
                  {...type.title}
                  maxWidth="100%"
                  fill={color.ink}
                >
                  Shape as container
                </Text>
                <Text {...type.body} maxWidth="100%" fill={color.inkMuted}>
                  {longBody ? BODY_LONG : BODY_SHORT}
                </Text>
                <Button onClick={() => setHovered((h) => !h)}>Got it</Button>
              </Flow>
            </Frame.Slot>
          </Frame>
        </Flow>
      </VectorUIRoot>
    </div>
  );
}
