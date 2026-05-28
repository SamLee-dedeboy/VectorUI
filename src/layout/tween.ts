/**
 * Layer 2 — `useTween` and friends: RAF-driven prop tweening (SPEC §9 — motion).
 *
 * VectorUI primitives are pure functions of props. "Animating" therefore reduces
 * to **driving a prop over time and letting React re-render**. These five hooks
 * turn that pattern into one line for the four shapes of value that come up in
 * practice:
 *
 *   `useTween`            → scalar           (a transform's scale, an opacity)
 *   `useTweenedNumbers`   → readonly number[](row of widths, per-item progress)
 *   `useTweenedPoints`    → readonly CurvePoint[] (curve vertices to feed PathFlow)
 *   `useTweenedPath`      → string           (an SVG `d` to feed Card / Frame)
 *   `useStaggeredReveal`  → readonly number[](sugar: count + open → progress[])
 *
 * All four honor `usePrefersReducedMotion()` by snapping to target without
 * running the easing or RAF. Length / structure changes (a different-length
 * array, a path that no longer tokenizes the same) snap as well — there's no
 * sensible mid-flight bridge across a reshape.
 *
 * Internally everything delegates to a private `useTweenedAny<T>` core so the
 * RAF lifecycle, the reduced-motion gate, and the equality short-circuit live
 * in exactly one place.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./motion";
import type { CurvePoint } from "./walkPath";
import { tokenizePath } from "./morphPath";
import { easeInOut, easeOut, type Easing } from "./easings";

export type TweenOptions = {
  /** Tween duration in milliseconds. Defaults to 240. */
  durationMs?: number;
  /** Easing — any `(t: number) => number` on [0, 1]. Defaults to `easeInOut`. */
  easing?: Easing;
};

export type StaggeredTweenOptions = TweenOptions & {
  /** Per-index start delay, in milliseconds. 0 → all indices run in lockstep. */
  staggerMs?: number;
};

const DEFAULT_DURATION = 240;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// ---- Internal core ----------------------------------------------------------

/**
 * The one RAF loop. `interpolate` builds the current value from the snapshot
 * `from`, the live `target`, and the elapsed milliseconds. `totalDurationMs`
 * tells the loop when to stop scheduling. `equals` short-circuits when target
 * already matches the live value (e.g. mid-flight retargets back to the
 * current eased value).
 */
type TweenCore<T> = {
  interpolate: (from: T, target: T, elapsed: number) => T;
  totalDurationMs: number;
  equals: (a: T, b: T) => boolean;
  /** Defensive snapshot — store a copy of the live value at tween start. */
  snapshot: (v: T) => T;
};

/**
 * `targetKey` is a content hash of `target` (a string or number) — used as the
 * useEffect dep so the tween restarts when target *content* changes, not when
 * just the reference changes. Without this, consumers that build a fresh
 * targets array each render (e.g. `targets = items.map(…)`) would cancel and
 * restart the tween on every frame, making every animation crawl.
 */
