import { useSyncExternalStore } from "react";
import { clearMeasurementCaches } from "./measureText";

/**
 * Web-font readiness. pretext and the canvas metrics probe both measure
 * against whatever the browser currently has loaded — so any measurement done
 * before the bundled Inter font arrives is wrong. This module exposes a single
 * boolean that flips once `document.fonts.ready` resolves, and flushes the
 * measurement caches at that moment so the first correct measurement sticks.
 */

let ready = false;
const listeners = new Set<() => void>();

if (typeof document !== "undefined" && "fonts" in document) {
  document.fonts.ready.then(() => {
    ready = true;
    clearMeasurementCaches();
    for (const l of listeners) l();
  });
} else {
  // No FontFaceSet (e.g. jsdom): treat fonts as immediately ready.
  ready = true;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `true` once web fonts have loaded; triggers a re-measure when it flips. */
export function useFontsReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => ready,
  );
}
