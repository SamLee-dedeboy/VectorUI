import { VectorUIRoot } from "../../components/VectorUIRoot";
import { PathFlow } from "../../components/PathFlow";
import { Pill } from "../../components/Pill";
import { fitArc } from "../../layout/walkPath";
import { tokens } from "../../tokens";

/**
 * Minimum implementation: a sequence of buttons laid out along a curve.
 *
 * `fitArc` gives the arc its centre + start angle + a fixed radius and lets the
 * SWEEP grow to fit the measured pills — so the curve can never overflow and
 * there is no geometry to keep in sync with the labels. `PathFlow` places each
 * child at its origin on the curve, so the pills are `origin="center"`;
 * `orient="upright"` keeps the labels horizontal rather than tilting them to
 * the tangent.
 */

const LABELS = ["Overview", "Activity", "Settings", "Billing", "Help"];

export default function ButtonsOnCurve() {
  const curve = fitArc({ cx: 200, cy: 230, startAngle: -2.5, radius: 200 });

  return (
    <VectorUIRoot
      style={{
        border: `1px solid ${tokens.color.line}`,
        background: tokens.color.surface,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <PathFlow curve={curve} gap={14} padding={8} orient="upright">
        {LABELS.map((label) => (
          <Pill
            key={label}
            textStyle={tokens.type.label}
            origin="center"
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            onClick={() => console.log(`clicked ${label}`)}
          >
            {label}
          </Pill>
        ))}
      </PathFlow>
    </VectorUIRoot>
  );
}
