/**
 * Path helpers for Demo 3's menu chrome — a hexagonal item chip and a
 * cog-like centre hub. Both are generated as plain SVG path strings and
 * centred on the origin (0, 0) so `PathFlow` can place and rotate them about
 * their middle. Layout units throughout.
 */

const round = (n: number) => Math.round(n * 100) / 100;

/** A flat-topped regular hexagon of circumradius `r`, centred on the origin. */
export function hexagon(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(`${round(r * Math.cos(a))} ${round(r * Math.sin(a))}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

/**
 * A cog: `teeth` smooth radial lobes around radius `r`, centred on the
 * origin. The radius is rippled by a cosine rather than cut into hard spikes,
 * so the teeth read as a soft gear.
 */
export function cog(r: number, teeth = 9): string {
  const samples = teeth * 16;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const rr = r * (1 + 0.15 * Math.cos(teeth * a));
    pts.push(`${round(rr * Math.cos(a))} ${round(rr * Math.sin(a))}`);
  }
  return `M ${pts.join(" L ")} Z`;
}
