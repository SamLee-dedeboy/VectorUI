import type { ComponentType } from "react";

// Each demo is a `demo.tsx` page (controls + scene) that renders a reusable
// component from the same folder.
import { Demo as SmokeDemo } from "./00-smoke/demo";
import { Demo as TextFidelityDemo } from "./text-fidelity/demo";
import { Demo as TextFlowDemo } from "./01-text-flow/demo";
import { Demo as CardDemo } from "./02-card/demo";
import { Demo as RadialMenuDemo } from "./03-radial-menu/demo";
import { Demo as BreakpointMorphDemo } from "./04-breakpoint-morph/demo";
import { Demo as LayoutPlaygroundDemo } from "./05-layout-playground/demo";
import { Demo as ProceduralPathDemo } from "./06-procedural-path/demo";

// Demo source, imported verbatim via Vite's `?raw` so each demo page can show
// the exact code that produced it (the "Code" tab) — demo.tsx first.
import smokeDemoSrc from "./00-smoke/demo.tsx?raw";
import scaleReadoutSrc from "./00-smoke/ScaleReadout.tsx?raw";
import textFidelityDemoSrc from "./text-fidelity/demo.tsx?raw";
import textComparisonSrc from "./text-fidelity/TextComparison.tsx?raw";
import samplesSrc from "./text-fidelity/samples.ts?raw";
import textFlowDemoSrc from "./01-text-flow/demo.tsx?raw";
import textFlowSrc from "./01-text-flow/TextFlow.tsx?raw";
import cornerBlobSrc from "./01-text-flow/cornerBlob.ts?raw";
import archFloatSrc from "./01-text-flow/archFloat.ts?raw";
import cardDemoSrc from "./02-card/demo.tsx?raw";
import cardSrc from "./02-card/Card.tsx?raw";
import scoopCardSrc from "./02-card/scoopCard.ts?raw";
import landscapeCardSrc from "./02-card/LandscapeCard.tsx?raw";
import triangleFloatSrc from "./02-card/triangleFloat.ts?raw";
import wobbleSrc from "./02-card/wobble.ts?raw";
import buttonSrc from "./02-card/Button.tsx?raw";
import useTweenSrc from "./02-card/useTween.ts?raw";
import radialMenuDemoSrc from "./03-radial-menu/demo.tsx?raw";
import radialMenuSrc from "./03-radial-menu/RadialMenu.tsx?raw";
import radialChromeSrc from "./03-radial-menu/chrome.ts?raw";
import iconSrc from "./03-radial-menu/Icon.tsx?raw";
import breakpointMorphDemoSrc from "./04-breakpoint-morph/demo.tsx?raw";
import morphCardSrc from "./04-breakpoint-morph/MorphCard.tsx?raw";
import morphShapesSrc from "./04-breakpoint-morph/shapes.ts?raw";
import layoutPlaygroundDemoSrc from "./05-layout-playground/demo.tsx?raw";
import layoutPlaygroundSceneSrc from "./05-layout-playground/Playground.tsx?raw";
import layoutPlaygroundControlsSrc from "./05-layout-playground/Controls.tsx?raw";
import layoutPlaygroundInspectSrc from "./05-layout-playground/InspectOverlay.tsx?raw";
import layoutPlaygroundAccentSrc from "./05-layout-playground/accent.ts?raw";
import layoutPlaygroundStateSrc from "./05-layout-playground/state.ts?raw";
import proceduralDemoSrc from "./06-procedural-path/demo.tsx?raw";
import proceduralPathSrc from "./06-procedural-path/ProceduralPath.tsx?raw";
import proceduralShapeSrc from "./06-procedural-path/proceduralShape.ts?raw";
import proceduralControlsSrc from "./06-procedural-path/Controls.tsx?raw";
import proceduralStateSrc from "./06-procedural-path/state.ts?raw";

/** One source file shown in a demo's Code tab. */
export type SourceFile = { name: string; code: string };

/** A demo route. Built demos have a Component + sources; planned ones don't. */
export type DemoEntry = {
  id: string;
  title: string;
  blurb: string;
  proves: string;
  Component?: ComponentType;
  /** The demo's own source files — `demo.tsx` first, then its components. */
  sources?: SourceFile[];
};

