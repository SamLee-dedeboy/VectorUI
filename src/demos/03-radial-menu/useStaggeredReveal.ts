import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../layout/motion";

/**
 * A RAF-driven array tween that opens/closes a row of items one-by-one — used
 * by Demo 3's radial menu to fly chips out from the hub along their radial
 * trajectory. Each item's progress runs from 0 to 1 (or back), with a fixed
 * stagger between consecutive items, so the eye reads the reveal as a
 * left-to-right sweep rather than a parallel pop.
 *
 * Honors `prefers-reduced-motion`: when the user prefers reduced motion the
 * whole array snaps to the target state instantly (SPEC §10).
 */

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export type StaggeredRevealOptions = {
  /** How long each item takes to traverse 0 → 1, in milliseconds. */
  itemDurationMs?: number;
  /** Delay between consecutive items starting, in milliseconds. */
  staggerMs?: number;
};

export function useStaggeredReveal(
  count: number,
  open: boolean,
  { itemDurationMs = 300, staggerMs = 60 }: StaggeredRevealOptions = {},
): number[] {
  const reduced = usePrefersReducedMotion();
  const target = open ? 1 : 0;

  const [progress, setProgress] = useState<number[]>(() =>
    new Array(count).fill(target),
  );
  // Latest progress, read at tween start without retriggering the effect.
  const progressRef = useRef<number[]>(progress);
  progressRef.current = progress;

  // Re-shape the progress array when `count` changes.
  useEffect(() => {
    setProgress((prev) => {
      if (prev.length === count) return prev;
      const next = new Array(count).fill(target);
      for (let i = 0; i < Math.min(prev.length, count); i++) next[i] = prev[i];
      return next;
    });
  }, [count, target]);

  useEffect(() => {
    if (reduced) {
      setProgress(new Array(count).fill(target));
      return;
    }
    const from = progressRef.current.slice();
    if (from.every((v) => v === target)) return;

    const start = performance.now();
    const totalDuration = itemDurationMs + Math.max(0, count - 1) * staggerMs;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const next = from.map((v, i) => {
        const local = clamp01((elapsed - i * staggerMs) / itemDurationMs);
        const eased = easeOut(local);
        return v + (target - v) * eased;
      });
      setProgress(next);
      if (elapsed < totalDuration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, count, reduced, itemDurationMs, staggerMs]);

  return reduced ? new Array(count).fill(target) : progress;
}
