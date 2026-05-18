import type { SVGProps } from "react";

/**
 * Layer 1 render primitive: a thin wrapper over `<path>`.
 *
 * Accepts a `d` string (path generators return strings — see SPEC §15) and
 * forwards everything else. Decorative paths default to `aria-hidden`; pass
 * `aria-hidden={false}` (or a `role`) to opt back in.
 */
export type PathProps = SVGProps<SVGPathElement> & {
  d: string;
  /** Decorative by default — screen readers skip ornamental geometry. */
  decorative?: boolean;
};

export function Path({ decorative = true, d, ...rest }: PathProps) {
  const ariaHidden =
    rest["aria-hidden"] ?? (decorative && rest.role == null ? true : undefined);
  return <path d={d} {...rest} aria-hidden={ariaHidden} />;
}
