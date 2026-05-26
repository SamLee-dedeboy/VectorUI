import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { Path } from "../svg/Path";
import { SlotContext } from "../layout/slot";
import { useMeasuredBounds } from "../layout/measureBounds";
import { useEditHandle } from "../layout/editHandles";
import type { CurvePoint } from "../layout/walkPath";
import {
  pathWalkerFromData,
  measureWalkerBBox,
} from "../layout/pathWalker";
import { occupancyFromPath } from "../layout/intrusionFromPath";
import type { FlowAround } from "./Text";
import { DesignSurface } from "./DesignSurface";

/**
 * Layer 3 — `Frame`: a shape used as a layout container (SPEC §6.1).
 *
 * A Frame is a closed path plus a set of named slots. Children render into
 * slots via `<Frame.Slot name="…">`. The path is generated *after* layout: a
 * `height="auto"` Frame measures the content of its content-sized slots,
 * derives its own height, then runs the shape generator with the final (w, h).
 *
 * Region slots stack: a slot's `y` may be a number, or `{ after: "<slot>" }`
 * to sit below another slot. Stacked, content-sized slots all contribute to a
 * `height="auto"` Frame — so anchored buttons no longer need a padding band.
 */

// --- slot specs -----------------------------------------------------------

/** Position a region slot below another, instead of at a fixed `y`. */
export type SlotAfter = { after: string; gap?: number };

/**
 * A rectangular region.
 * - `x`: left edge in layout units. **Optional — defaults to the Frame's
 *   `padding`**, so a slot that just wants to sit in the content box can omit
 *   it (no more repeating `x: PAD` on every slot).
 * - `y`: a fixed coordinate, or `{ after }` to stack below another slot.
 * - `width`: a number, or **`"fill"` (the default)** to fill the Frame's
 *   content box — `resolvedWidth - x - padding`. Under `width="auto"`, fill
 *   slots are *excluded* from the width derivation (they fill into whatever
 *   the explicit-width slots establish), so at least one slot must declare a
 *   numeric width to anchor an auto-width Frame. That one width is the
 *   content column; siblings `"fill"` to match it.
 * - `height`: a number; `"content"` to fit the measured content; or `"fill"`
 *   to take the measured content (auto Frame) or the remaining height (fixed).
 */
export type RegionSlot = {
  type: "region";
  x?: number;
  y: number | SlotAfter;
  width?: number | "fill";
  height: number | "fill" | "content";
};

export type AnchorAlign =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** A point with an alignment; content's named corner is pinned to (x, y).
 *  Negative x/y count back from the Frame's right/bottom edge. */
export type AnchorSlot = {
  type: "anchor";
  x: number;
  y: number;
  align?: AnchorAlign;
};

/**
 * Reserved for future HTML-overlay content (SPEC §10) — text inputs and other
 * native form controls mounted in a `<foreignObject>`. Defined so that story
 * slots in cleanly later; using one throws in this phase.
 */
export type HTMLOverlaySlot = {
  type: "html-overlay";
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * A region slot whose content auto-fits the Frame's shape (or an override
 * shape). The Frame samples the shape's interior per band via
 * `occupancyFromPath`; the slot then either publishes a contour-aware
 * `flowAround` so a child `Text` reflows to the silhouette ("text" mode), or
 * collapses to the largest conservative safe rectangle inside the shape
 * across this slot's vertical band ("safe" mode, for rigid widgets like a
 * button row).
 *
 * Reuses every `RegionSlot` knob (`x`/`y`/`width`/`height` + `{ after }`
 * stacking + auto-size derivation). The contour is derived after the Frame's
 * size and path settle — same one-frame settle the rest of Frame already does.
 */
export type ShapeFitSlot = {
  type: "shape-fit";
  /** `"text"` — slot publishes a per-band contour `flowAround`; a child `Text`
   *  with no explicit `flowAround` reflows to the shape's interior.
   *  `"safe"` — slot shrinks to the largest conservative inset rectangle
   *  inside the shape across this slot's y-band, so rigid widgets fit. */
  mode?: "text" | "safe";
  x?: number;
  y: number | SlotAfter;
  width?: number | "fill";
  height: number | "fill" | "content";
  /** Override shape to fit inside; defaults to the Frame's own `shape`. Lets
   *  a slot fit inside an inner feature shape (e.g. a triangle whose title
   *  fills it) different from the Frame's outline. Called with the slot's
   *  resolved (width, height); the returned path is in slot-local coords. */
  shape?: ShapeGenerator;
  /** Inset from the contour, layout units. */
  padding?: number;
};

