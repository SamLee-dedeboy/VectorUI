import { createContext, useContext } from "react";

/**
 * Layer 2 — slot context.
 *
 * A `Frame` places each child into a named slot region. The slot publishes its
 * inner width here so a `Text` with `maxWidth="100%"` resolves to the slot's
 * width rather than the whole viewBox (SPEC §6.3). Outside a Frame this is
 * `null` and `"100%"` falls back to the viewBox edge.
 */
export type SlotInfo = {
  /** Inner width of the slot, in layout units. */
  width: number;
};

export const SlotContext = createContext<SlotInfo | null>(null);

/** The slot a component is rendered into, or `null` if not inside one. */
export function useSlot(): SlotInfo | null {
  return useContext(SlotContext);
}
