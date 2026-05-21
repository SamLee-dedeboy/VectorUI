import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../layout/motion";
import { lerpPoints } from "../../layout/curveMorph";
import type { CurvePoint } from "../../layout/walkPath";
import { curvePoints, type CurveKind, type CurveScene } from "./curves";

/**
 * Smoothly morph the curve's vertices when `kind` changes — the basis of
 * Version B's "curves animate naturally" demo. Because every curve is
 * resampled to the same number of arc-length-spaced points (see `curves.ts`),
 * morphing is just a point-by-point lerp (`lerpPoints`, in the library);
 * PathFlow then sees a continuously deforming polyline and slides items
 * along it for free.
 *
 * Honors `prefers-reduced-motion`: the morph is skipped and the target
 * vertices are returned immediately (SPEC §10).
 */

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function useMorphedCurve(
  kind: CurveKind,
  scene: CurveScene,
  durationMs = 360,
): CurvePoint[] {
  const reduced = usePrefersReducedMotion();

  // Target vertices for the current `kind` — recomputed only when inputs change.
  const target = useMemo(() => curvePoints(kind, scene), [kind, scene]);

  const [points, setPoints] = useState<CurvePoint[]>(target);
  // Latest emitted points, snapshotted at the start of each tween.
  const pointsRef = useRef<CurvePoint[]>(points);
  pointsRef.current = points;

  useEffect(() => {
    if (reduced) {
      setPoints(target);
      return;
    }
    const from = pointsRef.current;
    if (
      from.length === target.length &&
      from.every((p, i) => p.x === target[i].x && p.y === target[i].y)
    ) {
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setPoints(lerpPoints(from, target, easeInOut(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, durationMs]);

  return reduced ? target : points;
}
