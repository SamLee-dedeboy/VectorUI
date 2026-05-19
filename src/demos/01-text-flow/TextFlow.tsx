import { useMemo } from "react";
import { Text, type FlowAround } from "../../components/Text";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";

/**
 * A floated shape `TextFlow` can pour body text around. Both `cornerBlob`
 * (one-sided) and `archFloat` (two-sided) produce one.
 */
export type TextFloat = {
  /** SVG path data for the float's outline. */
  path: string;
  /** Left-edge intrusion profile, in the text block's coordinates. */
  intrusionAt: (yTop: number, yBottom: number) => number;
  /** Optional right-edge intrusion — for a shape that wraps both sides. */
  rightIntrusionAt?: (yTop: number, yBottom: number) => number;
  /** Y offset of the text block below the float's top (e.g. an arch's bar). */
  textTop?: number;
};

/**
 * `TextFlow` — a reusable column of body text that wraps a floated shape.
 *
 * Renders the float plus a `Text` set to flow around it. A float with only an
 * `intrusionAt` wraps on one side; one that also has `rightIntrusionAt` (an
 * archway) wraps the text on both. The text, the float, and the column width
 * are all props — see `demo.tsx` for example arguments.
 */
export type TextFlowProps = {
  /** Body text to pour around the float. */
  text: string;
  /** The floated shape — its `path` and intrusion profile(s). */
  float: TextFloat;
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
    () => ({
      intrusionAt: float.intrusionAt,
      rightIntrusionAt: float.rightIntrusionAt,
      gap: 24,
    }),
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
        y={float.textTop ?? 0}
        flowAround={flowAround}
        fill={textFill}
      >
        {text}
      </Text>
    </g>
  );
}
