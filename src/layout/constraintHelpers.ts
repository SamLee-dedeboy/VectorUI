/**
 * Layer 2 — constraint helpers for `useEditHandle`.
 *
 * The edit-handle protocol exposes raw `(point, onDrag)` pairs; once you
 * start wiring more than two of them together, the same patterns repeat —
 * scoop tips that move in only one axis, gap handles that report half the
 * drag distance because they sit in the middle of the gap, linked anchors
 * that follow a leader. Demo 8 hand-wrote each one. This file lifts those
 * patterns into reusable functions so the next constraint-cascade demo
 * doesn't reinvent them.
 *
 * Everything here is a *pure* descriptor — no React. The caller still passes
 * the result into `useEditHandle({ ...descriptor, id, ... })`; the helper
 * just builds the bookkeeping (the `point`, the `onDrag` callback that
 * converts the dragged xy back into the underlying scalar, the `axis` lock).
 * That keeps the helpers testable and keeps the React-ness in the demo.
 */

import type { CurvePoint } from "./walkPath";
import type { EditHandle } from "./editHandles";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

// --- axis-pinned scalar handle -------------------------------------------

export type AxisHandleSpec = {
  /** Read the current scalar (e.g. the scoop depth, the gap). */
  read: () => number;
  /** Commit a new scalar — already converted out of layout-XY space. */
  write: (next: number) => void;
  /** Which axis the handle is pinned to. The other axis is fixed at `fixed`. */
  axis: "x" | "y";
  /**
   * The fixed coordinate on the *other* axis — e.g. `y` for an axis="x"
   * handle. The handle is rendered at (scalar, fixed) for axis="x" and
   * (fixed, scalar) for axis="y", before `read` and `write` flip into the
   * caller's coordinate system.
   */
  fixed: number;
  /**
   * Convert the dragged layout-XY coordinate on the live axis into the
   * underlying scalar. Identity by default — used when the underlying value
   * is measured *from* a reference edge (e.g. scoop depth = cardWidth - x).
   */
  toScalar?: (live: number) => number;
  /**
   * Convert the underlying scalar back into the layout-XY coordinate on the
   * live axis. Should be the inverse of `toScalar`. Identity by default.
   */
  toLive?: (scalar: number) => number;
  /** Clamp the resulting scalar to a range. */
  range?: { min?: number; max?: number };
};

/**
 * Build a `{ point, axis, onDrag }` triple for an axis-pinned scalar drag.
 * Pair with `useEditHandle({ id, label, ...spec })`.
 *
 *   const h = makeAxisHandle({
 *     read: () => scoopDepth, write: setScoopDepth,
 *     axis: "x", fixed: bodyTop + scoopDepth,
 *     toScalar: (x) => cardWidth - x,
 *     toLive:   (d) => cardWidth - d,
 *     range: { min: SCOOP_MIN, max: SCOOP_MAX },
 *   });
 *   useEditHandle({ id: "scoop-tip", label: "Scoop depth", ...h });
 */
export function makeAxisHandle(
  spec: AxisHandleSpec,
): Pick<EditHandle, "point" | "axis" | "onDrag"> {
  const toScalar = spec.toScalar ?? ((live: number) => live);
  const toLive = spec.toLive ?? ((s: number) => s);
  const live = toLive(spec.read());
  const point: CurvePoint =
    spec.axis === "x"
      ? { x: live, y: spec.fixed }
      : { x: spec.fixed, y: live };
  return {
    point,
    axis: spec.axis,
    onDrag: (next: CurvePoint) => {
      const dragged = spec.axis === "x" ? next.x : next.y;
      let scalar = toScalar(dragged);
      if (spec.range) {
        scalar = clamp(
          scalar,
          spec.range.min ?? -Infinity,
          spec.range.max ?? Infinity,
        );
      }
      spec.write(scalar);
    },
  };
}

// --- gap handle (mid-gap, double-deflection) -----------------------------

export type GapHandleSpec = {
  /** Read the bottom edge of the slot the gap sits below. */
  topEdge: () => number;
  /** Read the current gap. */
  read: () => number;
  /** Write a new gap. */
  write: (gap: number) => void;
  /** x of the handle — usually the centre of the leader slot. */
  x: number;
  /** Range to clamp the gap to. */
  range?: { min?: number; max?: number };
};

/**
 * A gap handle sits in the *middle* of the gap (so the user can see it as a
 * "spacer") and reports the gap as the *full* distance between the leader's
 * bottom and the follower's top. Because the handle is at the midpoint,
 * dragging it by `d` pixels actually means the gap changed by `2 * d` — the
 * `*2` arithmetic Demo 8 used to spell out.
 */
export function makeGapHandle(
  spec: GapHandleSpec,
): Pick<EditHandle, "point" | "axis" | "onDrag"> {
  const top = spec.topEdge();
  const gap = spec.read();
  return {
    point: { x: spec.x, y: top + gap / 2 },
    axis: "y",
    onDrag: (next: CurvePoint) => {
      // Handle sits at mid-gap; the dragged y → gap is `(y - topEdge) * 2`.
      let g = (next.y - top) * 2;
      if (spec.range) {
        g = clamp(g, spec.range.min ?? 0, spec.range.max ?? Infinity);
      }
      spec.write(g);
    },
  };
}

// --- linked anchors (follower tracks leader by a fixed offset) -----------

export type LinkSpec = {
  /** Read the leader's current position. */
  leader: () => CurvePoint;
  /** Constant offset added to the leader to derive the follower. */
  offset: CurvePoint;
};

/**
 * Derive a follower's position from a leader plus a fixed offset. The
 * follower has no handle of its own in this mode — it moves whenever the
 * leader is dragged. Used by Demo 8's "linked" mode (body follows title).
 */
export function followerOf(spec: LinkSpec): CurvePoint {
  const a = spec.leader();
  return { x: a.x + spec.offset.x, y: a.y + spec.offset.y };
}
