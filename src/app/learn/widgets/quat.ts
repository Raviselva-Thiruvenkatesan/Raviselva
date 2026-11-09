/** Quaternions, 3×3 rotation matrices and Euler angles for the Rotations in depth widgets (Z up, right-handed). */
import { V3, deg, rad, v3 } from './iso';

/** A quaternion w + xi + yj + zk; a unit one is a rotation. */
export interface Q { w: number; x: number; y: number; z: number }
export type M3 = number[][];

export const qId: Q = { w: 1, x: 0, y: 0, z: 0 };
export const qLen = (q: Q) => Math.hypot(q.w, q.x, q.y, q.z);
export const qDot = (a: Q, b: Q) => a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
export const qNeg = (q: Q): Q => ({ w: -q.w, x: -q.x, y: -q.y, z: -q.z });
export const qScale = (q: Q, k: number): Q => ({ w: q.w * k, x: q.x * k, y: q.y * k, z: q.z * k });
export const qNorm = (q: Q): Q => qScale(q, 1 / (qLen(q) || 1));

/** The rotation of `degrees` about the unit axis k. */
export function qAxisAngle(k: V3, degrees: number): Q {
  const h = rad(degrees) / 2, s = Math.sin(h);
  return { w: Math.cos(h), x: k.x * s, y: k.y * s, z: k.z * s };
}

/** Hamilton product a·b: the rotation b, then a. */
export function qMul(a: Q, b: Q): Q {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
  };
}

/** The rotation matrix of a unit quaternion. */
export function qToM(q: Q): M3 {
  const { w, x, y, z } = q;
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)]
  ];
}

/** The angle (0..180°) a unit quaternion turns through, whichever sign it has. */
export const qAngle = (q: Q) => 2 * deg(Math.acos(Math.min(1, Math.abs(q.w))));

/** Normalised linear interpolation. */
export function qNlerp(a: Q, b: Q, t: number): Q {
  return qNorm({ w: a.w + (b.w - a.w) * t, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
}

/** Spherical linear interpolation at constant angular speed (no shortest-path flip: callers decide). */
export function qSlerp(a: Q, b: Q, t: number): Q {
  const d = Math.max(-1, Math.min(1, qDot(a, b)));
  if (d > 0.9995) return qNlerp(a, b, t);
  const th = Math.acos(d), s = Math.sin(th), ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
  return { w: a.w * ka + b.w * kb, x: a.x * ka + b.x * kb, y: a.y * ka + b.y * kb, z: a.z * ka + b.z * kb };
}

export const mApply3 = (m: M3, p: V3): V3 => v3(
  m[0][0] * p.x + m[0][1] * p.y + m[0][2] * p.z,
  m[1][0] * p.x + m[1][1] * p.y + m[1][2] * p.z,
  m[2][0] * p.x + m[2][1] * p.y + m[2][2] * p.z);

export function mMul3(a: M3, b: M3): M3 {
  return [0, 1, 2].map(i => [0, 1, 2].map(j => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
}

export function mDet3(m: M3) {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}

export const rotX = (d: number): M3 => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
export const rotY = (d: number): M3 => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
export const rotZ = (d: number): M3 => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; };

/** Yaw about Z, then pitch about the new Y, then roll about the newest X: R = Rz(yaw)·Ry(pitch)·Rx(roll). */
export const euler = (yaw: number, pitch: number, roll: number): M3 => mMul3(rotZ(yaw), mMul3(rotY(pitch), rotX(roll)));

/** Yaw, pitch and roll back from a rotation matrix (roll is set to 0 at gimbal lock). */
export function toEuler(m: M3): { yaw: number; pitch: number; roll: number } {
  const sp = Math.max(-1, Math.min(1, -m[2][0]));
  const pitch = deg(Math.asin(sp));
  if (Math.abs(sp) > 0.99999) return { yaw: deg(Math.atan2(-m[0][1], m[1][1])), pitch, roll: 0 };
  return { yaw: deg(Math.atan2(m[1][0], m[0][0])), pitch, roll: deg(Math.atan2(m[2][1], m[2][2])) };
}

/** The unit quaternion of a rotation matrix. */
export function mToQ(m: M3): Q {
  const tr = m[0][0] + m[1][1] + m[2][2];
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    return { w: s / 4, x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s };
  }
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    return { w: (m[2][1] - m[1][2]) / s, x: s / 4, y: (m[0][1] + m[1][0]) / s, z: (m[0][2] + m[2][0]) / s };
  }
  if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    return { w: (m[0][2] - m[2][0]) / s, x: (m[0][1] + m[1][0]) / s, y: s / 4, z: (m[1][2] + m[2][1]) / s };
  }
  const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
  return { w: (m[1][0] - m[0][1]) / s, x: (m[0][2] + m[2][0]) / s, y: (m[1][2] + m[2][1]) / s, z: s / 4 };
}

/** A box, centred on the origin, with a pointed nose on +X so that every orientation is easy to read. */
export function noseBox(l = 1.6, w = 0.8, h = 0.5) {
  const c: V3[] = [];
  for (let i = 0; i < 8; i++) c.push(v3(i % 2 ? l : -l, Math.floor(i / 2) % 2 ? w : -w, i >= 4 ? h : -h));
  c.push(v3(l + 0.9, 0, 0));
  const edges: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7], [1, 8], [3, 8], [5, 8], [7, 8]];
  return { corners: c, edges, top: [4, 5, 7, 6] };
}
