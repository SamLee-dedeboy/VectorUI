import { wobbleEdge } from "./wobble";
import { intrusionFromReach } from "../layout/intrusionSampling";
import type { IntrusionFn } from "../layout/intrusionSampling";

/**
 * `scoopCard` — a card outline with a smooth concave scoop carved into its
 * left edge, paired with the matching intrusion profile so a paragraph can be
 * poured to follow that exact contour.
 *
 * The SAME scoop function feeds the drawn path and the intrusion query, so the
 * body text provably wraps the curve that is rendered — never an approximation
 * of it (cf. `cornerBlob`). It is what lets the card demonstrate that text
 * wrapping is not bound to a rectangle.
 *
 * An optional `wobble` amplitude jitters the four straight edges (top, right,
 * bottom, and the left's straight portions above/below the scoop) for a
 * hand-drawn aesthetic. The corner curves stay clean; the wobble envelope
 * fades to 0 at each endpoint so the edge always meets its corner cleanly.
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
  /** Hand-drawn wobble amplitude on the straight edges, in layout units. */
  wobble?: number;
};

export type ScoopCard = {
  /** SVG path data for the card outline at size (w, h). */
  path: (w: number, h: number) => string;
  /**
   * The scoop's intrusion into a text column, ready to hand to a `Text`'s
   * `flowAround`. `columnLeft`/`columnTop` give the column's top-left in card
   * space; the returned profile takes coordinates relative to the text block.
   */
  intrusionInto: (columnLeft: number, columnTop: number) => IntrusionFn;
};

export function scoopCard(opts: ScoopCardOptions): ScoopCard {
  const cornerRadius = opts.cornerRadius ?? 22;
  const { scoopTop, scoopHeight, depth } = opts;
  const samples = opts.samples ?? 48;
  const wobble = opts.wobble ?? 0;

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

    // Outline, drawn clockwise from the top-left corner. Each straight edge
    // is a wobble-sampled polyline; the corners stay clean Q curves.
    const d: string[] = [`M ${p(cr)} 0`];
    wobbleEdge(d, cr, 0, w - cr, 0, wobble, 0.3); // top
    d.push(`Q ${p(w)} 0 ${p(w)} ${p(cr)}`);
    wobbleEdge(d, w, cr, w, h - cr, wobble, 1.7); // right
    d.push(`Q ${p(w)} ${p(h)} ${p(w - cr)} ${p(h)}`);
    wobbleEdge(d, w - cr, h, cr, h, wobble, 2.8); // bottom
    d.push(`Q 0 ${p(h)} 0 ${p(h - cr)}`);
    wobbleEdge(d, 0, h - cr, 0, sBottom, wobble, 4.2); // left, below scoop

    // Walk the scoop upward, sampling the lobe so the rendered edge matches
    // the intrusion query point-for-point.
    if (sBottom > sTop) {
      for (let i = 1; i <= samples; i++) {
        const y = sBottom + ((sTop - sBottom) * i) / samples;
        d.push(`L ${p(scoopXAt(y))} ${p(y)}`);
      }
    }
    wobbleEdge(d, 0, sTop, 0, cr, wobble, 5.5); // left, above scoop
    d.push(`Q 0 0 ${p(cr)} 0`, "Z");
    return d.join(" ");
  };

  // The intrusion uses the same `scoopXAt` the path is drawn from. The
  // reach function is queried in column-local y (`intrusionFromReach`
  // contract); translate to card-y by adding `columnTop`, then subtract
  // the column's left inset to get how far the lobe pokes INTO the text
  // column.
  const intrusionInto = (
    columnLeft: number,
    columnTop: number,
  ): IntrusionFn =>
    intrusionFromReach(
      (yLocal) => Math.max(0, scoopXAt(columnTop + yLocal) - columnLeft),
      {
        // The lobe lives inside the scoop band; clip in column-local coords
        // so the sampler skips bands outside it.
        yMin: scoopTop - columnTop,
        yMax: scoopTop + scoopHeight - columnTop,
      },
    );

  return { path, intrusionInto };
}
