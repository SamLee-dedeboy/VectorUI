import { useCallback, useEffect, useMemo, useState } from "react";
import { measureNaturalWidth } from "@chenglou/pretext";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Frame } from "../../components/Frame";
import { PathFlow } from "../../components/PathFlow";
import { Stack } from "../../components/Stack";
import { Text, type FlowAround } from "../../components/Text";
import { Path } from "../../svg/Path";
import { quadratic } from "../../layout/walkPath";
import { useViewportWidth } from "../../layout/breakpoints";
import { useFontsReady } from "../../layout/fonts";
import { prepareCached } from "../../layout/measureText";
import { tokens } from "../../tokens";
import { useTween } from "../02-card/useTween";
import { cornerBlob } from "../01-text-flow/cornerBlob";

/**
 * Demo 5 — composed, interactive "settings" page (SPEC §11).
 *
 * The page's vertical layout is a `Stack`: tabs, divider, body block and the
 * row list are stacked by their RENDERED bounds, so the rows always clear the
 * body block — even though the body's illustration is taller than its text.
 * No magic-number offsets, no per-section height plumbing.
 *
 * Responsiveness: the root uses `width="auto"`, so `scale` stays 1 and the
 * layout reflows to the real width instead of shrinking. Tabs switch, toggles
 * flip with an animated knob, value rows cycle.
 *
 * Proves: the primitives compose into something that reads as a real UI.
 */

const { color, type, space, shapes, filters } = tokens;

const OUTER = 24; // panel margin
const PAD = 30; // panel inner padding
const MIN_WIDTH = 520;
const PAGE_GAP = 20;
const ROW_GAP = 12;
const ROW_H = 66;

type RowKind =
  | { kind: "toggle" }
  | { kind: "value"; options: readonly string[] };

type RowDef = { id: string; title: string; caption: string } & RowKind;

type Section = {
  tab: string;
  eyebrow: string;
  body: string;
  rows: RowDef[];
};

const SECTIONS: Section[] = [
  {
    tab: "Appearance",
    eyebrow: "APPEARANCE",
    body: "These preferences are rendered entirely in SVG. The paragraph you are reading wraps the contour of the shape to its left — not a rectangle — and the rows below are closed paths, not boxes.",
    rows: [
      { id: "dark", title: "Dark mode", caption: "Match the system at sundown", kind: "toggle" },
      { id: "motion", title: "Reduced motion", caption: "Minimize non-essential animation", kind: "toggle" },
      { id: "size", title: "Text size", caption: "Body copy scale", kind: "value", options: ["Small", "Medium", "Large"] },
    ],
  },
  {
    tab: "Privacy",
    eyebrow: "PRIVACY",
    body: "Control what leaves this device. Each switch below is a closed path with a knob that animates between its two states — the same Frame primitive as every other row, and the rows stack on rendered bounds.",
    rows: [
      { id: "analytics", title: "Usage analytics", caption: "Share anonymous metrics", kind: "toggle" },
      { id: "history", title: "Search history", caption: "Keep recent queries", kind: "toggle" },
      { id: "visibility", title: "Profile visibility", caption: "Who can find you", kind: "value", options: ["Private", "Contacts", "Public"] },
    ],
  },
  {
    tab: "Account",
    eyebrow: "ACCOUNT",
    body: "Your account spans every device. Switching tabs re-flows this whole panel through one Stack — try it, then narrow the window and watch the layout adapt instead of shrinking.",
    rows: [
      { id: "twofa", title: "Two-factor auth", caption: "Require a code at sign-in", kind: "toggle" },
      { id: "backup", title: "Cloud backup", caption: "Sync settings across devices", kind: "toggle" },
      { id: "plan", title: "Plan", caption: "Billing tier", kind: "value", options: ["Free", "Pro", "Team"] },
    ],
  },
];

const INITIAL_TOGGLES: Record<string, boolean> = {
  dark: true,
  motion: false,
  analytics: true,
  history: true,
  twofa: false,
  backup: true,
};
const INITIAL_VALUES: Record<string, number> = {
  size: 1,
  visibility: 1,
  plan: 1,
};

