/**
 * Easing functions for the tween hooks in `tween.ts` (SPEC §9 — motion).
 *
 * Bare `(t: number) => number` functions on `t ∈ [0, 1]` → eased `[0, 1]`.
 * No metadata, no reduced-motion wiring — the tween hooks short-circuit on
 * reduced motion before the easing is ever called, so easings stay
 * trivially composable, testable, and user-extensible (a consumer can pass
 * their own `(t) => …`).
 *
 * Layer 2 — must not import from `src/tokens`.
 */

export type Easing = (t: number) => number;

/** Identity. `easing` defaults to `easeInOut`; pass `linear` to opt out. */
export const linear: Easing = (t) => t;

/** Cubic ease-in. Slow start, fast finish — emphasizes the arrival. */
export const easeIn: Easing = (t) => t * t * t;

/** Cubic ease-out. Fast start, slow finish — Demo 3A's reveal aesthetic. */
export const easeOut: Easing = (t) => 1 - Math.pow(1 - t, 3);

/** Cubic ease-in-out. Symmetric S-curve — Demos 2 / 3B / 6's default. */
export const easeInOut: Easing = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Hermite smoothstep (3t² − 2t³). Used by `MorphCard` for breakpoint morphs. */
export const smoothstep: Easing = (t) => t * t * (3 - 2 * t);