export type SlotSpec =
  | RegionSlot
  | AnchorSlot
  | HTMLOverlaySlot
  | ShapeFitSlot;

/** A path generator: returns SVG path data for a (width, height) box. */
export type ShapeGenerator = (width: number, height: number) => string;

// --- Frame context --------------------------------------------------------

type Size = { w: number; h: number };

/** Resolved placement of a slot, computed by the Frame. */
type Placement = {
  tx: number;
  ty: number;
  slotWidth: number;
  kind: SlotSpec["type"];
};

type FrameContextValue = {
  placements: Record<string, Placement>;
  /** Per-slot flowAround for shape-fit slots; missing for other slot types. */
  slotFlowArounds: Record<string, FlowAround>;
  reportSize: (name: string, size: Size) => void;
};

const FrameContext = createContext<FrameContextValue | null>(null);

function useFrameContext(component: string): FrameContextValue {
  const ctx = useContext(FrameContext);
  if (!ctx) throw new Error(`<${component}> must be used inside a <Frame>`);
  return ctx;
}

// --- Frame ----------------------------------------------------------------

export type FrameProps = Omit<
  SVGProps<SVGGElement>,
  "width" | "height" | "fill"
> & {
  /** Path generator for the Frame's outline. */
  shape: ShapeGenerator;
  /** Frame width in layout units, or "auto" to derive it from slot content
   *  (mirrors `height="auto"`: the Frame's width is the rightmost slot edge
   *  plus `padding`). */
  width: number | "auto";
  /** Frame height in layout units, or "auto" to derive it from slot content. */
  height: number | "auto";
  /** Named slots children render into. */
  slots: Record<string, SlotSpec>;
  /** Fill for the shape path. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** Filter reference for the shape path, e.g. tokens.filters.softShadow. */
  filter?: string;
  /** Optional larger hit region (SPEC §10). Defaults to the rendered path. */
  hitPath?: string;
  /** Rendered as a leading SVG <title> — screen readers announce it. */
  title?: string;
  /** Bottom inset added below the lowest slot when height is "auto". */
  padding?: number;
  /** Reports the Frame's resolved size once layout settles. */
  onLayout?: (size: { width: number; height: number }) => void;
  /**
   * Edit-mode: when set AND the Frame sits inside a `<DesignSurface>` (or
   * its own `edit` prop is true), each named slot gets a draggable handle at
   * its placed origin. Called with the new (x, y) in Frame-local layout
   * units — the consumer decides how to update its SlotSpec (some specs use
   * `{ after }` for y or negative anchor coords, so the policy lives there).
   */
  onSlotEdit?: (name: string, next: CurvePoint) => void;
  /** Sugar: wrap this Frame in its own `<DesignSurface>` so slot handles are
   *  draggable without an outer surface. */
  edit?: boolean;
  children?: ReactNode;
};

export function Frame(props: FrameProps) {
  const { edit, ...rest } = props;
  const inner = <FrameInner {...rest} />;
  return edit ? <DesignSurface>{inner}</DesignSurface> : inner;
}

