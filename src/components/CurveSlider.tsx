import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SVGProps,
} from "react";
import {
  nearestPointOnCurve,
  pointAt,
  type Curve,
  type CurvePoint,
} from "../layout/walkPath";
import { useEditHandle } from "../layout/editHandles";
import { DesignSurface } from "./DesignSurface";
import { tokens } from "../tokens";

/**
 * Layer 3 — `CurveSlider`: a continuous value selector whose track *is* the
 * transfer function.
 *
 * The value is the position along `curve`, parameterised as `t ∈ [0, 1]` of
 * arc length. The curve's shape encodes what the value means — an audio
 * taper, an easing curve preview, a non-linear control range — so the input
 * and the function are the same geometry. This is the SVG-native answer to
 * `<input type="range">` for ranges where the curve is meaningful.
 *
 * Interactions:
 * - Pointer (mouse, pen, touch): press anywhere on the track or thumb, drag.
 *   Pointer XY is converted into the SVG's layout space via the screen CTM
 *   and snapped to the nearest point on the curve. Pointer capture keeps the
 *   drag alive past the track's bounds.
 * - Keyboard: arrow keys step `t` by `step`; Home / End jump to 0 / 1.
 *
 * Accessibility: the focusable element is the thumb, marked `role="slider"`
 * with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and
 * `aria-valuetext` (the formatted value). A separate `<title>` element gives
 * screen readers the label.
 *
 * Theming: defaults pull from `tokens.color` so the slider matches the rest
 * of a scene; any colour can be overridden per-instance.
 */
export type CurveSliderProps = Omit<
  SVGProps<SVGGElement>,
  "children" | "onChange"
