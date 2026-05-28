/**
 * Shared state shape for the layout playground.
 *
 * Lives in its own file so `demo.tsx` (owner) and `Controls.tsx` (presenter)
 * agree on the type and the option sets without circular imports.
 */

export type Distribute = "even" | "start" | "end" | "spread";
export type BodyLength = "short" | "medium" | "long";

export type PlaygroundState = {
  /** Outer wrapper width in CSS pixels — drives container-query semantics. */
  containerPx: number;
  /** Number of tab pills along the header arch. */
  tabCount: number;
  /** Number of tag pills along the tag rail line. */
  tagCount: number;
  /** `distributeAlong` strategy used by the tag rail. */
  tagDistribute: Distribute;
  /** Body paragraph length — drives the Frame's shrink-wrap. */
  bodyLength: BodyLength;
  /** Number of items in the footer Flow. */
  footerCount: number;
  /** Whether the top-right badge anchor slot is rendered. */
  showBadge: boolean;
  /** Whether the debug overlay is visible. */
  inspect: boolean;
};

export const defaultState: PlaygroundState = {
  containerPx: 560,
  tabCount: 4,
  tagCount: 5,
  tagDistribute: "even",
  bodyLength: "medium",
  footerCount: 2,
  showBadge: true,
  inspect: false,
};

/** Range / option metadata so `Controls.tsx` and `demo.tsx` agree on bounds. */
export const limits = {
  containerPx: { min: 320, max: 960, step: 8 },
  tabCount: { min: 2, max: 6 },
  tagCount: { min: 0, max: 10 },
  footerCount: { min: 1, max: 4 },
} as const;

export const distributeOptions: Distribute[] = [
  "even",
  "start",
  "end",
  "spread",
];

export const bodyLengthOptions: BodyLength[] = ["short", "medium", "long"];

/** Body paragraph copy per length, picked at render time. */
export const bodyCopy: Record<BodyLength, string> = {
  short:
    "Layout primitives, composed live. Resize the panel and watch the shape reflow.",
  medium:
    "Every block on this surface is a layout primitive. Tabs distribute along a curve, the body wraps a floated accent, the tag rail packs along a line, and the footer reflows by measured bounds.",
  long:
    "Every block on this surface is a layout primitive. Tabs distribute along a curve, the body paragraph wraps a floated accent, the tag rail packs along a line, and the footer reflows by measured bounds. The outer Frame is height='auto': it derives its own height from the content of its stacked slots, then regenerates its path once everything has settled — so changing any input below the panel makes the whole shape grow or shrink to fit.",
};
