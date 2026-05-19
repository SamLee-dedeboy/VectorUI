import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Text } from "../../components/Text";
import { layoutParagraph } from "../../layout/measureText";
import { useFontsReady } from "../../layout/fonts";

/**
 * `TextComparison` — a reusable side-by-side of one paragraph rendered two
 * ways: a native HTML `<p>` (the browser's line breaker) and a VectorUI
 * `<Text>` (pretext-driven SVG), at an identical width and font. `mode`
 * overlays them so per-line drift shows as red/blue ghosting.
 *
 * `scale` is pinned to 1: the VectorUIRoot's CSS width equals its viewBox
 * width, so one layout unit === one CSS pixel and the comparison is honest.
 */

export type ViewMode = "side-by-side" | "overlay";

export type TextComparisonProps = {
  text: string;
  /** Wrap width, in CSS px. */
  width: number;
  fontSize: number;
  mode: ViewMode;
};

const capStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#888",
  marginBottom: 6,
};
const frameStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  background: "#fff",
  padding: 0,
};

export function TextComparison({
  text,
  width,
  fontSize,
  mode,
}: TextComparisonProps) {
  const fontsReady = useFontsReady();

  const lineHeight = Math.round(fontSize * 1.55);
  const font = `${fontSize}px Inter`;
  const cssFont = `${fontSize}px/${lineHeight}px Inter`;

  // pretext's view of the paragraph — drives the verdict + per-line listing.
  const paragraph = useMemo(
    () =>
      layoutParagraph({
        text,
        font,
        maxWidthPx: width,
        lineHeightPx: lineHeight,
      }),
    [text, font, width, lineHeight, fontsReady],
  );

  // The browser's view: measure the rendered <p>'s height -> line count.
  const pRef = useRef<HTMLParagraphElement>(null);
  const [htmlLineCount, setHtmlLineCount] = useState(0);
  useLayoutEffect(() => {
    if (pRef.current) {
      setHtmlLineCount(Math.round(pRef.current.offsetHeight / lineHeight));
    }
  }, [text, width, fontSize, lineHeight, fontsReady]);

  const blockHeight = Math.max(paragraph.heightPx, lineHeight);
  const countsMatch = htmlLineCount === paragraph.lines.length;

  const pStyle: React.CSSProperties = {
    margin: 0,
    padding: 0,
    width,
    font: cssFont,
    boxSizing: "content-box",
  };

  return (
    <div>
      <p
        style={{
          marginTop: 16,
          fontWeight: 600,
          color: countsMatch ? "#1f8a5c" : "#c0392b",
        }}
      >
        {countsMatch ? "✓ " : "✕ "}
        line count — HTML: {htmlLineCount} · pretext/SVG:{" "}
        {paragraph.lines.length}
        {fontsReady ? "" : " · (waiting for Inter to load…)"}
      </p>

      {mode === "side-by-side" ? (
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <figure style={{ margin: 0 }}>
            <figcaption style={capStyle}>HTML &lt;p&gt; (reference)</figcaption>
            <div style={{ ...frameStyle, width }}>
              <p ref={pRef} style={pStyle}>
                {text}
              </p>
            </div>
          </figure>
          <figure style={{ margin: 0 }}>
            <figcaption style={capStyle}>VectorUI &lt;Text&gt; (SVG)</figcaption>
            <div style={{ ...frameStyle, width }}>
              <VectorUIRoot width={width} height={blockHeight} style={{ width }}>
                <Text
                  font={font}
                  lineHeight={lineHeight}
                  maxWidth={width}
                  fill="#111"
                >
                  {text}
                </Text>
              </VectorUIRoot>
            </div>
          </figure>
        </div>
      ) : (
        <figure style={{ margin: 0 }}>
          <figcaption style={capStyle}>
            Overlay — HTML in <span style={{ color: "#c0392b" }}>red</span>, SVG
            in <span style={{ color: "#2155cd" }}>blue</span>
          </figcaption>
          <div
            style={{
              ...frameStyle,
              width,
              height: blockHeight,
              position: "relative",
            }}
          >
            <p
              ref={pRef}
              style={{
                ...pStyle,
                position: "absolute",
                inset: 0,
                color: "rgba(192,57,43,0.7)",
              }}
            >
              {text}
            </p>
            <div style={{ position: "absolute", inset: 0 }}>
              <VectorUIRoot width={width} height={blockHeight} style={{ width }}>
                <Text
                  font={font}
                  lineHeight={lineHeight}
                  maxWidth={width}
                  fill="rgba(33,85,205,0.7)"
                >
                  {text}
                </Text>
              </VectorUIRoot>
            </div>
          </div>
        </figure>
      )}

      <details style={{ marginTop: 24 }}>
        <summary style={{ cursor: "pointer", color: "#555" }}>
          pretext line breakdown ({paragraph.lines.length} lines)
        </summary>
        <ol style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
          {paragraph.lines.map((line, i) => (
            <li key={i}>
              <span style={{ color: "#999" }}>
                [{line.widthPx.toFixed(1)}px]
              </span>{" "}
              {line.text}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
