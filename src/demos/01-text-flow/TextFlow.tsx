import { useCallback, useMemo, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Text, type FlowAround, type TextMeasurement } from "../../components/Text";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";
import { cornerBlob } from "./cornerBlob";

/**
 * Demo 1 — text flow around a shape (SPEC §11).
 *
 * A column of body text with an organic blob floated into the upper-left
 * corner; the text wraps the blob's silhouette and squares off below it. This
 * is the demo that is impossible in plain HTML/CSS without absurd hacks, so it
 * doubles as the project's headline screenshot.
 *
 * Proves: pretext integration, variable-width per-line layout, flow-around.
 */

const BODY = `Mainstream UI toolkits speak a rectilinear language: everything is a box, nested in boxes, aligned to the edges of other boxes. VectorUI asks a different question. If the page is one SVG document, then a shape — any closed path — can be a layout container, and text can be poured to follow its contours rather than a bounding rectangle. The blob to the left is not an image sitting in a float; it is a path, and the very same curve that is drawn is the curve this paragraph is wrapping against. Each line asks the shape how far it reaches in, indents past it, and lets the text engine wrap whatever width remains. Below the blob, the lines simply return to the full column width. Nothing here is faked with padding or hand-placed line breaks.`;

const PAD = 44;
const VIEW_WIDTH = 760;

export function TextFlow() {
  const [columnWidth, setColumnWidth] = useState(VIEW_WIDTH - PAD * 2);
  const [showSilhouette, setShowSilhouette] = useState(false);
  const [measured, setMeasured] = useState<TextMeasurement | null>(null);

  const blob = useMemo(() => cornerBlob({ width: 168, height: 212 }), []);
  const flowAround = useMemo<FlowAround>(
    () => ({ intrusionAt: blob.intrusionAt, gap: 24 }),
    [blob],
  );
  const onMeasure = useCallback((m: TextMeasurement) => setMeasured(m), []);

  const blockHeight = measured?.height ?? 460;
  const viewHeight = blockHeight + PAD * 2;

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The body text wraps the blob's contour line-by-line, then returns to the
        full column width once it clears the bottom. Drag the width to watch it
        reflow.
      </p>

      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "8px 0 16px",
        }}
      >
        <label>
          Column width {columnWidth}{" "}
          <input
            type="range"
            min={360}
            max={VIEW_WIDTH - PAD * 2}
            value={columnWidth}
            onChange={(e) => setColumnWidth(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={showSilhouette}
            onChange={(e) => setShowSilhouette(e.target.checked)}
          />{" "}
          Show float silhouette
        </label>
      </div>

      <VectorUIRoot
        width={VIEW_WIDTH}
        height={viewHeight}
        style={{
          maxWidth: VIEW_WIDTH,
          border: `1px solid ${tokens.color.line}`,
          background: tokens.color.surface,
        }}
      >
        <g transform={`translate(${PAD} ${PAD})`}>
          {/* The float. Decorative — aria-hidden by default via <Path>. */}
          <Path
            d={blob.path}
            fill={tokens.color.accentSoft}
            stroke={showSilhouette ? tokens.color.accent : "none"}
            strokeWidth={showSilhouette ? 2 : 0}
          />
          <Text
            {...tokens.type.body}
            lineHeight={26}
            maxWidth={columnWidth}
            flowAround={flowAround}
            fill={tokens.color.ink}
            onMeasure={onMeasure}
          >
            {BODY}
          </Text>
        </g>
      </VectorUIRoot>
    </div>
  );
}