/** Demos that exist today. */
export const DEMOS: DemoEntry[] = [
  {
    id: "smoke",
    title: "0 · Root & coordinate scale",
    blurb:
      "A trivial SVG scene plus a live readout of the layout↔pixel scale. Resize the window to watch it update.",
    proves: "Steps 1–2: VectorUIRoot, useCoordinateScale, ResizeObserver.",
    Component: SmokeDemo,
    sources: [
      { name: "demo.tsx", code: smokeDemoSrc },
      { name: "ScaleReadout.tsx", code: scaleReadoutSrc },
    ],
  },
  {
    id: "text-fidelity",
    title: "Text fidelity — risk gate",
    blurb:
      "pretext-driven SVG text vs. the browser's native line breaker, side by side and as an overlay.",
    proves: "Step 3: the Text primitive. The SPEC §14 risk gate.",
    Component: TextFidelityDemo,
    sources: [
      { name: "demo.tsx", code: textFidelityDemoSrc },
      { name: "TextComparison.tsx", code: textComparisonSrc },
      { name: "samples.ts", code: samplesSrc },
    ],
  },
  {
    id: "01-text-flow",
    title: "1 · Text flow around a shape",
    blurb:
      "Body text wrapping a corner blob, then poured through a hand-drawn archway — wrapped on both sides.",
    proves: "Step 4: pretext flow-around, variable-width line layout.",
    Component: TextFlowDemo,
    sources: [
      { name: "demo.tsx", code: textFlowDemoSrc },
      { name: "TextFlow.tsx", code: textFlowSrc },
      { name: "cornerBlob.ts", code: cornerBlobSrc },
      { name: "archFloat.ts", code: archFloatSrc },
    ],
  },
  {
    id: "02-card",
    title: "2 · Non-rectangular card",
    blurb:
      "A scoop-edged card (hover wobbles all four edges) and a hand-drawn landscape postcard with a mountain horizon.",
    proves: "Steps 5–6: Frame, the slot system, path-as-container, flow-around.",
    Component: CardDemo,
    sources: [
      { name: "demo.tsx", code: cardDemoSrc },
      { name: "Card.tsx", code: cardSrc },
      { name: "scoopCard.ts", code: scoopCardSrc },
      { name: "LandscapeCard.tsx", code: landscapeCardSrc },
      { name: "triangleFloat.ts", code: triangleFloatSrc },
      { name: "wobble.ts", code: wobbleSrc },
      { name: "Button.tsx", code: buttonSrc },
      { name: "useTween.ts", code: useTweenSrc },
    ],
  },
  {
    id: "03-radial-menu",
    title: "3 · Radial menu",
    blurb:
      "Hexagonal items distributed along an arc around a cog hub, rotated to the tangent.",
    proves: "Step 7: PathFlow, arc-length distribution, tangent rotation.",
    Component: RadialMenuDemo,
    sources: [
      { name: "demo.tsx", code: radialMenuDemoSrc },
      { name: "RadialMenu.tsx", code: radialMenuSrc },
      { name: "chrome.ts", code: radialChromeSrc },
      { name: "Icon.tsx", code: iconSrc },
    ],
  },
  {
    id: "04-breakpoint-morph",
    title: "4 · Breakpoint shape-morph",
    blurb:
      "A dark card with three stops — spark · petal · banner — that morphs through every breakpoint.",
    proves: "Step 8: breakpoint system, path morphing, ResizeObserver wiring.",
    Component: BreakpointMorphDemo,
    sources: [
      { name: "demo.tsx", code: breakpointMorphDemoSrc },
      { name: "MorphCard.tsx", code: morphCardSrc },
      { name: "shapes.ts", code: morphShapesSrc },
    ],
  },
  {
    id: "05-layout-playground",
    title: "5 · Layout playground",
    blurb:
      "One composed surface, six knobs. Every input targets a single layout-system capability — drag the slider to drive container-query reflow, cycle the distribute strategy, watch the Frame shrink-wrap.",
    proves:
      "Step 9: every primitive composed live; container queries; Frame shrink-wrap; PathFlow distribute strategies; dynamic Flow.",
    Component: LayoutPlaygroundDemo,
    sources: [
      { name: "demo.tsx", code: layoutPlaygroundDemoSrc },
      { name: "Playground.tsx", code: layoutPlaygroundSceneSrc },
      { name: "Controls.tsx", code: layoutPlaygroundControlsSrc },
      { name: "InspectOverlay.tsx", code: layoutPlaygroundInspectSrc },
      { name: "accent.ts", code: layoutPlaygroundAccentSrc },
      { name: "state.ts", code: layoutPlaygroundStateSrc },
    ],
  },
  {
    id: "06-procedural-path",
    title: "6 · Procedural path with live reflow",
    blurb:
      "Sliders drive a closed-form left-edge wave; text wraps the exact contour the path draws.",
    proves:
      "One closed-form function feeding both ShapeGenerator and Text's intrusionAt — slider input morphs the silhouette and reflows the paragraph on one frame.",
    Component: ProceduralPathDemo,
    sources: [
      { name: "demo.tsx", code: proceduralDemoSrc },
      { name: "ProceduralPath.tsx", code: proceduralPathSrc },
      { name: "proceduralShape.ts", code: proceduralShapeSrc },
      { name: "Controls.tsx", code: proceduralControlsSrc },
      { name: "state.ts", code: proceduralStateSrc },
    ],
  },
];

/** All five SPEC §11 demos are built; Demo 6 is the DX-probe addition. */
export const PLANNED: DemoEntry[] = [];
