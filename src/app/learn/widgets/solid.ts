/** Triangle meshes, boxes and sections for the 3D geometry and solids widgets (Z up, right-handed). */
import { V3, add3, cross3, dot3, len3, mul3, sub3, v3 } from './iso';
import { P } from './vec-plane';

/** Vertices and triangles; every triangle is counter-clockwise seen from outside. */
export interface Mesh { v: V3[]; f: [number, number, number][] }

/** A polygon (counter-clockwise, fan-triangulable from its first corner) extruded by h. */
export function prism(poly: [number, number][], h: number): Mesh {
  const n = poly.length, v: V3[] = [], f: [number, number, number][] = [];
  for (const [x, y] of poly) v.push(v3(x, y, 0));
  for (const [x, y] of poly) v.push(v3(x, y, h));
  for (let k = 1; k < n - 1; k++) { f.push([0, k + 1, k]); f.push([n, n + k, n + k + 1]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push([i, j, j + n]); f.push([i, j + n, i + n]); }
  return { v, f };
}

export const boxMesh = (lx: number, ly: number, lz: number) => prism([[0, 0], [lx, 0], [lx, ly], [0, ly]], lz);

/** A square-based pyramid; its first face is the front side (facing −Y). */
export function pyramidMesh(b: number, h: number): Mesh {
  const v = [v3(0, 0, 0), v3(b, 0, 0), v3(b, b, 0), v3(0, b, 0), v3(b / 2, b / 2, h)];
  return { v, f: [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4], [0, 2, 1], [0, 3, 2]] };
}

/** A gable house: the end wall (width w, eaves e, ridge r) extruded along X by l. The prism's (a, b, h) map to (y, z, x), which keeps the winding. */
export function houseMesh(l: number, w: number, e: number, r: number): Mesh {
  const m = prism([[0, 0], [w, 0], [w, e], [w / 2, r], [0, e]], l);
  return { v: m.v.map(p => v3(p.z, p.x, p.y)), f: m.f };
}

export const L_ROOM: [number, number][] = [[0, 0], [4, 0], [4, 2], [2, 2], [2, 4], [0, 4]];

export function centreOf(m: Mesh): V3 {
  const lo = v3(Infinity, Infinity, Infinity), hi = v3(-Infinity, -Infinity, -Infinity);
  for (const p of m.v) {
    lo.x = Math.min(lo.x, p.x); lo.y = Math.min(lo.y, p.y); lo.z = Math.min(lo.z, p.z);
    hi.x = Math.max(hi.x, p.x); hi.y = Math.max(hi.y, p.y); hi.z = Math.max(hi.z, p.z);
  }
  return mul3(add3(lo, hi), 0.5);
}

export const moved = (m: Mesh, d: V3): Mesh => ({ v: m.v.map(p => add3(p, d)), f: m.f });

/** Area-weighted normal (length = 2 × area). */
export const triCross = (m: Mesh, t: [number, number, number]) => cross3(sub3(m.v[t[1]], m.v[t[0]]), sub3(m.v[t[2]], m.v[t[0]]));
export const triCentre = (m: Mesh, t: [number, number, number]) => mul3(add3(add3(m.v[t[0]], m.v[t[1]]), m.v[t[2]]), 1 / 3);

export const meshArea = (m: Mesh) => m.f.reduce((s, t) => s + len3(triCross(m, t)) / 2, 0);

/** Signed volume of the tetrahedron from o to the triangle t. */
export function tetVolume(m: Mesh, t: [number, number, number], o: V3) {
  const a = sub3(m.v[t[0]], o), b = sub3(m.v[t[1]], o), c = sub3(m.v[t[2]], o);
  return dot3(a, cross3(b, c)) / 6;
}

export const meshVolume = (m: Mesh, o = v3(0, 0, 0)) => m.f.reduce((s, t) => s + tetVolume(m, t, o), 0);

