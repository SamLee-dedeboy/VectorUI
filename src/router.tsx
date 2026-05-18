import { useSyncExternalStore } from "react";

/**
 * A ~20-line hash router. SPEC §3 asks for "one route per demo" without a
 * Storybook setup; pulling in react-router for a five-page prototype is not
 * worth the dependency.
 */

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, "");
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The current route id (empty string === the demo index). */
export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute, () => "");
}

export function navigate(routeId: string): void {
  window.location.hash = routeId ? `/${routeId}` : "/";
}
