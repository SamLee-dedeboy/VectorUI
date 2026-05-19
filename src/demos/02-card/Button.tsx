import { Pill } from "../../components/Pill";
import { tokens } from "../../tokens";

/**
 * A minimal demo-app button (SPEC §4 — a Layer 3 component composed from
 * primitives). It is a `Pill` with a button role — `Pill` does the
 * measure-the-label-and-size-the-shape work.
 */
export type ButtonProps = {
  children: string;
  onClick?: () => void;
  fill?: string;
  color?: string;
};

export function Button({
  children,
  onClick,
  fill = tokens.color.accent,
  color = tokens.color.accentInk,
}: ButtonProps) {
  return (
    <Pill
      role="button"
      tabIndex={0}
      onClick={onClick}
      style={{ cursor: "pointer" }}
      textStyle={tokens.type.label}
      height={34}
      paddingX={18}
      fill={fill}
      textFill={color}
    >
      {children}
    </Pill>
  );
}
