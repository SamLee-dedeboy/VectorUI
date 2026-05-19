import { useState } from "react";
import { SAMPLES } from "./samples";
import { TextComparison, type ViewMode } from "./TextComparison";

/**
 * Demo — implementation step 3 + the first risk gate (SPEC §14).
 *
 * The demo page: owns the controls and the sample texts, and renders the
 * reusable `<TextComparison>` (see TextComparison.tsx) with them as arguments.
 */
export function Demo() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [width, setWidth] = useState(420);
  const [fontSize, setFontSize] = useState(16);
  const [mode, setMode] = useState<ViewMode>("side-by-side");

  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Step-3 risk gate: pretext-driven SVG text vs. the browser's native line
        breaker, same width and font. Use <strong>Overlay</strong> to spot
        per-line drift — perfect agreement renders as solid purple.
      </p>

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
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
          >
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Width {width}px{" "}
          <input
            type="range"
            min={160}
            max={680}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label>
          Font {fontSize}px{" "}
          <input
            type="range"
            min={11}
            max={32}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </label>
        <label>
          View{" "}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ViewMode)}
          >
            <option value="side-by-side">Side by side</option>
            <option value="overlay">Overlay</option>
          </select>
        </label>
      </div>

      <TextComparison
        text={sample.text}
        width={width}
        fontSize={fontSize}
        mode={mode}
      />
    </div>
  );
}