> & {
  /** The track. The value 0 sits at the curve's start, 1 at its end. */
  curve: Curve;
  /** Current value in [0, 1]. */
  value: number;
  /** Called with the next value (already clamped to [0, 1]). */
  onChange: (next: number) => void;
  /** Keyboard step; arrow keys nudge `t` by this. Default 0.05. */
  step?: number;
  /** Accessible label for the slider. */
  label: string;
  /** Formats `value` for `aria-valuetext` / screen-readers. Default rounds
   *  to two decimals. */
  formatValue?: (value: number) => string;

  /** Width of the track stroke, in layout units. Default 6. */
  trackWidth?: number;
  /** Track colour (the un-traveled portion). Default `color.line`. */
  trackStroke?: string;
  /** Fill colour (the traveled portion, value=0 → none). Default
   *  `color.accent`. */
  fillStroke?: string;
  /** Thumb radius, in layout units. Default 9. */
  thumbRadius?: number;
  /** Thumb fill. Default `color.surface`. */
  thumbFill?: string;
  /** Thumb outline. Default `color.accent`. */
  thumbStroke?: string;

  /**
   * Editable points on the curve. When provided AND the slider is inside a
   * `<DesignSurface>` (or its own `edit` prop is true), each point becomes a
   * draggable handle that calls back with its new layout-space position.
   *
   * The slider stays agnostic about the curve's parameterisation — the
   * caller decides which points are editable and how to rebuild the curve
   * from them.
   */
  editablePoints?: Array<{
    id: string;
    point: CurvePoint;
    onDrag: (next: CurvePoint) => void;
    label?: string;
  }>;

  /**
   * Sugar: wrap this slider in its own `<DesignSurface>` so `editablePoints`
   * are draggable without an outer surface. Useful for showing a single
   * component in edit mode without putting the whole scene in design mode.
   */
  edit?: boolean;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;
const TRAVELLED_SAMPLES = 48;

/** Convert a pointer event's screen coordinates into the local coord space
 *  of the slider's group `el` — which is also the curve's coord space, since
 *  the curve's points are passed in by the consumer relative to wherever
 *  CurveSlider renders. Using `el.getScreenCTM()` (the element's own CTM,
 *  which includes every ancestor transform) keeps the cursor and the
 *  curve in lockstep; using the root SVG's CTM would silently offset the
 *  drag by any parent group's translate.
 *
 *  Falls back to raw client coords if the CTM isn't available (e.g. in
 *  tests without a real DOM). */
function svgPointFromEvent(
  el: SVGGraphicsElement,
  event: ReactPointerEvent<SVGGElement>,
): CurvePoint {
  const svg = el.ownerSVGElement;
  if (!svg) return { x: event.clientX, y: event.clientY };
  const ctm = el.getScreenCTM();
  if (!ctm) return { x: event.clientX, y: event.clientY };
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  const local = p.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

/** Sample the curve from `s = 0` to `s = upTo` as a polyline path. Used to
 *  draw the "travelled" portion of the track without needing a sub-curve
 *  splitter for arbitrary Curve types. */
function curveSegmentPath(curve: Curve, upTo: number): string {
  if (upTo <= 0 || curve.length === 0) return "";
  const end = Math.min(curve.length, upTo);
  const steps = Math.max(2, Math.round(TRAVELLED_SAMPLES * (end / curve.length)));
  const round = (n: number) => Math.round(n * 100) / 100;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const s = (end * i) / steps;
    const p = curve.pointAtLength(s);
    d += i === 0 ? `M ${round(p.x)} ${round(p.y)}` : ` L ${round(p.x)} ${round(p.y)}`;
  }
  return d;
}

export function CurveSlider({
  edit,
  ...rest
}: CurveSliderProps) {
  const inner = <CurveSliderInner {...rest} />;
  return edit ? <DesignSurface>{inner}</DesignSurface> : inner;
}

function CurveSliderInner({
  curve,
  value,
  onChange,
  step = 0.05,
  label,
  formatValue = (v) => round2(v).toString(),
  trackWidth = 6,
  trackStroke = tokens.color.line,
  fillStroke = tokens.color.accent,
  thumbRadius = 9,
  thumbFill = tokens.color.surface,
  thumbStroke = tokens.color.accent,
  editablePoints,
  ...gProps
}: Omit<CurveSliderProps, "edit">) {
  const groupRef = useRef<SVGGElement | null>(null);
  const labelId = useId();
  const [focused, setFocused] = useState(false);

  const t = clamp01(value);
  const trackPath = useMemo(() => curve.toPathData(), [curve]);
  const filledPath = useMemo(
    () => curveSegmentPath(curve, t * curve.length),
    [curve, t],
  );
  const thumb = useMemo(() => pointAt(curve, t), [curve, t]);

  // Map a pointer event into the curve's parameter space and report it up.
  const updateFromEvent = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      const el = groupRef.current;
      if (!el) return;
      const layoutPoint = svgPointFromEvent(el, event);
      const nearest = nearestPointOnCurve(curve, layoutPoint);
      onChange(clamp01(nearest.t));
    },
    [curve, onChange],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      // Only react to the primary button (or any touch / pen contact).
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromEvent(event);
    },
    [updateFromEvent],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      updateFromEvent(event);
    },
    [updateFromEvent],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>) => {
      let next: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = clamp01(t + step);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          next = clamp01(t - step);
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = 1;
          break;
      }
      if (next !== null) {
        event.preventDefault();
        onChange(next);
      }
    },
    [t, step, onChange],
  );

  const valueText = formatValue(t);
  // Focus ring as a path: an inflated thumb circle, only rendered while
  // focused. Drawn in `accent` so it reads in light and dark token themes.
  const focusRingRadius = thumbRadius + 3;

  return (
    <g
      ref={groupRef}
      role="slider"
      tabIndex={0}
      aria-labelledby={labelId}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={t}
      aria-valuetext={valueText}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        cursor: "pointer",
        // The default focus outline would draw in pixel space and ignore the
        // SVG transform — kill it and draw our own ring as a path.
        outline: "none",
        ...gProps.style,
      }}
      {...gProps}
    >
      <title id={labelId}>{label}</title>

      {/* Track. Decorative — the focusable group above carries the slider
          semantics. */}
      <path
        d={trackPath}
        fill="none"
        stroke={trackStroke}
        strokeWidth={trackWidth}
        strokeLinecap="round"
        aria-hidden
      />

      {/* The travelled portion of the curve, drawn on top of the track. */}
      {filledPath && (
        <path
          d={filledPath}
          fill="none"
          stroke={fillStroke}
          strokeWidth={trackWidth}
          strokeLinecap="round"
          aria-hidden
        />
      )}

      {/* Focus ring as a path (no CSS outline — see comment on the wrapping
          group's style). */}
      {focused && (
        <circle
          cx={thumb.point.x}
          cy={thumb.point.y}
          r={focusRingRadius}
          fill="none"
          stroke={tokens.color.accent}
          strokeWidth={2}
          strokeOpacity={0.55}
          aria-hidden
        />
      )}

      {/* Thumb. */}
      <circle
        cx={thumb.point.x}
        cy={thumb.point.y}
        r={thumbRadius}
        fill={thumbFill}
        stroke={thumbStroke}
        strokeWidth={2}
        aria-hidden
      />

      {/* Edit handles, if the caller passed any. Each is its own little
          subcomponent so React's hook rules stay satisfied if the list
          shrinks or grows between renders. The handles render nothing
          themselves — the surrounding DesignSurface draws them. */}
      {editablePoints?.map((p) => (
        <RegisterHandle
          key={p.id}
          id={p.id}
          point={p.point}
          onDrag={p.onDrag}
          label={p.label}
        />
      ))}
    </g>
  );
}

/** Wrapper component so each editable point gets its own `useEditHandle`
 *  call in a stable hook scope. Renders nothing. */
function RegisterHandle({
  id,
  point,
  onDrag,
  label,
}: {
  id: string;
  point: CurvePoint;
  onDrag: (next: CurvePoint) => void;
  label?: string;
}) {
  useEditHandle({ id, point, onDrag, label });
  return null;
}