function FrameInner({
  shape,
  width,
  height,
  slots,
  fill = "none",
  stroke,
  strokeWidth,
  filter,
  hitPath,
  title,
  padding = 0,
  onLayout,
  onSlotEdit,
  children,
  ...gProps
}: Omit<FrameProps, "edit">) {
  // Content sizes reported by each slot, keyed by slot name.
  const [measured, setMeasured] = useState<Record<string, Size>>({});

  const reportSize = useCallback((name: string, size: Size) => {
    setMeasured((prev) => {
      const cur = prev[name];
      if (cur && cur.w === size.w && cur.h === size.h) return prev;
      return { ...prev, [name]: size };
    });
  }, []);

  // Resolve every slot's geometry, then the Frame width and height, then
  // the path. ShapeFit slots are placed nominally here; refined below.
  const {
    placements: nominal,
    slotHeights,
    frameHeight,
    frameWidth,
  } = useMemo(() => {
    const entries = Object.entries(slots);
    const yCache = new Map<string, number>();
    const visiting = new Set<string>();

    // A "region-like" slot is anything that occupies a rectangle and can
    // participate in `{ after }` stacking + auto-size derivation. ShapeFit
    // slots use the same x/y/width/height knobs, so they're handled
    // identically here; the contour-specific refinement happens later, after
    // the path is generated.
    type RegionLike = RegionSlot | ShapeFitSlot;
    const isRegionLike = (s: SlotSpec): s is RegionLike =>
      s.type === "region" || s.type === "shape-fit";

    // Effective height of a region-like slot.
    const regionHeight = (name: string, slot: RegionLike): number => {
      if (slot.height === "content") return measured[name]?.h ?? 0;
      if (slot.height === "fill") {
        return height === "auto"
          ? (measured[name]?.h ?? 0)
          : Math.max(0, height - resolveY(name));
      }
      return slot.height;
    };

    // y of a region-like slot — a number, or stacked below another slot.
    function resolveY(name: string): number {
      const cached = yCache.get(name);
      if (cached !== undefined) return cached;
      const slot = slots[name];
      if (!slot || !isRegionLike(slot)) return 0;
      if (visiting.has(name)) return 0; // cycle guard
      visiting.add(name);

      let y: number;
      if (typeof slot.y === "number") {
        y = slot.y;
      } else {
        const ref = slots[slot.y.after];
        y =
          ref && isRegionLike(ref)
            ? resolveY(slot.y.after) +
              regionHeight(slot.y.after, ref) +
              (slot.y.gap ?? 0)
            : 0;
      }
      visiting.delete(name);
      yCache.set(name, y);
      return y;
    }

    // Auto height: the extent of the lowest region-like slot.
    let resolvedHeight: number;
    if (height === "auto") {
      let bottom = 0;
      for (const [name, slot] of entries) {
        if (isRegionLike(slot)) {
          bottom = Math.max(bottom, resolveY(name) + regionHeight(name, slot));
        }
      }
      resolvedHeight = bottom + padding;
    } else {
      resolvedHeight = height;
    }

    // A region-like slot's left edge: explicit, or the Frame's padding by default.
    const regionX = (slot: RegionLike): number => slot.x ?? padding;

    // Auto width: rightmost edge across slots that declare a NUMERIC width.
    // `"fill"` (and omitted) slots are excluded — they fill into whatever the
    // explicit-width slots establish, so including them would be circular.
    // Anchor slots are positioned *against* the resolved edge, so they don't
    // drive it either. Same `padding` policy as height.
    let resolvedWidth: number;
    if (width === "auto") {
      let right = 0;
      for (const [, slot] of entries) {
        if (isRegionLike(slot) && typeof slot.width === "number") {
          right = Math.max(right, regionX(slot) + slot.width);
        } else if (slot.type === "html-overlay") {
          right = Math.max(right, slot.x + slot.width);
        }
      }
      resolvedWidth = right + padding;
    } else {
      resolvedWidth = width;
    }

    // A region-like slot's width: explicit number, or `"fill"`/omitted → the
    // content box from its x to the right padding edge of the resolved Frame.
    const regionWidth = (slot: RegionLike): number => {
      if (typeof slot.width === "number") return slot.width;
      return Math.max(0, resolvedWidth - regionX(slot) - padding);
    };

    // Now place every slot. Region and shape-fit get the same nominal
    // placement; shape-fit is refined below once the path is known.
    const placed: Record<string, Placement> = {};
    const slotHeights: Record<string, number> = {};
    for (const [name, slot] of entries) {
      if (isRegionLike(slot)) {
        placed[name] = {
          tx: regionX(slot),
          ty: resolveY(name),
          slotWidth: regionWidth(slot),
          kind: slot.type,
        };
        slotHeights[name] = regionHeight(name, slot);
      } else if (slot.type === "anchor") {
        const ax = slot.x < 0 ? resolvedWidth + slot.x : slot.x;
        const ay = slot.y < 0 ? resolvedHeight + slot.y : slot.y;
        const size = measured[name] ?? { w: 0, h: 0 };
        const { hx, vy } = ALIGN_FACTORS[slot.align ?? "top-left"];
        placed[name] = {
          tx: ax - size.w * hx,
          ty: ay - size.h * vy,
          slotWidth: size.w || resolvedWidth,
          kind: "anchor",
        };
      } else {
        // html-overlay — reserved, see Frame.Slot.
        placed[name] = {
          tx: slot.x,
          ty: slot.y,
          slotWidth: slot.width,
          kind: "html-overlay",
        };
      }
    }
    return {
      placements: placed,
      slotHeights,
      frameHeight: resolvedHeight,
      frameWidth: resolvedWidth,
    };
  }, [slots, measured, height, width, padding]);

  // The path is generated last, with the final (w, h).
  const d = shape(frameWidth, frameHeight);

  // Shape-fit refinement: for each shape-fit slot, sample the path (or the
  // slot's override shape) to either (a) publish a per-band flowAround so a
  // child Text auto-fits the contour, or (b) collapse the slot to the largest
  // safe rectangle for rigid widgets. Both are derived AFTER the path so the
  // contour matches what's drawn. Memoised on `d` + nominal placements; the
  // settle frame catches size-driven shape changes.
  const { placements, slotFlowArounds } = useMemo(() => {
    const flowArounds: Record<string, FlowAround> = {};
    const refined: Record<string, Placement> = {};
    for (const [name, slot] of Object.entries(slots)) {
      if (slot.type !== "shape-fit") continue;
      const placement = nominal[name];
      if (!placement) continue;
      const mode = slot.mode ?? "text";
      const pad = slot.padding ?? 0;
      // Slot's path: an override shape (slot-local coords) or the Frame's `d`
      // (Frame coords). For frame coords, we translate queries by the slot's
      // (tx, ty) to map slot-local <-> path-coord.
      const overrideShape = slot.shape;
      const pathD = overrideShape
        ? overrideShape(placement.slotWidth, slotHeights[name] ?? 0)
        : d;
      const inSlotCoords = !!overrideShape;
      let walker;
      try {
        walker = pathWalkerFromData(pathD);
      } catch {
        continue; // no DOM (jsdom on tests); skip — slot stays as nominal rect
      }
      const bbox = measureWalkerBBox(walker);
      const occ = occupancyFromPath(walker, {
        height: Math.max(0, bbox.minY + bbox.height),
        // Shape-fit treats the shape as a CONTAINER text must stay inside —
        // the band's safe interior = ranges that are inside at every sub-y
        // (intersection), not the widest reach (union, the float-to-avoid mode).
        combine: "intersect",
      });

      // Translate a slot-local y to path-coord y.
      const toPathY = (y: number) =>
        inSlotCoords ? y : placement.ty + y;
      // Translate a path-coord x to slot-local x.
      const toSlotX = (x: number) =>
        inSlotCoords ? x : x - placement.tx;

      if (mode === "text") {
        // occupancyAt returns OCCUPIED intervals (in slot-local x) — the
        // complement of the shape interior within [0, slotWidth] — so the
        // multi-segment text pour treats the interior as the FREE region.
        flowArounds[name] = {
          occupancyAt: (yT, yB) => {
            const interior = occ(toPathY(yT), toPathY(yB));
            const within: Array<[number, number]> = [];
            for (const [s, e] of interior) {
              const cs = Math.max(0, toSlotX(s));
              const ce = Math.min(placement.slotWidth, toSlotX(e));
              if (ce > cs) within.push([cs, ce]);
            }
            if (within.length === 0) return [[0, placement.slotWidth]];
            within.sort((a, b) => a[0] - b[0]);
            const occupied: Array<[number, number]> = [];
            let cursor = 0;
            for (const [s, e] of within) {
              if (s > cursor) occupied.push([cursor, s]);
              if (e > cursor) cursor = e;
            }
            if (cursor < placement.slotWidth)
              occupied.push([cursor, placement.slotWidth]);
            return occupied;
          },
          gap: pad,
        };
      } else {
        // mode === "safe": pick the conservative inscribed rect across the
        // slot's y-band (max of left edges, min of right edges).
        const slotH = slotHeights[name] ?? 0;
        const samples = Math.max(2, Math.ceil(slotH / 4));
        let maxLeft = 0;
        let minRight = Infinity;
        for (let i = 0; i <= samples; i++) {
          const yLocal = slotH === 0 ? 0 : (slotH * i) / samples;
          const intervals = occ(toPathY(yLocal), toPathY(yLocal) + 1);
          if (intervals.length === 0) continue;
          // Largest interval at this y wins (multi-lobe shapes pick the
          // biggest contiguous interior).
          let best = intervals[0];
          for (const iv of intervals) {
            if (iv[1] - iv[0] > best[1] - best[0]) best = iv;
          }
          const lSlot = toSlotX(best[0]);
          const rSlot = toSlotX(best[1]);
          if (lSlot > maxLeft) maxLeft = lSlot;
          if (rSlot < minRight) minRight = rSlot;
        }
        if (Number.isFinite(minRight)) {
          const left = Math.max(0, maxLeft + pad);
          const right = Math.min(placement.slotWidth, minRight - pad);
          if (right - left >= 1) {
            refined[name] = {
              ...placement,
              tx: placement.tx + left,
              slotWidth: right - left,
            };
          }
        }
      }
    }
    if (Object.keys(refined).length === 0) {
      return { placements: nominal, slotFlowArounds: flowArounds };
    }
    return {
      placements: { ...nominal, ...refined },
      slotFlowArounds: flowArounds,
    };
  }, [d, nominal, slotHeights, slots]);

  useEffect(() => {
    onLayout?.({ width: frameWidth, height: frameHeight });
  }, [onLayout, frameWidth, frameHeight]);

  const ctx = useMemo<FrameContextValue>(
    () => ({ placements, slotFlowArounds, reportSize }),
    [placements, slotFlowArounds, reportSize],
  );

  return (
    <g {...gProps}>
      {title ? <title>{title}</title> : null}
      {/* The shape is decorative; the Frame's <g> carries role/aria. */}
      <Path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        filter={filter}
      />
      {/* Optional enlarged hit region; the rendered path is the default. */}
      {hitPath ? (
        <Path d={hitPath} fill="transparent" style={{ pointerEvents: "all" }} />
      ) : null}
      <FrameContext.Provider value={ctx}>{children}</FrameContext.Provider>
      {/* Slot anchor handles. Each placed slot exposes its (tx, ty) — that's
          the slot's origin in Frame-local layout units. The consumer's
          `onSlotEdit` decides how to reconcile a drag with the SlotSpec
          (e.g. `{ after }` ys, negative anchor coords). */}
      {onSlotEdit
        ? Object.entries(placements).map(([name, placement]) => (
            <RegisterSlotHandle
              key={name}
              name={name}
              point={{ x: placement.tx, y: placement.ty }}
              onDrag={onSlotEdit}
            />
          ))
        : null}
    </g>
  );
}

