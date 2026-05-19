import { useCallback, useMemo, useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Frame } from "../../components/Frame";
import { Flow } from "../../components/Flow";
import { PathFlow } from "../../components/PathFlow";
import { Pill } from "../../components/Pill";
import { Text, type FlowAround } from "../../components/Text";
import { Path } from "../../svg/Path";
import { quadratic } from "../../layout/walkPath";
import { useViewportWidth } from "../../layout/breakpoints";
import { tokens } from "../../tokens";
import { useTween } from "../02-card/useTween";
import { cornerBlob } from "../01-text-flow/cornerBlob";

/**
 * Demo 5 — composed, interactive "settings" page (SPEC §11).
 *
 * The whole screen is one `Frame` (the panel) whose interior is one `Flow`
 * (tabs, divider, body, rows). The Frame auto-sizes to that Flow and the root
 * uses `height="content"`, so the page has no height plumbing at all — no
 * `useState` seed, no `onMeasure`/`onLayout` callbacks.
 *
 * Responsiveness: the root uses `width="auto"`, so `scale` stays 1 and the
 * layout reflows to the real width instead of shrinking. Tabs switch, toggles
 * flip with an animated knob, value rows cycle.
 *
 * Proves: the primitives compose into something that reads as a real UI.
 */

const { color, type, space, shapes, filters } = tokens;

const OUTER = 24; // margin around the panel
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
    body: "Your account spans every device. Switching tabs re-flows this whole panel through one Flow — try it, then narrow the window and watch the layout adapt instead of shrinking.",
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
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        The screen is one <code>Frame</code> wrapping one <code>Flow</code>;
        the Frame auto-sizes and the root uses <code>height="content"</code>, so
        there is no height plumbing. Switch tabs, flip toggles, tap a value row.
      </p>
      <div style={{ overflowX: "auto" }}>
        <VectorUIRoot
          width="auto"
          height="content"
          style={{ minWidth: MIN_WIDTH, background: color.surfaceSunken }}
        >
          <SettingsScene />
        </VectorUIRoot>
      </div>
    </div>
  );
}

/** Lives under VectorUIRoot so it can reflow to the live viewport width. */
function SettingsScene() {
  const width = useViewportWidth();
  const [activeTab, setActiveTab] = useState(0);
  const [toggles, setToggles] = useState(INITIAL_TOGGLES);
  const [values, setValues] = useState(INITIAL_VALUES);

  const section = SECTIONS[activeTab];
  const panelW = Math.max(width, MIN_WIDTH) - OUTER * 2;
  const contentW = panelW - PAD * 2;

  const toggleRow = useCallback((id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const cycleRow = useCallback((id: string, count: number) => {
    setValues((prev) => ({ ...prev, [id]: ((prev[id] ?? 0) + 1) % count }));
  }, []);

  return (
    // Outer Flow margins the panel; the panel Frame auto-sizes to its content.
    <Flow padding={OUTER}>
      <Frame
        shape={shapes.rectRounded}
        width={panelW}
        height="auto"
        padding={PAD}
        slots={{
          page: {
            type: "region",
            x: PAD,
            y: PAD,
            width: contentW,
            height: "content",
          },
        }}
        fill={color.surface}
        filter={filters.softShadow}
      >
        <Frame.Slot name="page">
          <Flow gap={PAGE_GAP}>
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
            <Flow gap={ROW_GAP}>
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
            </Flow>
          </Flow>
        </Frame.Slot>
      </Frame>
    </Flow>
  );
}

// --- tab bar --------------------------------------------------------------

const TAB_H = 38;
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

/** A tab is a Pill, centered on its origin so PathFlow can place it. */
function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Pill
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{ cursor: "pointer" }}
      origin="center"
      textStyle={type.label}
      height={TAB_H}
      paddingX={18}
      fill={active ? color.accent : color.surfaceSunken}
      textFill={active ? color.accentInk : color.inkMuted}
    >
      {label}
    </Pill>
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
    <Flow gap={space.md}>
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
    </Flow>
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
        {/* Title + caption stacked by measured bounds — no manual y-offset. */}
        <Flow gap={space.xs}>
          <Text {...type.title} maxWidth="100%" fill={color.ink}>
            {row.title}
          </Text>
          <Text {...type.caption} maxWidth="100%" fill={color.inkSubtle}>
            {row.caption}
          </Text>
        </Flow>
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
