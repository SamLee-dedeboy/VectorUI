import { useCoordinateScale } from "../../layout/coordinateScale";

/**
 * `ScaleReadout` — a reusable debug overlay that prints the live layout↔pixel
 * coordinate scale, centered in the current viewBox. Render it under any
 * `VectorUIRoot` to watch the scale update as the container resizes.
 */
export type ScaleReadoutProps = {
  fill?: string;
};

export function ScaleReadout({ fill = "#0b3d2e" }: ScaleReadoutProps) {
  const { scale, viewBoxWidth, viewBoxHeight } = useCoordinateScale();
  return (
    <text
      x={viewBoxWidth / 2}
      y={viewBoxHeight / 2 + 6}
      textAnchor="middle"
      fontFamily="ui-monospace, monospace"
      fontSize={16}
      fill={fill}
    >
      scale = {scale.toFixed(4)} px / layout unit
    </text>
  );
}
