import { useMemo, useState } from "react";
import { Frame } from "../../components/Frame";
import { Text, type FlowAround } from "../../components/Text";
import { tokens } from "../../tokens";
import { Button } from "./Button";
import { scoopCard } from "../../shapes";
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
 *
 * Every dimension has a sensible default but is now a prop — the card is a
 * generator, not a fixed shape: tune `titleHeight`, `scoopHeight`, the hover
 * gain, etc. without forking.
 */

const { space, color, type, filters } = tokens;

const DEFAULTS = {
  width: 340,
  scoopDepth: 84,
  /** Padding around the card's content, layout units. */
  padding: space.xl,
  /** Title-band height in layout units. */
  titleHeight: 34,
  /** Gap between the title band and the body, layout units. */
  headerGap: space.sm,
  /** Y of the scoop band, relative to the body's top edge. */
  scoopTopOffset: 6,
  /** Vertical extent of the scoop band, layout units. */
  scoopHeight: 150,
  /** Underlying rounded-rect corner radius. */
  cornerRadius: 22,
  /** Hover-tween multiplier on `scoopDepth`. 0.42 = deepens by ~42%. */
  hoverDepthGain: 0.42,
  /** Peak hand-drawn wobble amplitude at full hover, layout units. */
  hoverWobblePeak: 5,
  /** Gap between text and the scoop's edge, layout units. */
  flowGap: space.md,
} as const;

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

  // --- generator knobs (defaults preserve the Demo 2 look) ---
  padding?: number;
  titleHeight?: number;
  headerGap?: number;
  /** Y of the scoop band, relative to the body slot's top edge. */
  scoopTopOffset?: number;
  scoopHeight?: number;
  cornerRadius?: number;
  /** Hover deepens the scoop by `scoopDepth * (1 + morph * hoverDepthGain)`. */
  hoverDepthGain?: number;
  /** Peak hand-drawn wobble amplitude at full hover. */
  hoverWobblePeak?: number;
  /** Gap between text and the scoop's edge, layout units. */
  flowGap?: number;
};

export function Card({
  width = DEFAULTS.width,
  title,
  body,
  scoopDepth = DEFAULTS.scoopDepth,
  actionLabel,
  onAction,
  surface = color.surface,
  titleFill = color.ink,
  bodyFill = color.inkMuted,
  accent = color.accent,
  accentInk = color.accentInk,
  padding = DEFAULTS.padding,
  titleHeight = DEFAULTS.titleHeight,
  headerGap = DEFAULTS.headerGap,
  scoopTopOffset = DEFAULTS.scoopTopOffset,
  scoopHeight = DEFAULTS.scoopHeight,
  cornerRadius = DEFAULTS.cornerRadius,
  hoverDepthGain = DEFAULTS.hoverDepthGain,
  hoverWobblePeak = DEFAULTS.hoverWobblePeak,
  flowGap = DEFAULTS.flowGap,
}: CardProps) {
  const [hovered, setHovered] = useState(false);
  // 0 → 1 on hover. The scoop deepens AND the four edges grow a hand-drawn
  // wobble, so the body text re-wraps as the contour tweens.
  const morph = useTween(hovered ? 1 : 0);
  const depth = scoopDepth * (1 + morph * hoverDepthGain);
  const wobble = morph * hoverWobblePeak;

  const contentW = width - padding * 2;
  // The body slot stacks below the title band; the scoop tracks it.
  const bodyTop = padding + titleHeight + headerGap;
  const scoopTop = bodyTop + scoopTopOffset;

  const card = useMemo(
    () =>
      scoopCard({
        cornerRadius,
        scoopTop,
        scoopHeight,
        depth,
        wobble,
      }),
    [cornerRadius, scoopTop, scoopHeight, depth, wobble],
  );
  // The body column's top-left is a known point in card space (`padding`,
  // `bodyTop`), so the scoop's intrusion is exact — no guessed offset.
  const flowAround = useMemo<FlowAround>(
    () => ({ intrusionAt: card.intrusionInto(padding, bodyTop), gap: flowGap }),
    [card, padding, bodyTop, flowGap],
  );

  return (
    <Frame
      shape={card.path}
      width={width}
      height="auto"
      padding={padding}
      slots={{
        header: {
          type: "region",
          x: padding,
          y: padding,
          width: contentW,
          height: titleHeight,
        },
        body: {
          type: "region",
          x: padding,
          y: { after: "header", gap: headerGap },
          width: contentW,
          height: "content",
        },
        actions: {
          type: "region",
          x: padding,
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
