import type { SVGProps, ReactNode } from "react";

/**
 * Layer 1 render primitive: a thin, semantic wrapper over `<g>`.
 *
 * Carries no layout logic. It exists so that higher layers have a single,
 * named place to forward ARIA / event props to a group element, and so the
 * emitted SVG reads cleanly.
 */
export type GroupProps = SVGProps<SVGGElement> & {
  children?: ReactNode;
};

export function Group({ children, ...rest }: GroupProps) {
  return <g {...rest}>{children}</g>;
}
