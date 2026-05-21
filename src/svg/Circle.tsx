import type { SVGProps } from "react";

/**
 * Layer 1 render primitive: a thin wrapper over `<circle>`.
 *
 * VectorUI's shape vocabulary is path-first, but a plain disc — a badge, a
 * status dot, an avatar mask, the centre of a radial menu — is common enough
 * that hand-rolling `M r 0 A r r 0 1 1 -r 0 …` arcs (as consumer code kept
 * doing) is pure friction. `r` and the centre are in layout units, like every
 * other geometric prop; `cx`/`cy` default to 0 so the circle is centred on its
 * own origin — handy when a parent (PathFlow, an anchor slot) places that
 * origin on a point.
 *
 * Decorative by default — screen readers skip ornamental geometry; pass a
 * `role` or `aria-hidden={false}` to opt back in.
 */
export type CircleProps = Omit<SVGProps<SVGCircleElement>, "r"> & {
  /** Radius, in layout units. */
  r: number;
  /** Centre x/y, in layout units. Default 0, 0. */
  cx?: number;
  cy?: number;
  /** Decorative by default. */
  decorative?: boolean;
};

export function Circle({
  r,
  cx = 0,
  cy = 0,
  decorative = true,
  ...rest
}: CircleProps) {
  const ariaHidden =
    rest["aria-hidden"] ?? (decorative && rest.role == null ? true : undefined);
  return <circle cx={cx} cy={cy} r={r} {...rest} aria-hidden={ariaHidden} />;
}
