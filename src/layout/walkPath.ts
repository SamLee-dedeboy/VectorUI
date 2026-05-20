/**
 * Layer 2 — arc-length curve math for `PathFlow`.
 *
 * A `Curve` is a parametric path that can answer three questions: how long is
 * it, where is the point at a given arc-length, and which way does it point
 * there. `PathFlow` uses these to place children at exact arc-length offsets
 * and rotate them to the tangent.
 *
 * Curves are pure (no DOM), so the math is unit-testable. This covers the
 * shapes the prototype needs — arcs and straight lines. Supporting an
 * arbitrary `<path d>` string (via the browser's `getPointAtLength`) is a
 * deliberate future extension, not built yet.
 */

export type CurvePoint = { x: number; y: number };

export type Curve = {
  /** Total arc length, in layout units. */
  length: number;
  /** Point at arc-length s (clamped to [0, length]). */
  pointAtLength: (s: number) => CurvePoint;
  /** Tangent direction at arc-length s, in radians. */
  tangentAtLength: (s: number) => number;
  /** SVG path data for drawing the curve itself. */
  toPathData: () => string;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n * 1000) / 1000;

// --- line -----------------------------------------------------------------

export type LineSpec = { x1: number; y1: number; x2: number; y2: number };

/** A straight line. With `distribute="start"` this makes PathFlow a flex row
 *  — flex is the degenerate case (SPEC §6.2). */
export function line({ x1, y1, x2, y2 }: LineSpec): Curve {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  return {
    length,
    pointAtLength(s) {
      const t = length === 0 ? 0 : clamp(s, 0, length) / length;
      return { x: x1 + dx * t, y: y1 + dy * t };
    },
    tangentAtLength() {
      return angle;
    },
    toPathData() {
      return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;
    },
  };
}

// --- arc ------------------------------------------------------------------

export type ArcSpec = {
  cx: number;
  cy: number;
  radius: number;
  /** Start/end angle in radians (0 = +x axis, increasing clockwise in SVG). */
  startAngle: number;
  endAngle: number;
};

/** A circular arc. The basis of Demo 3's radial menu. */
export function arc({ cx, cy, radius, startAngle, endAngle }: ArcSpec): Curve {
  const sweep = endAngle - startAngle; // signed
  const length = Math.abs(sweep) * radius;
  // Tangent leads the radius by 90° in the sweep direction.
  const tangentOffset = sweep >= 0 ? Math.PI / 2 : -Math.PI / 2;

  const angleAt = (s: number) => {
    const t = length === 0 ? 0 : clamp(s, 0, length) / length;
    return startAngle + sweep * t;
  };

  return {
    length,
    pointAtLength(s) {
      const a = angleAt(s);
      return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
    },
    tangentAtLength(s) {
      return angleAt(s) + tangentOffset;
    },
    toPathData() {
      const sweepFlag = sweep >= 0 ? 1 : 0;
      const p0 = {
        x: cx + radius * Math.cos(startAngle),
        y: cy + radius * Math.sin(startAngle),
      };
      // A full circle starts and ends at the same point, so a single
      // A-command (which draws from the current point to its endpoint)
      // degenerates. Split into two half-sweeps via an intermediate point.
      if (Math.abs(sweep) >= 2 * Math.PI - 1e-9) {
        const midAngle = startAngle + sweep / 2;
        const pm = {
          x: cx + radius * Math.cos(midAngle),
          y: cy + radius * Math.sin(midAngle),
        };
        return (
          `M ${round(p0.x)} ${round(p0.y)} ` +
          `A ${round(radius)} ${round(radius)} 0 0 ${sweepFlag} ` +
          `${round(pm.x)} ${round(pm.y)} ` +
          `A ${round(radius)} ${round(radius)} 0 0 ${sweepFlag} ` +
          `${round(p0.x)} ${round(p0.y)}`
        );
      }
      const p1 = {
        x: cx + radius * Math.cos(endAngle),
        y: cy + radius * Math.sin(endAngle),
      };
      const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
      return (
        `M ${round(p0.x)} ${round(p0.y)} ` +
        `A ${round(radius)} ${round(radius)} 0 ${largeArc} ${sweepFlag} ` +
        `${round(p1.x)} ${round(p1.y)}`
      );
    },
  };
}

// --- polyline -------------------------------------------------------------

export type PolylineSpec = {
  /** Ordered vertices. Must have at least two. */
  points: CurvePoint[];
};

/**
 * A piecewise-linear curve through `points` — the building block for any
 * curve sampled as a sequence of vertices (a sine wave, a square wave, a
 * polygon edge, an SVG path traced offline). Arc-length is exact; the tangent
 * is the segment angle, with jumps at the corners (use `orient="upright"`
 * with `PathFlow` when those jumps would spin chips at the kinks).
 */
