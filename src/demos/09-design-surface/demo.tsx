import { useCallback, useMemo, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { CurveSlider } from "../../components/CurveSlider";
import { DesignSurface } from "../../components/DesignSurface";
import { Frame } from "../../components/Frame";
import { Text } from "../../components/Text";
import {
  ConstraintOverlay,
  EdgeTick,
  AlignGuide,
  GapBracket,
  RectOutline,
} from "../../components/ConstraintOverlay";
import { quadratic, type CurvePoint } from "../../layout/walkPath";
import { useEditHandle } from "../../layout/editHandles";
import { useNaturalTextWidth } from "../../layout/textWidth";
import {
  combineIntrusions,
  intrusionFromReach,
  type IntrusionFn,
} from "../../layout/intrusionSampling";
import { floatAroundRect } from "../../layout/rectIntrusion";
import { makeAxisHandle, makeGapHandle } from "../../layout/constraintHelpers";
import { Path } from "../../svg/Path";
import { tokens } from "../../tokens";

/**
 * Demo 9 — DesignSurface + per-component edit mode.
 *
 * One CurveSlider, two faces. The runtime face slides a value along a curve;
 * the edit face reshapes the curve itself. Both render from the same props;
 * the only thing that changes is who's drawing the handles.
 *
 * Side A wraps the slider in <DesignSurface> — the "design tool" framing,
 * where any subtree with handles becomes editable. Side B uses the slider's
 * own `edit` prop — sugar that self-wraps in a DesignSurface so a single
 * component goes into edit mode without putting the whole scene in design
 * mode.
 *
 * Proves: handle declarations are shared between both rendering routes;
 * the protocol is the only mechanism either uses.
 */

const W = 320;
const H = 120;

type Spec = { p0: CurvePoint; control: CurvePoint; p1: CurvePoint };

const initial: Spec = {
  p0: { x: 0, y: 100 },
  control: { x: 140, y: 100 },
  p1: { x: 300, y: 0 },
};

function ControlPolygon({ spec }: { spec: Spec }) {
  // Dashed lines from p0 → control → p1 — common in vector tools as visual
  // feedback for the relationship between anchors and control points.
  const d = `M ${spec.p0.x} ${spec.p0.y} L ${spec.control.x} ${spec.control.y} L ${spec.p1.x} ${spec.p1.y}`;
  return (
    <Path
      d={d}
      fill="none"
      stroke={tokens.color.accent}
      strokeWidth={1}
      strokeDasharray="3 4"
      strokeOpacity={0.45}
    />
  );
}

function SideA() {
  // Scene-wide edit mode — the whole scene is in design mode at once.
  const [spec, setSpec] = useState<Spec>(initial);
  const [t, setT] = useState(0.4);
  const curve = useMemo(() => quadratic(spec), [spec]);

  const editablePoints = useMemo(
    () => [
      { id: "p0", point: spec.p0, label: "Start", onDrag: (next: CurvePoint) => setSpec((s) => ({ ...s, p0: next })) },
      { id: "control", point: spec.control, label: "Control", onDrag: (next: CurvePoint) => setSpec((s) => ({ ...s, control: next })) },
      { id: "p1", point: spec.p1, label: "End", onDrag: (next: CurvePoint) => setSpec((s) => ({ ...s, p1: next })) },
    ],
    [spec.p0, spec.control, spec.p1],
  );

  return (
    <div>
      <p className="variant-label">
        A — Wrap the scene in <code>&lt;DesignSurface&gt;</code>
      </p>
      <p style={{ color: "#555", margin: "4px 0 8px" }}>
        Drag any of the three handles to reshape the easing curve. The slider
        keeps running — drag the thumb to move along whatever curve the
        handles currently describe.
      </p>
      <VectorUIRoot
        width={W + 40}
        height={H + 40}
        style={{ background: tokens.color.surfaceSunken, maxWidth: W + 40 }}
      >
        <g transform="translate(20 20)">
          <DesignSurface>
            <ControlPolygon spec={spec} />
            <CurveSlider
              curve={curve}
              value={t}
              onChange={setT}
              label="Easing progress"
              editablePoints={editablePoints}
            />
          </DesignSurface>
        </g>
      </VectorUIRoot>
    </div>
  );
}

function SideB() {
  // Per-component edit: only this slider exposes its handles; siblings (if
  // any existed) would stay in runtime mode.
  const [spec, setSpec] = useState<Spec>(initial);
  const [t, setT] = useState(0.4);
  const curve = useMemo(() => quadratic(spec), [spec]);

  const editablePoints = useMemo(
    () => [
      { id: "p0", point: spec.p0, label: "Start", onDrag: (next: CurvePoint) => setSpec((s) => ({ ...s, p0: next })) },
      { id: "control", point: spec.control, label: "Control", onDrag: (next: CurvePoint) => setSpec((s) => ({ ...s, control: next })) },
      { id: "p1", point: spec.p1, label: "End", onDrag: (next: CurvePoint) => setSpec((s) => ({ ...s, p1: next })) },
    ],
    [spec.p0, spec.control, spec.p1],
  );

  return (
    <div>
      <p className="variant-label">
        B — Pass <code>edit</code> to the component itself
      </p>
      <p style={{ color: "#555", margin: "4px 0 8px" }}>
        Same protocol, sugar applied: <code>&lt;CurveSlider edit …&gt;</code>{" "}
        wraps itself in a DesignSurface so only this one component goes into
        edit mode. Useful when the rest of a scene should stay live.
      </p>
      <VectorUIRoot
        width={W + 40}
        height={H + 40}
        style={{ background: tokens.color.surfaceSunken, maxWidth: W + 40 }}
      >
        <g transform="translate(20 20)">
          <ControlPolygon spec={spec} />
          <CurveSlider
            curve={curve}
            value={t}
            onChange={setT}
            label="Easing progress"
            editablePoints={editablePoints}
            edit
          />
        </g>
      </VectorUIRoot>
    </div>
  );
}

// ---------- C — Constraint-enforced cascade ---------------------------------
//
// The point of edit handles isn't free dragging — VectorUI already had that
// via pointer events on any <g>. The point is that a drag should still pass
// through the layout system's constraints. This demo wires four handles into
// three nested constraint layers:
//
//   1. Scoop-tip handle. Drag → shape regenerates → body's `rightIntrusionAt`
//      reports the new contour → Text rewraps → slot `height="content"`
//      grows → Frame `height="auto"` stretches. Frame `width="auto"` keeps
//      the card snug around its content as the title's natural width changes.
//
//   2. Inter-slot constraint (toggled). In "Linked" mode the body's
//      SlotSpec uses `y: { after: "title", gap }` and binds `body.x` to
//      `title.x` — so dragging the title moves the body automatically, no
//      second handle needed. A separate gap-handle (built via the library
//      `makeGapHandle` helper) adjusts the constraint itself.
//
//   3. Wrap-around-title (the other toggle). In "Free overlap" the body's
//      `flowAround.intrusionAt` / `rightIntrusionAt` are built from
//      `floatAroundRect` — drag the title into the body's column and the
//      paragraph flows around it line-by-line. The scoop's right-edge bite
//      composes via `combineIntrusions` so the two operators never collide.

const TITLE_H = 28;
const TITLE_W = 320;
const BODY_W = 320;
/** Layout-unit gap between the scoop and the body's right edge. */
const SCOOP_INSET = 20;
const SCOOP_MIN = 4;
const SCOOP_MAX = 100;
const TITLE_TEXT = "Title block";
const TITLE_INITIAL = { x: 20, y: 20 };
const GAP_INITIAL = 12;
const GAP_MAX = 80;
/** Inset from the Frame's edges where draggable slots stay clamped. */
const SAFE = 12;
/** Loose drag bounds — Frame `width="auto"` / `height="auto"` actually size
 *  the card; these just stop fling-drags from running off the SVG. */
const MAX_CARD_W = 720;
const MAX_CARD_H = 720;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

type LinkMode = "linked" | "free";

/** The card's outline with a quadratic right-edge bite. The bite's vertical
 *  position tracks the body slot's top so the scoop always meets the body's
 *  column rather than floating in space when the body moves. */
function makeScoopShape(scoopDepth: number, bodyTop: number) {
  return (w: number, h: number): string => {
    const r = 12; // corner radius
    const top = bodyTop;
    const bot = Math.min(top + 2 * scoopDepth, h - r);
    return [
      `M ${r} 0`,
      `L ${w - r} 0`,
      `Q ${w} 0 ${w} ${r}`,
      `L ${w} ${top}`,
      // The bite — quadratic Bezier from (w, top) to (w, bot) with control
      // at (w - 2·D, mid). Tip lands at (w - D, mid).
      `Q ${w - 2 * scoopDepth} ${(top + bot) / 2} ${w} ${bot}`,
      `L ${w} ${h - r}`,
      `Q ${w} ${h} ${w - r} ${h}`,
      `L ${r} ${h}`,
      `Q 0 ${h} 0 ${h - r}`,
      `L 0 ${r}`,
      `Q 0 0 ${r} 0`,
      `Z`,
    ].join(" ");
  };
}

function ConstraintCascade() {
  const [scoopDepth, setScoopDepth] = useState(48);
  const [linkMode, setLinkMode] = useState<LinkMode>("linked");
  const [titlePos, setTitlePos] = useState<CurvePoint>(TITLE_INITIAL);
  const [bodyPos, setBodyPos] = useState<CurvePoint>({
    x: TITLE_INITIAL.x,
    y: TITLE_INITIAL.y + TITLE_H + GAP_INITIAL,
  });
  const [gap, setGap] = useState(GAP_INITIAL);
  // Captured from Frame's onLayout so the visualisations and constraint math
  // can react to the resolved size.
  const [frameSize, setFrameSize] = useState({ width: 360, height: 200 });

  // Title's actual rendered width — drives the wrap-around-title math.
  // The `title` token doesn't declare letterSpacing, but other styles can;
  // pass it through if present.
  const titleStyle = tokens.type.title as {
    font: string;
    letterSpacing?: number;
  };
  const titleNaturalW = useNaturalTextWidth(
    TITLE_TEXT,
    titleStyle.font,
    titleStyle.letterSpacing,
  );
  // Cap at the slot width so the wrap math agrees with what's painted.
  const titleW = Math.min(titleNaturalW, TITLE_W);

  // Resolved body-slot top in Frame coords — needed by the shape generator
  // (the scoop tracks the body) and by the title-rect intrusion math (the
  // body is the wrap target).
  const bodyTop =
    linkMode === "linked" ? titlePos.y + TITLE_H + gap : bodyPos.y;
  const bodyLeft = linkMode === "linked" ? titlePos.x : bodyPos.x;

  const shape = useMemo(
    () => makeScoopShape(scoopDepth, bodyTop),
    [scoopDepth, bodyTop],
  );

  // The scoop's right-edge bite — a closed-form parabola whose intrusion
  // straight into the body column comes from the same quadratic the path is
  // drawn from. `intrusionFromReach` does the band-sampling; the bite lives
  // only inside the scoop band, so yMax keeps the sampler from asking pointless
  // questions below it.
  const scoopBite: IntrusionFn = useMemo(() => {
    if (scoopDepth <= 0) return () => 0;
    return intrusionFromReach(
      (yLocal) => {
        if (yLocal < 0 || yLocal > 2 * scoopDepth) return 0;
        const t = yLocal / (2 * scoopDepth);
        const biteFromRight = 4 * scoopDepth * t * (1 - t);
        return Math.max(0, biteFromRight - SCOOP_INSET);
      },
      { yMin: 0, yMax: 2 * scoopDepth },
    );
  }, [scoopDepth]);

  /** Where the title sits relative to the body's text origin. */
  const titleRectInBody = useMemo(
    () => ({
      left: titlePos.x - bodyLeft,
      right: titlePos.x - bodyLeft + titleW,
      top: titlePos.y - bodyTop,
      bottom: titlePos.y - bodyTop + TITLE_H,
    }),
    [titlePos.x, titlePos.y, bodyLeft, bodyTop, titleW],
  );

  // FlowAround composes the scoop bite (always on the right) with the
  // wrap-around-title rect (only in free mode). `combineIntrusions` is the
  // max-at-each-band union — clean composition with no per-shape "if".
  const flowAround = useMemo(() => {
    const rect =
      linkMode === "free"
        ? floatAroundRect(titleRectInBody, BODY_W)
        : { intrusionAt: (() => 0) as IntrusionFn,
            rightIntrusionAt: (() => 0) as IntrusionFn };
    return {
      intrusionAt: rect.intrusionAt,
      rightIntrusionAt: combineIntrusions(scoopBite, rect.rightIntrusionAt),
      gap: 6,
    };
  }, [linkMode, titleRectInBody, scoopBite]);

  // --- handlers ---

  const cardWidth = frameSize.width;

  const onTitleDrag = useCallback((p: CurvePoint) => {
    // Only the left/top clamps are hard limits — the right side is left open
    // so Frame `width="auto"` can grow the card. An upper bound on x keeps
    // the demo from running off the page if someone fling-drags.
    setTitlePos({
      x: clamp(p.x, SAFE, MAX_CARD_W),
      y: clamp(p.y, SAFE, MAX_CARD_H),
    });
  }, []);

  const onBodyDrag = useCallback((p: CurvePoint) => {
    setBodyPos({
      x: clamp(p.x, SAFE, MAX_CARD_W),
      y: clamp(p.y, SAFE + TITLE_H, MAX_CARD_H),
    });
  }, []);

  // --- slots ---

  const slots =
    linkMode === "linked"
      ? {
          title: {
            type: "region" as const,
            x: titlePos.x,
            y: titlePos.y,
            width: TITLE_W,
            height: TITLE_H,
          },
          // `x: titlePos.x` is the left-align constraint expressed as a
          // single binding; `y: { after }` keeps the vertical stacking
          // constraint Frame already has.
          body: {
            type: "region" as const,
            x: titlePos.x,
            y: { after: "title", gap },
            width: BODY_W,
            height: "content" as const,
          },
        }
      : {
          title: {
            type: "region" as const,
            x: titlePos.x,
            y: titlePos.y,
            width: TITLE_W,
            height: TITLE_H,
          },
          body: {
            type: "region" as const,
            x: bodyPos.x,
            y: bodyPos.y,
            width: BODY_W,
            height: "content" as const,
          },
        };

  return (
    <div>
      <p className="variant-label">C — Constraint-enforced cascade</p>
      <p style={{ color: "#555", margin: "4px 0 8px" }}>
        Three constraint layers exposed as handles. The scoop on the right
        edge feeds <code>rightIntrusionAt</code>; toggle below picks whether
        title and body are <strong>linked</strong> (body follows title via{" "}
        <code>y:&#123; after, gap &#125;</code>, with an editable gap handle)
        or <strong>free overlap</strong> (independent anchors; the body's
        <code> flowAround</code> wraps around the title's rect via the
        library helper <code>floatAroundRect</code>).
      </p>

      <div
        role="radiogroup"
        aria-label="Title / body constraint"
        style={{ display: "flex", gap: 8, margin: "0 0 6px" }}
      >
        <ModeButton
          active={linkMode === "linked"}
          onClick={() => setLinkMode("linked")}
        >
          Linked (body follows title)
        </ModeButton>
        <ModeButton
          active={linkMode === "free"}
          onClick={() => setLinkMode("free")}
        >
          Free overlap (text wraps around title)
        </ModeButton>
      </div>

      <VectorUIRoot
        width={cardWidth + 40}
        height="content"
        style={{
          background: tokens.color.surfaceSunken,
          // CSS width tracks the viewBox so scale stays at 1 — the card
          // appears to *grow*, not shrink — until it exceeds the container
          // (then maxWidth kicks in and the SVG scales down).
          width: cardWidth + 40,
          maxWidth: "100%",
        }}
      >
        <g transform="translate(20 16)">
          <DesignSurface>
            <Frame
              shape={shape}
              // Frame `width="auto"` and `height="auto"` together: the card
              // grows around whatever its slots demand, padding included.
              width="auto"
              height="auto"
              padding={20}
              fill={tokens.color.surface}
              stroke={tokens.color.line}
              strokeWidth={1.5}
              slots={slots}
              onLayout={setFrameSize}
            >
              <Frame.Slot name="title">
                <Text
                  {...tokens.type.title}
                  fill={tokens.color.ink}
                  maxWidth={TITLE_W}
                >
                  {TITLE_TEXT}
                </Text>
              </Frame.Slot>
              <Frame.Slot name="body">
                <Text
                  {...tokens.type.body}
                  fill={tokens.color.inkMuted}
                  maxWidth={BODY_W}
                  flowAround={flowAround}
                >
                  The body paragraph reads its right-edge intrusion from the
                  same scoopDepth the shape generator uses, and — in free
                  overlap mode — also from the title's current rect. Drag the
                  title into this column and watch lines flow around it; flip
                  back to Linked and the title's position drives the body's
                  position instead. Either way, the Frame's width="auto" and
                  height="auto" keep the card snug.
                </Text>
              </Frame.Slot>
            </Frame>

            {/* Constraint visualisation. Pointer events disabled so it
                never intercepts a drag. */}
            <ConstraintViz
              linkMode={linkMode}
              titlePos={titlePos}
              titleW={titleW}
              bodyTop={bodyTop}
              bodyLeft={bodyLeft}
              gap={gap}
              cardWidth={cardWidth}
              frameH={frameSize.height}
            />

            {/* Scoop tip — axis-pinned to x, anchored to the current right
                edge. `makeAxisHandle` builds the `point` + `onDrag` for us
                (and does the clamp via `range`). */}
            <RegisterHandle
              id="scoop-tip"
              label="Scoop depth"
              {...makeAxisHandle({
                read: () => scoopDepth,
                write: setScoopDepth,
                axis: "x",
                fixed: bodyTop + scoopDepth,
                toScalar: (x) => cardWidth - x,
                toLive: (d) => cardWidth - d,
                range: { min: SCOOP_MIN, max: SCOOP_MAX },
              })}
            />

            {/* Title anchor — always draggable. */}
            <SlotAnchor
              id="title-anchor"
              point={titlePos}
              label="Title position"
              onDrag={onTitleDrag}
            />

            {/* Linked: a gap handle, axis-pinned to y, sitting in the middle
                of the title-body gap. Free: a body anchor. */}
            {linkMode === "linked" ? (
              <RegisterHandle
                id="gap"
                label="Title–body gap"
                {...makeGapHandle({
                  topEdge: () => titlePos.y + TITLE_H,
                  read: () => gap,
                  write: setGap,
                  x: titlePos.x + TITLE_W / 2,
                  range: { min: 0, max: GAP_MAX },
                })}
              />
            ) : (
              <SlotAnchor
                id="body-anchor"
                point={bodyPos}
                label="Body position"
                onDrag={onBodyDrag}
              />
            )}
          </DesignSurface>
        </g>
      </VectorUIRoot>

      <p
        style={{
          margin: "6px 0 0",
          font: "500 12px ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "#777",
        }}
      >
        card: <strong>{Math.round(cardWidth)} × {Math.round(frameSize.height)}</strong>
        {" · "}scoop: <strong>{Math.round(scoopDepth)}</strong>
        {linkMode === "linked" ? (
          <>
            {" · "}gap: <strong>{Math.round(gap)}</strong>
          </>
        ) : (
          <>
            {" · "}title: <strong>({Math.round(titlePos.x)}, {Math.round(titlePos.y)})</strong>
            {" · "}body: <strong>({Math.round(bodyPos.x)}, {Math.round(bodyPos.y)})</strong>
          </>
        )}
      </p>
    </div>
  );
}

// --- constraint visualisation -------------------------------------------

function ConstraintViz({
  linkMode,
  titlePos,
  titleW,
  bodyTop,
  bodyLeft,
  gap,
  cardWidth,
  frameH,
}: {
  linkMode: LinkMode;
  titlePos: CurvePoint;
  titleW: number;
  bodyTop: number;
  bodyLeft: number;
  gap: number;
  cardWidth: number;
  frameH: number;
}) {
  return (
    <ConstraintOverlay>
      <EdgeTick
        at={{ x: cardWidth, y: -2 }}
        length={4}
        label={`width: ${Math.round(cardWidth)}`}
      />
      {linkMode === "linked" ? (
        <>
          <AlignGuide
            from={{ x: titlePos.x, y: titlePos.y - 4 }}
            to={{
              x: bodyLeft,
              y: Math.min(frameH - 4, bodyTop + 100),
            }}
            label="x"
          />
          <GapBracket
            x={titlePos.x + titleW + 10}
            top={titlePos.y + TITLE_H}
            bottom={bodyTop}
            label={`gap: ${Math.round(gap)}`}
          />
        </>
      ) : (
        <RectOutline
          rect={{
            left: titlePos.x,
            top: titlePos.y,
            right: titlePos.x + titleW,
            bottom: titlePos.y + TITLE_H,
          }}
          label="wrap target"
        />
      )}
    </ConstraintOverlay>
  );
}

// --- small handle subcomponents (each owns one useEditHandle) -------------

function SlotAnchor({
  id,
  point,
  label,
  onDrag,
}: {
  id: string;
  point: CurvePoint;
  label: string;
  onDrag: (next: CurvePoint) => void;
}) {
  useEditHandle({ id, point, label, onDrag });
  return null;
}

/**
 * Generic registrar — wraps `useEditHandle` so the `makeAxisHandle` /
 * `makeGapHandle` descriptors slot straight in via `{...handle}`.
 */
function RegisterHandle({
  id,
  label,
  point,
  axis,
  onDrag,
}: {
  id: string;
  label?: string;
  point: CurvePoint;
  axis?: "x" | "y" | "free";
  onDrag: (next: CurvePoint) => void;
}) {
  useEditHandle({ id, point, axis, label, onDrag });
  return null;
}

// --- mode toggle button ----------------------------------------------------

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: active ? "1.5px solid #6c5ce0" : "1.5px solid #d4cee9",
        background: active ? "#6c5ce0" : "#ffffff",
        color: active ? "#ffffff" : "#3b2d6b",
        font: "600 12px system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 680 }}>
        The runtime UI slides a value along the curve; the edit UI reshapes
        the curve. Same component, same handle declarations, same drag
        plumbing — only the surrounding context decides whether handles draw.
        A and B do that on <code>CurveSlider</code>; C shows the larger point —
        a constrained drag passes through the entire layout cascade.
      </p>
      <SideA />
      <SideB />
      <ConstraintCascade />
    </div>
  );
}
