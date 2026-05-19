import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { tokens } from "../../tokens";
import { type IconName } from "./Icon";
import { RadialMenu, type RadialMenuMode } from "./RadialMenu";

/**
 * Demo 3 — radial menu (SPEC §11).
 *
 * The demo page: owns the curve/orient controls and renders the reusable
 * `<RadialMenu>` (see RadialMenu.tsx) with them as arguments.
 *
 * Proves: `PathFlow`, arc-length distribution, tangent rotation.
 */

const ITEMS: IconName[] = ["home", "search", "heart", "star", "bell", "user"];
const ROOT_W = 540;
const ROOT_H = 400;

export function Demo() {
  const [mode, setMode] = useState<RadialMenuMode>("arc");
  const [orient, setOrient] = useState<"along" | "upright">("along");

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Six items placed along a curve and rotated to its tangent. Switch the
        curve and watch them animate — the line and the arc are the same
        quadratic with its control points tweened.
      </p>

      <div style={{ display: "flex", gap: 20, padding: "8px 0 16px" }}>
        <label>
          Curve{" "}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as RadialMenuMode)}
          >
            <option value="arc">Arc (radial menu)</option>
            <option value="line">Line (flex row)</option>
          </select>
        </label>
        <label>
          Orient{" "}
          <select
            value={orient}
            onChange={(e) =>
              setOrient(e.target.value as "along" | "upright")
            }
          >
            <option value="along">Along (tangent)</option>
            <option value="upright">Upright</option>
          </select>
        </label>
      </div>

      <VectorUIRoot
        width={ROOT_W}
        height={ROOT_H}
        style={{ maxWidth: ROOT_W, background: tokens.color.surfaceSunken }}
      >
        <RadialMenu
          items={ITEMS}
          mode={mode}
          orient={orient}
          width={ROOT_W}
          height={ROOT_H}
        />
      </VectorUIRoot>
    </div>
  );
}
