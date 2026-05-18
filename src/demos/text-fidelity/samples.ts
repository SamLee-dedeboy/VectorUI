/** Stress samples for the Text fidelity risk gate (SPEC §14). */
export type Sample = { id: string; label: string; text: string };

export const SAMPLES: Sample[] = [
  {
    id: "prose",
    label: "Editorial prose",
    text: "VectorUI is a feasibility prototype for a UI component model rendered entirely in SVG. The aim is to escape the rectilinear visual language of mainstream component libraries and explore what becomes possible when shapes, rather than boxes, are the primary layout container. Body text should wrap exactly as a browser would wrap it.",
  },
  {
    id: "long-words",
    label: "Long / unbreakable tokens",
    text: "The endpoint lives at https://api.vectorui.example.com/v2/components/frame?include=slots,filters and the configuration key is layout_engine.coordinate_reconciliation_strategy. Internationalization and antidisestablishmentarianism are deliberately long words that test where the line breaker yields.",
  },
  {
    id: "punctuation",
    label: "Punctuation, dashes, numbers",
    text: "“Shape-as-container,” she said — emphatically — costs $1,240.50 (about €1,150). The ratio 16:9 differs from 4:3; the date 2026-05-18 is an ISO-8601 string. Em-dashes, en-dashes (3–7), and hyphens in well-known compounds all affect break opportunities.",
  },
  {
    id: "short-words",
    label: "Many short words",
    text: "It is not at all odd to see a line of text be made up of a lot of very small words, and yet the way the line is cut can still go wrong if the count of the bits of space is off by a hair, so we test it here too.",
  },
];
