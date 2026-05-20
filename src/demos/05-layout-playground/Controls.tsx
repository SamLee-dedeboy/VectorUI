import type { CSSProperties } from "react";
import {
  bodyLengthOptions,
  distributeOptions,
  limits,
  type BodyLength,
  type Distribute,
  type PlaygroundState,
} from "./state";

/**
 * The HTML control strip beneath the playground.
 *
 * Pure presentational — owns no state, just emits an `onChange(state)` for
 * every input. The state shape is shared with `demo.tsx` via `state.ts`.
 *
 * Controls are plain HTML form elements (range, button, radio, checkbox) so
 * we don't reinvent focus, keyboard, or pointer handling for the sake of a
 * demo. SPEC §16 defers HTML-overlay inputs *inside* the SVG; placing them
 * *outside* is fine and matches the existing demo convention.
 */

export type ControlsProps = {
  state: PlaygroundState;
  onChange: (next: PlaygroundState) => void;
};

const groupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 12,
  color: "#37463e",
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  rowGap: 10,
  alignItems: "center",
  padding: "10px 12px",
  border: "1px solid #dde0da",
  borderRadius: 8,
  background: "#fbfaf6",
  marginBottom: 12,
  maxWidth: 720,
};

const stepBtn: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: "1px solid #c4c8be",
  background: "#fff",
  cursor: "pointer",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 14,
  lineHeight: "22px",
};

const radioGroupStyle: CSSProperties = {
  display: "inline-flex",
  border: "1px solid #c4c8be",
  borderRadius: 6,
  overflow: "hidden",
};

const radioBtn = (active: boolean): CSSProperties => ({
  border: "none",
  background: active ? "#1f8a5c" : "#fff",
  color: active ? "#fff" : "#37463e",
  padding: "4px 10px",
  cursor: "pointer",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: 12,
});

function Stepper({
  label,
  value,
  min,
  max,
  onSet,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onSet: (n: number) => void;
}) {
  return (
    <div style={groupStyle}>
      <span>{label}</span>
      <button
        type="button"
        style={stepBtn}
        onClick={() => onSet(Math.max(min, value - 1))}
        aria-label={`${label} decrease`}
        disabled={value <= min}
      >
        −
      </button>
      <span style={{ minWidth: 20, textAlign: "center" }}>{value}</span>
      <button
        type="button"
        style={stepBtn}
        onClick={() => onSet(Math.min(max, value + 1))}
        aria-label={`${label} increase`}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

function RadioRow<T extends string>({
  label,
  value,
  options,
  onSet,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onSet: (v: T) => void;
}) {
  return (
    <div style={groupStyle}>
      <span>{label}</span>
      <div style={radioGroupStyle}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            style={radioBtn(opt === value)}
            onClick={() => onSet(opt)}
            aria-pressed={opt === value}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Controls({ state, onChange }: ControlsProps) {
  const set = <K extends keyof PlaygroundState>(
    key: K,
    value: PlaygroundState[K],
  ) => onChange({ ...state, [key]: value });

  return (
    <div role="group" aria-label="Layout playground controls">
      <div style={rowStyle}>
        <div style={groupStyle}>
          <label htmlFor="container-width">container</label>
          <input
            id="container-width"
            type="range"
            min={limits.containerPx.min}
            max={limits.containerPx.max}
            step={limits.containerPx.step}
            value={state.containerPx}
            onChange={(e) => set("containerPx", Number(e.target.value))}
            style={{ width: 180 }}
          />
          <span style={{ minWidth: 50 }}>{state.containerPx}px</span>
          <label style={{ ...groupStyle, cursor: "pointer", marginLeft: 4 }}>
            <input
              type="checkbox"
              checked={state.showBadge}
              onChange={(e) => set("showBadge", e.target.checked)}
            />
            <span>show width value</span>
          </label>
        </div>
      </div>

      <div style={rowStyle}>
        <Stepper
          label="tabs"
          value={state.tabCount}
          min={limits.tabCount.min}
          max={limits.tabCount.max}
          onSet={(n) => set("tabCount", n)}
        />

        <Stepper
          label="tags"
          value={state.tagCount}
          min={limits.tagCount.min}
          max={limits.tagCount.max}
          onSet={(n) => set("tagCount", n)}
        />

        <Stepper
          label="footer"
          value={state.footerCount}
          min={limits.footerCount.min}
          max={limits.footerCount.max}
          onSet={(n) => set("footerCount", n)}
        />
      </div>

      <div style={rowStyle}>
        <RadioRow<Distribute>
          label="distribute"
          value={state.tagDistribute}
          options={distributeOptions}
          onSet={(v) => set("tagDistribute", v)}
        />

        <RadioRow<BodyLength>
          label="body"
          value={state.bodyLength}
          options={bodyLengthOptions}
          onSet={(v) => set("bodyLength", v)}
        />

        <label style={{ ...groupStyle, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={state.inspect}
            onChange={(e) => set("inspect", e.target.checked)}
          />
          <span>inspect layout</span>
        </label>
      </div>
    </div>
  );
}
