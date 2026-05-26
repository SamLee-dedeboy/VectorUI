import type { ReactNode, SVGProps } from "react";
import { Frame, type ShapeGenerator } from "./Frame";
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
  /** The card's outline. Any `ShapeGenerator`. */
  shape: ShapeGenerator;
  /** Card width, in layout units. Defaults to 340. */
  width?: number | "auto";
  /** Card height. Defaults to `"auto"` (shrink-wraps to header+body+actions). */
  height?: number | "auto";
  /** Title rendered in the header band. Omit for a card with no title. */
  title?: string;
  /** Body paragraph — flows around the shape's interior contour. */
  body?: string;
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
  const slots: Record<string, import("./Frame").SlotSpec> = {
    body: {
      type: "shape-fit",
      mode: "text",
      y: title
        ? { after: "header", gap: headerGap }
        : padding,
      height: "content",
      padding: bodyPadding,
    },
  };
  if (title) {
    slots.header = {
      type: "shape-fit",
      mode: "safe",
      y: padding,
      height: titleHeight,
    };
  }
  if (actions) {
    slots.actions = {
      type: "shape-fit",
      mode: "safe",
      y: { after: "body", gap: actionsGap },
      height: "content",
    };
  }

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
          <Text {...bodyStyle} maxWidth="100%" fill={bodyFill}>
            {body}
          </Text>
        </Frame.Slot>
      ) : null}
      {actions ? <Frame.Slot name="actions">{actions}</Frame.Slot> : null}
    </Frame>
  );
}
