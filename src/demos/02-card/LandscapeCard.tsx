import { useMemo } from "react";
import { Frame } from "../../components/Frame";
import { Text, type FlowAround } from "../../components/Text";
import { Path } from "../../svg/Path";
import { tokens, type TextStyle } from "../../tokens";
import { wobbleEdge, triangleFloat } from "../../shapes";

/**
 * `LandscapeCard` — a hand-drawn postcard: a wobbly rectangular outline with
 * a triangle in the upper-left whose interior houses the title and whose
 * right slope shapes the body text.
 *
 * Both the title and the body use `flowAround`. The title pairs the LEFT and
 * RIGHT slope intrusions (`triangle.fitInside`) so its lines narrow toward
 * the peak and widen toward the base, following the rendered contour. The
 * body uses just the RIGHT slope (`triangle.intrusionInto`) so its lines wrap
 * around the outside of the triangle. The wobble functions feed both the
 * drawn path and the wrap profiles, so the text provably hugs the contour.
 */

const { space, type, filters } = tokens;

const PAD = space.xl;

/** Triangle geometry, in card coordinates relative to the body slot origin. */
const TRI_W = 220;
const TRI_H = 175;

/** Gap kept between the text and the slope, in layout units. */
const FLOW_GAP = 4;
/** Inset from each slope for the title text — applied inside the triangle. */
const TITLE_PADDING = 8;
/**
 * Y where the title begins, measured from the triangle's peak. The peak is
 * a point; with `overflowWrap: "normal"` (keeping words whole) we'd see any
 * word wider than the local interior spill past the slope. Dropping the
 * title past the narrowest band lets the contour shape the *upper* lines
 * without forcing mid-word breaks.
 */
const TITLE_TOP_OFFSET = 30;

/** Heavy wobble: the user-visible point of this card. */
const CARD_WOBBLE = 12;
const TRIANGLE_WOBBLE = 22;

const round = (n: number) => Math.round(n * 100) / 100;

/** A rounded rectangle whose four straight edges wobble for a hand-drawn look. */
function wobblyRect(w: number, h: number): string {
  const cr = Math.min(w, h) * 0.025;
  const p = round;
  const d: string[] = [`M ${p(cr)} 0`];
  wobbleEdge(d, cr, 0, w - cr, 0, CARD_WOBBLE, 0.4); // top
  d.push(`Q ${p(w)} 0 ${p(w)} ${p(cr)}`);
  wobbleEdge(d, w, cr, w, h - cr, CARD_WOBBLE, 1.8); // right
  d.push(`Q ${p(w)} ${p(h)} ${p(w - cr)} ${p(h)}`);
  wobbleEdge(d, w - cr, h, cr, h, CARD_WOBBLE, 3.1); // bottom
  d.push(`Q 0 ${p(h)} 0 ${p(h - cr)}`);
  wobbleEdge(d, 0, h - cr, 0, cr, CARD_WOBBLE, 4.6); // left
  d.push(`Q 0 0 ${p(cr)} 0`, "Z");
  return d.join(" ");
}

export type LandscapeCardProps = {
  /** Card width, in layout units. */
  width?: number;
  title: string;
  body: string;
  /**
   * Type style for the title — pass a `tokens.type.*` token or a custom
   * `{ font, lineHeight, letterSpacing? }`. Defaults to `tokens.type.caption`
   * (13px), small enough that whole words fit inside the triangle's narrower
   * bands. Bigger fonts may need a larger triangle (`width`) or longer
   * `TITLE_TOP_OFFSET` to keep words from spilling past the slope.
   */
  titleStyle?: TextStyle;
  /** Card surface fill (the "paper"). */
  surface?: string;
  /** Fill of the title triangle. */
  triangleFill?: string;
  /** Title text color — sits on the triangle, so contrast against it. */
  titleFill?: string;
  /** Body text color. */
  bodyFill?: string;
};

export function LandscapeCard({
  width = 420,
  title,
  body,
  titleStyle = type.heading,
  surface = "#f3ecde",
  triangleFill = "#243029",
  titleFill = "#f3ecde",
  bodyFill = "#3d4540",
}: LandscapeCardProps) {
  const contentW = width - PAD * 2;

  // Wobbly triangle path + matching intrusion profiles (right-slope for the
  // body, both-slopes for the title-fitting-inside).
  const triangle = useMemo(
    () =>
      triangleFloat({
        width: TRI_W,
        height: TRI_H,
        wobble: TRIANGLE_WOBBLE,
      }),
    [],
  );

  // Title flow-around: the title slot starts TITLE_TOP_OFFSET below the
  // triangle's peak (so the column's first line lands at an interior band
  // wide enough to hold a whole word), and `padding` insets the text from
  // each slope for breathing room. Same wobble functions feed the drawn
  // slope and the intrusions, so the title follows every bend of the
  // rendered triangle.
  const titleFlow = useMemo<FlowAround>(() => {
    const fit = triangle.fitInside(0, -TITLE_TOP_OFFSET, TITLE_PADDING);
    return {
      intrusionAt: fit.intrusionAt,
      rightIntrusionAt: fit.rightIntrusionAt,
    };
  }, [triangle]);

  // Body flow-around: just the right slope — body sits to the right of the
  // triangle and squares back off below it.
  const bodyFlow = useMemo<FlowAround>(
    () => ({ intrusionAt: triangle.intrusionInto(0, 0), gap: FLOW_GAP }),
    [triangle],
  );

  return (
    <Frame
      shape={wobblyRect}
      width={width}
      height="auto"
      padding={space.xl}
      slots={{
        // The title's text column matches the triangle's bounding box, but
        // starts TITLE_TOP_OFFSET below the peak; lines are squeezed in from
        // both edges to fit the interior.
        title: {
          type: "region",
          x: PAD,
          y: PAD + TITLE_TOP_OFFSET,
          width: TRI_W,
          height: "content",
        },
        // The body's column is the full card width; the right-slope intrusion
        // pushes its lines around the outside of the triangle.
        body: {
          type: "region",
          x: PAD,
          y: PAD,
          width: contentW,
          height: "content",
        },
      }}
      fill={surface}
      filter={filters.softShadow}
      title={title}
      role="region"
    >
      {/* Triangle path — drawn at the body slot's origin so the same
          coordinates feed the intrusion profiles. */}
      <g transform={`translate(${PAD} ${PAD})`}>
        <Path d={triangle.path} fill={triangleFill} />
      </g>
      <Frame.Slot name="title">
        <Text
          {...titleStyle}
          maxWidth={TRI_W}
          flowAround={titleFlow}
          overflowWrap="normal"
          fill={titleFill}
        >
          {title}
        </Text>
      </Frame.Slot>
      <Frame.Slot name="body">
        <Text
          {...type.body}
          maxWidth="100%"
          flowAround={bodyFlow}
          fill={bodyFill}
        >
          {body}
        </Text>
      </Frame.Slot>
    </Frame>
  );
}
