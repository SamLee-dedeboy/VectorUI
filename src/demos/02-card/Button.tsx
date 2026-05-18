import { measureNaturalWidth } from "@chenglou/pretext";
import { Path } from "../../svg/Path";
import { Text } from "../../components/Text";
import { useCoordinateScale } from "../../layout/coordinateScale";
import { useFontsReady } from "../../layout/fonts";
import { prepareCached } from "../../layout/measureText";
import { tokens } from "../../tokens";

/**
 * A minimal demo-app button (SPEC §4 — a Layer 3 component composed from
 * primitives). It is a pill `Path` sized to its label plus a `Text` label,
 * shrink-wrapped to the text's natural width.
 */
export type ButtonProps = {
  children: string;
  onClick?: () => void;
  fill?: string;
  color?: string;
};

const FONT = "14px Inter";
const HEIGHT = 34;
const PAD_X = 18;

export function Button({
  children,
  onClick,
  fill = tokens.color.accent,
  color = tokens.color.accentInk,
}: ButtonProps) {
  const { scale } = useCoordinateScale();
  // Re-measure once the web font loads — the natural width depends on it.
  useFontsReady();

  const labelPx = measureNaturalWidth(prepareCached(children, FONT));
  const labelWidth = scale > 0 ? labelPx / scale : labelPx;
  const width = labelWidth + PAD_X * 2;

  return (
    <g
      role="button"
      tabIndex={0}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <Path d={tokens.shapes.pill(width, HEIGHT)} fill={fill} />
      {/* lineHeight === button height centers the single line via half-leading. */}
      <Text
        font={FONT}
        lineHeight={HEIGHT}
        maxWidth={width}
        x={PAD_X}
        fill={color}
      >
        {children}
      </Text>
    </g>
  );
}
