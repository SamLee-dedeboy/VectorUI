import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Text } from "../../components/Text";
import { layoutParagraph } from "../../layout/measureText";
import { useFontsReady } from "../../layout/fonts";
import { SAMPLES } from "./samples";

/**
 * Demo — implementation step 3 + the first risk gate (SPEC §14).
 *
 * Renders the same paragraph twice at an identical width and font: once as a
 * native HTML <p> (the browser's own line breaker), once as a VectorUI <Text>
 * (pretext-driven SVG). An overlay mode stacks them so any per-line drift
 * shows as red/blue ghosting. The verdict line compares line counts.
 *
 * scale is pinned to 1 here: the VectorUIRoot's CSS width equals its viewBox
 * width, so one layout unit === one CSS pixel and the comparison is honest.
 */

type ViewMode = "side-by-side" | "overlay";

export function TextFidelity() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [width, setWidth] = useState(420);
  const [fontSize, setFontSize] = useState(16);
  const [mode, setMode] = useState<ViewMode>("side-by-side");
  const fontsReady = useFontsReady();

  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  const lineHeight = Math.round(fontSize * 1.55);
  const font = `${fontSize}px Inter`;
  const cssFont = `${fontSize}px/${lineHeight}px Inter`;

  // pretext's view of the paragraph, used for the verdict + per-line listing.
  const paragraph = useMemo(
    () =>
      layoutParagraph({
        text: sample.text,
        font,
        maxWidthPx: width,
        lineHeightPx: lineHeight,
      }),
    [sample.text, font, width, lineHeight, fontsReady],
  );

  // The browser's view: measure the rendered <p>'s height -> line count.
  const pRef = useRef<HTMLParagraphElement>(null);
  const [htmlLineCount, setHtmlLineCount] = useState(0);
  useLayoutEffect(() => {
    if (pRef.current) {
      setHtmlLineCount(Math.round(pRef.current.offsetHeight / lineHeight));
    }
  }, [sample.text, width, fontSize, lineHeight, fontsReady]);

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
      <p style={{ color: "#555", maxWidth: 640 }}>
        Step-3 risk gate: pretext-driven SVG text vs. the browser's native line
        breaker, same width and font. Use <strong>Overlay</strong> to spot
        per-line drift — perfect agreement renders as solid purple.
      </p>

      <Controls
        sampleId={sampleId}
        onSample={setSampleId}
        width={width}
        onWidth={setWidth}
        fontSize={fontSize}
        onFontSize={setFontSize}
        mode={mode}
        onMode={setMode}
      />

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
                {sample.text}
              </p>
            </div>
          </figure>
          <figure style={{ margin: 0 }}>
            <figcaption style={capStyle}>VectorUI &lt;Text&gt; (SVG)</figcaption>
            <div style={{ ...frameStyle, width }}>
              <VectorUIRoot
                width={width}
                height={blockHeight}
                style={{ width }}
              >
                <Text
                  font={font}
                  lineHeight={lineHeight}
                  maxWidth={width}
                  fill="#111"
                >
                  {sample.text}
                </Text>
              </VectorUIRoot>
            </div>
          </figure>
        </div>
      ) : (
        <figure style={{ margin: 0 }}>
          <figcaption style={capStyle}>
            Overlay — HTML in <span style={{ color: "#c0392b" }}>red</span>,
            SVG in <span style={{ color: "#2155cd" }}>blue</span>
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
              {sample.text}
            </p>
            <div style={{ position: "absolute", inset: 0 }}>
              <VectorUIRoot width={width} height={blockHeight} style={{ width }}>
                <Text
                  font={font}
                  lineHeight={lineHeight}
                  maxWidth={width}
                  fill="rgba(33,85,205,0.7)"
                >
                  {sample.text}
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

type ControlsProps = {
  sampleId: string;
  onSample: (id: string) => void;
  width: number;
  onWidth: (w: number) => void;
  fontSize: number;
  onFontSize: (s: number) => void;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
};

function Controls(props: ControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "12px 0",
      }}
    >
      <label>
        Sample{" "}
        <select
          value={props.sampleId}
          onChange={(e) => props.onSample(e.target.value)}
        >
          {SAMPLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Width {props.width}px{" "}
        <input
          type="range"
          min={160}
          max={680}
          value={props.width}
          onChange={(e) => props.onWidth(Number(e.target.value))}
        />
      </label>
      <label>
        Font {props.fontSize}px{" "}
        <input
          type="range"
          min={11}
          max={32}
          value={props.fontSize}
          onChange={(e) => props.onFontSize(Number(e.target.value))}
        />
      </label>
      <label>
        View{" "}
        <select
          value={props.mode}
          onChange={(e) => props.onMode(e.target.value as ViewMode)}
        >
          <option value="side-by-side">Side by side</option>
          <option value="overlay">Overlay</option>
        </select>
      </label>
    </div>
  );
}
