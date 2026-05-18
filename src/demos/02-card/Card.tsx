import { useCallback, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Frame, type SlotSpec } from "../../components/Frame";
import { Text } from "../../components/Text";
import { tokens } from "../../tokens";
import { Button } from "./Button";
import { useTween } from "./useTween";

/**
 * Demo 2 — non-rectangular card (SPEC §11).
 *
 * A blob-shaped card with header / body / actions slots. The body text
 * shrink-wraps the card's height (Frame `height="auto"`), the card carries a
 * soft-shadow filter, and hovering morphs the blob.
 *
 * The three region slots are STACKED (`y: { after }`) and content-sized, so
 * each contributes to the auto height — no manual padding band (this is the
 * slot-model fix promised at the SPEC §14 Frame risk gate).
 *
 * Proves: `Frame`, the slot system, path-as-container.
 */

const { space, color, type, shapes, filters } = tokens;

const BODY_SHORT =
  "The path is generated after layout — so this card is exactly as tall as its text needs.";

const BODY_LONG =
  "A Frame is a closed path plus a set of named slots. The header, body and actions slots stack: each is sized to its content, and every one feeds the Frame's automatic height. Only then does the shape generator run with the final width and height. Hover the card to morph the blob.";

const CARD_WIDTH = 348;
const ROOT_WIDTH = 520;
const MARGIN = 64;

// Three stacked, content-sized slots — the body's measured height (and the
// header's and the actions') all roll up into the Frame's auto height.
const SLOTS: Record<string, SlotSpec> = {
  header: {
    type: "region",
    x: space.xl,
    y: space.xl,
    width: CARD_WIDTH - space.xl * 2,
    height: "content",
  },
  body: {
    type: "region",
    x: space.xl,
    y: { after: "header", gap: space.md },
    width: CARD_WIDTH - space.xl * 2,
    height: "content",
  },
  actions: {
    type: "region",
    x: space.xl,
    y: { after: "body", gap: space.lg },
    width: CARD_WIDTH - space.xl * 2,
    height: "content",
  },
};

type ShapeKind = "blob" | "rect";

export function Card() {
  const [shapeKind, setShapeKind] = useState<ShapeKind>("blob");
  const [longBody, setLongBody] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [frameHeight, setFrameHeight] = useState(320);

  const morph = useTween(hovered ? 1 : 0);
  const generator = shapeKind === "blob" ? shapes.blob : shapes.rectRounded;
  const shape = (w: number, h: number) => generator(w, h, morph);

  const onLayout = useCallback(
    (size: { height: number }) => setFrameHeight(size.height),
    [],
  );

  const rootHeight = frameHeight + MARGIN * 2;

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The card's outline is a generated path, not a `&lt;div&gt;`. Its height
        is the sum of three stacked, content-sized slots; hover it to morph the
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
        height={rootHeight}
        style={{ maxWidth: ROOT_WIDTH, background: "#f0efe9" }}
      >
        <g transform={`translate(${(ROOT_WIDTH - CARD_WIDTH) / 2} ${MARGIN})`}>
          <Frame
            shape={shape}
            width={CARD_WIDTH}
            height="auto"
            padding={space.xl}
            slots={SLOTS}
            fill={color.surface}
            filter={filters.softShadow}
            title="Account card"
            role="region"
            aria-labelledby="card-title"
            onLayout={onLayout}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: "default" }}
          >
            <Frame.Slot name="header">
              <Text
                id="card-title"
                {...type.title}
                maxWidth="100%"
                fill={color.ink}
              >
                Shape as container
              </Text>
            </Frame.Slot>
            <Frame.Slot name="body">
              <Text {...type.body} maxWidth="100%" fill={color.inkMuted}>
                {longBody ? BODY_LONG : BODY_SHORT}
              </Text>
            </Frame.Slot>
            <Frame.Slot name="actions">
              <Button onClick={() => setHovered((h) => !h)}>Got it</Button>
            </Frame.Slot>
          </Frame>
        </g>
      </VectorUIRoot>
    </div>
  );
}
