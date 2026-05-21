import { useCallback, useState } from "react";
import { useBreakpoint, useViewportWidth } from "../../layout/breakpoints";
import { line, quadratic } from "../../layout/walkPath";
import { Frame, type SlotSpec } from "../../components/Frame";
import { Flow } from "../../components/Flow";
import { PathFlow } from "../../components/PathFlow";
import { Pill } from "../../components/Pill";
import { Text } from "../../components/Text";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";
import { accent } from "../../shapes";
import { bodyCopy, type PlaygroundState } from "./state";
import {
  CurveTrace,
  FrameOutline,
  InspectMark,
  IntrusionTrace,
} from "./InspectOverlay";

/**
 * The composed scene the playground knobs drive.
 *
 * One Frame, five region slots (`header → divider → body → tagRail → footer`),
 * one anchor slot (`badge`). Every primitive on the layout layer is exercised:
 *
 *  - PathFlow on a `quadratic` arch — the header tabs.
 *  - PathFlow on a `line` — the tag rail (with all four `distribute` modes
 *    selectable, and a non-zero perpendicular `align`).
 *  - Text with `flowAround` an accent shape — the body paragraph.
 *  - Flow `direction="row"`/`"column"` with `align="end"` — the footer; the
 *    direction is keyed off the panel's *own* width via `useBreakpoint`. In
 *    row mode the Flow's main-axis position is `x = innerW - flowWidth`, so
 *    the actions right-align like a CSS `justify-content: flex-end`.
 *  - Frame `height="auto"` with stacked `{ after }` region slots — every input
 *    can change the Frame's resolved height.
 *  - Anchor slot pinned to top-right with a negative `x` — the breakpoint
 *    badge, sized by `useNaturalTextWidth` (inside `Pill`).
 *
 * The `InspectOverlay` exports gate themselves on `state.inspect`; nothing
 * else changes when inspect is off.
 */

const PAD = tokens.space.lg;
const HEADER_H = 56;
const TAG_RAIL_H = 40;
const FOOTER_PILL_H = 28;
const BADGE_H = 22;

/** Tag-rail pill height + the perpendicular offset PathFlow applies to
 *  each pill below the rail line. Kept here so the rail-line position math
 *  (`tagLineY`) can be derived rather than fudged. */
const TAG_PILL_HEIGHT = 22;
const TAG_PILL_ALIGN = 3;
/** Optical centring bias — a one-unit nudge so the label's cap-height
 *  weight (not its geometric centre) lands on the rail line. */
const TAG_RAIL_OPTICAL_BIAS = 1;

/** Horizontal reservation on the right side of the header arch so the
 *  rightmost tab doesn't sit underneath the top-right badge. */
const BADGE_RESERVE_WIDE = 110;
const BADGE_RESERVE_NARROW = 60;

/** Padded breakpoint for the panel's own width — drives the footer direction. */
const PANEL_BREAKPOINTS = { narrow: 0, wide: 460 };

const TAB_LABELS = [
  "Inbox",
  "Library",
  "People",
  "Stats",
  "Help",
  "About",
] as const;

const TAG_LABELS = [
  "alpha",
  "beta",
  "ship-it",
  "ux",
  "perf",
  "a11y",
  "draft",
  "review",
  "frame",
  "flow",
] as const;

const FOOTER_LABELS = ["Save", "Discard", "Preview", "Reset"] as const;

export type FrameLayoutSize = { width: number; height: number };

export type PlaygroundProps = {
  state: PlaygroundState;
  /**
   * Forwards the Frame's resolved size up to the demo's owner. Lifting this
   * state out of `Playground` is the critical bit: the Root above the Frame
   * needs to re-render after the Frame's height settles, otherwise
   * `useFitToContent` keeps the old `viewBox` height (a stale settle). See
   * docs/guide.md §13 on the one-frame settle.
   */
  onFrameLayout?: (size: FrameLayoutSize) => void;
};

