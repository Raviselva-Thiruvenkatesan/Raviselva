import { WritableSignal, signal } from '@angular/core';
import { P, keyDelta, short, snap, svgPoint } from './vec-plane';

/** Pixels per unit, and the pixel position of the origin, for a 300 × 300 viewBox showing −6..6. */
export const S = 25;
export const C = 150;

/**
 * Base for the widgets that show draggable points on a −6..6 grid.
 * A subclass lists its points in `pts`; the template wires start/move/key to the SVG and the handles.
 */
export abstract class DragPlane<K extends string> {
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly short = short;
  readonly drag = signal<K | null>(null);
  protected abstract readonly pts: Record<K, WritableSignal<P>>;
  /** Handles stay within ±lim and snap to this step. */
  protected lim = 5.5;
  protected step = 0.25;

  pt(k: K): P { return this.pts[k](); }
  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  /** "x,y" in pixels, for polyline and polygon points. */
  pp(p: P) { return `${this.px(p.x)},${this.py(p.y)}`; }
  fmt(p: P, d = 2) { return `(${short(p.x, d)}, ${short(p.y, d)})`; }

  start(e: PointerEvent, k: K) {
    this.drag.set(k);
    (e.currentTarget as Element).closest('svg')?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  move(e: PointerEvent, el: Element) {
    const k = this.drag();
    if (!k) return;
    const p = svgPoint(e, el);
    if (p) this.place(k, { x: (p.x - C) / S, y: (C - p.y) / S });
  }

  key(e: KeyboardEvent, k: K) {
    const d = keyDelta(e, this.step * 2);
    if (!d) return;
    e.preventDefault();
    this.place(k, { x: this.pt(k).x + d.x, y: this.pt(k).y + d.y });
  }

  /** Set several points at once, e.g. from a preset button. */
  load(v: Partial<Record<K, P>>) {
    for (const k of Object.keys(v) as K[]) this.pts[k].set({ ...(v[k] as P) });
  }

  protected place(k: K, p: P) {
    this.pts[k].set({ x: snap(p.x, this.step, -this.lim, this.lim), y: snap(p.y, this.step, -this.lim, this.lim) });
  }
}
