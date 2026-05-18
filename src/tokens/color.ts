/**
 * Color tokens (SPEC §9).
 *
 * Semantic names resolve to CSS custom properties, so a future theme only has
 * to override the variables — no component edits. `VectorUIRoot` applies
 * `colorVars` to the root SVG; `color.*` are the `var(...)` references that
 * cascade into every fill and stroke beneath it.
 */

/** The actual values, applied as CSS custom properties on the root SVG. */
export const colorVars: Record<string, string> = {
  "--vui-surface": "#ffffff",
  "--vui-surface-sunken": "#f4f3ee",
  "--vui-surface-muted": "#eef0ea",
  "--vui-ink": "#1a1a1a",
  "--vui-ink-muted": "#6a6a64",
  "--vui-ink-subtle": "#9b9b93",
  "--vui-accent": "#1f8a5c",
  "--vui-accent-soft": "#cfe9dd",
  "--vui-accent-ink": "#ffffff",
  "--vui-line": "#dde0da",
  "--vui-shadow": "#1c2b22",
};

/** Semantic color accessors — each is a `var(--vui-…)` reference. */
export const color = {
  surface: "var(--vui-surface)",
  surfaceSunken: "var(--vui-surface-sunken)",
  surfaceMuted: "var(--vui-surface-muted)",
  ink: "var(--vui-ink)",
  inkMuted: "var(--vui-ink-muted)",
  inkSubtle: "var(--vui-ink-subtle)",
  accent: "var(--vui-accent)",
  accentSoft: "var(--vui-accent-soft)",
  accentInk: "var(--vui-accent-ink)",
  line: "var(--vui-line)",
  shadow: "var(--vui-shadow)",
} as const;

export type ColorToken = keyof typeof color;
