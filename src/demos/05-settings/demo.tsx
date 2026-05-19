import { VectorUIRoot } from "../../components/VectorUIRoot";
import { tokens } from "../../tokens";
import { SettingsPanel, MIN_WIDTH, type Section } from "./SettingsPanel";

/**
 * Demo 5 — composed, interactive "settings" page (SPEC §11).
 *
 * Two versions of the reusable, data-driven `<SettingsPanel>` (see
 * SettingsPanel.tsx): two entirely different `sections` datasets, two accents
 * — same component.
 *
 * Proves: the primitives compose into something that reads as a real UI.
 */

const SECTIONS_A: Section[] = [
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
    body: "Control what leaves this device. Each switch below is a closed path with a knob that animates between its two states — the same Frame primitive as every other row.",
    rows: [
      { id: "analytics", title: "Usage analytics", caption: "Share anonymous metrics", kind: "toggle", defaultOn: true },
      { id: "history", title: "Search history", caption: "Keep recent queries", kind: "toggle", defaultOn: true },
      { id: "visibility", title: "Profile visibility", caption: "Who can find you", kind: "value", options: ["Private", "Contacts", "Public"], defaultIndex: 1 },
    ],
  },
  {
    tab: "Account",
    eyebrow: "ACCOUNT",
    body: "Your account spans every device. Switching tabs re-flows this whole panel through one Flow — try it, then narrow the window and watch the layout adapt.",
    rows: [
      { id: "twofa", title: "Two-factor auth", caption: "Require a code at sign-in", kind: "toggle", defaultOn: false },
      { id: "backup", title: "Cloud backup", caption: "Sync settings across devices", kind: "toggle", defaultOn: true },
      { id: "plan", title: "Plan", caption: "Billing tier", kind: "value", options: ["Free", "Pro", "Team"], defaultIndex: 1 },
    ],
  },
];

// A completely different product's settings — same component, new data.
const SECTIONS_B: Section[] = [
  {
    tab: "Playback",
    eyebrow: "PLAYBACK",
    body: "Audio settings for the player. Nothing here is bespoke — it is the SettingsPanel component again, handed a different sections array and a violet accent.",
    rows: [
      { id: "gapless", title: "Gapless playback", caption: "No silence between tracks", kind: "toggle", defaultOn: true },
      { id: "crossfade", title: "Crossfade", caption: "Blend track endings", kind: "toggle", defaultOn: false },
      { id: "quality", title: "Streaming quality", caption: "Bandwidth per track", kind: "value", options: ["Standard", "High", "Lossless"], defaultIndex: 1 },
    ],
  },
  {
    tab: "Library",
    eyebrow: "LIBRARY",
    body: "How the library is stored and ordered. The tabs arch along a curve and the rows stack by their rendered bounds, exactly as in version A.",
    rows: [
      { id: "offline", title: "Offline downloads", caption: "Keep saved music on device", kind: "toggle", defaultOn: true },
      { id: "autoadd", title: "Auto-add likes", caption: "Liked songs join the library", kind: "toggle", defaultOn: false },
      { id: "sort", title: "Default sort", caption: "Order new playlists by", kind: "value", options: ["Recent", "Title", "Artist"], defaultIndex: 0 },
    ],
  },
  {
    tab: "Devices",
    eyebrow: "DEVICES",
    body: "Output routing. Flip a switch or cycle the output — the toggle knob animates and the value row cycles, all from the shared component.",
    rows: [
      { id: "airplay", title: "AirPlay", caption: "Stream to nearby speakers", kind: "toggle", defaultOn: true },
      { id: "bluetooth", title: "Bluetooth", caption: "Pair wireless headphones", kind: "toggle", defaultOn: false },
      { id: "output", title: "Output", caption: "Where audio plays", kind: "value", options: ["Speakers", "Headphones", "TV"], defaultIndex: 0 },
    ],
  },
];

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Both panels below are the same data-driven <code>SettingsPanel</code>
        component, handed a different <code>sections</code> array and accent.
        Switch tabs, flip toggles, tap a value row.
      </p>

      <p className="variant-label">Version A — system settings, green accent</p>
      <div style={{ overflowX: "auto" }}>
        <VectorUIRoot
          width="auto"
          height="content"
          style={{
            minWidth: MIN_WIDTH,
            background: tokens.color.surfaceSunken,
          }}
        >
          <SettingsPanel sections={SECTIONS_A} />
        </VectorUIRoot>
      </div>

      <p className="variant-label">
        Version B — a media player's settings, violet accent
      </p>
      <div style={{ overflowX: "auto" }}>
        <VectorUIRoot
          width="auto"
          height="content"
          style={{ minWidth: MIN_WIDTH, background: "#f1eefb" }}
        >
          <SettingsPanel sections={SECTIONS_B} accent="#6c5ce0" />
        </VectorUIRoot>
      </div>
    </div>
  );
}
