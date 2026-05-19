import { SAMPLES } from "./samples";
import { TextComparison } from "./TextComparison";

/**
 * Demo — implementation step 3 + the first risk gate (SPEC §14).
 *
 * Two configurations of the reusable `<TextComparison>` (see
 * TextComparison.tsx): different sample text, width, font size and view mode.
 */
export function Demo() {
  const sampleA = SAMPLES[0];
  const sampleB = SAMPLES[SAMPLES.length - 1];

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        pretext-driven SVG text vs. the browser's native line breaker. Both
        blocks below are the same <code>TextComparison</code> component with
        different props; <strong>Overlay</strong> mode shows per-line drift as
        red/blue ghosting.
      </p>

      <p className="variant-label">
        Version A — {sampleA.label}, 420px, 16px, side by side
      </p>
      <TextComparison
        text={sampleA.text}
        width={420}
        fontSize={16}
        mode="side-by-side"
      />

      <p className="variant-label">
        Version B — {sampleB.label}, 320px, 20px, overlay
      </p>
      <TextComparison
        text={sampleB.text}
        width={320}
        fontSize={20}
        mode="overlay"
      />
    </div>
  );
}
