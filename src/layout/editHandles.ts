import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type MutableRefObject,
} from "react";
import type { CurvePoint } from "./walkPath";

/**
 * Layer 2 — direct-manipulation edit handles (Phase 3).
 *
 * The protocol that lets any VectorUI component expose draggable points
 * without owning a drag widget. The component declares *what* is editable
 * via `useEditHandle({ id, point, onDrag })`; the rendering of those handles
 * is decided by whoever wraps the subtree:
 *
 *  - `<DesignSurface>` aggregates all registered handles into one overlay
 *    layer above the scene, so a single edit mode lights up everything in
 *    the subtree (the "design tool" mode).
 *  - A per-component `edit` prop wraps that one component in its own
 *    DesignSurface, surfacing only its handles.
 *
 * Both routes share this registry. Components register a *ref* to the
 * handle so the surface always reads the current `point` and `onDrag` —
 * neither needs to be memoised by the caller.
 *
 * Coordinate model: `point` is in layout units, the same space as
 * VectorUIRoot's viewBox. Pointer events get reconciled to this space via
 * the SVG's screen CTM in the rendering layer.
 */

/** A single editable point exposed by a component. */
export type EditHandle = {
  /** Stable across renders. Identifies the handle inside the surface. */
  id: string;
  /** Anchor point in layout units. */
  point: CurvePoint;
  /** Called with the new layout-space point on drag. */
  onDrag: (next: CurvePoint) => void;
  /** Constrain motion: "x" pins y, "y" pins x. Default "free". */
  axis?: "x" | "y" | "free";
  /** Short label for tooltips / a11y. */
  label?: string;
};

/** Internal: the registry entry stores a ref so the surface always reads
 *  the latest handle without forcing the caller to memoise. */
type Entry = { ref: MutableRefObject<EditHandle> };

export type EditModeContextValue = {
  active: boolean;
  /** Register a ref. Returns an unregister fn (used as an effect cleanup). */
  register?: (id: string, ref: MutableRefObject<EditHandle>) => () => void;
  /** Bump the version so subscribers re-read handle refs. Called after every
   *  render of every registered component. */
  ping?: () => void;
  /** Subscribe to registry version changes. */
  subscribe?: (listener: () => void) => () => void;
  /** Snapshot the currently-registered handles. */
  snapshot?: () => EditHandle[];
};

const INACTIVE: EditModeContextValue = { active: false };

export const EditModeContext =
  createContext<EditModeContextValue>(INACTIVE);

/**
 * Build a registry. Used by `<DesignSurface>` (and by tests). Keeps a
 * map of refs plus a version counter; subscribers wake on version bumps
 * (either a register / unregister or an explicit `ping`).
 */
export function createEditRegistry() {
  const entries = new Map<string, Entry>();
  let version = 0;
  let cachedSnapshot: EditHandle[] = [];
  let cachedAtVersion = -1;
  const listeners = new Set<() => void>();

  const notify = () => {
    version += 1;
    for (const l of listeners) l();
  };

  const value: EditModeContextValue = {
    active: true,
    register(id, ref) {
      entries.set(id, { ref });
      notify();
      return () => {
        // Only delete if the ref is the same — guards against an effect
        // cleanup running after a remount has already re-registered.
        if (entries.get(id)?.ref === ref) {
          entries.delete(id);
          notify();
        }
      };
    },
    ping: notify,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    snapshot() {
      // useSyncExternalStore requires the same reference for the same state.
      // Rebuild only when the version has moved.
      if (cachedAtVersion !== version) {
        cachedSnapshot = Array.from(entries.values(), (e) => e.ref.current);
        cachedAtVersion = version;
      }
      return cachedSnapshot;
    },
  };

  return {
    value,
    getVersion: () => version,
  };
}

/** Read whether edit mode is on. Components that conditionally render
 *  inline chrome (e.g. corner markers) use this. */
export function useEditMode(): { active: boolean } {
  const ctx = useContext(EditModeContext);
  return { active: ctx.active };
}

/**
 * Declare a draggable handle. The component renders normally; the surrounding
 * `<DesignSurface>` is responsible for drawing the handle and wiring drag.
 *
 * The hook returns the current `active` so a component can branch (e.g.
 * disable a click-to-set in edit mode), but it does NOT render anything
 * itself — that decoupling is the whole point of the protocol.
 */
export function useEditHandle(handle: EditHandle): { active: boolean } {
  const ctx = useContext(EditModeContext);
  const ref = useRef(handle);
  // Refresh the ref to the latest closure on every render — refs are mutable
  // and read by the surface during its own render.
  ref.current = handle;

  // Register on mount; unregister on unmount or id change.
  useEffect(() => {
    if (!ctx.active || !ctx.register) return;
    return ctx.register(handle.id, ref);
    // `ref` is stable; `ctx` updates on Provider remount (rare).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, handle.id]);

  // Wake subscribers each render so the surface re-reads point + onDrag.
  useEffect(() => {
    if (ctx.active) ctx.ping?.();
  });

  return { active: ctx.active };
}

/** A hook for the rendering surface: read the current handles and re-render
 *  when the registry changes. */
export function useRegisteredHandles(
  ctx: EditModeContextValue,
): EditHandle[] {
  return useSyncExternalStore(
    ctx.subscribe ?? (() => () => {}),
    ctx.snapshot ?? (() => EMPTY),
    () => EMPTY,
  );
}

const EMPTY: EditHandle[] = [];
