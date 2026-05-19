import { useMemo, useState } from "react";
import { Frame } from "../../components/Frame";
import { Text, type FlowAround } from "../../components/Text";
import { tokens } from "../../tokens";
import { Button } from "./Button";
import { scoopCard } from "./scoopCard";
import { useTween } from "./useTween";

/**
 * `Card` — a reusable shape-as-container card whose outline is a path, not a
 * box, and whose body text follows that path.
 *
 * The card's left edge carries a smooth concave scoop (see `scoopCard`); the
 * body paragraph is poured to wrap that exact contour. Hovering deepens the
 * scoop, and the text re-flows live around the new curve — the demonstration
 * that wrapping in VectorUI is not bound to a rectangle. Content is all props;
 * see `demo.tsx` for example arguments.
 */

const { space, color, type, filters } = tokens;

// Slot geometry, in layout units. The header is a fixed band, so the body
// slot — and therefore the scoop's intrusion profile — sits at a known y,
// with no measurement round-trip.
const PAD = space.xl;
const TITLE_H = 34;
const HEADER_GAP = space.sm;
const BODY_TOP = PAD + TITLE_H + HEADER_GAP;
const SCOOP_TOP = BODY_TOP + 6;
const SCOOP_HEIGHT = 150;

export type CardProps = {
  /** Card width, in layout units. */
  width?: number;
  title: string;
  body: string;
  /** Inward reach of the left-edge scoop, in layout units. */
  scoopDepth?: number;
  /** Optional action button; omit for a card with no action. */
  actionLabel?: string;
  onAction?: () => void;
  /** Card surface fill. */
  surface?: string;
  /** Title text color. */
  titleFill?: string;
  /** Body text color. */
  bodyFill?: string;
  /** Action button fill. */
  accent?: string;
  /** Action button label color. */
  accentInk?: string;
};

export function Card({
  width = 340,
  title,
  body,
  scoopDepth = 84,
  actionLabel,
  onAction,
  surface = color.surface,
  titleFill = color.ink,
  bodyFill = color.inkMuted,
  accent = color.accent,
  accentInk = color.accentInk,
}: CardProps) {
  const [hovered, setHovered] = useState(false);
  // 0 → 1 on hover. The scoop deepens, so the body text re-wraps as it tweens.
  const morph = useTween(hovered ? 1 : 0);
  const depth = scoopDepth * (1 + morph * 0.42);

  const contentW = width - PAD * 2;

  const card = useMemo(
    () =>
      scoopCard({
        cornerRadius: 22,
        scoopTop: SCOOP_TOP,
        scoopHeight: SCOOP_HEIGHT,
        depth,
      }),
    [depth],
  );
  // The body column's top-left is a fixed point in card space (PAD, BODY_TOP),
  // so the scoop's intrusion is exact — no guessed offset.
  const flowAround = useMemo<FlowAround>(
    () => ({ intrusionAt: card.intrusionInto(PAD, BODY_TOP), gap: space.md }),
    [card],
  );

  return (
    <Frame
      shape={card.path}
      width={width}
      height="auto"
      padding={space.xl}
      slots={{
        header: {
          type: "region",
          x: PAD,
          y: PAD,
          width: contentW,
          height: TITLE_H,
        },
        body: {
          type: "region",
          x: PAD,
          y: { after: "header", gap: HEADER_GAP },
          width: contentW,
          height: "content",
        },
        actions: {
          type: "region",
          x: PAD,
          y: { after: "body", gap: space.md },
          width: contentW,
          height: "content",
        },
      }}
      fill={surface}
      filter={filters.softShadow}
      title={title}
      role="region"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "default" }}
    >
      <Frame.Slot name="header">
        <Text {...type.title} maxWidth="100%" fill={titleFill}>
          {title}
        </Text>
      </Frame.Slot>
      <Frame.Slot name="body">
        <Text
          {...type.body}
          maxWidth="100%"
          flowAround={flowAround}
          fill={bodyFill}
        >
          {body}
        </Text>
      </Frame.Slot>
      {actionLabel ? (
        <Frame.Slot name="actions">
          <Button onClick={onAction} fill={accent} color={accentInk}>
            {actionLabel}
          </Button>
        </Frame.Slot>
      ) : null}
    </Frame>
  );
}
