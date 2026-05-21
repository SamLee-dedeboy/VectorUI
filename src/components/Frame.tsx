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
 * - `y`: a fixed coordinate, or `{ after }` to stack below another slot.
 * - `height`: a number; `"content"` to fit the measured content; or `"fill"`
 *   to take the measured content (auto Frame) or the remaining height (fixed).
 */
export type RegionSlot = {
  type: "region";
  x: number;
  y: number | SlotAfter;
  width: number;
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

export type SlotSpec = RegionSlot | AnchorSlot | HTMLOverlaySlot;

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
  // the path.
  const { placements, frameHeight, frameWidth } = useMemo(() => {
    const entries = Object.entries(slots);
    const yCache = new Map<string, number>();
    const visiting = new Set<string>();

    // Effective height of a region slot.
    const regionHeight = (name: string, slot: RegionSlot): number => {
      if (slot.height === "content") return measured[name]?.h ?? 0;
      if (slot.height === "fill") {
        return height === "auto"
          ? (measured[name]?.h ?? 0)
          : Math.max(0, height - resolveY(name));
      }
      return slot.height;
    };

    // y of a region slot — a number, or stacked below another slot.
    function resolveY(name: string): number {
      const cached = yCache.get(name);
      if (cached !== undefined) return cached;
      const slot = slots[name];
      if (!slot || slot.type !== "region") return 0;
      if (visiting.has(name)) return 0; // cycle guard
      visiting.add(name);

      let y: number;
      if (typeof slot.y === "number") {
        y = slot.y;
      } else {
        const ref = slots[slot.y.after];
        y =
          ref && ref.type === "region"
            ? resolveY(slot.y.after) +
              regionHeight(slot.y.after, ref) +
              (slot.y.gap ?? 0)
            : 0;
      }
      visiting.delete(name);
      yCache.set(name, y);
      return y;
    }

    // Auto height: the extent of the lowest region slot.
    let resolvedHeight: number;
    if (height === "auto") {
      let bottom = 0;
      for (const [name, slot] of entries) {
        if (slot.type === "region") {
          bottom = Math.max(bottom, resolveY(name) + regionHeight(name, slot));
        }
      }
      resolvedHeight = bottom + padding;
    } else {
      resolvedHeight = height;
    }

    // Auto width: rightmost edge across every region slot (a region's width
    // is fixed in its spec; content-sized widths aren't a thing today, so the
    // spec width is the truth). Anchor slots are *positioned* against the
    // Frame's right edge — they'd create a feedback loop if they also drove
    // the auto-width, so they're excluded. Same `padding` policy as height.
    let resolvedWidth: number;
    if (width === "auto") {
      let right = 0;
      for (const [, slot] of entries) {
        if (slot.type === "region") {
          right = Math.max(right, slot.x + slot.width);
        } else if (slot.type === "html-overlay") {
          right = Math.max(right, slot.x + slot.width);
        }
      }
      resolvedWidth = right + padding;
    } else {
      resolvedWidth = width;
    }

    // Now place every slot.
    const placed: Record<string, Placement> = {};
    for (const [name, slot] of entries) {
      if (slot.type === "region") {
        placed[name] = {
          tx: slot.x,
          ty: resolveY(name),
          slotWidth: slot.width,
          kind: "region",
        };
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
      frameHeight: resolvedHeight,
      frameWidth: resolvedWidth,
    };
  }, [slots, measured, height, width, padding]);

  // The path is generated last, with the final (w, h).
  const d = shape(frameWidth, frameHeight);

  useEffect(() => {
    onLayout?.({ width: frameWidth, height: frameHeight });
  }, [onLayout, frameWidth, frameHeight]);

  const ctx = useMemo<FrameContextValue>(
    () => ({ placements, reportSize }),
    [placements, reportSize],
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

  return (
    <g transform={`translate(${placement.tx} ${placement.ty})`}>
      <SlotContext.Provider value={{ width: placement.slotWidth }}>
        <g ref={contentRef}>{children}</g>
      </SlotContext.Provider>
    </g>
  );
}

Frame.Slot = FrameSlot;
