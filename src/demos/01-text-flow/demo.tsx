import { useMemo } from "react";
import { VectorUIRoot } from "../../components/VectorUIRoot";
import { WrapText } from "../../components/WrapText";
import { Float } from "../../components/Float";
import { tokens } from "../../tokens";
import { cornerBlob, archFloat } from "../../shapes";

/**
 * Demo 1 — text flow around a shape (SPEC §11).
 *
 * Built entirely from the core components: a `WrapText` with a `Float` child.
 * `WrapText` draws each float's path AND derives the wrap contour from the same
 * `d`, so the text provably hugs the curve that is drawn. Version A pours text
 * past a blob floated into one corner; version B pours it THROUGH a hand-drawn
 * archway — a single concave path whose doorway the text threads, wrapped on
 * both sides at once.
 *
 * Proves: pretext flow-around, variable-width per-line layout, interior holes.
 */

const BODY_A = `Mainstream UI toolkits speak a rectilinear language: everything is a box, nested in boxes, aligned to the edges of other boxes. VectorUI asks a different question. If the page is one SVG document, then a shape — any closed path — can be a layout container, and text can be poured to follow its contours rather than a bounding rectangle. The blob to the left is not an image sitting in a float; it is a path, and the very same curve that is drawn is the curve this paragraph is wrapping against. Below the blob, the lines simply return to the full column width.`;

const BODY_B = `Here the text is poured straight through a doorway. The shape behind these words is a single hand-drawn archway — a wavy bar resting on two wavy legs — and the paragraph threads down between them. Each line is squeezed inward from the left by one leg and from the right by the other, so the column narrows to the width of the opening. The wobble is deliberate: the legs are not straight rules but irregular contours, and the text follows every bend of them, line by line. The very same path that draws the legs answers the question of how far each line must inset, which is why the words hug the silhouette exactly rather than an approximation of it. Once the lines clear the feet of the arch they spill back out to the full width of the column, squaring off as if the doorway had never been there. One Float, one concave path — WrapText reads the opening between the legs and flows the text through it.`;

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
        Both versions are a single <code>WrapText</code> with one{" "}
        <code>Float</code> — version B threads the text through a concave
        archway, wrapped on <em>both</em> sides at once.
      </p>

      <p className="variant-label">Version A — corner blob, wide column</p>
      <VectorUIRoot
        width={WIDE}
        height="content"
        style={{
          maxWidth: WIDE,
          border: `1px solid ${tokens.color.line}`,
          background: tokens.color.surface,
          padding: PAD,
        }}
      >
          <WrapText
            {...tokens.type.body}
            gap={24}
            fill={tokens.color.ink}
          >
            <Float d={blobA.path} fill={tokens.color.accentSoft} />
            {BODY_A}
          </WrapText>
      </VectorUIRoot>

      <p className="variant-label">
        Version B — text poured through a hand-drawn archway, wrapped both sides
      </p>
      <VectorUIRoot
        height="content"
        style={{
          maxWidth: ARCH_W,
          border: `1px solid ${tokens.color.line}`,
          background: "#fdf6ef",
          padding: PAD,
        }}
      >
          <WrapText
            {...tokens.type.body}
            lineHeight={26}
            gap={24}
            fill="#3a2e26"
          >
            <Float d={arch.path} fill="#ecd3b8" samples={1024} />
            {BODY_B}
          </WrapText>
      </VectorUIRoot>
    </div>
  );
}
