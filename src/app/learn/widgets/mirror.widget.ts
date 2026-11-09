import { Component, computed, signal } from '@angular/core';
import { C, S } from './drag-plane';
import { M, mApply, mDet, mMirror, mMove, mMul, mRot } from './affine';
import { P, arrowHead, cross, minus, num, shaftEnd } from './vec-plane';

type Mode = 'mirror' | 'rotate';

/** A door family in plan: origin at the middle of the opening, hinge at (−1, 0), swinging into +Y. */
const WALL_L: P[] = [{ x: -1.8, y: -0.3 }, { x: -1, y: -0.3 }, { x: -1, y: 0 }, { x: -1.8, y: 0 }];
const WALL_R: P[] = [{ x: 1, y: -0.3 }, { x: 1.8, y: -0.3 }, { x: 1.8, y: 0 }, { x: 1, y: 0 }];
const LEAF: P[] = [{ x: -1, y: 0 }, { x: -0.88, y: 0 }, { x: -0.88, y: 2 }, { x: -1, y: 2 }];
const SWING: P[] = Array.from({ length: 13 }, (_, i) => ({ x: -1 + 2 * Math.cos((i * Math.PI) / 24), y: 2 * Math.sin((i * Math.PI) / 24) }));
const PLACE = mMove(2.5, 0.6);

const area = (p: P[]) => p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0) / 2;

