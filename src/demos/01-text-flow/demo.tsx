import { useMemo } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { tokens } from "../../tokens";
import { cornerBlob } from "./cornerBlob";
import { TextFlow } from "./TextFlow";

/**
 * Demo 1 — text flow around a shape (SPEC §11).
 *
 * Two versions of the reusable `<TextFlow>` (see TextFlow.tsx): different
 * float shapes, column widths, text and colors — same component.
 *
 * Proves: pretext flow-around, variable-width per-line layout.
 */

const BODY_A = `Mainstream UI toolkits speak a rectilinear language: everything is a box, nested in boxes, aligned to the edges of other boxes. VectorUI asks a different question. If the page is one SVG document, then a shape — any closed path — can be a layout container, and text can be poured to follow its contours rather than a bounding rectangle. The blob to the left is not an image sitting in a float; it is a path, and the very same curve that is drawn is the curve this paragraph is wrapping against. Below the blob, the lines simply return to the full column width.`;

const BODY_B = `Same component, different arguments. This column is narrower, the floated shape is smaller and warmer, the silhouette is stroked so you can see the contour the text follows, and the type colours have changed — yet not a line of TextFlow's own code is different.`;

const PAD = 44;
const WIDE = 760;
const NARROW = 460;

export function Demo() {
  const blobA = useMemo(() => cornerBlob({ width: 168, height: 212 }), []);
  const blobB = useMemo(() => cornerBlob({ width: 116, height: 150 }), []);

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Body text wraps a floated shape's contour, then squares off below it.
        Both versions are the same <code>TextFlow</code> component with
        different props.
      </p>

      <p className="variant-label">Version A — large blob, wide column</p>
      <VectorUIRoot
        width={WIDE}
        height="content"
        style={{
          maxWidth: WIDE,
          border: `1px solid ${tokens.color.line}`,
          background: tokens.color.surface,
        }}
      >
        <Flow padding={PAD}>
          <TextFlow text={BODY_A} float={blobA} columnWidth={WIDE - PAD * 2} />
        </Flow>
      </VectorUIRoot>

      <p className="variant-label">
        Version B — small blob, narrow column, silhouette + warm restyle
      </p>
      <VectorUIRoot
        width={NARROW}
        height="content"
        style={{
          maxWidth: NARROW,
          border: `1px solid ${tokens.color.line}`,
          background: "#fdf6ef",
        }}
      >
        <Flow padding={PAD}>
          <TextFlow
            text={BODY_B}
            float={blobB}
            columnWidth={NARROW - PAD * 2}
            showSilhouette
            floatFill="#f6d9c4"
            textFill="#3a2e26"
          />
        </Flow>
      </VectorUIRoot>
    </div>
  );
}
