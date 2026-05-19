import { VectorUIRoot } from "../../components/VectorUIRoot";
import { type IconName } from "./Icon";
import { RadialMenu } from "./RadialMenu";

/**
 * Demo 3 — radial menu (SPEC §11).
 *
 * Two versions of the reusable `<RadialMenu>` (see RadialMenu.tsx): a fanned
 * arc and a flat row, with different item sets and themes.
 *
 * Proves: `PathFlow`, arc-length distribution, tangent rotation.
 */

const ITEMS_A: IconName[] = ["home", "search", "heart", "star", "bell", "user"];
const ITEMS_B: IconName[] = ["home", "search", "heart", "user"];

export function Demo() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Items distributed along a curve and rotated to its tangent. Both
        versions are the same <code>RadialMenu</code> component — the curve
        mode, item set, orientation and theme are props.
      </p>

      <p className="variant-label">
        Version A — arc, six items, tangent-oriented, default theme
      </p>
      <VectorUIRoot
        width={540}
        height={400}
        style={{ maxWidth: 540, background: "#f4f3ee" }}
      >
        <RadialMenu
          items={ITEMS_A}
          mode="arc"
          orient="along"
          width={540}
          height={400}
        />
      </VectorUIRoot>

      <p className="variant-label">
        Version B — line, four items, upright, violet restyle
      </p>
      <VectorUIRoot
        width={540}
        height={240}
        style={{ maxWidth: 540, background: "#f1eefb" }}
      >
        <RadialMenu
          items={ITEMS_B}
          mode="line"
          orient="upright"
          width={540}
          height={240}
          hubFill="#6c5ce0"
          itemFill="#efeafc"
          iconColor="#3b2d6b"
        />
      </VectorUIRoot>
    </div>
  );
}