/** Mirroring a door: det −1, a left-handed frame and reversed winding, compared with a rotation. */
@Component({
  selector: 'w-mirror',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Mirroring a door</h3></div>
      <div class="w-controls" role="group" aria-label="Transform">
        <button type="button" class="w-btn" [class.on]="mode() === 'mirror'" [attr.aria-pressed]="mode() === 'mirror'" (click)="mode.set('mirror')">Mirror in the line</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'rotate'" [attr.aria-pressed]="mode() === 'rotate'" (click)="mode.set('rotate')">Rotate by 2 × the line angle</button>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @if (mode() === 'mirror') {
            <line [attr.x1]="mLine()[0].x" [attr.y1]="mLine()[0].y" [attr.x2]="mLine()[1].x" [attr.y2]="mLine()[1].y" class="mline" />
          }
          @for (d of doors(); track d.k) {
            <g [class]="'door ' + d.k">
              <polygon [attr.points]="line(d.wl)" class="wall" />
              <polygon [attr.points]="line(d.wr)" class="wall" />
              <polyline [attr.points]="line(d.swing)" class="swing" />
              <polygon [attr.points]="line(d.leaf)" class="leaf" />
              @for (a of d.axes; track $index) {
                <line [attr.x1]="a.x1" [attr.y1]="a.y1" [attr.x2]="a.tip.x" [attr.y2]="a.tip.y" class="lax" [class.y]="a.y" />
                <polygon [attr.points]="a.head" class="laxh" [class.y]="a.y" />
              }
              <circle [attr.cx]="d.o.x" [attr.cy]="d.o.y" r="6" class="zc" />
              @if (d.up) { <circle [attr.cx]="d.o.x" [attr.cy]="d.o.y" r="1.8" class="zd" /> }
              @else {
                <line [attr.x1]="d.o.x - 4" [attr.y1]="d.o.y - 4" [attr.x2]="d.o.x + 4" [attr.y2]="d.o.y + 4" class="zx" />
                <line [attr.x1]="d.o.x - 4" [attr.y1]="d.o.y + 4" [attr.x2]="d.o.x + 4" [attr.y2]="d.o.y - 4" class="zx" />
              }
            </g>
          }
        </svg>
        <div>
          @if (mode() === 'mirror') {
            <label class="w-field mb-2">mirror line angle φ = {{ phi() }}°
              <input type="range" min="0" max="180" step="15" [value]="phi()" (input)="phi.set(+$any($event.target).value)" />
            </label>
          } @else {
            <label class="w-field mb-2">rotate by 2φ = {{ 2 * phi() }}°
              <input type="range" min="0" max="180" step="15" [value]="phi()" (input)="phi.set(+$any($event.target).value)" />
            </label>
          }
          <table class="wtable mono"><tbody>
            <tr><th>det of the 2×2 part</th><td [class.hl]="det() < 0" [class.ok]="det() > 0">{{ num(det(), 0) }}</td></tr>
            <tr><th>X′ × Y′</th><td>{{ det() > 0 ? '+Z (right-handed)' : '−Z (left-handed)' }}</td></tr>
            <tr><th>leaf outline</th><td>{{ wind() > 0 ? 'counterclockwise' : 'clockwise' }}</td></tr>
            <tr><th>hinge</th><td>{{ det() > 0 ? 'same hand as the family' : 'opposite hand' }}</td></tr>
            @if (mode() === 'mirror') {
              <tr><th>as flip + rotation</th><td>flip local X, then rotate {{ num(alpha(), 0) }}°</td></tr>
            }
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="det() < 0" [class.info]="det() > 0" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .door .wall { fill: var(--text-muted); opacity: 0.55; }
    .door .leaf { fill: #3b82f6; stroke: #1d4ed8; stroke-width: 1; }
    .door .swing { fill: none; stroke: #3b82f6; stroke-width: 1.2; stroke-dasharray: 3 2; }
    .door.orig { opacity: 0.45; }
    .door.res.flip .leaf { fill: #f59e0b; stroke: #b45309; }
    .door.res.flip .swing { stroke: #f59e0b; }
    .mline { stroke: #8b5cf6; stroke-width: 2; stroke-dasharray: 7 4; }
    .lax { stroke: #10b981; stroke-width: 2.5; }
    .lax.y { stroke: #ef4444; }
    .laxh { fill: #10b981; }
    .laxh.y { fill: #ef4444; }
    .zc { fill: var(--bg-main); stroke: var(--text-main); stroke-width: 1.5; }
    .zd { fill: var(--text-main); }
    .zx { stroke: var(--text-main); stroke-width: 1.5; }
  `]
})
export class MirrorWidget {
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly num = num;

  mode = signal<Mode>('mirror');
  phi = signal(90);

  op = computed(() => (this.mode() === 'mirror' ? mMirror(this.phi()) : mRot(2 * this.phi())));
  m = computed(() => mMul(this.op(), PLACE));
  det = computed(() => mDet(this.m()));
  wind = computed(() => area(LEAF.map(p => mApply(this.m(), p))));
  /** Mirror = (mirror · flipX) · flipX, and mirror · flipX is a rotation: this is its angle. */
  alpha = computed(() => { const m = this.m(); let a = (Math.atan2(-m.b, -m.a) * 180) / Math.PI; if (a < 0) a += 360; return Math.round(a) % 360; });
  mLine = computed(() => {
    const t = (this.phi() * Math.PI) / 180, d = { x: Math.cos(t) * 8.5, y: Math.sin(t) * 8.5 };
    return [{ x: this.px(-d.x), y: this.py(-d.y) }, { x: this.px(d.x), y: this.py(d.y) }];
  });
  doors = computed(() => [this.door('orig', PLACE), this.door(this.det() < 0 ? 'res flip' : 'res', this.m())]);

  message = computed(() => {
    if (this.det() > 0) return 'A rotation keeps det = +1: the frame stays right-handed, outlines keep their winding, and the door keeps its hinge side. No rotation can turn a left-hand door into a right-hand one.';
    return `A mirror has det = −1. X′ × Y′ now points down (⊗), every outline’s winding reverses, and a left-hand door becomes a right-hand one. Store it as a rotation of ${num(this.alpha(), 0)}° plus a “flipped” flag, and reverse the face order when you build geometry, or normals will point inwards.`;
  });

  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  line(pts: P[]) { return pts.map(p => `${this.px(p.x)},${this.py(p.y)}`).join(' '); }

  private door(k: string, m: M) {
    const t = (ps: P[]) => ps.map(p => mApply(m, p));
    const o = mApply(m, { x: 0, y: 0 }), ox = this.px(o.x), oy = this.py(o.y);
    const axes = [{ x: 1.3, y: 0 }, { x: 0, y: 1.3 }].map((v, i) => {
      const e = mApply(m, v), x2 = this.px(e.x), y2 = this.py(e.y);
      return { y: i === 1, x1: ox, y1: oy, tip: shaftEnd(ox, oy, x2, y2, 8), head: arrowHead(ox, oy, x2, y2, 8) };
    });
    const xa = minus(mApply(m, { x: 1, y: 0 }), o), ya = minus(mApply(m, { x: 0, y: 1 }), o);
    return { k, wl: t(WALL_L), wr: t(WALL_R), leaf: t(LEAF), swing: t(SWING), axes, o: { x: ox, y: oy }, up: cross(xa, ya) > 0 };
  }
}
