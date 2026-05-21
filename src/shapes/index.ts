/**
 * VectorUI shape kit.
 *
 * Reusable shape providers that pair a rendered SVG path with a matching
 * `FlowAround` profile — the "one curve, two consumers" pattern that keeps
 * the drawn contour and the wrap-around-it math in lockstep. Built on the
 * `intrusionFromReach` helper in `src/layout`; each provider is pure
 * geometry (no token imports, no React).
 */
export { cornerBlob } from "./cornerBlob";
export type { CornerFloat, CornerBlobOptions } from "./cornerBlob";

export { archFloat, archLegWobbleProfile } from "./archFloat";
export type { ArchFloat, ArchFloatOptions } from "./archFloat";

export { triangleFloat } from "./triangleFloat";
export type { TriangleFloat, TriangleFloatOptions } from "./triangleFloat";

export { scoopCard } from "./scoopCard";
export type { ScoopCard, ScoopCardOptions } from "./scoopCard";

export { accent } from "./accent";
export type { Accent, AccentOptions } from "./accent";

export { makeShape, makeFlow } from "./proceduralShape";
export type { ShapeParams, ProceduralShapeOptions } from "./proceduralShape";

export { makeMenuShape } from "./menuShape";
export type { MenuShapeOptions } from "./menuShape";

export {
  wobbleAt,
  wobbleEdge,
  makeWobble,
  defaultWobbleProfile,
} from "./wobble";
export type { WobbleProfile, WobbleHarmonic } from "./wobble";
