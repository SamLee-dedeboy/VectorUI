import { useState, type ReactNode } from "react";
import {
  useMeasuredBounds,
  type Bounds,
  boundsEqual,
} from "../../layout/measureBounds";

/**
 * Debug overlays for the layout playground.
 *
 * Everything in this file is gated by the `enabled` prop so the production
 * scene pays no cost when inspect mode is off.
 *
 * Conventions:
 *  - dashed outlines mean "measured rendered extent"
 *  - solid thin outlines mean "specified layout box"
 *  - mint stroke = slots and Frame, cyan stroke = curves, magenta = intrusion
 *
 * Coordinates are always in the parent group's user space — the consumer
 * places this overlay inside the same `<g>` whose geometry it annotates.
 */

const COLORS = {
  slot: "#34d399",
  frame: "#a3e635",
  curve: "#22d3ee",
  intrusion: "#f472b6",
  text: "#cbd5e1",
} as const;

const DASH = "4 4";

/* -------------------------------------------------------------------------- */

export type InspectMarkProps = {
  /** Short label drawn at the box's top-left when enabled. */
  label: string;
  /** When false, children render with no overlay (zero runtime cost). */
  enabled: boolean;
  /** Stroke color for the outline; defaults to slot mint. */
  color?: string;
  children: ReactNode;
};

/**
 * Wraps children in a `<g>`, measures its rendered bounds, and (when enabled)
 * draws a dashed outline + label on top — so the user can see exactly what
 * geometry the slot's content actually occupies.
 *
 * Cheap when disabled: the measurement hook is unconditional but its only
 * side-effect is `setBounds`, which never triggers a re-render of consumers
 * because nothing reads `bounds` in that branch.
 */
export function InspectMark({
  label,
  enabled,
  color = COLORS.slot,
  children,
}: InspectMarkProps) {
  const [bounds, setBounds] = useState<Bounds | undefined>(undefined);
  const ref = useMeasuredBounds<SVGGElement>((b) => {
    setBounds((prev) => (boundsEqual(prev, b) ? prev : b));
  });

  return (
    <g>
      <g ref={ref}>{children}</g>
      {enabled && bounds && bounds.width > 0 && bounds.height > 0 ? (
        <g pointerEvents="none" aria-hidden="true">
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="none"
            stroke={color}
            strokeWidth={1}
            strokeDasharray={DASH}
            opacity={0.85}
          />
          <text
            x={bounds.x + 4}
            y={bounds.y + 12}
            fontFamily="ui-monospace, SFMono-Regular, monospace"
            fontSize={10}
            fill={color}
            opacity={0.95}
          >
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

/* -------------------------------------------------------------------------- */

export type FrameOutlineProps = {
  enabled: boolean;
  width: number;
  height: number;
};

/** Dashed outline of the whole Frame — coordinates are Frame-local (0,0). */
export function FrameOutline({ enabled, width, height }: FrameOutlineProps) {
  if (!enabled || width <= 0 || height <= 0) return null;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke={COLORS.frame}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        opacity={0.9}
      />
      <text
        x={6}
        y={height - 6}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize={11}
        fill={COLORS.frame}
        opacity={0.95}
      >
        {`Frame · onLayout → ${Math.round(width)} × ${Math.round(height)}`}
      </text>
    </g>
  );
}

/* -------------------------------------------------------------------------- */

export type CurveTraceProps = {
  enabled: boolean;
  /** Path data produced by `Curve.toPathData()`. */
  d: string;
  /** Optional caption (drawn at the path's start point, if provided). */
  label?: string;
  /** Origin for the label, in the same local coordinate space as `d`. */
  labelAnchor?: { x: number; y: number };
};

/** A dashed trace of the underlying curve a PathFlow distributes along. */
export function CurveTrace({
  enabled,
  d,
  label,
  labelAnchor,
}: CurveTraceProps) {
  if (!enabled) return null;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={COLORS.curve}
        strokeWidth={1}
        strokeDasharray={DASH}
        opacity={0.9}
      />
      {label && labelAnchor ? (
        <text
          x={labelAnchor.x + 4}
          y={labelAnchor.y - 4}
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          fontSize={10}
          fill={COLORS.curve}
          opacity={0.95}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

/* -------------------------------------------------------------------------- */

export type IntrusionTraceProps = {
  enabled: boolean;
  /** Accent path, in the body slot's local coordinate space. */
  d: string;
};

/** A stroked silhouette of the body's flowAround accent — shows what wraps. */
export function IntrusionTrace({ enabled, d }: IntrusionTraceProps) {
  if (!enabled) return null;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={COLORS.intrusion}
        strokeWidth={1.25}
        strokeDasharray="3 3"
        opacity={0.9}
      />
    </g>
  );
}

export const inspectColors = COLORS;
