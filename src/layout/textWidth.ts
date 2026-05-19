import { measureNaturalWidth } from "@chenglou/pretext";
import { useCoordinateScale } from "./coordinateScale";
import { useFontsReady } from "./fonts";
import { prepareCached } from "./measureText";

/**
 * Layer 2 — natural text width, in LAYOUT UNITS.
 *
 * pretext measures text in pixels; sizing a shape (a pill, a chip) to a label
 * therefore needs a px→layout conversion. This hook does that conversion
 * internally — the consumer never touches `scale`. It also re-measures when
 * the web font finishes loading.
 *
 * Returns the unwrapped width of `text` rendered in `font`, in layout units.
 */
export function useNaturalTextWidth(text: string, font: string): number {
  const { scale } = useCoordinateScale();
  // Subscribe so the width recomputes once the bundled font is available.
  useFontsReady();
  const widthPx = measureNaturalWidth(prepareCached(text, font));
  return scale > 0 ? widthPx / scale : widthPx;
}
