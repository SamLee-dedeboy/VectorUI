import { useSyncExternalStore } from "react";

/**
 * Layer 2 — motion preferences.
 *
 * A single source of truth for `prefers-reduced-motion`, so every animated
 * primitive (`useTween`, breakpoint morphs) can drop to instant transitions
 * when the user asks for it (SPEC §10). Step 9 layers duration/easing tokens
 * on top of this.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/** `true` when the user has requested reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
