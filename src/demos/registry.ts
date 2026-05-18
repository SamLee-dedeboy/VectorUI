import type { ComponentType } from "react";
import { Smoke } from "./00-smoke/Smoke";
import { TextFidelity } from "./text-fidelity/TextFidelity";
import { TextFlow } from "./01-text-flow/TextFlow";
import { Card } from "./02-card/Card";
import { RadialMenu } from "./03-radial-menu/RadialMenu";
import { BreakpointMorph } from "./04-breakpoint-morph/BreakpointMorph";
import { Settings } from "./05-settings/Settings";

/** A demo route. `built` demos have a Component; planned ones are listed only. */
export type DemoEntry = {
  id: string;
  title: string;
  blurb: string;
  proves: string;
  Component?: ComponentType;
};

/** Demos that exist today. */
export const DEMOS: DemoEntry[] = [
  {
    id: "smoke",
    title: "0 · Root & coordinate scale",
    blurb:
      "A trivial SVG scene plus a live readout of the layout↔pixel scale. Resize the window to watch it update.",
    proves: "Steps 1–2: VectorUIRoot, useCoordinateScale, ResizeObserver.",
    Component: Smoke,
  },
  {
    id: "text-fidelity",
    title: "Text fidelity — risk gate",
    blurb:
      "pretext-driven SVG text vs. the browser's native line breaker, side by side and as an overlay.",
    proves: "Step 3: the Text primitive. The SPEC §14 risk gate.",
    Component: TextFidelity,
  },
  {
    id: "01-text-flow",
    title: "1 · Text flow around a shape",
    blurb:
      "A column of body text wrapping the silhouette of a blob floated into the corner.",
    proves: "Step 4: pretext flow-around, variable-width line layout.",
    Component: TextFlow,
  },
  {
    id: "02-card",
    title: "2 · Non-rectangular card",
    blurb:
      "A blob-shaped card with header / body / actions slots; the body shrink-wraps its height.",
    proves: "Steps 5–6: Frame, the slot system, path-as-container.",
    Component: Card,
  },
  {
    id: "03-radial-menu",
    title: "3 · Radial menu",
    blurb:
      "Six items distributed along an arc around a hub, rotated to the tangent.",
    proves: "Step 7: PathFlow, arc-length distribution, tangent rotation.",
    Component: RadialMenu,
  },
  {
    id: "04-breakpoint-morph",
    title: "4 · Breakpoint shape-morph",
    blurb:
      "A card that morphs from blob to rounded rectangle as the viewport crosses 600px.",
    proves: "Step 8: breakpoint system, path morphing, ResizeObserver wiring.",
    Component: BreakpointMorph,
  },
  {
    id: "05-settings",
    title: "5 · Composed settings page",
    blurb:
      "Curved tabs, a paragraph flowing around an illustration, non-rectangular rows.",
    proves: "Step 9: every primitive composed; design tokens.",
    Component: Settings,
  },
];

/** All five SPEC §11 demos are built. */
export const PLANNED: DemoEntry[] = [];
