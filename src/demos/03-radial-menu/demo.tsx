import { useState } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { type IconName } from "./Icon";
import { RadialMenu } from "./RadialMenu";
import { CurveMenu } from "./CurveMenu";
import { type CurveKind } from "./curves";

/**
 * Demo 3 — radial menu (SPEC §11).
 *
 * Two faces of the same idea — `PathFlow` placing items along a curve:
 *
 * - Version A is a true radial menu: click the green "…" hub and the chips
 *   fly out from the center along their radial trajectory, one-by-one
 *   left-to-right. Click again to retract them.
 * - Version B drops the "radial" assumption — the layout path is a curve the
 *   user picks (sine, square, or straight). Whatever the path's shape, the
 *   items distribute evenly along its arc length.
 *
 * Proves: `PathFlow`, arc-length distribution, tangent rotation, and that
 * the curve underneath can be any `Curve` — not just an arc.
 */

const ITEMS_A: IconName[] = ["home", "search", "heart", "star", "bell", "user"];
const ITEMS_B: IconName[] = ["home", "search", "heart", "star", "user"];

const CURVE_OPTIONS: { value: CurveKind; label: string }[] = [
  { value: "sine", label: "Sine wave" },
  { value: "square", label: "Square wave" },
  { value: "straight", label: "Straight line" },
];

export function Demo() {
  const [openA, setOpenA] = useState(false);
  const [curveB, setCurveB] = useState<CurveKind>("sine");

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Items distributed along a curve and rotated to its tangent.{" "}
        <strong>Version A</strong> opens the menu from a green "…" hub — chips
        fly out along their radial trajectory one-by-one over about 300 ms.{" "}
        <strong>Version B</strong> shows that the layout path can be anything —
        a sine wave, a square wave, or a straight line — and the items still
        distribute evenly along it.
      </p>

      <p className="variant-label">
        Version A — click the green "…" hub to fly chips out along the arc
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
          open={openA}
          onToggle={() => setOpenA((v) => !v)}
          itemDurationMs={300}
          staggerMs={50}
          width={540}
          height={400}
        />
      </VectorUIRoot>

      <p className="variant-label">
        Version B — same component family, but the path is{" "}
        <code>{curveB}</code>
      </p>
      <div
        role="radiogroup"
        aria-label="Curve type"
        style={{
          display: "flex",
          gap: 8,
          margin: "8px 0 12px",
          flexWrap: "wrap",
        }}
      >
        {CURVE_OPTIONS.map((opt) => {
          const active = opt.value === curveB;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCurveB(opt.value)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: active ? "1.5px solid #6c5ce0" : "1.5px solid #d4cee9",
                background: active ? "#6c5ce0" : "#ffffff",
                color: active ? "#ffffff" : "#3b2d6b",
                font: "600 13px system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <VectorUIRoot
        width={540}
        height={240}
        style={{ maxWidth: 540, background: "#f1eefb" }}
      >
        <CurveMenu
          items={ITEMS_B}
          curve={curveB}
          width={540}
          height={240}
        />
      </VectorUIRoot>
    </div>
  );
}
