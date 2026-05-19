import {
  Children,
  isValidElement,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  distributeAlong,
  type Curve,
  type Distribute,
} from "../layout/walkPath";
import { useChildBounds } from "../layout/childBounds";

/**
 * Layer 3 — `PathFlow`: distribute children along a curve (SPEC §6.2).
 *
 * Each child is measured, placed at its arc-length offset along the curve, and
 * optionally rotated to the tangent. A straight `line()` curve with
 * `distribute="start"` reduces to a flex row — flex is the degenerate case.
 */
export type PathFlowProps = Omit<SVGProps<SVGGElement>, "children"> & {
  /** The curve children are laid out along. */
  curve: Curve;
  /** How children are spaced along the curve. */
  distribute?: Distribute;
  /** Gap between children, layout units — used by "start"/"end". */
  gap?: number;
  /** "along" rotates each child to the tangent; "upright" leaves it unrotated. */
  orient?: "along" | "upright";
  /** Perpendicular offset from the curve, layout units (0 = centered on it). */
  align?: number;
  children: ReactNode;
};

export function PathFlow({
  curve,
  distribute = "even",
  gap = 0,
  orient = "along",
  align = 0,
  children,
  ...gProps
}: PathFlowProps) {
  const items = Children.toArray(children).filter(isValidElement);

  // Rendered bounds per child (shared measurement core). Only "start"/"end"/
  // "spread" consume the widths; "even" ignores them.
  const { bounds, Measured } = useChildBounds();
  const itemWidths = items.map((_, i) => bounds[i]?.width ?? 0);
  const offsets = distributeAlong(curve.length, items.length, {
    distribute,
    gap,
    itemWidths,
  });

  return (
    <g {...gProps}>
      {items.map((child, i) => {
        const s = offsets[i] ?? 0;
        const point = curve.pointAtLength(s);
        const tangent = curve.tangentAtLength(s);
        // Offset perpendicular to the direction of travel.
        const nx = Math.cos(tangent + Math.PI / 2);
        const ny = Math.sin(tangent + Math.PI / 2);
        const x = point.x + nx * align;
        const y = point.y + ny * align;
        const angleDeg = orient === "along" ? (tangent * 180) / Math.PI : 0;

        return (
          <g
            key={i}
            transform={`translate(${x} ${y}) rotate(${angleDeg})`}
          >
            <Measured index={i}>{child}</Measured>
          </g>
        );
      })}
    </g>
  );
}
