import { useState, type CSSProperties } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Text } from "../../components/Text";
import { Path } from "../../svg/Path";
import { Group } from "../../svg/Group";
import {
  useActualTextMetrics,
  useNaturalTextWidth,
} from "../../layout/textWidth";
import { getFontMetrics } from "../../layout/measureText";
import { tokens, type TextStyle } from "../../tokens";
import { makeMenuShape } from "./menuShape";
import { useTweenedNumbers } from "./useTweenedNumbers";

/**
 * Version B — a path that contours a vertical menu of varying-width items.
 *
 * Same single-source idea as Version A, expressed as a step function instead
 * of a closed-form curve: one array of per-row labels feeds both
 *  (1) the rendered labels, sized to their natural width via
 *      `useNaturalTextWidth` (no scale arithmetic — see [Pill]), and
 *  (2) the silhouette `Path`, which shelves to exactly that width on each row.
 *
 * Two width modes, switchable at the top:
 *  - `fit-content` — each row shrinks to its own label. The active row grows
 *    further to admit the "● active" suffix. The silhouette zig-zags.
 *  - `max-content` — every row sits at the widest plain label, producing a
 *    flush rectangle. Activating a row pushes JUST that one beyond the shared
 *    edge by the suffix's width, so the "active" badge sticks out.
 *
 * Clicking the already-active row deselects (active = null), returning the
 * shape to its all-plain baseline. The outer container is pinned to the
 * largest silhouette either mode can produce (which, conveniently, is the
 * same value for both: `max(plainW) + suffixDelta`), so neither activating a
 * row nor flipping the mode reflows the surrounding layout.
 */

/** Module-level so the hook-per-label `map` below has a stable length — a
 *  varying length would violate the Rules of Hooks. */
const ITEMS = [
  "Home",
  "Search",
  "Notifications",
  "Library",
  "Subscriptions",
  "History",
  "Settings",
] as const;

/** Suffix glyph appended after the active label. No leading whitespace —
 *  pretext strips both regular and non-breaking leading/trailing whitespace
 *  from natural-width measurement AND from rendered SVG `<text>`, so a
 *  space-as-character would vanish on both sides. The gap between label and
 *  suffix lives in `SUFFIX_GAP` (layout units) instead. */
const ACTIVE_SUFFIX = "● active";
/** Gap between a label's last glyph and the suffix's "●", in layout units. */
const SUFFIX_GAP = 6;
const ITEM_HEIGHT = 44;
const PADDING_X = 22;
const CORNER_RADIUS = 12;
const TWEEN_MS = 240;
/** Default selection. */
const DEFAULT_ACTIVE = 2;

type FitMode = "fit" | "max";