export function Playground({ state, onFrameLayout }: PlaygroundProps) {
  // useViewportWidth() reports the Root's *own* pixel width via the existing
  // ResizeObserver. The Root is mounted with width="auto" so scale === 1 and
  // viewBoxWidth tracks the pixel width — the container-query mechanic.
  const W = Math.max(280, useViewportWidth());
  const breakpoint = useBreakpoint(PANEL_BREAKPOINTS);
  const isNarrow = breakpoint === "narrow";

  // Local copy of the Frame size, used by the inspect overlay's caption. The
  // same value is forwarded to the demo via `onFrameLayout` so the Root
  // above re-renders and `useFitToContent` resettles cleanly.
  const [frameSize, setFrameSize] = useState({ width: W, height: 0 });
  const [footerFlowSize, setFooterFlowSize] = useState({ width: 0, height: 0 });

  const innerW = Math.max(120, W - 2 * PAD);
  const accentShape = accent({ size: Math.min(92, innerW * 0.34) });

  // Header arch — a gentle (low-bulge) quadratic. The right endpoint stops
  // short of the slot edge to reserve room for the top-right badge, so the
  // rightmost tab never tucks under it. When the badge is toggled off the
  // arch reclaims that space and tabs span the full slot width.
  const archRightInset = !state.showBadge
    ? 8
    : isNarrow
      ? BADGE_RESERVE_NARROW
      : BADGE_RESERVE_WIDE;
  const archStartX = 8;
  const archEndX = Math.max(archStartX + 80, innerW - archRightInset);
  const archCurve = quadratic({
    p0: { x: archStartX, y: HEADER_H - 18 },
    control: { x: (archStartX + archEndX) / 2, y: HEADER_H - 38 },
    p1: { x: archEndX, y: HEADER_H - 18 },
  });

  // Tag rail — a straight line spanning the slot's interior. The pills
  // ride this line via PathFlow `align={TAG_PILL_ALIGN}` (origin="center",
  // so their geometric centre lands ALIGN units below the line). The line
  // itself sits at the rail's vertical centre minus that offset, with a
  // tiny `TAG_RAIL_OPTICAL_BIAS` nudge upward so the label's cap-height
  // weight — not its geometric centre — sits on the rail line. Drop the
  // bias to 0 and the pills look 1–2 px low even though they're
  // arithmetically centered.
  const tagLineY =
    TAG_RAIL_H / 2 - TAG_PILL_ALIGN + TAG_RAIL_OPTICAL_BIAS;
  const tagCurve = line({
    x1: 6,
    y1: tagLineY,
    x2: innerW - 6,
    y2: tagLineY,
  });

  // Footer x — in row mode, push the Flow to the right edge of the slot so
  // the actions justify-end. In column mode, x=0 (Flow's own align="end"
  // right-justifies the column items via cross-axis alignment).
  const footerX = isNarrow
    ? 0
    : Math.max(0, innerW - footerFlowSize.width);

  // Slot definitions — five regions stacked by `{ after }`, one anchor.
  const slots: Record<string, SlotSpec> = {
    header: {
      type: "region",
      x: PAD,
      y: PAD,
      width: innerW,
      height: HEADER_H,
    },
    divider: {
      type: "region",
      x: PAD,
      y: { after: "header", gap: tokens.space.md },
      width: innerW,
      height: 1,
    },
    body: {
      type: "region",
      x: PAD,
      y: { after: "divider", gap: tokens.space.lg },
      width: innerW,
      height: "content",
    },
    tagRail: {
      type: "region",
      x: PAD,
      y: { after: "body", gap: tokens.space.lg },
      width: innerW,
      height: TAG_RAIL_H,
    },
    footer: {
      type: "region",
      x: PAD,
      y: { after: "tagRail", gap: tokens.space.md },
      width: innerW,
      height: "content",
    },
    badge: {
      type: "anchor",
      x: -PAD,
      y: PAD,
      align: "top-right",
    },
  };

  const tabs = TAB_LABELS.slice(0, state.tabCount);
  const tags = TAG_LABELS.slice(0, state.tagCount);
  const footerActions = FOOTER_LABELS.slice(0, state.footerCount);

  // Stable identity so Frame's `useEffect` (deps include `onLayout`) doesn't
  // re-fire on every render — that would form a setState loop with the
  // size-forwarding above.
  const handleFrameLayout = useCallback(
    (size: FrameLayoutSize) => {
      setFrameSize((prev) =>
        prev.width === size.width && prev.height === size.height ? prev : size,
      );
      onFrameLayout?.(size);
    },
    [onFrameLayout],
  );

  return (
    <Frame
      shape={tokens.shapes.rectRounded}
      width={W}
      height="auto"
      padding={PAD}
      slots={slots}
      fill={tokens.color.surface}
      filter={tokens.filters.softShadow}
      onLayout={handleFrameLayout}
      title="Layout playground"
    >
      {/* HEADER — PathFlow on a quadratic arch. */}
      <Frame.Slot name="header">
        <InspectMark label="slot: header" enabled={state.inspect}>
          <g>
            <PathFlow
              curve={archCurve}
              distribute="even"
              orient="upright"
            >
              {tabs.map((label) => (
                <Pill
                  key={label}
                  textStyle={tokens.type.label}
                  height={FOOTER_PILL_H}
                  origin="center"
                  fill={tokens.color.accentSoft}
                  textFill={tokens.color.accent}
                  paddingX={12}
                >
                  {label}
                </Pill>
              ))}
            </PathFlow>
            <CurveTrace
              enabled={state.inspect}
              d={archCurve.toPathData()}
              label='quadratic() · distribute="even"'
              labelAnchor={{ x: archStartX, y: HEADER_H - 38 }}
            />
          </g>
        </InspectMark>
      </Frame.Slot>

      {/* DIVIDER — a fixed 1-unit-high region with a thin rule. */}
      <Frame.Slot name="divider">
        <InspectMark label="slot: divider" enabled={state.inspect}>
          <Path
            d={`M 0 0.5 L ${innerW} 0.5`}
            stroke={tokens.color.line}
            strokeWidth={1}
            fill="none"
          />
        </InspectMark>
      </Frame.Slot>

      {/* BODY — Text wraps the accent's silhouette; slot is height="content". */}
      <Frame.Slot name="body">
        <InspectMark label="slot: body (content)" enabled={state.inspect}>
          <g>
            <Path d={accentShape.path} fill={tokens.color.accentSoft} />
            <IntrusionTrace enabled={state.inspect} d={accentShape.path} />
            <Text
              {...tokens.type.body}
              maxWidth="100%"
              flowAround={{
                intrusionAt: accentShape.intrusionAt,
                gap: 14,
              }}
              fill={tokens.color.ink}
            >
              {bodyCopy[state.bodyLength]}
            </Text>
          </g>
        </InspectMark>
      </Frame.Slot>

      {/* TAG RAIL — PathFlow on a line; distribute mode comes from state. */}
      <Frame.Slot name="tagRail">
        <InspectMark label="slot: tagRail" enabled={state.inspect}>
          <g>
            <CurveTrace
              enabled={state.inspect}
              d={tagCurve.toPathData()}
              label={`line() · distribute="${state.tagDistribute}"`}
              labelAnchor={{ x: 0, y: tagLineY }}
            />
            <PathFlow
              curve={tagCurve}
              distribute={state.tagDistribute}
              gap={tokens.space.sm}
              orient="upright"
              align={TAG_PILL_ALIGN}
            >
              {tags.map((label) => (
                <Pill
                  key={label}
                  textStyle={tokens.type.caption}
                  height={TAG_PILL_HEIGHT}
                  origin="center"
                  fill={tokens.color.surfaceMuted}
                  textFill={tokens.color.inkMuted}
                  paddingX={10}
                >
                  {label}
                </Pill>
              ))}
            </PathFlow>
          </g>
        </InspectMark>
      </Frame.Slot>

      {/* FOOTER — Flow that pivots column/row by the panel's own breakpoint. */}
      <Frame.Slot name="footer">
        <InspectMark label="slot: footer (content)" enabled={state.inspect}>
          <Flow
            x={footerX}
            direction={isNarrow ? "column" : "row"}
            gap={tokens.space.sm}
            align="end"
            // crossSize fills the slot in column mode so `align="end"` pushes
            // each pill to the slot's right edge; in row mode the cross axis
            // is vertical and we pin it to the pill height so items
            // bottom-align cleanly.
            crossSize={isNarrow ? innerW : FOOTER_PILL_H}
            onMeasure={setFooterFlowSize}
          >
            {footerActions.map((label, i) => (
              <Pill
                key={label}
                textStyle={tokens.type.label}
                height={FOOTER_PILL_H}
                fill={i === 0 ? tokens.color.accent : tokens.color.surfaceMuted}
                textFill={
                  i === 0 ? tokens.color.accentInk : tokens.color.ink
                }
                paddingX={14}
              >
                {label}
              </Pill>
            ))}
          </Flow>
        </InspectMark>
      </Frame.Slot>

      {/* BADGE — anchor slot pinned to top-right; label reflects live state.
          Shortened at narrow widths — `useNaturalTextWidth` (inside Pill)
          resizes the pill to whichever string is current. Toggled via the
          `show badge` control: hiding it lets the header arch span the full
          slot width. */}
      {state.showBadge ? (
        <Frame.Slot name="badge">
          <Pill
            textStyle={tokens.type.label}
            height={BADGE_H}
            paddingX={10}
            fill={tokens.color.surfaceMuted}
            textFill={tokens.color.inkMuted}
          >
            {isNarrow ? breakpoint : `${breakpoint} · ${Math.round(W)}px`}
          </Pill>
        </Frame.Slot>
      ) : null}

      {/* Frame-level overlay — rendered in the Frame's own coordinate space. */}
      <FrameOutline
        enabled={state.inspect}
        width={frameSize.width}
        height={frameSize.height}
      />
    </Frame>
  );
}
