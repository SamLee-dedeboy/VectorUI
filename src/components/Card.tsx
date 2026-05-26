import { useMemo, type ReactNode, type SVGProps } from "react";
import { Frame, type ShapeProp } from "./Frame";
import { Text } from "./Text";
import { tokens, type TextStyle } from "../tokens";

/**
 * Layer 3 — `Card`: a reusable shape-as-container with header / body / actions.
 *
 * The container's outline is **passed in as a `shape` prop** (any
 * `ShapeGenerator`), so the consumer chooses the geometry: a scooped card, a
 * blob, an arch, anything. Inside, slots auto-follow that boundary via the
 * `shape-fit` slot type:
 *  - **body** ("text" mode) — body paragraph reflows to the shape's interior
 *    contour line by line; no hand-wired intrusion.
 *  - **header** / **actions** ("safe" mode) — the title band and the action
 *    row collapse to the largest conservative inset rectangle inside the shape
 *    across their vertical bands, so a fixed-size title or button always fits.
 *
 * Card knows nothing about any specific shape family — pass `scoopCard(...).path`,
 * `tokens.shapes.blob`, or your own `(w,h) => "M…"` from the consumer.
 *
 * ```tsx
 * const shape = (w, h) => tokens.shapes.rectRounded(w, h, 24);
 * <Card shape={shape} title="…" body="…" actions={<Button>Save</Button>} />
 * ```
 */

const { space, color, type, filters } = tokens;

const DEFAULTS = {
  width: 340,
  padding: space.xl,
  titleHeight: 34,
  headerGap: space.sm,
  bodyPadding: space.md,
  actionsGap: space.md,
} as const;

export type CardProps = Omit<
  SVGProps<SVGGElement>,
  "width" | "height" | "fill" | "stroke" | "strokeWidth" | "children"
> & {
  /** The card's outline. A `ShapeGenerator` (`(w,h) => string`), or a
   *  `ShapeBundle` (`{ path, flowAround? }`) — when the bundle ships a
   *  `flowAround`, Card's body slot uses it directly and skips contour
   *  sampling, which is the only way to keep text wrap smooth on a
   *  shape that's animated every frame. */
  shape: ShapeProp;
  /** Card width, in layout units. Defaults to 340. */
  width?: number | "auto";
  /** Card height. Defaults to `"auto"` (shrink-wraps to header+body+actions). */
  height?: number | "auto";
  /** Title rendered in the header band. Omit for a card with no title. */
  title?: string;
  /** Body content. A string is rendered as a `Text` that auto-fits the shape's
   *  interior contour (via the slot's shape-fit). Pass a `ReactNode` for
   *  custom content — e.g. a `WrapText` with a `Float` that carves out an
   *  inner feature; the slot still publishes the contour flowAround, so any
   *  nested plain Text without its own `flowAround` picks it up. */
  body?: string | ReactNode;
  /** Optional rigid content (typically a button or button row). Sits in a
   *  conservative safe rectangle at the bottom of the card. */
  actions?: ReactNode;

  /** Inner padding around the content, layout units. */
  padding?: number;
  /** Title band height, layout units. */
  titleHeight?: number;
  /** Gap between the title band and the body. */
  headerGap?: number;
  /** Gap kept between the body text and the shape's contour. */
  bodyPadding?: number;
  /** Gap between the body and the actions row. */
  actionsGap?: number;

  surface?: string;
  titleFill?: string;
  bodyFill?: string;
  titleStyle?: TextStyle;
  bodyStyle?: TextStyle;
  filter?: string;
};

export function Card({
  shape,
  width = DEFAULTS.width,
  height = "auto",
  title,
  body,
  actions,
  padding = DEFAULTS.padding,
  titleHeight = DEFAULTS.titleHeight,
  headerGap = DEFAULTS.headerGap,
  bodyPadding = DEFAULTS.bodyPadding,
  actionsGap = DEFAULTS.actionsGap,
  surface = color.surface,
  titleFill = color.ink,
  bodyFill = color.inkMuted,
  titleStyle = type.title,
  bodyStyle = type.body,
  filter = filters.softShadow,
  ...gProps
}: CardProps) {
  // Memo the slots so Frame's downstream useMemos (which include `slots` in
  // their deps) stay stable across renders. A fresh slots literal each render
  // would cascade into shape-fit re-sampling — ~120ms × N settle frames =
  // hundreds of wasted ms on Cards with a sampled-contour shape.
  const hasHeader = !!title;
  const hasActions = !!actions;
  const slots = useMemo<Record<string, import("./Frame").SlotSpec>>(() => {
    const s: Record<string, import("./Frame").SlotSpec> = {
      body: {
        type: "shape-fit",
        mode: "text",
        y: hasHeader
          ? { after: "header", gap: headerGap }
          : padding,
        height: "content",
        padding: bodyPadding,
      },
    };
    if (hasHeader) {
      s.header = {
        type: "shape-fit",
        mode: "safe",
        y: padding,
        height: titleHeight,
      };
    }
    if (hasActions) {
      s.actions = {
        type: "shape-fit",
        mode: "safe",
        y: { after: "body", gap: actionsGap },
        height: "content",
      };
    }
    return s;
  }, [
    hasHeader,
    hasActions,
    padding,
    headerGap,
    actionsGap,
    bodyPadding,
    titleHeight,
  ]);

  return (
    <Frame
      shape={shape}
      width={width}
      height={height}
      padding={padding}
      slots={slots}
      fill={surface}
      filter={filter}
      title={title}
      role="region"
      {...gProps}
    >
      {title ? (
        <Frame.Slot name="header">
          <Text {...titleStyle} maxWidth="100%" fill={titleFill}>
            {title}
          </Text>
        </Frame.Slot>
      ) : null}
      {body ? (
        <Frame.Slot name="body">
          {typeof body === "string" ? (
            <Text {...bodyStyle} maxWidth="100%" fill={bodyFill}>
              {body}
            </Text>
          ) : (
            body
          )}
        </Frame.Slot>
      ) : null}
      {actions ? <Frame.Slot name="actions">{actions}</Frame.Slot> : null}
    </Frame>
  );
}
