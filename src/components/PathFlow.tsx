import {
  Children,
  isValidElement,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  distributeAlong,
  type Curve,
  type CurveFactory,
  type Distribute,
} from "../layout/walkPath";
import { useChildBounds } from "../layout/childBounds";

/**
 * Layer 3 — `PathFlow`: distribute children along a curve (SPEC §6.2).
 *
 * Each child is measured, placed at its arc-length offset along the curve, and
 * optionally rotated to the tangent. A straight `line()` curve with
 * `distribute="start"` reduces to a flex row — flex is the degenerate case.
 *
 * The curve may be **fixed** (a `Curve`) or **content-sized** (a
 * `CurveFactory` from `fitLine`/`fitArc`). With a factory, PathFlow sums the
 * measured child widths + gaps + padding and realizes a curve that exactly
 * fits — so a valid spec can't make items overlap (the curve analogue of
 * `Frame width="auto"`). With a fixed curve, packing can overflow; PathFlow
 * warns in dev when it does.
 */
export type PathFlowProps = Omit<SVGProps<SVGGElement>, "children"> & {
  /** Fixed curve, or a factory (`fitLine`/`fitArc`) that sizes to content. */
  curve: Curve | CurveFactory;
  /** How children are spaced along the curve. Defaults to `"start"` for a
   *  content-sized curve (packs flush), `"even"` for a fixed curve. */
  distribute?: Distribute;
  /** Gap between children, layout units — used by "start"/"end". */
  gap?: number;
  /** Inset before the first / after the last item for a content-sized curve,
   *  layout units. Ignored for a fixed curve. */
  padding?: number;
  /** "along" rotates each child to the tangent; "upright" leaves it unrotated. */
  orient?: "along" | "upright";
  /** Perpendicular offset from the curve, layout units (0 = centered on it). */
  align?: number;
  children: ReactNode;
};

export function PathFlow({
  curve,
  distribute,
  gap = 0,
  padding = 0,
  orient = "along",
  align = 0,
  children,
  ...gProps
}: PathFlowProps) {
  const items = Children.toArray(children).filter(isValidElement);

  // Rendered bounds per child (shared measurement core). Width-aware modes
  // ("start"/"end"/"spread") and content-sized curves consume the widths;
  // "even" ignores them.
  const { bounds, Measured } = useChildBounds();
  const itemWidths = items.map((_, i) => bounds[i]?.width ?? 0);

  const isFactory = typeof curve === "function";
  const dist: Distribute = distribute ?? (isFactory ? "start" : "even");

  let resolved: Curve;
  let padStart = 0;
  if (isFactory) {
    // content = Σwidths + gaps; curve length leaves `padding` at each end.
    const content =
      itemWidths.reduce((a, b) => a + b, 0) +
      gap * Math.max(0, items.length - 1);
    resolved = curve(content + padding * 2);
    padStart = padding;
  } else {
    resolved = curve;
    // Dev nicety: a fixed curve too short for its content overflows silently.
    if (import.meta.env?.DEV) {
      const need =
        itemWidths.reduce((a, b) => a + b, 0) +
        gap * Math.max(0, items.length - 1);
      if (need > resolved.length + 0.5) {
        console.warn(
          `[PathFlow] content (${need.toFixed(0)} layout units) exceeds the ` +
            `curve length (${resolved.length.toFixed(0)}); items will overlap. ` +
            `Use a fitLine/fitArc factory, a longer curve, or fewer items.`,
        );
      }
    }
  }

  const offsets = distributeAlong(resolved.length, items.length, {
    distribute: dist,
    gap,
    itemWidths,
    padStart,
  });

  return (
    <g {...gProps}>
      {items.map((child, i) => {
        const s = offsets[i] ?? 0;
        const point = resolved.pointAtLength(s);
        const tangent = resolved.tangentAtLength(s);
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
