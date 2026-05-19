import { useState } from "react";
import { Frame } from "../../components/Frame";
import { Flow } from "../../components/Flow";
import { Text } from "../../components/Text";
import { tokens } from "../../tokens";
import { Button } from "./Button";
import { useTween } from "./useTween";

/**
 * `Card` — a reusable shape-as-container card.
 *
 * A `Frame` whose interior is a header / body / actions `Flow`. The Frame
 * auto-sizes to that content; hovering morphs the shape. All content is passed
 * in as props — see `demo.tsx` for example arguments.
 */

const { space, color, type, filters } = tokens;

export type CardProps = {
  /** Shape generator. The third argument is a 0→1 hover-morph amount. */
  shape: (w: number, h: number, morph: number) => string;
  /** Card width, in layout units. */
  width?: number;
  title: string;
  body: string;
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
  shape,
  width = 320,
  title,
  body,
  actionLabel,
  onAction,
  surface = color.surface,
  titleFill = color.ink,
  bodyFill = color.inkMuted,
  accent = color.accent,
  accentInk = color.accentInk,
}: CardProps) {
  const [hovered, setHovered] = useState(false);
  const morph = useTween(hovered ? 1 : 0);

  return (
    <Frame
      shape={(w, h) => shape(w, h, morph)}
      width={width}
      height="auto"
      padding={space.xl}
      slots={{
        content: {
          type: "region",
          x: space.xl,
          y: space.xl,
          width: width - space.xl * 2,
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
      <Frame.Slot name="content">
        <Flow gap={space.md}>
          <Text {...type.title} maxWidth="100%" fill={titleFill}>
            {title}
          </Text>
          <Text {...type.body} maxWidth="100%" fill={bodyFill}>
            {body}
          </Text>
          {actionLabel ? (
            <Button onClick={onAction} fill={accent} color={accentInk}>
              {actionLabel}
            </Button>
          ) : null}
        </Flow>
      </Frame.Slot>
    </Frame>
  );
}