function useTweenedAny<T>(
  target: T,
  targetKey: string | number,
  core: TweenCore<T>,
): T {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState<T>(() => core.snapshot(target));
  // The latest emitted value, snapshotted at the start of each new tween so
  // a mid-flight retarget continues from the eased mid-value, not the prior
  // target.
  const valueRef = useRef<T>(value);
  valueRef.current = value;
  // Latest target (the *content*, captured via ref so the effect closure reads
  // the live one even though `targetKey` is what triggers re-runs).
  const targetRef = useRef<T>(target);
  targetRef.current = target;
  // Stable handle on the (re-created-each-render) core configuration.
  const coreRef = useRef(core);
  coreRef.current = core;

  useEffect(() => {
    const cfg = coreRef.current;
    const t = targetRef.current;
    if (reduced) {
      setValue(cfg.snapshot(t));
      return;
    }
    if (cfg.equals(valueRef.current, t)) return;

    const from = cfg.snapshot(valueRef.current);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      setValue(cfg.interpolate(from, targetRef.current, elapsed));
      if (elapsed < cfg.totalDurationMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `targetKey` triggers a new tween when content actually changes.
    // `reduced` flips behavior between tween and snap. `target` and `core` are
    // read through refs so a fresh per-render reference doesn't re-trigger.
  }, [targetKey, reduced]);

  return value;
}

// ---- useTween (scalar) ------------------------------------------------------

/**
 * Scalar tween. Each render returns the current eased number on its way to
 * `target`. Mid-flight retargets continue from the eased mid-value, so e.g.
 * a hover-grow that the cursor leaves mid-flight reverses smoothly.
 */
export function useTween(target: number, opts?: TweenOptions): number {
  const durationMs = opts?.durationMs ?? DEFAULT_DURATION;
  const easing = opts?.easing ?? easeInOut;

  const core = useMemo<TweenCore<number>>(
    () => ({
      totalDurationMs: durationMs,
      equals: (a, b) => a === b,
      snapshot: (v) => v,
      interpolate: (from, t, elapsed) => {
        const k = easing(clamp01(elapsed / durationMs));
        return from + (t - from) * k;
      },
    }),
    [durationMs, easing],
  );

  // Numbers compare via Object.is — the target itself is its own content key.
  return useTweenedAny(target, target, core);
}

// ---- useTweenedNumbers (array + optional stagger) ---------------------------

const numbersEqual = (a: readonly number[], b: readonly number[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/**
 * Per-index tween of an array of scalars. Optional `staggerMs` gates each
 * index's start, so the visible reveal sweeps left-to-right rather than
 * popping in lockstep. Length change → snap to the new targets.
 */
export function useTweenedNumbers(
  targets: readonly number[],
  opts?: StaggeredTweenOptions,
): number[] {
  const durationMs = opts?.durationMs ?? DEFAULT_DURATION;
  const staggerMs = opts?.staggerMs ?? 0;
  const easing = opts?.easing ?? easeInOut;
  const count = targets.length;

  const total = durationMs + Math.max(0, count - 1) * staggerMs;

  const core = useMemo<TweenCore<readonly number[]>>(
    () => ({
      totalDurationMs: total,
      equals: numbersEqual,
      snapshot: (v) => v.slice(),
      interpolate: (from, t, elapsed) => {
        // Length change snaps — there's no per-index correspondence across a
        // reshape, and silently truncating papered over real bugs.
        if (from.length !== t.length) return t.slice();
        const out = new Array<number>(t.length);
        for (let i = 0; i < t.length; i++) {
          const local = clamp01((elapsed - i * staggerMs) / durationMs);
          const k = easing(local);
          out[i] = from[i] + (t[i] - from[i]) * k;
        }
        return out;
      },
    }),
    [durationMs, staggerMs, easing, total],
  );

  // Content-hash the targets array so a fresh `[…]` literal each render
  // doesn't restart the tween — Object.is on the joined string is true when
  // content matches, regardless of array reference.
  const key = targets.join(",");
  // useTweenedAny owns the cast — the public type is `number[]` (mutable
  // result), but internally we treat it as readonly to discourage external
  // mutation.
  return useTweenedAny<readonly number[]>(targets, key, core) as number[];
}

// ---- useTweenedPoints (vertex array) ----------------------------------------

const pointsEqual = (a: readonly CurvePoint[], b: readonly CurvePoint[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  }
  return true;
};

/**
 * Tween a vertex array. Endpoints must have equal length — pre-resample with
 * `uniformResample` if you're morphing between curves of different native
 * vertex counts. Length change → snap.
 */
export function useTweenedPoints(
  target: readonly CurvePoint[],
  opts?: TweenOptions,
): CurvePoint[] {
  const durationMs = opts?.durationMs ?? DEFAULT_DURATION;
  const easing = opts?.easing ?? easeInOut;

  const core = useMemo<TweenCore<readonly CurvePoint[]>>(
    () => ({
      totalDurationMs: durationMs,
      equals: pointsEqual,
      snapshot: (v) => v.map((p) => ({ x: p.x, y: p.y })),
      interpolate: (from, t, elapsed) => {
        if (from.length !== t.length) {
          return t.map((p) => ({ x: p.x, y: p.y }));
        }
        const k = easing(clamp01(elapsed / durationMs));
        const out = new Array<CurvePoint>(t.length);
        for (let i = 0; i < t.length; i++) {
          out[i] = {
            x: from[i].x + (t[i].x - from[i].x) * k,
            y: from[i].y + (t[i].y - from[i].y) * k,
          };
        }
        return out;
      },
    }),
    [durationMs, easing],
  );

  // Content-hash the points so a fresh array literal each render doesn't
  // restart the tween. Length + first/last endpoints are usually enough to
  // detect kind-change targets; we include all coords so equal-length but
  // differently-shaped point arrays still re-trigger.
  let key = String(target.length);
  for (let i = 0; i < target.length; i++) {
    key += "|" + target[i].x + "," + target[i].y;
  }
  return useTweenedAny<readonly CurvePoint[]>(target, key, core) as CurvePoint[];
}

// ---- useTweenedPath (path-d string) -----------------------------------------

/**
 * Parsed form of a path-d: command letters interleaved with their numeric
 * arguments. Carrying the parsed form keeps the per-frame work to a numeric
 * lerp — no regex, no string scan — and lets us cache the target's
 * tokenization across renders via `useMemo`.
 */
type ParsedPath = { tokens: string[]; numbers: (number | null)[] };

function parsePath(d: string): ParsedPath {
  const tokens = tokenizePath(d);
  const numbers: (number | null)[] = new Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    const n = Number(tokens[i]);
    numbers[i] = Number.isNaN(n) ? null : n;
  }
  return { tokens, numbers };
}

function pathsStructurallyMatch(a: ParsedPath, b: ParsedPath): boolean {
  if (a.tokens.length !== b.tokens.length) return false;
  for (let i = 0; i < a.tokens.length; i++) {
    const aNum = a.numbers[i] !== null;
    const bNum = b.numbers[i] !== null;
    if (aNum !== bNum) return false;
    if (!aNum && a.tokens[i] !== b.tokens[i]) return false;
  }
  return true;
}

/**
 * Tween an SVG path-d string. Endpoints must tokenize identically (same
 * command letters in the same positions) — use a single shape generator on
 * both sides to guarantee this, as Demo 7's `card()` family does.
 *
 * The target's tokenization is memoized once per target change; the per-frame
 * work is a tight numeric lerp + a join. This is the key perf advantage over
 * calling `morphPath(from, to, t)` directly inside an animation loop.
 */
export function useTweenedPath(target: string, opts?: TweenOptions): string {
  const durationMs = opts?.durationMs ?? DEFAULT_DURATION;
  const easing = opts?.easing ?? easeInOut;

  const targetParsed = useMemo(() => parsePath(target), [target]);

  const core = useMemo<TweenCore<string>>(() => {
    // Parsed `from` is built once per core (i.e. once per new target) and
    // re-used across every frame of that tween. The whole point of the hook —
    // calling `morphPath(from, to, t)` directly inside a RAF loop would
    // re-tokenize both sides on every frame.
    let fromParsed: ParsedPath | null = null;
    return {
      totalDurationMs: durationMs,
      equals: (a, b) => a === b,
      snapshot: (v) => v,
      interpolate: (from, _t, elapsed) => {
        if (fromParsed === null) fromParsed = parsePath(from);
        if (!pathsStructurallyMatch(fromParsed, targetParsed)) {
          return target; // snap on structural mismatch
        }
        const k = easing(clamp01(elapsed / durationMs));
        const out = new Array<string>(targetParsed.tokens.length);
        for (let i = 0; i < targetParsed.tokens.length; i++) {
          const aN = fromParsed.numbers[i];
          const bN = targetParsed.numbers[i];
          if (aN === null || bN === null) {
            out[i] = targetParsed.tokens[i];
          } else {
            out[i] = String(round3(aN + (bN - aN) * k));
          }
        }
        return out.join(" ");
      },
    };
  }, [durationMs, easing, target, targetParsed]);

  // Path-d is a primitive string — it IS its own content key.
  return useTweenedAny(target, target, core);
}

// ---- useStaggeredReveal (sugar) ---------------------------------------------

/**
 * Demo-3-style staggered reveal: synthesizes a `[0,0,…]` → `[1,1,…]` targets
 * array of length `count` driven by the `open` flag, with stagger between
 * neighbours. Defaults match Demo 3A's reveal aesthetic exactly:
 * `itemDurationMs = 300`, `staggerMs = 60`, `easing = easeOut`.
 */
export function useStaggeredReveal(
  count: number,
  open: boolean,
  opts?: {
    itemDurationMs?: number;
    staggerMs?: number;
    easing?: Easing;
  },
): number[] {
  const target = open ? 1 : 0;
  // Stable reference for equal targets across renders — useTweenedNumbers' own
  // equality check would catch a fresh `[1,1,…]`, but reusing the same array
  // avoids the redundant effect dep change.
  const targets = useMemo(
    () => new Array<number>(count).fill(target),
    [count, target],
  );
  return useTweenedNumbers(targets, {
    durationMs: opts?.itemDurationMs ?? 300,
    staggerMs: opts?.staggerMs ?? 60,
    easing: opts?.easing ?? easeOut,
  });
}