export function polyline({ points }: PolylineSpec): Curve {
  if (points.length < 2) {
    throw new Error("polyline needs at least two points");
  }

  const cumulative: number[] = [0];
  const tangents: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
    tangents.push(Math.atan2(dy, dx));
  }
  const length = cumulative[cumulative.length - 1];

  const segmentAt = (s: number) => {
    const target = clamp(s, 0, length);
    let i = 0;
    while (i < tangents.length - 1 && cumulative[i + 1] < target) i++;
    return i;
  };

  return {
    length,
    pointAtLength(s) {
      const i = segmentAt(s);
      const segLen = cumulative[i + 1] - cumulative[i];
      const t = segLen > 0 ? (clamp(s, 0, length) - cumulative[i]) / segLen : 0;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    },
    tangentAtLength(s) {
      return tangents[segmentAt(s)];
    },
    toPathData() {
      return (
        "M " +
        points.map((p) => `${round(p.x)} ${round(p.y)}`).join(" L ")
      );
    },
  };
}

// --- quadratic Bézier -----------------------------------------------------

export type QuadraticSpec = {
  p0: CurvePoint;
  control: CurvePoint;
  p1: CurvePoint;
};

/**
 * A quadratic Bézier curve. Its three control points can be interpolated to
 * morph between curves of different character — a straight line (control at
 * the midpoint) and a bowed arc-like curve — which is what Demo 3 animates.
 *
 * Arc length has no closed form for a quadratic, so it is approximated with a
 * cumulative chord-length table; `pointAtLength` is then arc-length accurate.
 */
export function quadratic({ p0, control, p1 }: QuadraticSpec): Curve {
  const at = (u: number): CurvePoint => {
    const v = 1 - u;
    return {
      x: v * v * p0.x + 2 * v * u * control.x + u * u * p1.x,
      y: v * v * p0.y + 2 * v * u * control.y + u * u * p1.y,
    };
  };
  const derivative = (u: number): CurvePoint => {
    const v = 1 - u;
    return {
      x: 2 * v * (control.x - p0.x) + 2 * u * (p1.x - control.x),
      y: 2 * v * (control.y - p0.y) + 2 * u * (p1.y - control.y),
    };
  };

  // Cumulative chord lengths over a uniform-u sampling.
  const STEPS = 64;
  const cumulative: number[] = [0];
  let prev = at(0);
  for (let i = 1; i <= STEPS; i++) {
    const point = at(i / STEPS);
    cumulative.push(
      cumulative[i - 1] + Math.hypot(point.x - prev.x, point.y - prev.y),
    );
    prev = point;
  }
  const length = cumulative[STEPS];

  // Invert the table: arc-length s -> Bézier parameter u.
  const uAtLength = (s: number): number => {
    const target = clamp(s, 0, length);
    let i = 0;
    while (i < STEPS && cumulative[i + 1] < target) i++;
    const span = cumulative[i + 1] - cumulative[i];
    const frac = span > 0 ? (target - cumulative[i]) / span : 0;
    return (i + frac) / STEPS;
  };

  return {
    length,
    pointAtLength: (s) => at(uAtLength(s)),
    tangentAtLength: (s) => {
      const d = derivative(uAtLength(s));
      return Math.atan2(d.y, d.x);
    },
    toPathData: () =>
      `M ${round(p0.x)} ${round(p0.y)} ` +
      `Q ${round(control.x)} ${round(control.y)} ${round(p1.x)} ${round(p1.y)}`,
  };
}

// --- sampling -------------------------------------------------------------

/**
 * A point on a curve with the parameters that produced it. `s` is arc length,
 * `t` is its 0..1 normalisation (`t = s / length`). `tangent` is in radians.
 */
export type CurveSample = {
  s: number;
  t: number;
  point: CurvePoint;
  tangent: number;
};

/**
 * Convenience over `pointAtLength`/`tangentAtLength` for callers that think in
 * 0..1 (sliders, edit handles). `t` is clamped.
 */
export function pointAt(curve: Curve, t: number): CurveSample {
  const ct = clamp(t, 0, 1);
  const s = ct * curve.length;
  return {
    s,
    t: ct,
    point: curve.pointAtLength(s),
    tangent: curve.tangentAtLength(s),
  };
}

/** Result of `nearestPointOnCurve`. */
export type NearestPoint = {
  /** Arc length from the start of the curve to the nearest point. */
  s: number;
  /** `s / curve.length`, in [0, 1]. Zero when the curve has zero length. */
  t: number;
  /** The closest point on the curve. */
  point: CurvePoint;
  /** Straight-line distance from `target` to `point`. */
  distance: number;
};

