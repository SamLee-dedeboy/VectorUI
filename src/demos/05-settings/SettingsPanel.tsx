import { useCallback, useMemo, useState } from "react";
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
 * `SettingsPanel` — a reusable, data-driven settings screen.
 *
 * Pass a `sections` array; the panel renders the tabs, body and rows, owns the
 * interactive state (active tab, toggles, value rows), and derives the initial
 * toggle/value state from each row's declared default. Must be rendered under
 * a `VectorUIRoot` (it reads `useViewportWidth`). See `demo.tsx` for data.
 */

const { color, type, space, shapes, filters } = tokens;

const OUTER = 24; // margin around the panel
const PAD = 30; // panel inner padding
const PAGE_GAP = 20;
const ROW_GAP = 12;
const ROW_H = 66;
const TAB_H = 38;
const TAB_CENTER_Y = 22;

/** Minimum panel width — exported so a host can set the SVG's `min-width`. */
export const MIN_WIDTH = 520;

export type RowDef =
  | {
      id: string;
      title: string;
      caption: string;
      kind: "toggle";
      /** Initial on/off state. */
      defaultOn?: boolean;
    }
  | {
      id: string;
      title: string;
      caption: string;
      kind: "value";
      options: readonly string[];
      /** Initial option index. */
      defaultIndex?: number;
    };

export type Section = {
  tab: string;
  eyebrow: string;
  body: string;
  rows: RowDef[];
};

export type SettingsPanelProps = {
  sections: Section[];
  /** Accent color — active tab, toggle-on track, illustration spark. */
  accent?: string;
};

function initialToggles(sections: Section[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  for (const section of sections)
    for (const row of section.rows)
      if (row.kind === "toggle") state[row.id] = row.defaultOn ?? false;
  return state;
}

function initialValues(sections: Section[]): Record<string, number> {
  const state: Record<string, number> = {};
  for (const section of sections)
    for (const row of section.rows)
      if (row.kind === "value") state[row.id] = row.defaultIndex ?? 0;
  return state;
}

export function SettingsPanel({
  sections,
  accent = color.accent,
}: SettingsPanelProps) {
  const width = useViewportWidth();
  const [activeTab, setActiveTab] = useState(0);
  const [toggles, setToggles] = useState(() => initialToggles(sections));
  const [values, setValues] = useState(() => initialValues(sections));

  const section = sections[activeTab] ?? sections[0];
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
              sections={sections}
              contentW={contentW}
              activeTab={activeTab}
              onSelect={setActiveTab}
              accent={accent}
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
              accent={accent}
            />
            <Flow gap={ROW_GAP}>
              {section.rows.map((row) => (
                <SettingRow
                  key={row.id}
                  width={contentW}
                  row={row}
                  accent={accent}
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

function TabBar({
  sections,
  contentW,
  activeTab,
  onSelect,
  accent,
}: {
  sections: Section[];
  contentW: number;
  activeTab: number;
  onSelect: (i: number) => void;
  accent: string;
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
      {sections.map((s, i) => (
        <Tab
          key={s.tab}
          label={s.tab}
          active={i === activeTab}
          onClick={() => onSelect(i)}
          accent={accent}
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
  accent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent: string;
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
      fill={active ? accent : color.surfaceSunken}
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
  accent,
}: {
  contentW: number;
  eyebrow: string;
  body: string;
  accent: string;
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
          fill={accent}
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
  accent,
  toggleOn,
  valueIndex,
  onActivate,
}: {
  width: number;
  row: RowDef;
  accent: string;
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
          <Toggle on={toggleOn} accent={accent} />
        ) : (
          <ValueChevron value={row.options[valueIndex]} />
        )}
      </Frame.Slot>
    </Frame>
  );
}

/** An on/off toggle with a knob that animates between states. */
function Toggle({ on, accent }: { on: boolean; accent: string }) {
  const w = 46;
  const h = 26;
  const knobR = 9;
  const t = useTween(on ? 1 : 0, 180);
  const cx = h / 2 + t * (w - h);
  return (
    <g role="switch" aria-checked={on}>
      <Path d={shapes.pill(w, h)} fill={on ? accent : color.line} />
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
