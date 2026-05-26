import {
  useCallback,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { Path } from "../svg/Path";
import { tokens } from "../tokens";

/**
 * Layer 3 — `VectorButton`: a path-as-button core component.
 *
 * The shape IS the button: the `shape` prop's `d` string is the outline, the
 * filled surface, AND the hit target — one path, no rectangular wrapper.
 * Children (icons, text, decorations) render on top so glyphs or labels ride
 * the shape. Keyboard activation (Enter/Space), focus, and hover are wired up
 * here once; consumers only supply callbacks.
 *
 * Like `Card`'s `shape` prop, VectorButton knows nothing about any specific
 * shape family: pass a hexagon, a cog, a leaf, a hand-drawn blob — anything
 * that fits in a `d` string — and you get the same button affordances.
 *
 * Presentational state (e.g. hover-fill, pressed-stroke) is left to the
 * consumer via `onHoverChange` or the `data-hovered` attribute — VectorButton
 * tracks hover but does not opine on how it looks.
 */
export type VectorButtonProps = Omit<
  SVGProps<SVGGElement>,
  "onClick" | "onMouseEnter" | "onMouseLeave"
> & {
  /** Path data — the button's outline AND its click target. */
  shape: string;
  /** Path fill. Defaults to `tokens.color.accent`. */
  fill?: string;
  /** Path stroke. */
  stroke?: string;
  /** Path stroke width, in layout units. */
  strokeWidth?: number;
  /** Path fill rule. */
  fillRule?: "nonzero" | "evenodd";
  /** Content rendered on top of the shape (icon, text, badges, …). */
  children?: ReactNode;
  /** Click handler — also fires on Enter/Space when the button is focused. */
  onClick?: (
    event: MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>,
  ) => void;
  /** Called whenever hover starts or ends (mouse / focus-within parity). */
  onHoverChange?: (hovered: boolean) => void;
  /** Disabled: no click, no keyboard activation, no hover state. */
  disabled?: boolean;
  /** Cursor style. Defaults to `"pointer"` (`"default"` when disabled). */
  cursor?: CSSProperties["cursor"];
};

export function VectorButton({
  shape,
  fill = tokens.color.accent,
  stroke,
  strokeWidth,
  fillRule,
  children,
  onClick,
  onHoverChange,
  disabled = false,
  cursor,
  role = "button",
  tabIndex,
  style,
  ...gProps
}: VectorButtonProps) {
  const [hovered, setHovered] = useState(false);

  const setHover = useCallback(
    (next: boolean) => {
      if (disabled) return;
      setHovered(next);
      onHoverChange?.(next);
    },
    [disabled, onHoverChange],
  );

  const handleClick = (e: MouseEvent<SVGGElement>) => {
    if (disabled) return;
    onClick?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      // Space would otherwise scroll the page; Enter would bubble.
      e.preventDefault();
      onClick?.(e);
    }
  };

  // Disabled elements aren't tabbable; otherwise honour the caller's tabIndex
  // and fall back to 0 so the button is reachable by keyboard out of the box.
  const resolvedTabIndex = disabled ? -1 : tabIndex ?? 0;
  const resolvedCursor = cursor ?? (disabled ? "default" : "pointer");

  return (
    <g
      role={role}
      tabIndex={resolvedTabIndex}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      data-hovered={hovered || undefined}
      style={{ cursor: resolvedCursor, ...style }}
      {...gProps}
    >
      <Path
        d={shape}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fillRule={fillRule}
      />
      {children}
    </g>
  );
}
