import { VectorUIRoot } from "../../components/VectorUIRoot";
import { tokens } from "../../tokens";
import { SettingsPanel, MIN_WIDTH, type Section } from "./SettingsPanel";

/**
 * Demo 5 — composed, interactive "settings" page (SPEC §11).
 *
 * The demo page: it owns the section data and renders the reusable, data-
 * driven `<SettingsPanel>` (see SettingsPanel.tsx).
 *
 * Proves: the primitives compose into something that reads as a real UI.
 */

const SECTIONS: Section[] = [
  {
    tab: "Appearance",
    eyebrow: "APPEARANCE",
    body: "These preferences are rendered entirely in SVG. The paragraph you are reading wraps the contour of the shape to its left — not a rectangle — and the rows below are closed paths, not boxes.",
    rows: [
      { id: "dark", title: "Dark mode", caption: "Match the system at sundown", kind: "toggle", defaultOn: true },
      { id: "motion", title: "Reduced motion", caption: "Minimize non-essential animation", kind: "toggle", defaultOn: false },
      { id: "size", title: "Text size", caption: "Body copy scale", kind: "value", options: ["Small", "Medium", "Large"], defaultIndex: 1 },
    ],
  },
  {
    tab: "Privacy",
    eyebrow: "PRIVACY",
    body: "Control what leaves this device. Each switch below is a closed path with a knob that animates between its two states — the same Frame primitive as every other row, and the rows stack on rendered bounds.",
    rows: [
      { id: "analytics", title: "Usage analytics", caption: "Share anonymous metrics", kind: "toggle", defaultOn: true },
      { id: "history", title: "Search history", caption: "Keep recent queries", kind: "toggle", defaultOn: true },
      { id: "visibility", title: "Profile visibility", caption: "Who can find you", kind: "value", options: ["Private", "Contacts", "Public"], defaultIndex: 1 },
    ],
  },
  {
    tab: "Account",
    eyebrow: "ACCOUNT",
    body: "Your account spans every device. Switching tabs re-flows this whole panel through one Flow — try it, then narrow the window and watch the layout adapt instead of shrinking.",
    rows: [
      { id: "twofa", title: "Two-factor auth", caption: "Require a code at sign-in", kind: "toggle", defaultOn: false },
      { id: "backup", title: "Cloud backup", caption: "Sync settings across devices", kind: "toggle", defaultOn: true },
      { id: "plan", title: "Plan", caption: "Billing tier", kind: "value", options: ["Free", "Pro", "Team"], defaultIndex: 1 },
    ],
  },
];

export function Demo() {
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
          style={{
            minWidth: MIN_WIDTH,
            background: tokens.color.surfaceSunken,
          }}
        >
          <SettingsPanel sections={SECTIONS} />
        </VectorUIRoot>
      </div>
    </div>
  );
}
