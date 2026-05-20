import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../layout/motion";

/**
 * Array generalisation of [useTween]: each entry in `targets` is tweened
 * independently with one shared RAF, so a menu of N rows whose widths change
 * one-at-a-time produces a single 60 fps loop instead of N parallel ones.
 *
 * Honours `prefers-reduced-motion` (SPEC §10): when the user prefers reduced
 * motion the values snap to their targets.
 *
 * Assumes `targets.length` is stable across renders — a length change snaps
 * (no meaningful per-index "from" exists once the slots themselves shift).
 */

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function useTweenedNumbers(
  targets: readonly number[],
  durationMs = 240,
): number[] {
  const reduced = usePrefersReducedMotion();
  const [values, setValues] = useState<number[]>(() => targets.slice());
  // Latest values, read at tween start without retriggering the effect.
  const valuesRef = useRef<number[]>(values);
  valuesRef.current = values;

  // Stable signature for the dep — a fresh array on every render would
  // restart the tween mid-flight and snap to target each frame.
  const targetKey = targets.join("|");

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValues(targets.slice());
      return;
    }
    if (valuesRef.current.length !== targets.length) {
      setValues(targets.slice());
      return;
    }
    const from = valuesRef.current.slice();
    if (from.every((v, i) => v === targets[i])) return;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const e = easeInOut(t);
      setValues(from.map((v, i) => v + (targets[i] - v) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetKey, reduced, durationMs]);

  return reduced ? targets.slice() : values;
}