/** Registers a draggable handle for a Frame slot. Renders nothing — the
 *  surrounding DesignSurface draws the handle. */
function RegisterSlotHandle({
  name,
  point,
  onDrag,
}: {
  name: string;
  point: CurvePoint;
  onDrag: (name: string, next: CurvePoint) => void;
}) {
  useEditHandle({
    id: `frame-slot-${name}`,
    point,
    label: `Slot ${name}`,
    onDrag: (next) => onDrag(name, next),
  });
  return null;
}

// --- Frame.Slot -----------------------------------------------------------

const ALIGN_FACTORS: Record<AnchorAlign, { hx: number; vy: number }> = {
  "top-left": { hx: 0, vy: 0 },
  "top-center": { hx: 0.5, vy: 0 },
  "top-right": { hx: 1, vy: 0 },
  "center-left": { hx: 0, vy: 0.5 },
  center: { hx: 0.5, vy: 0.5 },
  "center-right": { hx: 1, vy: 0.5 },
  "bottom-left": { hx: 0, vy: 1 },
  "bottom-center": { hx: 0.5, vy: 1 },
  "bottom-right": { hx: 1, vy: 1 },
};

export type FrameSlotProps = {
  /** Name of the slot — must exist in the Frame's `slots`. */
  name: string;
  children?: ReactNode;
};