/** Undirected edge count, and whether every directed edge is matched by exactly one in the other direction. */
export function edgeCheck(m: Mesh): { edges: number; closed: boolean } {
  const dir = new Map<string, number>();
  for (const t of m.f) for (let k = 0; k < 3; k++) {
    const key = `${t[k]},${t[(k + 1) % 3]}`;
    dir.set(key, (dir.get(key) ?? 0) + 1);
  }
  const und = new Set<string>();
  let closed = true;
  for (const [key, n] of dir) {
    const [a, b] = key.split(',').map(Number);
    und.add(a < b ? `${a},${b}` : `${b},${a}`);
    if (n !== 1 || dir.get(`${b},${a}`) !== 1) closed = false;
  }
  return { edges: und.size, closed };
}

/** Vertices needed when each flat face gets its own normal (one per vertex and plane). */
export function flatVertexCount(m: Mesh) {
  const keys = new Set<string>();
  for (const t of m.f) {
    const n = triCross(m, t), l = len3(n);
    const k = `${(n.x / l).toFixed(4)},${(n.y / l).toFixed(4)},${(n.z / l).toFixed(4)}`;
    for (const i of t) keys.add(`${i}|${k}`);
  }
  return keys.size;
}

export interface Section { segs: [V3, V3][]; loops: V3[][]; area: number }

/**
 * Cut a mesh with the plane n·p = d (n a unit vector). A corner on the plane counts as above it.
 * Each segment is oriented along n × (face normal), so loops run counter-clockwise seen from +n.
 */
export function section(m: Mesh, n: V3, d: number): Section {
  const segs: [V3, V3][] = [];
  for (const t of m.f) {
    const p = t.map(i => m.v[i]), s = p.map(q => dot3(n, q) - d), pts: V3[] = [];
    for (let k = 0; k < 3; k++) {
      const j = (k + 1) % 3;
      if ((s[k] >= 0) !== (s[j] >= 0)) pts.push(add3(p[k], mul3(sub3(p[j], p[k]), s[k] / (s[k] - s[j]))));
    }
    if (pts.length !== 2 || len3(sub3(pts[1], pts[0])) < 1e-9) continue;
    const dir = cross3(n, triCross(m, t));
    segs.push(dot3(sub3(pts[1], pts[0]), dir) >= 0 ? [pts[0], pts[1]] : [pts[1], pts[0]]);
  }
  const area = segs.reduce((a, [p, q]) => a + dot3(n, cross3(p, q)) / 2, 0);
  return { segs, loops: chain(segs), area };
}

const key = (p: V3) => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;

/** Join oriented segments end to start into closed loops. */
export function chain(segs: [V3, V3][]): V3[][] {
  const from = new Map<string, number>();
  segs.forEach((s, i) => from.set(key(s[0]), i));
  const used = new Set<number>(), loops: V3[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    const loop: V3[] = [];
    let j: number | undefined = i;
    while (j !== undefined && !used.has(j)) {
      used.add(j);
      loop.push(segs[j][0]);
      j = from.get(key(segs[j][1]));
    }
    loops.push(loop);
  }
  return loops;
}

/** A rectangle in plan: centre, half sizes along its own axes, and its angle in degrees. */
export interface Box2 { c: P; hx: number; hy: number; a: number }

export function axes2(b: Box2): [P, P] {
  const t = (b.a * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return [{ x: c, y: s }, { x: -s, y: c }];
}

export function corners2(b: Box2): P[] {
  const [u, v] = axes2(b);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({
    x: b.c.x + u.x * b.hx * i + v.x * b.hy * j,
    y: b.c.y + u.y * b.hx * i + v.y * b.hy * j
  }));
}

/** The interval a set of points covers on an axis. */
export function project2(pts: P[], ax: P): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { const d = p.x * ax.x + p.y * ax.y; lo = Math.min(lo, d); hi = Math.max(hi, d); }
  return [lo, hi];
}

/** Overlap of two intervals: positive = overlap, negative = gap. */
export const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);

/** Separating-axis test for two rectangles: true if they overlap. */
export function clash2(a: Box2, b: Box2): boolean {
  const ca = corners2(a), cb = corners2(b);
  return [...axes2(a), ...axes2(b)].every(ax => overlap(project2(ca, ax), project2(cb, ax)) > 0);
}

/** World-aligned box of a set of points. */
export function aabb2(pts: P[]) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/** Painter's order for the 'se' camera (viewer towards +X, −Y, +Z): far faces first. */
export const VIEW_SE = v3(1, -1, 1);
export const depthSe = (p: V3) => p.x - p.y + p.z;
