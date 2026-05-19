import { useMemo } from "react";
import { Text, type FlowAround } from "../../components/Text";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";
import type { CornerFloat } from "./cornerBlob";

/**
 * `TextFlow` — a reusable column of body text that wraps a floated shape.
 *
 * Renders the float plus a `Text` set to flow around it. The text, the float,
 * and the column width are all props — see `demo.tsx` for example arguments.
 */
export type TextFlowProps = {
  /** Body text to pour around the float. */
  text: string;
  /** The floated shape — its `path` and `intrusionAt` profile. */
  float: CornerFloat;
  /** Column width, in layout units. */
  columnWidth: number;
  /** Stroke the float's silhouette (useful for inspecting the wrap). */
  showSilhouette?: boolean;
  /** Fill of the floated shape. */
  floatFill?: string;
  /** Body text color. */
  textFill?: string;
};

export function TextFlow({
  text,
  float,
  columnWidth,
  showSilhouette = false,
  floatFill = tokens.color.accentSoft,
  textFill = tokens.color.ink,
}: TextFlowProps) {
  const flowAround = useMemo<FlowAround>(
    () => ({ intrusionAt: float.intrusionAt, gap: 24 }),
    [float],
  );

  return (
    <g>
      {/* The float. Decorative — aria-hidden by default via <Path>. */}
      <Path
        d={float.path}
        fill={floatFill}
        stroke={showSilhouette ? tokens.color.accent : "none"}
        strokeWidth={showSilhouette ? 2 : 0}
      />
      <Text
        {...tokens.type.body}
        lineHeight={26}
        maxWidth={columnWidth}
        flowAround={flowAround}
        fill={textFill}
      >
        {text}
      </Text>
    </g>
  );
}
