/**
 * `scoopCard` — a card outline with a smooth concave scoop carved into its
 * left edge, paired with the matching intrusion profile so a paragraph can be
 * poured to follow that exact contour.
 *
 * The SAME scoop function feeds the drawn path and the intrusion query, so the
 * body text provably wraps the curve that is rendered — never an approximation
 * of it (cf. `cornerBlob` in demo 1). It is what lets the card demonstrate
 * that text wrapping is not bound to a rectangle.
 *
 * All coordinates are in layout units, with the card's top-left at (0, 0).
 */

const round = (n: number) => Math.round(n * 100) / 100;

export type ScoopCardOptions = {
  /** Corner radius of the underlying rounded rectangle. */
  cornerRadius?: number;
  /** Card-space y at which the scoop band begins. */
  scoopTop: number;
  /** Vertical extent of the scoop band, in layout units. */
  scoopHeight: number;
  /** Maximum inward reach of the scoop, measured from the card's left edge. */
  depth: number;
  /** Outline sample count for the scoop curve — higher is smoother. */
  samples?: number;
};

/** A `FlowAround.intrusionAt`: left intrusion over a [yTop, yBottom] band. */
export type IntrusionProfile = (yTop: number, yBottom: number) => number;

export type ScoopCard = {
  /** SVG path data for the card outline at size (w, h). */
  path: (w: number, h: number) => string;
  /**
   * The scoop's intrusion into a text column, ready to hand to a `Text`'s
   * `flowAround`. `columnLeft`/`columnTop` give the column's top-left in card
   * space; the returned profile takes coordinates relative to the text block.
   */
  intrusionInto: (columnLeft: number, columnTop: number) => IntrusionProfile;
};

export function scoopCard(opts: ScoopCardOptions): ScoopCard {
  const cornerRadius = opts.cornerRadius ?? 22;
  const { scoopTop, scoopHeight, depth } = opts;
  const samples = opts.samples ?? 48;

  // The scoop curve: how far the left edge bows inward at a given card-y.
  // A single smooth lobe — zero at the band's ends, `depth` at its middle.
  const scoopXAt = (cardY: number): number => {
    if (cardY <= scoopTop || cardY >= scoopTop + scoopHeight) return 0;
    const t = (cardY - scoopTop) / scoopHeight;
    return depth * Math.sin(Math.PI * t);
  };

  const path = (w: number, h: number): string => {
    const cr = Math.min(cornerRadius, w / 2, h / 2);
    const p = round;
    // Clamp the scoop band inside the straight part of the left edge.
    const sTop = Math.max(scoopTop, cr);
    const sBottom = Math.min(scoopTop + scoopHeight, h - cr);

    // Outline, drawn clockwise from the top-left corner.
    const d = [
      `M ${p(cr)} 0`,
      `L ${p(w - cr)} 0`,
      `Q ${p(w)} 0 ${p(w)} ${p(cr)}`,
      `L ${p(w)} ${p(h - cr)}`,
      `Q ${p(w)} ${p(h)} ${p(w - cr)} ${p(h)}`,
      `L ${p(cr)} ${p(h)}`,
      `Q 0 ${p(h)} 0 ${p(h - cr)}`,
      `L 0 ${p(sBottom)}`,
    ];
    // Walk the scoop upward, sampling the lobe so the rendered edge matches
    // the intrusion query point-for-point.
    if (sBottom > sTop) {
      for (let i = 1; i <= samples; i++) {
        const y = sBottom + ((sTop - sBottom) * i) / samples;
        d.push(`L ${p(scoopXAt(y))} ${p(y)}`);
      }
    }
    d.push(`L 0 ${p(cr)}`, `Q 0 0 ${p(cr)} 0`, "Z");
    return d.join(" ");
  };

  const intrusionInto =
    (columnLeft: number, columnTop: number): IntrusionProfile =>
    (yTop, yBottom) => {
      // Sample across the line band and take the widest reach, so a lobe
      // never pokes through a line that nominally clears it.
      let max = 0;
      const STEPS = 6;
      for (let i = 0; i <= STEPS; i++) {
        const cardY = columnTop + yTop + ((yBottom - yTop) * i) / STEPS;
        max = Math.max(max, scoopXAt(cardY) - columnLeft);
      }
      return Math.max(0, max);
    };

  return { path, intrusionInto };
}