function FrameSlot({ name, children }: FrameSlotProps) {
  const ctx = useFrameContext("Frame.Slot");
  const placement = ctx.placements[name];
  if (!placement) throw new Error(`<Frame.Slot> — no slot named "${name}"`);
  if (placement.kind === "html-overlay") {
    // The slot *type* is reserved in the public API so story slots in cleanly
    // when this lands (SPEC §10 — `<foreignObject>` form controls). Today
    // there is no rendering path — fall through to mounting children would
    // silently skip the overlay coordinate translation, so we throw with a
    // pointer rather than papering over it.
    throw new Error(
      `<Frame.Slot name="${name}"> — "html-overlay" slots are reserved ` +
        "but not implemented yet. Use a region slot, or follow the " +
        "html-overlay tracking issue before relying on this.",
    );
  }

  // Measure the rendered content (rendered bounds — see measureBounds) and
  // report it up; the Frame uses it to size content slots and place anchors.
  // No rounding — `boundsEqual` already de-dupes sub-pixel jitter, and the
  // round previously here cost precision on text height for no upside.
  const contentRef = useMeasuredBounds<SVGGElement>((b) =>
    ctx.reportSize(name, { w: b.width, h: b.height }),
  );

  const flowAround = ctx.slotFlowArounds[name];
  const slotInfo = flowAround
    ? { width: placement.slotWidth, flowAround }
    : { width: placement.slotWidth };

  return (
    <g transform={`translate(${placement.tx} ${placement.ty})`}>
      <SlotContext.Provider value={slotInfo}>
        <g ref={contentRef}>{children}</g>
      </SlotContext.Provider>
    </g>
  );
}

Frame.Slot = FrameSlot;
