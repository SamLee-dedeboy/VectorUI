/**
 * A floated organic blob that hugs the top-left corner of a text column.
 *
 * The blob's left and top edges are straight (flush against the column corner,
 * so the eye never sees them); its lower-right boundary is an organic
 * silhouette. Crucially the SAME `edgeX` profile generates both the rendered
 * path and the `intrusionAt` query — so the text provably wraps the exact
 * curve that is drawn, not an approximation of it.
 *
 * All coordinates are in layout units, with the blob's top-left at (0, 0).
 */

export type CornerFloat = {
  /** SVG path data for the blob outline. */
  path: string;
  /** Bounding-box width, in layout units. */
  width: number;
  /** Bounding-box height, in layout units. */
  height: number;
  /**
   * Left intrusion of the blob over the vertical band [yTop, yBottom], in
   * layout units. 0 once the band clears the blob's bottom.
   */
  intrusionAt: (yTop: number, yBottom: number) => number;
};

export type CornerBlobOptions = {
  /** Max horizontal reach of the blob, layout units. */
  width?: number;
  /** Vertical extent of the blob, layout units. */
  height?: number;
  /** Outline sample count — higher is smoother. */
  samples?: number;
  /** Lobe depth — how deeply the silhouette is carved inward (0…1). */
  amp?: number;
  /** Lobe frequency — how many carved waves run down the silhouette. */
  bumps?: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function cornerBlob(opts: CornerBlobOptions = {}): CornerFloat {
  const width = opts.width ?? 156;
  const height = opts.height ?? 200;
  const samples = opts.samples ?? 96;

  // Lobe depth and frequency. A non-integer frequency keeps the silhouette
  // from looking mechanically symmetric.
  const AMP = opts.amp ?? 0.22;
  const BUMPS = opts.bumps ?? 3.4;

  /**
   * The blob's right edge: its x at vertical fraction t ∈ [0, 1].
   * - `taper` falls smoothly from the full width at the top to 0 at the
   *   bottom, so the blob comes to a soft point in the corner.
   * - `carve` cuts organic lobes *inward* (never outward), gated by an
   *   `envelope` that vanishes at both ends so the silhouette still meets the
   *   column edges cleanly. Carving inward keeps `width` a true maximum.
   */
  const edgeX = (t: number): number => {
    const taper = Math.cos((t * Math.PI) / 2);
    const envelope = Math.sin(t * Math.PI);
    const lobe = 0.5 + 0.5 * Math.sin(BUMPS * t * Math.PI); // ∈ [0, 1]
    const carve = 1 - AMP * envelope * lobe; // ∈ [1 - AMP, 1]
    return Math.max(0, width * taper * carve);
  };

  // Closed outline: top edge, organic right silhouette, then up the left edge.
  let path = `M 0 0 L ${round(width)} 0`;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    path += ` L ${round(edgeX(t))} ${round(t * height)}`;
  }
  path += " L 0 0 Z";

  const intrusionAt = (yTop: number, yBottom: number): number => {
    if (yBottom <= 0 || yTop >= height) return 0;
    const lo = Math.max(0, Math.min(height, yTop));
    const hi = Math.max(0, Math.min(height, yBottom));
    // Sample across the band and take the widest reach, so a bump never
    // pokes through a line that nominally sits below it.
    let max = 0;
    const STEPS = 6;
    for (let i = 0; i <= STEPS; i++) {
      const y = lo + ((hi - lo) * i) / STEPS;
      max = Math.max(max, edgeX(y / height));
    }
    return max;
  };

  return { path, width, height, intrusionAt };
}
