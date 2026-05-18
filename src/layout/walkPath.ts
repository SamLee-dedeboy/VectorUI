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
      const p0 = {
        x: cx + radius * Math.cos(startAngle),
        y: cy + radius * Math.sin(startAngle),
      };
      const p1 = {
        x: cx + radius * Math.cos(endAngle),
        y: cy + radius * Math.sin(endAngle),
      };
      const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
      const sweepFlag = sweep >= 0 ? 1 : 0;
      return (
        `M ${round(p0.x)} ${round(p0.y)} ` +
        `A ${round(radius)} ${round(radius)} 0 ${largeArc} ${sweepFlag} ` +
        `${round(p1.x)} ${round(p1.y)}`
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
