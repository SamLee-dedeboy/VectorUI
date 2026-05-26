import type { ComponentType } from "react";

// Each demo is a `demo.tsx` page (controls + scene) that renders a reusable
// component from the same folder.
import { Demo as TextFlowDemo } from "./01-text-flow/demo";
import { Demo as CardDemo } from "./02-card/demo";
import { Demo as RadialMenuDemo } from "./03-radial-menu/demo";
import { Demo as BreakpointMorphDemo } from "./04-breakpoint-morph/demo";
import { Demo as LayoutPlaygroundDemo } from "./05-layout-playground/demo";
import { Demo as ProceduralPathDemo } from "./06-procedural-path/demo";
import { Demo as CurveSliderDemo } from "./07-curve-slider/demo";
import { Demo as DesignSurfaceDemo } from "./08-design-surface/demo";
import { Demo as AnimationDemo } from "./09-animation/demo";
import { Demo as PlaygroundDemo } from "../playground/demo";

// Demo source, imported verbatim via Vite's `?raw` so each demo page can show
// the exact code that produced it (the "Code" tab) — demo.tsx first.
import textFlowDemoSrc from "./01-text-flow/demo.tsx?raw";
import cornerBlobSrc from "../shapes/cornerBlob.ts?raw";
import archFloatSrc from "../shapes/archFloat.ts?raw";
import cardDemoSrc from "./02-card/demo.tsx?raw";
import cardSrc from "../components/Card.tsx?raw";
import landscapeCardSrc from "../components/LandscapeCard.tsx?raw";
import scoopCardSrc from "../shapes/scoopCard.ts?raw";
import triangleFloatSrc from "../shapes/triangleFloat.ts?raw";
import wobbleSrc from "../shapes/wobble.ts?raw";
import buttonSrc from "./02-card/Button.tsx?raw";
import radialMenuDemoSrc from "./03-radial-menu/demo.tsx?raw";
import pathFlowSrc from "../components/PathFlow.tsx?raw";
import vectorButtonSrc from "../components/VectorButton.tsx?raw";
import radialChromeSrc from "./03-radial-menu/chrome.ts?raw";
import iconSrc from "./03-radial-menu/Icon.tsx?raw";
import radialCurvesSrc from "./03-radial-menu/curves.ts?raw";
import breakpointMorphDemoSrc from "./04-breakpoint-morph/demo.tsx?raw";
import morphCardSrc from "./04-breakpoint-morph/MorphCard.tsx?raw";
import morphShapesSrc from "./04-breakpoint-morph/shapes.ts?raw";
import layoutPlaygroundDemoSrc from "./05-layout-playground/demo.tsx?raw";
import layoutPlaygroundSceneSrc from "./05-layout-playground/Playground.tsx?raw";
import layoutPlaygroundControlsSrc from "./05-layout-playground/Controls.tsx?raw";
import layoutPlaygroundInspectSrc from "./05-layout-playground/InspectOverlay.tsx?raw";
import layoutPlaygroundAccentSrc from "../shapes/accent.ts?raw";
import layoutPlaygroundStateSrc from "./05-layout-playground/state.ts?raw";
import proceduralDemoSrc from "./06-procedural-path/demo.tsx?raw";
import proceduralPathSrc from "./06-procedural-path/ProceduralPath.tsx?raw";
import proceduralShapeSrc from "../shapes/proceduralShape.ts?raw";
import proceduralControlsSrc from "./06-procedural-path/Controls.tsx?raw";
import proceduralStateSrc from "./06-procedural-path/state.ts?raw";
import contouredMenuSrc from "./06-procedural-path/ContouredMenu.tsx?raw";
import menuShapeSrc from "../shapes/menuShape.ts?raw";
import curveSliderDemoSrc from "./07-curve-slider/demo.tsx?raw";
import designSurfaceDemoSrc from "./08-design-surface/demo.tsx?raw";
import animationDemoSrc from "./09-animation/demo.tsx?raw";
import animationTransformSrc from "./09-animation/scenes/TransformScene.tsx?raw";
import animationLayoutSrc from "./09-animation/scenes/LayoutInputScene.tsx?raw";
import animationShapeSrc from "./09-animation/scenes/ShapePropScene.tsx?raw";
import frameSrc from "../components/Frame.tsx?raw";
import tweenSrc from "../layout/tween.ts?raw";
import easingsSrc from "../layout/easings.ts?raw";

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
    id: "01-text-flow",
    title: "1 · Text flow around a shape",
    blurb:
      "Body text wrapping a corner blob, then poured through a hand-drawn archway — wrapped on both sides.",
    proves: "Step 4: pretext flow-around, variable-width line layout.",
    Component: TextFlowDemo,
    sources: [
      { name: "demo.tsx", code: textFlowDemoSrc },
      { name: "cornerBlob.ts", code: cornerBlobSrc },
      { name: "archFloat.ts", code: archFloatSrc },
    ],
  },
  {
    id: "02-card",
    title: "2 · Card — a shape-as-container core component",
    blurb:
      "Two cards built from the same Card core component: pass any shape as a prop and the body text auto-follows its contour; rigid widgets land in a derived safe rectangle. Version B (LandscapeCard) is itself a thin wrapper over the same Card, with a Float-as-feature body.",
    proves:
      "Card as a reusable core component: shape-as-prop + contour-fit slots; one Float doing three jobs (drawn, wrap-around, fill-inside).",
    Component: CardDemo,
    sources: [
      { name: "demo.tsx", code: cardDemoSrc },
      { name: "Card.tsx", code: cardSrc },
      { name: "LandscapeCard.tsx", code: landscapeCardSrc },
      { name: "scoopCard.ts", code: scoopCardSrc },
      { name: "triangleFloat.ts", code: triangleFloatSrc },
      { name: "wobble.ts", code: wobbleSrc },
      { name: "Button.tsx", code: buttonSrc },
    ],
  },
  {
    id: "03-radial-menu",
    title: "3 · PathFlow + VectorButton — curve-as-layout meets path-as-button",
    blurb:
      "Two menus built from two library core components: PathFlow distributes its children along any Curve; each child is a VectorButton whose shape prop is the click target. Version A passes an arc + cog-shaped VectorButton hub; Version B passes a morphed polyline interpolating between sine, square, and straight.",
    proves:
      "PathFlow as a reusable core component (curve-as-prop, arc-length distribution, tangent rotation) plus VectorButton (shape-as-prop button with click / hover / keyboard wired up). The curve and the shapes are the only things that change between the two faces of the demo.",
    Component: RadialMenuDemo,
    sources: [
      { name: "demo.tsx", code: radialMenuDemoSrc },
      { name: "PathFlow.tsx", code: pathFlowSrc },
      { name: "VectorButton.tsx", code: vectorButtonSrc },
      { name: "curves.ts", code: radialCurvesSrc },
      { name: "tween.ts", code: tweenSrc },
      { name: "easings.ts", code: easingsSrc },
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
      "Version A: sliders drive a closed-form left-edge wave; text wraps the exact contour the path draws. Version B: a vertical menu whose silhouette shelves to each item's measured width — click to activate and watch the outline morph.",
    proves:
      "One source of truth (a closed-form curve, or the array of measured row widths) feeding both ShapeGenerator and the layout consumer — geometry and layout stay in lockstep through every frame.",
    Component: ProceduralPathDemo,
    sources: [
      { name: "demo.tsx", code: proceduralDemoSrc },
      { name: "ProceduralPath.tsx", code: proceduralPathSrc },
      { name: "proceduralShape.ts", code: proceduralShapeSrc },
      { name: "ContouredMenu.tsx", code: contouredMenuSrc },
      { name: "menuShape.ts", code: menuShapeSrc },
      { name: "tween.ts", code: tweenSrc },
      { name: "Controls.tsx", code: proceduralControlsSrc },
      { name: "state.ts", code: proceduralStateSrc },
    ],
  },
  {
    id: "07-curve-slider",
    title: "7 · CurveSlider — the curve is the function",
    blurb:
      "One slider, three carriers: a volume cusp with +/− buttons (fine control at the sweet spot), a hike elevation profile (the curve is the trail), and a full-circle clock face. The curve always is what the value means.",
    proves:
      "Phase 3 — first-principles components. CurveSlider + nearestPointOnCurve / pointAt; pointer + keyboard + reduced-motion-aware.",
    Component: CurveSliderDemo,
    sources: [{ name: "demo.tsx", code: curveSliderDemoSrc }],
  },
  {
    id: "08-design-surface",
    title: "8 · DesignSurface — direct manipulation",
    blurb:
      "Drag handles that pass through the layout system, not around it. A and B reshape a CurveSlider's transfer function; C cascades scoop → text rewrap → slot height → Frame auto-height, with a linked-vs-free title/body toggle, an editable gap, width auto-expand, and constraint visualization.",
    proves:
      "Phase 3 — direct-manipulation authoring. useEditHandle protocol; DesignSurface aggregation; per-component edit-mode sugar; constraint-respecting drags.",
    Component: DesignSurfaceDemo,
    sources: [{ name: "demo.tsx", code: designSurfaceDemoSrc }],
  },
  {
    id: "09-animation",
    title: "9 · Animation — drive a prop over time",
    blurb:
      "Three sub-scenes, one recipe. A child's transform, a layout input, and a shape prop — all animated by the same five-hook kit (useTween, useTweenedNumbers, useTweenedPoints, useTweenedPath, useStaggeredReveal).",
    proves:
      "Animation as a render-time concern: VectorUI primitives are pure functions of props, so animating reduces to driving a prop over time. No animation API, no DOM mutation — just RAF-driven hooks at Layer 2.",
    Component: AnimationDemo,
    sources: [
      { name: "demo.tsx", code: animationDemoSrc },
      { name: "scenes/TransformScene.tsx", code: animationTransformSrc },
      { name: "scenes/LayoutInputScene.tsx", code: animationLayoutSrc },
      { name: "scenes/ShapePropScene.tsx", code: animationShapeSrc },
      { name: "tween.ts", code: tweenSrc },
      { name: "easings.ts", code: easingsSrc },
      // Scene B layers on PathFlow; the curve-as-layout primitive is the
      // thing being driven each frame by useTweenedPoints.
      { name: "PathFlow.tsx", code: pathFlowSrc },
      // Scene C composes Card + scoopCard; Card threads the ShapeProp through
      // to Frame, and Frame's shape-fit fast path is what turns the morph
      // from O(path × bands) sampling into O(line) closed-form queries.
      { name: "Card.tsx", code: cardSrc },
      { name: "Frame.tsx", code: frameSrc },
      { name: "scoopCard.ts", code: scoopCardSrc },
    ],
  },
  {
    id: "playground",
    title: "▶ Playground",
    blurb:
      "A live scratchpad: tabbed instances, each a real component file. Edit on the left, see it render on the right. Ask Claude Code to edit any instance and watch it hot-reload.",
    proves:
      "Dev-only sandbox over real files in src/playground/sketches/ — add/rename/delete instances; a shared editing surface for you and the agent. (No Code tab; the page is the editor.)",
    Component: PlaygroundDemo,
    // No `sources`: the page IS the editor, so there's nothing to mirror.
  },
];

/** All five SPEC §11 demos are built; Demo 6 is the DX-probe addition. */
export const PLANNED: DemoEntry[] = [];