export type NearestPointOptions = {
  /** Coarse samples for the initial scan. Default 64 — matches the quadratic
   *  arc-length table. */
  samples?: number;
  /** Ternary-search refinement steps after the coarse scan. Default 12 —
   *  ~1/3^12 of a sample window, well under a sub-pixel for any sane curve. */
  refineSteps?: number;
};

/**
 * Find the point on `curve` closest to `target`. The arc-length-parameterised
 * inverse of `pointAtLength`: pointer-XY → `t`, what `CurveSlider` and any
 * drag-along-curve interaction needs.
 *
 * Strategy: a uniform coarse sweep finds the nearest sample, then ternary
 * search refines within ±one sample step. This is robust for the kinks in
 * `polyline` (where calculus-based methods misbehave) and accurate enough for
 * a hit test on any of the built-in curves.
 */
export function nearestPointOnCurve(
  curve: Curve,
  target: CurvePoint,
  options: NearestPointOptions = {},
): NearestPoint {
  const samples = Math.max(2, options.samples ?? 64);
  const refineSteps = Math.max(0, options.refineSteps ?? 12);
  const L = curve.length;

  if (L === 0) {
    const point = curve.pointAtLength(0);
    return {
      s: 0,
      t: 0,
      point,
      distance: Math.hypot(target.x - point.x, target.y - point.y),
    };
  }

  // Coarse pass — sample uniformly in arc length and pick the closest.
  let bestS = 0;
  let bestD2 = Infinity;
  for (let i = 0; i <= samples; i++) {
    const s = (L * i) / samples;
    const p = curve.pointAtLength(s);
    const d2 = (target.x - p.x) ** 2 + (target.y - p.y) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestS = s;
    }
  }

  // Refine within ±one sample step via ternary search.
  const step = L / samples;
  let lo = Math.max(0, bestS - step);
  let hi = Math.min(L, bestS + step);
  for (let i = 0; i < refineSteps; i++) {
    const third = (hi - lo) / 3;
    const m1 = lo + third;
    const m2 = hi - third;
    const p1 = curve.pointAtLength(m1);
    const p2 = curve.pointAtLength(m2);
    const d1 = (target.x - p1.x) ** 2 + (target.y - p1.y) ** 2;
    const d2 = (target.x - p2.x) ** 2 + (target.y - p2.y) ** 2;
    if (d1 < d2) hi = m2;
    else lo = m1;
  }
  const s = (lo + hi) / 2;
  const point = curve.pointAtLength(s);
  return {
    s,
    t: s / L,
    point,
    distance: Math.hypot(target.x - point.x, target.y - point.y),
  };
}

// --- distribution ---------------------------------------------------------

export type Distribute = "even" | "start" | "end" | "spread";

export type DistributeOptions = {
  distribute: Distribute;
  /** Gap between items, layout units — used by "start"/"end". */
  gap?: number;
  /** Natural widths of items — used by "start"/"end"/"spread". */
  itemWidths?: number[];
};

/**
 * Compute the arc-length offset of each item's CENTER along a curve.
 *
 * - `even`   — equal spacing with half-gaps at both ends (ignores widths).
 * - `spread` — first item flush to the start, last to the end, equal gaps
 *              between (the `space-between` case; needs widths).
 * - `start`  — packed from the start with a fixed `gap` (the flex row).
 * - `end`    — packed against the end with a fixed `gap`.
 */
export function distributeAlong(
  curveLength: number,
  count: number,
  opts: DistributeOptions,
): number[] {
  if (count <= 0) return [];
  const widths = opts.itemWidths ?? new Array(count).fill(0);
  const gap = opts.gap ?? 0;

  if (opts.distribute === "even" || count === 1) {
    return Array.from(
      { length: count },
      (_, i) => (curveLength * (i + 0.5)) / count,
    );
  }

  const totalWidth = widths.reduce((a, b) => a + b, 0);

  if (opts.distribute === "spread") {
    const slack = (curveLength - totalWidth) / (count - 1);
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < count; i++) {
      offsets.push(acc + widths[i] / 2);
      acc += widths[i] + slack;
    }
    return offsets;
  }

  // "start" / "end": pack with a fixed gap.
  const block = totalWidth + gap * (count - 1);
  const base = opts.distribute === "end" ? curveLength - block : 0;
  const offsets: number[] = [];
  let acc = base;
  for (let i = 0; i < count; i++) {
    offsets.push(acc + widths[i] / 2);
    acc += widths[i] + gap;
  }
  return offsets;
}
