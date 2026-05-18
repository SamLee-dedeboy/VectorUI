/**
 * Type tokens (SPEC §9).
 *
 * Each named style carries a CSS `font` shorthand plus `lineHeight` and
 * optional `letterSpacing`, all in CSS pixels — the units the `Text` primitive
 * works in. Spread a style straight onto `<Text>`: `<Text {...type.body} …>`.
 */
export type TextStyle = {
  font: string;
  lineHeight: number;
  letterSpacing?: number;
};

export const type = {
  display: { font: "700 26px Inter", lineHeight: 32 },
  title: { font: "600 19px Inter", lineHeight: 26 },
  heading: { font: "600 15px Inter", lineHeight: 21, letterSpacing: 0.2 },
  body: { font: "15px Inter", lineHeight: 23 },
  caption: { font: "13px Inter", lineHeight: 18 },
  label: { font: "600 13px Inter", lineHeight: 16, letterSpacing: 0.3 },
} as const satisfies Record<string, TextStyle>;

export type TypeToken = keyof typeof type;
