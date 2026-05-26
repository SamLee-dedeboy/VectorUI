import { createContext, useContext } from "react";
import type { FlowAround } from "../components/Text";

/**
 * Layer 2 — slot context.
 *
 * A `Frame` places each child into a named slot region. The slot publishes its
 * inner width here so a `Text` with `maxWidth="100%"` resolves to the slot's
 * width rather than the whole viewBox (SPEC §6.3). Outside a Frame this is
 * `null` and `"100%"` falls back to the viewBox edge.
 *
 * A shape-fit slot also publishes a pre-resolved `flowAround` — a per-band
 * profile derived from the Frame's shape (or the slot's override shape) — so a
 * `Text` inside auto-fits the contour without the consumer having to wire any
 * intrusion. `Text` reads this as a fallback when its own `flowAround` prop is
 * not set.
 */
export type SlotInfo = {
  /** Inner width of the slot, in layout units. */
  width: number;
  /** When set, a `Text` inside this slot (with no explicit `flowAround`) uses
   *  this profile — the slot is publishing a shape-derived interior contour. */
  flowAround?: FlowAround;
};

export const SlotContext = createContext<SlotInfo | null>(null);

/** The slot a component is rendered into, or `null` if not inside one. */
export function useSlot(): SlotInfo | null {
  return useContext(SlotContext);
}