export function ContouredMenu() {
  const [active, setActive] = useState<number | null>(DEFAULT_ACTIVE);
  const [mode, setMode] = useState<FitMode>("fit");
  // Widened to `TextStyle` so the optional `letterSpacing` field is visible
  // to TS (the literal token type narrows the field out when it's absent).
  const labelStyle: TextStyle = tokens.type.body;

  // Per-label natural widths in layout units. `ITEMS` is a module constant, so
  // the hook count is stable across renders.
  const labelMetrics = ITEMS.map((label) => {
    const natural = useNaturalTextWidth(
      label,
      labelStyle.font,
      labelStyle.letterSpacing,
    );
    return {
      plainW: natural + PADDING_X * 2,
      labelNatural: natural,
    };
  });

  // Suffix natural width — measured once, independent of the active row, so
  // both modes share one stick-out budget (and the container can be pinned
  // to the largest silhouette regardless of which row is active).
  const suffixNatW = useNaturalTextWidth(
    ACTIVE_SUFFIX,
    labelStyle.font,
    labelStyle.letterSpacing,
  );
  /** Horizontal extension applied to a row when it goes active: gap + suffix
   *  ink. Right pad is preserved automatically because we keep `PADDING_X`
   *  baked into `plainW` and add only the stick-out beyond it. */
  const suffixDelta = SUFFIX_GAP + suffixNatW;

  // Cap-height vertical centering — same convention as `Pill`. `Text` with
  // `lineHeight = ITEM_HEIGHT` centres the single line within an ITEM_HEIGHT
  // box on the CSS font-box; the tiny `baselineOffsetPx` shift converts that
  // to cap-height centring so the ink sits on the row's visual midline rather
  // than dipping by Inter's asymmetric ascender room.
  const fontBox = getFontMetrics(labelStyle.font);
  const cap = useActualTextMetrics("H", labelStyle.font);
  const baselineOffsetPx =
    (cap.actAscPx - cap.actDescPx - fontBox.ascentPx + fontBox.descentPx) / 2;

  // Per-mode baselines. In fit-content an inactive row is its own plain width;
  // in max-content every inactive row sits at the widest plain label.
  const basePlainMax = Math.max(...labelMetrics.map((m) => m.plainW));
  const rowInactive = (i: number) =>
    mode === "fit" ? labelMetrics[i].plainW : basePlainMax;
  const rowActive = (i: number) => rowInactive(i) + suffixDelta;

  // Target right-edge x per row, then RAF-tweened so a click animates the
  // shelves into place instead of snapping. Re-encoded on mode/active change.
  const targets = labelMetrics.map((_, i) =>
    i === active ? rowActive(i) : rowInactive(i),
  );
  const widths = useTweenedNumbers(targets, TWEEN_MS);

  const totalHeight = ITEMS.length * ITEM_HEIGHT;
  // Container width = the widest silhouette either mode can ever produce —
  // identical in both, since fit's longest active row IS basePlainMax row
  // plus the stick-out. Stable across mode AND active changes, so the
  // surrounding layout never reflows on click.
  const containerWidth = basePlainMax + suffixDelta;

  const d = makeMenuShape({
    itemWidths: widths,
    itemHeight: ITEM_HEIGHT,
    cornerRadius: CORNER_RADIUS,
  })(containerWidth, totalHeight);

  // Suffix anchor:
  //   fit  — tracks the label's right edge, so a short label keeps the badge
  //          close (the badge follows the same shelf the silhouette draws).
  //   max  — lives at the shared right edge so every active row's badge
  //          appears in the same column — the "stick-out" reads as a uniform
  //          extension regardless of which row is active.
  const suffixX = (i: number) =>
    mode === "fit"
      ? PADDING_X + labelMetrics[i].labelNatural + SUFFIX_GAP
      : basePlainMax - PADDING_X + SUFFIX_GAP;

  return (
    <div style={{ width: containerWidth, maxWidth: "100%" }}>
      <ModeToggle mode={mode} onChange={setMode} />
      <VectorUIRoot
        width="auto"
        height={totalHeight}
        style={{ background: tokens.color.surfaceSunken }}
      >
        <Path
          d={d}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
          strokeWidth={1.5}
        />
        {ITEMS.map((label, i) => {
          const isActive = i === active;
          const inactiveW = rowInactive(i);
          const activeW = rowActive(i);
          const rowTop = i * ITEM_HEIGHT;
          // Suffix opacity follows the path's growth toward THIS row's active
          // width — 0 when sitting at its inactive width, 1 when fully
          // expanded. Tying it to width (not a boolean) keeps the badge
          // revealing in lockstep with the shelf so the ink never extends past
          // the silhouette.
          const span = Math.max(1, activeW - inactiveW);
          const suffixOpacity = Math.max(
            0,
            Math.min(1, (widths[i] - inactiveW) / span),
          );
          return (
            <Group key={label}>
              <Text
                font={labelStyle.font}
                lineHeight={ITEM_HEIGHT}
                letterSpacing={labelStyle.letterSpacing}
                maxWidth={containerWidth}
                x={PADDING_X}
                y={rowTop + baselineOffsetPx}
                fill={isActive ? tokens.color.accent : tokens.color.ink}
                style={{ transition: `fill ${TWEEN_MS}ms ease-in-out` }}
              >
                {label}
              </Text>
              <Text
                font={labelStyle.font}
                lineHeight={ITEM_HEIGHT}
                letterSpacing={labelStyle.letterSpacing}
                maxWidth={containerWidth}
                x={suffixX(i)}
                y={rowTop + baselineOffsetPx}
                fill={tokens.color.accent}
                style={{ opacity: suffixOpacity, pointerEvents: "none" }}
              >
                {ACTIVE_SUFFIX}
              </Text>
              {/* Hit region — covers the whole pinned width so a click in the
                  empty margin to the right of a short row still selects it.
                  Clicking the already-active row deselects (active → null).
                  Transparent so the silhouette shows through. */}
              <rect
                x={0}
                y={rowTop}
                width={containerWidth}
                height={ITEM_HEIGHT}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => setActive(isActive ? null : i)}
              />
            </Group>
          );
        })}
      </VectorUIRoot>
    </div>
  );
}

/** Inline mode toggle. HTML form control outside the SVG — SPEC §10 keeps
 *  HTML-overlay inputs deferred. */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: FitMode;
  onChange: (next: FitMode) => void;
}) {
  return (
    <div style={togglePanelStyle}>
      <span style={{ color: "#555" }}>Row width:</span>
      <label style={radioLabelStyle}>
        <input
          type="radio"
          name="contoured-menu-mode"
          value="fit"
          checked={mode === "fit"}
          onChange={() => onChange("fit")}
        />
        <code>fit-content</code>
      </label>
      <label style={radioLabelStyle}>
        <input
          type="radio"
          name="contoured-menu-mode"
          value="max"
          checked={mode === "max"}
          onChange={() => onChange("max")}
        />
        <code>max-content</code>
      </label>
    </div>
  );
}

const togglePanelStyle: CSSProperties = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  marginBottom: 8,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  // The menu's wrapper is pinned to the silhouette's max width, which is
  // narrower than this toggle — `width: max-content` lets the toggle ignore
  // that bound, and `nowrap` keeps the `<code>` chips from soft-breaking at
  // the hyphen in "fit-content" / "max-content".
  width: "max-content",
  whiteSpace: "nowrap",
};

const radioLabelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
};
