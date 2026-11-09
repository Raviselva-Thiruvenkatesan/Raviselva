/** 2D affine transforms for the Matrices and transforms widgets. */
import { P } from './vec-plane';

/**
 * The 3×3 matrix  | a  c  tx |
 *                 | b  d  ty |
 *                 | 0  0  1  |
 * Columns (a, b) and (c, d) are where the X and Y axes go; (tx, ty) is where the origin goes.
 */
export interface M { a: number; b: number; c: number; d: number; tx: number; ty: number }

const R = Math.PI / 180;

export const mId = (): M => ({ a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 });
export const mOf = (a: number, b: number, c: number, d: number, tx = 0, ty = 0): M => ({ a, b, c, d, tx, ty });
export const mMove = (x: number, y: number): M => ({ ...mId(), tx: x, ty: y });
export const mScale = (sx: number, sy = sx): M => mOf(sx, 0, 0, sy);
export const mRot = (deg: number): M => { const c = Math.cos(deg * R), s = Math.sin(deg * R); return mOf(c, s, -s, c); };
/** Mirror in a line through the origin at `deg` from the X axis. */
export const mMirror = (deg: number): M => { const c = Math.cos(2 * deg * R), s = Math.sin(2 * deg * R); return mOf(c, s, s, -c); };

/** A · B: apply B first, then A. */
export function mMul(A: M, B: M): M {
  return {
    a: A.a * B.a + A.c * B.b, b: A.b * B.a + A.d * B.b,
    c: A.a * B.c + A.c * B.d, d: A.b * B.c + A.d * B.d,
    tx: A.a * B.tx + A.c * B.ty + A.tx, ty: A.b * B.tx + A.d * B.ty + A.ty
  };
}
/** Apply to a point (w = 1): the translation counts. */
export const mApply = (m: M, p: P): P => ({ x: m.a * p.x + m.c * p.y + m.tx, y: m.b * p.x + m.d * p.y + m.ty });
/** Apply to a direction (w = 0): the translation is ignored. */
export const mDir = (m: M, v: P): P => ({ x: m.a * v.x + m.c * v.y, y: m.b * v.x + m.d * v.y });
export const mDet = (m: M) => m.a * m.d - m.b * m.c;
export function mInv(m: M): M | null {
  const det = mDet(m);
  if (Math.abs(det) < 1e-12) return null;
  const a = m.d / det, b = -m.b / det, c = -m.c / det, d = m.a / det;
  return { a, b, c, d, tx: -(a * m.tx + c * m.ty), ty: -(b * m.tx + d * m.ty) };
}
/** Rotate about a pivot: move the pivot to the origin, rotate, move back. */
export const mRotAbout = (deg: number, p: P): M => mMul(mMove(p.x, p.y), mMul(mRot(deg), mMove(-p.x, -p.y)));

/** The three rows of the 3×3 matrix, for display. */
export const mRows = (m: M): number[][] => [[m.a, m.c, m.tx], [m.b, m.d, m.ty], [0, 0, 1]];
