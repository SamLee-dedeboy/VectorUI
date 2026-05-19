import { useCoordinateScale } from "../../layout/coordinateScale";

/**
 * `ScaleReadout` — a reusable debug overlay that prints the live layout↔pixel
 * coordinate scale, centered in the current viewBox. Render it under any
 * `VectorUIRoot` to watch the scale update as the container resizes.
 */
export type ScaleReadoutProps = {
  fill?: string;
  fontSize?: number;
};

export function ScaleReadout({
  fill = "#0b3d2e",
  fontSize = 16,
}: ScaleReadoutProps) {
  const { scale, viewBoxWidth, viewBoxHeight } = useCoordinateScale();
  return (
    <text
      x={viewBoxWidth / 2}
      y={viewBoxHeight / 2 + 6}
      textAnchor="middle"
      fontFamily="ui-monospace, monospace"
      fontSize={fontSize}
      fill={fill}
    >
      scale = {scale.toFixed(4)} px / layout unit
    </text>
  );
}