export function Settings() {
  const [height, setHeight] = useState(600);
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The page's vertical layout is one <code>Stack</code> — tabs, body and
        rows are placed by their rendered bounds, so the rows clear the body's
        illustration automatically. Switch tabs, flip toggles, tap a value row.
      </p>
      <div style={{ overflowX: "auto" }}>
        <VectorUIRoot
          width="auto"
          height={height}
          style={{ minWidth: MIN_WIDTH, background: color.surfaceSunken }}
        >
          <SettingsScene onHeight={setHeight} />
        </VectorUIRoot>
      </div>
    </div>
  );
}

/** Lives under VectorUIRoot so it can reflow to the live viewport width. */
function SettingsScene({ onHeight }: { onHeight: (h: number) => void }) {
  const width = useViewportWidth();
  const [activeTab, setActiveTab] = useState(0);
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [contentHeight, setContentHeight] = useState(440);

  const section = SECTIONS[activeTab];
  const panelW = Math.max(width, MIN_WIDTH) - OUTER * 2;
  const contentW = panelW - PAD * 2;

  const panelH = contentHeight + PAD * 2;
  const totalH = panelH + OUTER * 2;
  useEffect(() => {
    onHeight(totalH);
  }, [onHeight, totalH]);

  const onContentMeasure = useCallback(
    (size: { height: number }) => setContentHeight(size.height),
    [],
  );
  const toggleRow = useCallback((id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const cycleRow = useCallback((id: string, count: number) => {
    setValues((prev) => ({ ...prev, [id]: ((prev[id] ?? 0) + 1) % count }));
  }, []);

  return (
    <>
      {/* The screen panel. Decorative — aria-hidden via <Path>. */}
      <Path
        d={shapes.rectRounded(panelW, panelH)}
        transform={`translate(${OUTER} ${OUTER})`}
        fill={color.surface}
        filter={filters.softShadow}
      />
      {/* The whole page is one vertical Stack — measured, not hand-placed. */}
      <Stack
        x={OUTER + PAD}
        y={OUTER + PAD}
        gap={PAGE_GAP}
        onMeasure={onContentMeasure}
      >
        <TabBar
          contentW={contentW}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
        <Path
          d={`M 0 0 L ${contentW} 0`}
          stroke={color.line}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <BodyBlock
          contentW={contentW}
          eyebrow={section.eyebrow}
          body={section.body}
        />
        <Stack gap={ROW_GAP}>
          {section.rows.map((row) => (
            <SettingRow
              key={row.id}
              width={contentW}
              row={row}
              toggleOn={toggles[row.id] ?? false}
              valueIndex={values[row.id] ?? 0}
              onActivate={() =>
                row.kind === "toggle"
                  ? toggleRow(row.id)
                  : cycleRow(row.id, row.options.length)
              }
            />
          ))}
        </Stack>
      </Stack>
    </>
  );
}

// --- tab bar --------------------------------------------------------------

const TAB_H = 38;
const TAB_PAD_X = 18;
const TAB_CENTER_Y = 22;

function TabBar({
  contentW,
  activeTab,
  onSelect,
}: {
  contentW: number;
  activeTab: number;
  onSelect: (i: number) => void;
}) {
  // A gentle arch — a quadratic with its control point lifted.
  const curve = quadratic({
    p0: { x: 8, y: TAB_CENTER_Y },
    control: { x: contentW / 2, y: TAB_CENTER_Y - 12 },
    p1: { x: contentW - 8, y: TAB_CENTER_Y },
  });
  return (
    <PathFlow
      curve={curve}
      distribute="even"
      orient="upright"
      role="tablist"
      aria-label="Settings sections"
    >
      {SECTIONS.map((s, i) => (
        <Tab
          key={s.tab}
          label={s.tab}
          active={i === activeTab}
          onClick={() => onSelect(i)}
        />
      ))}
    </PathFlow>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  useFontsReady(); // re-measure once the web font loads
  const labelW = measureNaturalWidth(prepareCached(label, type.label.font));
  const w = labelW + TAB_PAD_X * 2;
  return (
    <g
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <Path
        d={shapes.pill(w, TAB_H)}
        transform={`translate(${-w / 2} ${-TAB_H / 2})`}
        fill={active ? color.accent : color.surfaceSunken}
      />
      <Text
        {...type.label}
        lineHeight={TAB_H}
        maxWidth={w}
        x={-w / 2 + TAB_PAD_X}
        y={-TAB_H / 2}
        fill={active ? color.accentInk : color.inkMuted}
      >
        {label}
      </Text>
    </g>
  );
}

// --- body block -----------------------------------------------------------

function BodyBlock({
  contentW,
  eyebrow,
  body,
}: {
  contentW: number;
  eyebrow: string;
  body: string;
}) {
  const blob = useMemo(() => cornerBlob({ width: 92, height: 100 }), []);
  const flowAround = useMemo<FlowAround>(
    () => ({ intrusionAt: blob.intrusionAt, gap: space.lg }),
    [blob],
  );
  // eyebrow + illustrated paragraph, themselves stacked by rendered bounds.
  return (
    <Stack gap={space.md}>
      <Text {...type.heading} maxWidth={contentW} fill={color.inkSubtle}>
        {eyebrow}
      </Text>
      <g>
        <Path d={blob.path} fill={color.accentSoft} />
        <Path
          d="M 32 28 L 37 43 L 52 48 L 37 53 L 32 68 L 27 53 L 12 48 L 27 43 Z"
          fill={color.accent}
        />
        <Text
          {...type.body}
          maxWidth={contentW}
          flowAround={flowAround}
          fill={color.inkMuted}
        >
          {body}
        </Text>
      </g>
    </Stack>
  );
}

// --- rows -----------------------------------------------------------------

function SettingRow({
  width,
  row,
  toggleOn,
  valueIndex,
  onActivate,
}: {
  width: number;
  row: RowDef;
  toggleOn: boolean;
  valueIndex: number;
  onActivate: () => void;
}) {
  return (
    <Frame
      shape={shapes.rectRounded}
      width={width}
      height={ROW_H}
      slots={{
        label: {
          type: "region",
          x: space.xl,
          y: 15,
          width: width - 150,
          height: "content",
        },
        control: {
          type: "anchor",
          x: -space.xl,
          y: ROW_H / 2,
          align: "center-right",
        },
      }}
      fill={color.surface}
      stroke={color.line}
      strokeWidth={1.5}
      onClick={onActivate}
      style={{ cursor: "pointer" }}
      role="group"
      aria-label={row.title}
    >
      <Frame.Slot name="label">
        <Text {...type.title} lineHeight={23} maxWidth="100%" fill={color.ink}>
          {row.title}
        </Text>
        <Text {...type.caption} maxWidth="100%" y={25} fill={color.inkSubtle}>
          {row.caption}
        </Text>
      </Frame.Slot>
      <Frame.Slot name="control">
        {row.kind === "toggle" ? (
          <Toggle on={toggleOn} />
        ) : (
          <ValueChevron value={row.options[valueIndex]} />
        )}
      </Frame.Slot>
    </Frame>
  );
}

/** An on/off toggle with a knob that animates between states. */
function Toggle({ on }: { on: boolean }) {
  const w = 46;
  const h = 26;
  const knobR = 9;
  const t = useTween(on ? 1 : 0, 180);
  const cx = h / 2 + t * (w - h);
  return (
    <g role="switch" aria-checked={on}>
      <Path d={shapes.pill(w, h)} fill={on ? color.accent : color.line} />
      <circle cx={cx} cy={h / 2} r={knobR} fill={color.surface} />
    </g>
  );
}

/** A value label with a chevron — cycles when its row is tapped. */
function ValueChevron({ value }: { value: string }) {
  return (
    <g>
      <text
        x={-16}
        y={5}
        textAnchor="end"
        fontFamily="Inter, sans-serif"
        fontSize={13}
        fill={color.inkMuted}
      >
        {value}
      </text>
      <path
        d="M 0 -5 L 6 0 L 0 5"
        fill="none"
        stroke={color.inkSubtle}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
