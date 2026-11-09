/** 3D helpers and an isometric projection for the Planes and polygons widgets (Z up). */
import { P } from './vec-plane';

export interface V3 { x: number; y: number; z: number }

export const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
export const add3 = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub3 = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul3 = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
export const dot3 = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross3 = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const len3 = (a: V3) => Math.sqrt(dot3(a, a));
export const unit3 = (a: V3): V3 => mul3(a, 1 / (len3(a) || 1));
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

/**
 * An isometric camera for a 300-wide viewBox, with Z up.
 * 'ne' looks from (+X, +Y): X runs down-right, Y down-left.
 * 'se' looks from (+X, −Y): X runs down-right, Y up-right, so faces sloping towards −Y face the viewer.
 */
export class Iso {
  constructor(private s = 22, private ox = 150, private oy = 200, private from: 'ne' | 'se' = 'ne') {}
  /** Pixel position of a model point. */
  p(q: V3): P {
    const y = this.from === 'ne' ? q.y : -q.y;
    return { x: this.ox + (q.x - y) * this.s * 0.866, y: this.oy + (q.x + y) * this.s * 0.5 - q.z * this.s };
  }
  /** "x,y x,y …" for a polygon or polyline. */
  pts(qs: V3[]) { return qs.map(q => { const r = this.p(q); return `${r.x},${r.y}`; }).join(' '); }
}

/** Format a 3D vector or point. */
export function f3(v: V3, d = 2) {
  const s = (x: number) => { const r = +x.toFixed(d); return String(Object.is(r, -0) ? 0 : r).replace('-', '−'); };
  return `(${s(v.x)}, ${s(v.y)}, ${s(v.z)})`;
}
