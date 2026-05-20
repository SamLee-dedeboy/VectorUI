import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import {
  EditModeContext,
  createEditRegistry,
  useRegisteredHandles,
  type EditHandle,
} from "../layout/editHandles";
import type { CurvePoint } from "../layout/walkPath";
import { tokens } from "../tokens";

/**
 * Layer 3 — `DesignSurface`: the "edit mode" wrapper.
 *
 * Activates the edit-handle protocol for its subtree: any descendant that
 * calls `useEditHandle({...})` shows up in the surface's overlay as a
 * draggable point. The overlay is rendered after the subtree so handles
 * sit on top of the running UI without changing its layout.
 *
 * One surface aggregates all handles in its subtree (the "design tool"
 * mode). For single-component editing, pass `edit` to the component
 * itself — by convention that wraps the component in its own DesignSurface,
 * scoped to just that subtree.
 */
export type DesignSurfaceProps = SVGProps<SVGGElement> & {
  children: ReactNode;
  /** Hide handles without unmounting the subtree. Default false. */
  inert?: boolean;
  /** Handle radius, in layout units. Default 6. */
  handleRadius?: number;
  /** Handle fill. Default `color.surface`. */
  handleFill?: string;
  /** Handle outline. Default `color.accent`. */
  handleStroke?: string;
};

export function DesignSurface({
  children,
  inert = false,
  handleRadius = 6,
  handleFill = tokens.color.surface,
  handleStroke = tokens.color.accent,
  ...gProps
}: DesignSurfaceProps) {
  // The registry is owned by this DesignSurface instance.
  const registry = useMemo(() => createEditRegistry(), []);
  const handles = useRegisteredHandles(registry.value);

  return (
    <EditModeContext.Provider value={registry.value}>
      <g {...gProps}>
        {children}
        {!inert && (
          <g aria-hidden>
            {handles.map((handle) => (
              <HandleVisual
                key={handle.id}
                handle={handle}
                radius={handleRadius}
                fill={handleFill}
                stroke={handleStroke}
              />
            ))}
          </g>
        )}
      </g>
    </EditModeContext.Provider>
  );
}

// --- visual handle ----------------------------------------------------------

type HandleVisualProps = {
  handle: EditHandle;
  radius: number;
  fill: string;
  stroke: string;
};

/**
 * Map a pointer event into the coord space of `el`'s PARENT group.
 *
 * The handle's `point.x/y` is expressed in its parent's coord space (the
 * handle itself is rendered via `transform="translate(point.x point.y)"`).
 * Inverting the root SVG's CTM — what the old version did — gives root-
 * viewBox coords and silently shifts the handle by every ancestor's
 * transform. Using the parent's CTM keeps the drag input and the handle's
 * declared position in lockstep.
 */
function cursorInParent(
  el: SVGGraphicsElement,
  event: ReactPointerEvent<SVGGElement>,
): CurvePoint {
  const parent = el.parentNode as SVGGraphicsElement | null;
  const svg = el.ownerSVGElement;
  if (!parent || !svg || typeof parent.getScreenCTM !== "function") {
    return { x: event.clientX, y: event.clientY };
  }
  const ctm = parent.getScreenCTM();
  if (!ctm) return { x: event.clientX, y: event.clientY };
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  const local = p.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

function HandleVisual({ handle, radius, fill, stroke }: HandleVisualProps) {
  const ref = useRef<SVGGElement | null>(null);
  const [focused, setFocused] = useState(false);
  const { point, axis = "free" } = handle;

  // Where in the handle the user grabbed, captured on pointerdown. Applied
  // on every move so the handle never jumps to recentre under the cursor.
  const gripRef = useRef<CurvePoint>({ x: 0, y: 0 });

  const applyAxis = useCallback(
    (next: CurvePoint): CurvePoint => {
      if (axis === "x") return { x: next.x, y: point.y };
      if (axis === "y") return { x: point.x, y: next.y };
      return next;
    },
    [axis, point.x, point.y],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const el = ref.current;
      if (!el) return;
      const cursor = cursorInParent(el, event);
      gripRef.current = {
        x: point.x - cursor.x,
        y: point.y - cursor.y,
      };
    },
    [point.x, point.y],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      event.stopPropagation();
      const el = ref.current;
      if (!el) return;
      const cursor = cursorInParent(el, event);
      handle.onDrag(
        applyAxis({
          x: cursor.x + gripRef.current.x,
          y: cursor.y + gripRef.current.y,
        }),
      );
    },
    [handle, applyAxis],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  return (
    <g
      ref={ref}
      tabIndex={0}
      role="button"
      aria-label={handle.label ?? `Edit ${handle.id}`}
      transform={`translate(${point.x} ${point.y})`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ cursor: "grab", outline: "none" }}
    >
      {/* Outer halo — extends the hit target and shows focus. */}
      {focused && (
        <circle
          r={radius + 3}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeOpacity={0.55}
        />
      )}
      {/* The handle proper. */}
      <circle r={radius} fill={fill} stroke={stroke} strokeWidth={2} />
      {/* Centre dot — affordance for "this is a grip". */}
      <circle r={radius * 0.3} fill={stroke} />
    </g>
  );
}
