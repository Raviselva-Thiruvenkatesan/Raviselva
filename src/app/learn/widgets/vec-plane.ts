/** Small helpers shared by the vector widgets of the BIM Math course. */

export interface P { x: number; y: number }

/** Pointer position in the SVG's own (viewBox) coordinates. */
export function svgPoint(e: PointerEvent, el: Element): P | null {
  const m = (el as SVGSVGElement).getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

/** Points of a triangular arrow head at (x2, y2), pointing away from (x1, y1). Pixel coordinates. */
export function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 9): string {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
  if (l < 1e-6) return '';
  const ux = dx / l, uy = dy / l, w = size * 0.5;
  const bx = x2 - ux * size, by = y2 - uy * size;
  return `${x2},${y2} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`;
}

/** A shaft that stops at the base of the arrow head, so a thick line does not poke through the tip. */
export function shaftEnd(x1: number, y1: number, x2: number, y2: number, size = 9): P {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy);
  if (l <= size) return { x: x1, y: y1 };
  return { x: x2 - (dx / l) * size * 0.8, y: y2 - (dy / l) * size * 0.8 };
}

/** Fixed decimals, no "-0", and a real minus sign. */
export function num(v: number, d = 2): string {
  const r = Math.abs(v) < 0.5 * 10 ** -d ? 0 : v;
  return r.toFixed(d).replace('-', '−');
}

/** Up to d decimals with trailing zeros dropped, and a real minus sign. */
export function short(v: number, d = 3): string {
  const r = +v.toFixed(d);
  return String(Object.is(r, -0) ? 0 : r).replace('-', '−');
}

/** Snap to a step and clamp to [lo, hi]. */
export function snap(v: number, step: number, lo: number, hi: number): number {
  return Math.round(Math.min(hi, Math.max(lo, v)) / step) * step || 0;
}

/** Arrow-key nudges for a focused handle: the change in x and y, or null for other keys. */
export function keyDelta(e: KeyboardEvent, step: number): P | null {
  const s = e.shiftKey ? step * 2 : step;
  const map: Record<string, P> = { ArrowLeft: { x: -s, y: 0 }, ArrowRight: { x: s, y: 0 }, ArrowUp: { x: 0, y: s }, ArrowDown: { x: 0, y: -s } };
  return map[e.key] ?? null;
}

/* 2D vector arithmetic, used by the Lines and curves widgets. */
export const plus = (a: P, b: P): P => ({ x: a.x + b.x, y: a.y + b.y });
export const minus = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
export const times = (a: P, k: number): P => ({ x: a.x * k, y: a.y * k });
export const dot = (a: P, b: P) => a.x * b.x + a.y * b.y;
export const cross = (a: P, b: P) => a.x * b.y - a.y * b.x;
export const len = (a: P) => Math.hypot(a.x, a.y);
export const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
