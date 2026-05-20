import { useMemo } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Flow } from "../../components/Flow";
import { tokens } from "../../tokens";
import { cornerBlob } from "./cornerBlob";
import { archFloat } from "./archFloat";
import { TextFlow } from "./TextFlow";

/**
 * Demo 1 — text flow around a shape (SPEC §11).
 *
 * Two versions of the reusable `<TextFlow>` (see TextFlow.tsx): version A pours
 * text past a blob floated into one corner; version B pours it THROUGH a
 * hand-drawn archway, wrapped on both sides at once.
 *
 * Proves: pretext flow-around, variable-width per-line layout, two-sided wrap.
 */

const BODY_A = `Mainstream UI toolkits speak a rectilinear language: everything is a box, nested in boxes, aligned to the edges of other boxes. VectorUI asks a different question. If the page is one SVG document, then a shape — any closed path — can be a layout container, and text can be poured to follow its contours rather than a bounding rectangle. The blob to the left is not an image sitting in a float; it is a path, and the very same curve that is drawn is the curve this paragraph is wrapping against. Below the blob, the lines simply return to the full column width.`;

const BODY_B = `Here the text is poured straight through a doorway. The shape behind these words is a single hand-drawn archway — a wavy bar resting on two wavy legs — and the paragraph threads down between them. Each line is squeezed inward from the left by one leg and from the right by the other, so the column narrows to the width of the opening. The wobble is deliberate: the legs are not straight rules but irregular contours, and the text follows every bend of them, line by line. The very same functions that draw the legs answer the question of how far each line must inset, which is why the words hug the silhouette exactly rather than an approximation of it. Once the lines clear the feet of the arch they spill back out to the full width of the column, squaring off as if the doorway had never been there. Not one line of TextFlow's own code changed between this version and the blob above — only the float handed to it.`;

const PAD = 44;
const WIDE = 760;
const ARCH_W = 620;

export function Demo() {
  const blobA = useMemo(() => cornerBlob({ width: 168, height: 212 }), []);
  const arch = useMemo(
    () => archFloat({ width: ARCH_W - PAD * 2, height: 300 }),
    [],
  );

  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Body text wraps a floated shape's contour, then squares off below it.
        Both versions are the same <code>TextFlow</code> component — version B
        wraps the text on <em>both</em> sides at once.
      </p>

      <p className="variant-label">Version A — corner blob, wide column</p>
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
        Version B — text poured through a hand-drawn archway, wrapped both sides
      </p>
      <VectorUIRoot
        width={ARCH_W}
        height="content"
        style={{
          maxWidth: ARCH_W,
          border: `1px solid ${tokens.color.line}`,
          background: "#fdf6ef",
        }}
      >
        <Flow padding={PAD}>
          <TextFlow
            text={BODY_B}
            float={arch}
            columnWidth={ARCH_W - PAD * 2}
            floatFill="#ecd3b8"
            textFill="#3a2e26"
          />
        </Flow>
      </VectorUIRoot>
    </div>
  );
}
