/**
 * jsdom doesn't implement SVG `getBBox`. VectorUI's measured-bounds path
 * (useMeasuredBounds → Flow / Frame / PathFlow) swallows the exception and
 * leaves children un-measured, which collapses layout. This shim returns
 * estimated bounds based on the element's geometry.
 *
 * Not pixel-accurate — text width is estimated from a per-character average
 * derived from the font-size attribute, path bounds come from a coarse
 * tokeniser, and a group unions its children. Good enough for "did the
 * candidate compose the right helpers" judgement.
 */

type Box = { x: number; y: number; width: number; height: number };

const EMPTY: Box = { x: 0, y: 0, width: 0, height: 0 };

function parseNumber(s: string | null | undefined, fallback = 0): number {
  if (s == null) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function fontSizeOf(el: Element): number {
  // <text font-size="14"> or inherited style "font: 600 16px Inter"
  const fs = el.getAttribute("font-size");
  if (fs) return parseNumber(fs, 14);
  const style = (el as HTMLElement).style;
  if (style && style.fontSize) return parseNumber(style.fontSize, 14);
  const font = el.getAttribute("font");
  if (font) {
    const m = font.match(/([\d.]+)px/);
    if (m) return parseNumber(m[1], 14);
  }
  return 14;
}

function textBox(el: Element): Box {
  const x = parseNumber(el.getAttribute("x"));
  const y = parseNumber(el.getAttribute("y"));
  const fontSize = fontSizeOf(el);
  const len = (el.textContent ?? "").length;
  // ~0.55 em per char for proportional fonts; close enough for layout.
  const width = len * fontSize * 0.55;
  const height = fontSize * 1.2;
  return { x, y: y - fontSize * 0.85, width, height };
}

function pathBox(el: Element): Box {
  const d = el.getAttribute("d") ?? "";
  if (!d) return EMPTY;
  // Pull every number out of the d-string. Commands are letters; numbers are
  // sign-and-dot floats. Pair them as (x, y) — coarse but works for paths that
  // alternate xy.
  const nums = d.match(/-?\d*\.?\d+/g);
  if (!nums || nums.length < 2) return EMPTY;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return EMPTY;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rectBox(el: Element): Box {
  return {
    x: parseNumber(el.getAttribute("x")),
    y: parseNumber(el.getAttribute("y")),
    width: parseNumber(el.getAttribute("width")),
    height: parseNumber(el.getAttribute("height")),
  };
}

function circleBox(el: Element): Box {
  const cx = parseNumber(el.getAttribute("cx"));
  const cy = parseNumber(el.getAttribute("cy"));
  const r = parseNumber(el.getAttribute("r"));
  return { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
}

function lineBox(el: Element): Box {
  const x1 = parseNumber(el.getAttribute("x1"));
  const y1 = parseNumber(el.getAttribute("y1"));
  const x2 = parseNumber(el.getAttribute("x2"));
  const y2 = parseNumber(el.getAttribute("y2"));
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function parseTransform(s: string | null): { tx: number; ty: number } {
  if (!s) return { tx: 0, ty: 0 };
  // Only handle translate(x [, y]) — the rest is ignored, which is fine for
  // Flow / Frame / PathFlow which only use translate for placement.
  const m = s.match(/translate\(\s*(-?[\d.]+)(?:[,\s]+(-?[\d.]+))?\s*\)/);
  if (!m) return { tx: 0, ty: 0 };
  return { tx: parseFloat(m[1]), ty: parseFloat(m[2] ?? "0") };
}

function unionBox(a: Box, b: Box): Box {
  if (a.width === 0 && a.height === 0 && a.x === 0 && a.y === 0) return b;
  if (b.width === 0 && b.height === 0 && b.x === 0 && b.y === 0) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

function computeBox(el: Element): Box {
  const tag = el.tagName.toLowerCase();
  let local: Box;
  switch (tag) {
    case "text":
    case "tspan":
      local = textBox(el);
      break;
    case "path":
      local = pathBox(el);
      break;
    case "rect":
      local = rectBox(el);
      break;
    case "circle":
    case "ellipse":
      local = circleBox(el);
      break;
    case "line":
      local = lineBox(el);
      break;
    case "g":
    case "svg":
    case "switch": {
      let acc: Box = EMPTY;
      for (const child of Array.from(el.children)) {
        if (child.getAttribute("aria-hidden") === "true" && tag === "g") {
          // include — aria-hidden decorative shapes still contribute geometry
        }
        if ((child as HTMLElement).style?.display === "none") continue;
        const childBox = computeBox(child);
        const { tx, ty } = parseTransform(child.getAttribute("transform"));
        acc = unionBox(acc, {
          x: childBox.x + tx,
          y: childBox.y + ty,
          width: childBox.width,
          height: childBox.height,
        });
      }
      local = acc;
      break;
    }
    default:
      local = EMPTY;
  }
  return local;
}

export function installBBoxShim(): void {
  const proto = (globalThis as any).SVGElement?.prototype;
  if (!proto) {
    throw new Error("installBBoxShim: SVGElement not on global; install jsdom first");
  }
  if (proto.__vectoruiBBoxShimInstalled) return;
  proto.__vectoruiBBoxShimInstalled = true;
  proto.getBBox = function getBBox(this: Element): Box {
    return computeBox(this);
  };
  // jsdom also lacks getCTM; return identity-ish.
  proto.getCTM = function getCTM() {
    return null;
  };
  proto.getScreenCTM = function getScreenCTM() {
    return null;
  };
}
