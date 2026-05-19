/**
 * `chamferedRect` — a rounded rectangle with its top-left corner sliced off by
 * a straight diagonal. It gives Demo 5's setting rows a distinct faceted edge,
 * and is a plain `(w, h) => path` generator, usable as a `Frame` shape.
 *
 * The chamfer is kept clear of the row's label inset, so text never clips it.
 */

const round = (n: number) => Math.round(n * 100) / 100;

export function chamferedRect(w: number, h: number): string {
  const r = Math.min(w, h) * 0.16; // radius of the three rounded corners
  const cut = Math.min(w, h) * 0.32; // leg length of the top-left chamfer
  const p = round;
  return [
    `M ${p(cut)} 0`,
    `L ${p(w - r)} 0`,
    `Q ${p(w)} 0 ${p(w)} ${p(r)}`,
    `L ${p(w)} ${p(h - r)}`,
    `Q ${p(w)} ${p(h)} ${p(w - r)} ${p(h)}`,
    `L ${p(r)} ${p(h)}`,
    `Q 0 ${p(h)} 0 ${p(h - r)}`,
    `L 0 ${p(cut)}`,
    `L ${p(cut)} 0`,
    "Z",
  ].join(" ");
}
