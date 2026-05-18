import { VectorUIRoot } from "../../components/VectorUIRoot";
import { Frame } from "../../components/Frame";
import { Text } from "../../components/Text";
import {
  useViewportWidth,
  useBreakpoint,
  breakpointMorph,
} from "../../layout/breakpoints";
import { usePrefersReducedMotion } from "../../layout/motion";
import { morphPath } from "../../layout/morphPath";
import { tokens } from "../../tokens";

/**
 * Demo 4 — breakpoint shape-morph (SPEC §11).
 *
 * A card that morphs from a blob into a sharp rounded rectangle as the
 * viewport crosses 600px. Resize the browser window to see it: the morph is
 * continuous across a transition band, driven by the root SVG's real pixel
 * width — so it is implicitly container-queried.
 *
 * Proves: the breakpoint system, path morphing, ResizeObserver wiring.
 */

const VIEW_W = 640;
const VIEW_H = 320;
const CARD_W = 430;
const CARD_H = 200;
const CARD_TOP = 78;
const THRESHOLD = 600;
const BAND = 150;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function BreakpointMorph() {
  return (
    <div>
      <p style={{ color: "#555", maxWidth: 640 }}>
        Resize the browser window. As the SVG's real width crosses 600px the
        card morphs between two shapes — interpolated path-by-path, eased across
        a transition band rather than snapped.
      </p>
      <VectorUIRoot
        width={VIEW_W}
        height={VIEW_H}
        style={{ background: tokens.color.surfaceMuted }}
      >
        <MorphCard />
      </VectorUIRoot>
    </div>
  );
}

/** Lives under VectorUIRoot so it can read the live viewport width. */
function MorphCard() {
  const width = useViewportWidth();
  const breakpoint = useBreakpoint();
  const reduced = usePrefersReducedMotion();

  const raw = breakpointMorph(width, THRESHOLD, BAND);
  // Reduced motion: snap to one shape or the other instead of easing.
  const t = reduced ? (raw < 0.5 ? 0 : 1) : smoothstep(raw);

  // Text is pixel-locked; the caption's offset below the title must therefore
  // be expressed in pixels and converted to layout units via the live scale,
  // or it overlaps the title once the viewBox is scaled down.
  const scale = width > 0 ? width / VIEW_W : 1;
  const captionY = (tokens.type.title.lineHeight + 6) / scale;

  const shape = (w: number, h: number) =>
    morphPath(tokens.shapes.blob(w, h, 0.25), tokens.shapes.sharp(w, h), t);

  const stage =
    t < 0.02
      ? "blob"
      : t > 0.98
        ? "rounded rectangle"
        : `morphing — ${Math.round(t * 100)}%`;

  return (
    <>
      <text
        x={VIEW_W / 2}
        y={42}
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize={14}
        fill="#37463e"
      >
        {`viewport ${Math.round(width)}px · breakpoint "${breakpoint}" · ${stage}`}
      </text>

      <g transform={`translate(${(VIEW_W - CARD_W) / 2} ${CARD_TOP})`}>
        <Frame
          shape={shape}
          width={CARD_W}
          height={CARD_H}
          slots={{
            label: {
              type: "region",
              x: 40,
              y: CARD_H / 2 - 28,
              width: CARD_W - 80,
              height: 56,
            },
          }}
          fill={tokens.color.surface}
          filter={tokens.filters.softShadow}
          title="Breakpoint morph card"
          role="region"
          aria-label="A card whose shape responds to viewport width"
        >
          <Frame.Slot name="label">
            <Text {...tokens.type.title} maxWidth="100%" fill={tokens.color.ink}>
              Resize the window
            </Text>
            <Text
              {...tokens.type.caption}
              maxWidth="100%"
              y={captionY}
              fill={tokens.color.inkMuted}
            >
              Below 600px this blob squares off into a card.
            </Text>
          </Frame.Slot>
        </Frame>
      </g>
    </>
  );
}
