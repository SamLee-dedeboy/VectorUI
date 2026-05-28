import type { SVGProps } from "react";
import type { CurvePoint } from "../layout/walkPath";
import { tokens } from "../tokens";

/**
 * Layer 3 — `ConstraintOverlay`: opt-in debug visualisation for design
 * surfaces. Draws alignment guides, gap brackets, and edge ticks on top of
 * a Frame while the user drags handles around. Pure SVG, no interaction —
 * the underlying handles still own the drag protocol; this is just
 * "show your work". Pointer events are disabled so it can never intercept
 * a drag.
 *
 * The primitives mirror what Demo 9 hand-rolled: a tick at an arbitrary
 * point, a vertical or horizontal alignment guide, and a measurement
 * bracket. Compose them into whatever picture the demo needs.
 */

const ACCENT = tokens.color.accent;
const DEFAULT_OPACITY = 0.5;
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, monospace';

// --- root ----------------------------------------------------------------

export type ConstraintOverlayProps = Omit<
  SVGProps<SVGGElement>,
  "color"
> & {
  /** Overall stroke/text opacity. Default 0.5. */
  opacity?: number;
  /** Stroke + text color. Defaults to the token accent. */
  color?: string;
};

export function ConstraintOverlay({
  opacity = DEFAULT_OPACITY,
  color = ACCENT,
  children,
  ...gProps
}: ConstraintOverlayProps) {
  return (
    <g
      {...gProps}
      style={{
        pointerEvents: "none",
        color,
        opacity,
        ...(gProps.style ?? {}),
      }}
      aria-hidden
    >
      {children}
    </g>
  );
}

// --- primitives ----------------------------------------------------------

export type EdgeTickProps = {
  /** Tick anchor point. */
  at: CurvePoint;
  /** "vertical" draws an up/down tick; "horizontal" draws a side tick. */
  orient?: "vertical" | "horizontal";
  /** Length of the tick, in layout units. Default 4. */
  length?: number;
  /** Optional label drawn just past the tick. */
  label?: string;
};

/**
 * A short tick mark at a point, optionally labelled. Used in Demo 9 to show
 * the card's auto-growing right edge.
 */
export function EdgeTick({
  at,
  orient = "vertical",
  length = 4,
  label,
}: EdgeTickProps) {
  const x1 = orient === "vertical" ? at.x : at.x - length;
  const x2 = orient === "vertical" ? at.x : at.x + length;
  const y1 = orient === "vertical" ? at.y - length : at.y;
  const y2 = orient === "vertical" ? at.y + length : at.y;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {label !== undefined && (
        <text
          x={orient === "vertical" ? at.x - 2 : at.x + length + 4}
          y={orient === "vertical" ? at.y - length - 2 : at.y}
          fontFamily={MONO_FONT}
          fontSize={9}
          fill="currentColor"
          textAnchor={orient === "vertical" ? "end" : "start"}
          dominantBaseline={orient === "vertical" ? "auto" : "central"}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export type AlignGuideProps = {
  /** Both points the guide spans between. */
  from: CurvePoint;
  to: CurvePoint;
  /** Tiny inline label, e.g. "x" or "y". */
  label?: string;
};

/** A dashed line between two points — visualises an equality constraint. */
export function AlignGuide({ from, to, label }: AlignGuideProps) {
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {label !== undefined && (
        <text
          x={(from.x + to.x) / 2 - 6}
          y={(from.y + to.y) / 2}
          fontFamily={MONO_FONT}
          fontSize={9}
          fill="currentColor"
          textAnchor="end"
          dominantBaseline="central"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export type GapBracketProps = {
  /** X of the bracket's vertical stem. */
  x: number;
  /** Top edge being measured from. */
  top: number;
  /** Bottom edge being measured to. */
  bottom: number;
  /** Optional label drawn beside the bracket. */
  label?: string;
  /** Length of the tick crossbars. Default 4. */
  tickLength?: number;
};

/**
 * A measurement bracket between two horizontal edges — two ticks plus the
 * vertical stem between them, with an optional inline label.
 */
export function GapBracket({
  x,
  top,
  bottom,
  label,
  tickLength = 4,
}: GapBracketProps) {
  return (
    <g stroke="currentColor" strokeWidth={1} fill="none">
      <line x1={x - tickLength} y1={top} x2={x + tickLength} y2={top} />
      <line x1={x - tickLength} y1={bottom} x2={x + tickLength} y2={bottom} />
      <line x1={x} y1={top} x2={x} y2={bottom} />
      {label !== undefined && (
        <text
          x={x + tickLength + 2}
          y={(top + bottom) / 2}
          fontFamily={MONO_FONT}
          fontSize={9}
          fill="currentColor"
          dominantBaseline="central"
          stroke="none"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export type RectOutlineProps = {
  rect: { left: number; top: number; right: number; bottom: number };
  /** Outline padding around the rect. Default 3. */
  inset?: number;
  /** Corner radius. Default 3. */
  radius?: number;
  /** Optional label drawn above the rect. */
  label?: string;
};

/** A dashed rectangle outline — useful for marking a wrap target. */
export function RectOutline({
  rect,
  inset = 3,
  radius = 3,
  label,
}: RectOutlineProps) {
  const x = rect.left - inset;
  const y = rect.top - inset;
  const w = rect.right - rect.left + inset * 2;
  const h = rect.bottom - rect.top + inset * 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeDasharray="3 3"
        rx={radius}
      />
      {label !== undefined && (
        <text
          x={x}
          y={y - 3}
          fontFamily={MONO_FONT}
          fontSize={9}
          fill="currentColor"
        >
          {label}
        </text>
      )}
    </g>
  );
}
