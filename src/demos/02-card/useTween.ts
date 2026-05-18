import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../../layout/motion";

/**
 * A RAF-driven tween toward a numeric target — used for Demo 2's hover morph.
 *
 * Honors `prefers-reduced-motion`: when the user prefers reduced motion the
 * value snaps to its target instantly (SPEC §10). A standalone helper here;
 * step 9 folds easing/duration into the `motion` design tokens.
 */

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function useTween(target: number, durationMs = 220): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  // Latest value, read at tween start without retriggering the effect.
  const valueRef = useRef(target);
  valueRef.current = value;

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (from === target) return;

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(from + (target - from) * easeInOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, durationMs]);

  return reduced ? target : value;
}
