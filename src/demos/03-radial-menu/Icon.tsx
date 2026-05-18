/**
 * A tiny set of stroked line icons for Demo 3, drawn in a 24×24 box and
 * centered on the component's origin so `PathFlow` can place and rotate them
 * about their middle.
 */

export type IconName =
  | "home"
  | "search"
  | "heart"
  | "star"
  | "bell"
  | "user";

// Feather-ish glyphs; a single `d` per icon (sub-paths separated by M).
const GLYPHS: Record<IconName, string> = {
  home: "M3 11 L12 3.5 L21 11 M5.5 9.5 V20.5 H18.5 V9.5 M9.5 20.5 V14 H14.5 V20.5",
  search: "M11 11 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M16 16 L21 21",
  heart:
    "M12 20.5 C12 20.5 3.5 14 3.5 8.5 A4.5 4.5 0 0 1 12 6.2 A4.5 4.5 0 0 1 20.5 8.5 C20.5 14 12 20.5 12 20.5 Z",
  star: "M12 3 L14.7 9.4 L21.5 9.9 L16.3 14.3 L18 21 L12 17.3 L6 21 L7.7 14.3 L2.5 9.9 L9.3 9.4 Z",
  bell: "M9 18.5 A3 3 0 0 0 15 18.5 M6.5 18.5 H17.5 L15.5 15 V10.5 A3.5 3.5 0 0 0 8.5 10.5 V15 Z M12 4 V6.5",
  user: "M12 11 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M5 21 C5 16.2 8.4 14 12 14 C15.6 14 19 16.2 19 21",
};

export type IconProps = {
  name: IconName;
  /** Rendered size, layout units. */
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 26,
  color = "#1a1a1a",
  strokeWidth = 2,
}: IconProps) {
  const scale = size / 24;
  return (
    <g
      transform={`translate(${-size / 2} ${-size / 2}) scale(${scale})`}
      aria-hidden="true"
    >
      <path
        d={GLYPHS[name]}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth / scale}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
