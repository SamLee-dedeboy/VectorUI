import type { CSSProperties, ReactNode } from "react";
import type { ProceduralState } from "./state";

/**
 * Slider panel. HTML form controls live outside the SVG — SPEC §10 keeps
 * HTML-overlay inputs deferred, so interactive demos lift state via plain
 * `<input>` elements (the same pattern other interactive demos will adopt).
 */
export function Controls({
  state,
  onChange,
}: {
  state: ProceduralState;
  onChange: (next: ProceduralState) => void;
}) {
  const set = <K extends keyof ProceduralState>(
    key: K,
    value: ProceduralState[K],
  ) => onChange({ ...state, [key]: value });

  return (
    <div style={panelStyle}>
      <Field label={`Amplitude · ${state.amplitude}px`}>
        <input
          type="range"
          min={0}
          max={56}
          step={1}
          value={state.amplitude}
          onChange={(e) => set("amplitude", Number(e.target.value))}
        />
      </Field>
      <Field label={`Frequency · ${state.frequency} cycles`}>
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={state.frequency}
          onChange={(e) => set("frequency", Number(e.target.value))}
        />
      </Field>
      <Field label={`Phase · ${Math.round((state.phase * 180) / Math.PI)}°`}>
        <input
          type="range"
          min={0}
          max={Math.PI * 2}
          step={0.05}
          value={state.phase}
          onChange={(e) => set("phase", Number(e.target.value))}
        />
      </Field>
      <Field label={`Width · ${state.containerPx}px`}>
        <input
          type="range"
          min={360}
          max={720}
          step={10}
          value={state.containerPx}
          onChange={(e) => set("containerPx", Number(e.target.value))}
        />
      </Field>
      <label style={{ ...rowStyle, justifyContent: "flex-start", gap: 8 }}>
        <input
          type="checkbox"
          checked={state.mirrorRight}
          onChange={(e) => set("mirrorRight", e.target.checked)}
        />
        <span>Mirror wave on right edge (decorative only)</span>
      </label>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={rowStyle}>
      <span style={{ minWidth: 200 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {children}
      </div>
    </label>
  );
}

const panelStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 16,
  marginBottom: 16,
  background: "#f4f3ee",
  border: "1px solid #dde0da",
  borderRadius: 8,
  maxWidth: 520,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  color: "#1a1a1a",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};
