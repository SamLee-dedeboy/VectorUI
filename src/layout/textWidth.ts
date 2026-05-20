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
 * `letterSpacingPx` MUST match the letter-spacing the label will be rendered
 * with — otherwise the returned width is shorter than the rendered advance
 * by `N × letterSpacing` (one extra advance after every glyph, including the
 * last, exactly how SVG and `canvas.letterSpacing` apply it). Without this,
 * a `Pill` sized from the natural width and a label rendered with
 * letter-spacing end up off by a few pixels horizontally — visible as a
 * right-leaning text inside a pill that should be symmetric.
 *
 * Returns the unwrapped width of `text` rendered in `font`, in layout units.
 */
export function useNaturalTextWidth(
  text: string,
  font: string,
  letterSpacingPx?: number,
): number {
  const { scale } = useCoordinateScale();
  // Subscribe so the width recomputes once the bundled font is available.
  useFontsReady();
  const opts =
    letterSpacingPx != null ? { letterSpacing: letterSpacingPx } : undefined;
  const widthPx = measureNaturalWidth(prepareCached(text, font, opts));
  return scale > 0 ? widthPx / scale : widthPx;
}

/**
 * Layer 2 — actual ink-box metrics for a SPECIFIC text in a SPECIFIC font.
 *
 * `actualBoundingBoxAscent` / `actualBoundingBoxDescent` describe the
 * extent of the rendered ink relative to the baseline, in CSS pixels —
 * unlike the `font*` variants, which describe the whole font's design
 * envelope (much taller for Latin fonts, since the envelope reserves room
 * for diacritics and other special glyphs no real label contains).
 *
 * Visual centering of a single-line label inside a shape (a pill, a chip,
 * a button) needs ink metrics, not font-box metrics — otherwise the label
 * sits asymmetrically inside the shape by the difference between the two.
 * `Pill` consumes this hook for that vertical-centering math.
 */
export type ActualTextMetrics = {
  /** Ink extent above the baseline, in CSS pixels. */
  actAscPx: number;
  /** Ink extent below the baseline, in CSS pixels. */
  actDescPx: number;
};

let actualMetricsCanvas: HTMLCanvasElement | null = null;

export function useActualTextMetrics(
  text: string,
  font: string,
): ActualTextMetrics {
  // Same fonts-ready dependency as the natural-width hook so the metrics
  // refresh once the bundled font is in.
  useFontsReady();

  if (typeof document === "undefined") {
    return { actAscPx: 0, actDescPx: 0 };
  }
  if (!actualMetricsCanvas) actualMetricsCanvas = document.createElement("canvas");
  const ctx = actualMetricsCanvas.getContext("2d");
  if (!ctx) return { actAscPx: 0, actDescPx: 0 };
  ctx.font = font;
  const m = ctx.measureText(text);
  return {
    actAscPx: m.actualBoundingBoxAscent,
    actDescPx: m.actualBoundingBoxDescent,
  };
}
