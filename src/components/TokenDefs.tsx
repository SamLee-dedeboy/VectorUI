import { filterDefs } from "../tokens";

/**
 * Renders the token `<filter>` presets into a single `<defs>` block.
 *
 * `VectorUIRoot` mounts this automatically, so `tokens.filters.*` references
 * resolve anywhere in the tree without each scene re-declaring filters.
 */
export function TokenDefs() {
  return <defs>{filterDefs}</defs>;
}
