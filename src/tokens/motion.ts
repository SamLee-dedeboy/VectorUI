/**
 * Motion tokens (SPEC §9).
 *
 * Durations (ms) and easings, plus a `reduced` variant with zero durations.
 * Consumers pair this with `usePrefersReducedMotion()` and pick the variant —
 * see `useTween`, which already does exactly that.
 */
export const motion = {
  duration: {
    fast: 140,
    base: 220,
    slow: 360,
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    entrance: "cubic-bezier(0, 0, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
  /** Honored under `prefers-reduced-motion: reduce` — transitions go instant. */
  reduced: {
    duration: { fast: 0, base: 0, slow: 0 },
  },
} as const;

export type DurationToken = keyof typeof motion.duration;
