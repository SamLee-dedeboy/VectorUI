/**
 * Design tokens (SPEC §9).
 *
 * A single `tokens` object groups the standard categories (color, space, type,
 * motion) and the SVG-native ones (shapes, filters). Consumed at Layer 3 only —
 * Layer 1 (svg) and Layer 2 (layout) must not import this.
 */
import { color } from "./color";
import { space } from "./space";
import { type } from "./type";
import { motion } from "./motion";
import { shapes } from "./shapes";
import { filters } from "./filters";

export const tokens = {
  color,
  space,
  type,
  motion,
  shapes,
  filters,
} as const;

// Side-channel exports used to wire tokens into the root SVG.
export { colorVars } from "./color";
export { filterDefs } from "./filters";

export type { ColorToken } from "./color";
export type { SpaceToken } from "./space";
export type { TextStyle, TypeToken } from "./type";
export type { DurationToken } from "./motion";
export type { ShapeToken } from "./shapes";
export type { FilterToken } from "./filters";
