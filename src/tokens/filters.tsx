import type { ReactElement } from "react";

/**
 * Filter tokens (SPEC §9) — SVG `<filter>` presets.
 *
 * The `<filter>` elements are rendered once into a root `<defs>` block (by
 * `TokenDefs`, which `VectorUIRoot` mounts automatically); components just
 * reference them by the `url(#…)` strings in `filters`.
 */

const SOFT_SHADOW = "vui-soft-shadow";
const GLOW = "vui-glow";
const ETCHED = "vui-etched";

/** The `<filter>` definitions. Keyed for rendering as a list. */
export const filterDefs: ReactElement[] = [
  <filter
    key={SOFT_SHADOW}
    id={SOFT_SHADOW}
    x="-40%"
    y="-40%"
    width="180%"
    height="180%"
  >
    <feDropShadow
      dx="0"
      dy="7"
      stdDeviation="9"
      floodColor="#1c2b22"
      floodOpacity="0.2"
    />
  </filter>,

  <filter key={GLOW} id={GLOW} x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="5" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>,

  // A soft inner shadow — the shape looks pressed into the surface.
  <filter key={ETCHED} id={ETCHED} x="-20%" y="-20%" width="140%" height="140%">
    <feComponentTransfer in="SourceAlpha">
      <feFuncA type="table" tableValues="1 0" />
    </feComponentTransfer>
    <feGaussianBlur stdDeviation="2.2" />
    <feOffset dy="1.6" result="inner" />
    <feFlood floodColor="#1c2b22" floodOpacity="0.32" />
    <feComposite in2="inner" operator="in" />
    <feComposite in2="SourceAlpha" operator="in" />
    <feMerge>
      <feMergeNode in="SourceGraphic" />
      <feMergeNode />
    </feMerge>
  </filter>,
];

/** `url(#…)` references for the `filter` prop. */
export const filters = {
  softShadow: `url(#${SOFT_SHADOW})`,
  glow: `url(#${GLOW})`,
  etched: `url(#${ETCHED})`,
} as const;

export type FilterToken = keyof typeof filters;
