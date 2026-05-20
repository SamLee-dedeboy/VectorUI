/**
 * VectorUI public API barrel.
 *
 * Layer 1 (svg) and Layer 2 (layout) are exported for completeness, but
 * applications normally consume only Layer 3 components.
 */

// Layer 3 — components
export { VectorUIRoot } from "./components/VectorUIRoot";
export type { VectorUIRootProps } from "./components/VectorUIRoot";
export { Text } from "./components/Text";
export type {
  TextProps,
  TextMeasurement,
  FlowAround,
  OverflowWrap,
} from "./components/Text";
export { Frame } from "./components/Frame";
export type {
  FrameProps,
  FrameSlotProps,
  SlotSpec,
  RegionSlot,
  AnchorSlot,
  HTMLOverlaySlot,
  SlotAfter,
  AnchorAlign,
  ShapeGenerator,
} from "./components/Frame";
export { PathFlow } from "./components/PathFlow";
export type { PathFlowProps } from "./components/PathFlow";
export { Flow } from "./components/Flow";
export type { FlowProps, FlowDirection, FlowAlign } from "./components/Flow";
export { Pill } from "./components/Pill";
export type { PillProps } from "./components/Pill";
export { CurveSlider } from "./components/CurveSlider";
export type { CurveSliderProps } from "./components/CurveSlider";
export { DesignSurface } from "./components/DesignSurface";
export type { DesignSurfaceProps } from "./components/DesignSurface";

export { TokenDefs } from "./components/TokenDefs";

// Design tokens (consumed at Layer 3)
export { tokens, colorVars, filterDefs } from "./tokens";
export type {
  TextStyle,
  ColorToken,
  SpaceToken,
  TypeToken,
  ShapeToken,
  FilterToken,
} from "./tokens";

// Layer 1 — render primitives
export { Group } from "./svg/Group";
export type { GroupProps } from "./svg/Group";
export { Path } from "./svg/Path";
export type { PathProps } from "./svg/Path";
export { TextLine } from "./svg/TextLine";
export type { TextLineProps } from "./svg/TextLine";

// Layer 2 — layout engine
export {
  useCoordinateScale,
  layoutToPx,
  pxToLayout,
} from "./layout/coordinateScale";
export type { CoordinateScale } from "./layout/coordinateScale";
export { useSlot } from "./layout/slot";
export type { SlotInfo } from "./layout/slot";
export {
  arc,
  line,
  polyline,
  quadratic,
  distributeAlong,
  pointAt,
  nearestPointOnCurve,
} from "./layout/walkPath";
export type {
  Curve,
  CurvePoint,
  CurveSample,
  ArcSpec,
  LineSpec,
  PolylineSpec,
  QuadraticSpec,
  Distribute,
  DistributeOptions,
  NearestPoint,
  NearestPointOptions,
} from "./layout/walkPath";
export {
  layoutParagraph,
  layoutFlowParagraph,
  getFontMetrics,
  prepareCached,
} from "./layout/measureText";
export type {
  MeasuredLine,
  MeasuredParagraph,
  MeasureOptions,
  FlowParagraphOptions,
  IntrusionAtPx,
  FontMetrics,
} from "./layout/measureText";
export { useFontsReady } from "./layout/fonts";
export { useNaturalTextWidth } from "./layout/textWidth";
export { useMeasuredBounds, boundsEqual } from "./layout/measureBounds";
export type { Bounds } from "./layout/measureBounds";
export { useChildBounds, useFitToContent } from "./layout/childBounds";
export type {
  ChildBounds,
  ChildBoundsApi,
  FitSize,
} from "./layout/childBounds";
export { usePrefersReducedMotion } from "./layout/motion";
export {
  EditModeContext,
  useEditMode,
  useEditHandle,
  createEditRegistry,
} from "./layout/editHandles";
export type {
  EditHandle,
  EditModeContextValue,
} from "./layout/editHandles";
export { morphPath, tokenizePath } from "./layout/morphPath";
export {
  useViewportWidth,
  useBreakpoint,
  breakpointMorph,
  defaultStops,
} from "./layout/breakpoints";
export type { BreakpointStops } from "./layout/breakpoints";
