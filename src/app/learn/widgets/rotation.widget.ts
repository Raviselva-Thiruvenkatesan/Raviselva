import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { mApply, mRotAbout } from './affine';
import { F_SHAPE } from './matrix-2d.widget';
import { Iso, V3, cross3, dot3, f3, len3, mul3, rad, unit3, v3 } from './iso';
import { P, num } from './vec-plane';

type K = 'C';
type Mode = '2d' | '3d';
type Axis = 'x' | 'y' | 'z' | 'diag';

const AXES: { k: Axis; label: string; v: V3 }[] = [
  { k: 'x', label: 'X axis', v: v3(1, 0, 0) },
  { k: 'y', label: 'Y axis', v: v3(0, 1, 0) },
  { k: 'z', label: 'Z axis', v: v3(0, 0, 1) },
  { k: 'diag', label: 'Diagonal (1, 1, 1)', v: unit3(v3(1, 1, 1)) }
];

/** A box 3 × 1 × 2 with a corner at the origin: its corners and edges. */
const BOX: V3[] = [0, 1, 2, 3, 4, 5, 6, 7].map(i => v3(i % 2 ? 3 : 0, Math.floor(i / 2) % 2 ? 1 : 0, i >= 4 ? 2 : 0));
const EDGES: [number, number][] = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
const TOP = [4, 5, 7, 6];

/** Rodrigues: the rotation matrix for a turn of `deg` about the unit axis k (right-hand rule). */
export function rodrigues(k: V3, deg: number): number[][] {
  const t = rad(deg), c = Math.cos(t), s = Math.sin(t), u = 1 - c;
  return [
    [c + k.x * k.x * u, k.x * k.y * u - k.z * s, k.x * k.z * u + k.y * s],
    [k.y * k.x * u + k.z * s, c + k.y * k.y * u, k.y * k.z * u - k.x * s],
    [k.z * k.x * u - k.y * s, k.z * k.y * u + k.x * s, c + k.z * k.z * u]
  ];
}
const apply3 = (m: number[][], p: V3): V3 => v3(
  m[0][0] * p.x + m[0][1] * p.y + m[0][2] * p.z,
  m[1][0] * p.x + m[1][1] * p.y + m[1][2] * p.z,
  m[2][0] * p.x + m[2][1] * p.y + m[2][2] * p.z);

/** Rotation in 2D about a pivot, and in 3D about an axis. */
@Component({
  selector: 'w-rotation',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rotation in 2D and 3D</h3></div>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="mode() === '2d'" [attr.aria-pressed]="mode() === '2d'" (click)="mode.set('2d')">2D, about a pivot</button>
        <button type="button" class="w-btn" [class.on]="mode() === '3d'" [attr.aria-pressed]="mode() === '3d'" (click)="mode.set('3d')">3D, about an axis</button>
      </div>
      @if (mode() === '3d') {
        <div class="w-controls" role="group" aria-label="Rotation axis">
          @for (a of axes; track a.k) {
            <button type="button" class="w-btn" [class.on]="axis() === a.k" [attr.aria-pressed]="axis() === a.k" (click)="axis.set(a.k)">{{ a.label }}</button>
          }
        </div>
      } @else {
        <p class="w-hint">Drag the pivot C. The dashed outline is where the shape started.</p>
      }
      <div class="w-grid two">
        @if (mode() === '2d') {
          <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
               (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
            @for (g of grid; track g) {
              <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
              <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
            }
            <polygon [attr.points]="line(shape)" class="ghost" />
            <polygon [attr.points]="line(shapeR())" class="shape" />
            <line [attr.x1]="px(pt('C').x)" [attr.y1]="py(pt('C').y)" [attr.x2]="px(tip.x)" [attr.y2]="py(tip.y)" class="ext" />
            <line [attr.x1]="px(pt('C').x)" [attr.y1]="py(pt('C').y)" [attr.x2]="px(tipR().x)" [attr.y2]="py(tipR().y)" class="ext" />
            <path [attr.d]="arc()" class="arc" />
            <circle [attr.cx]="px(tip.x)" [attr.cy]="py(tip.y)" r="4" class="res warn" />
            <circle [attr.cx]="px(tipR().x)" [attr.cy]="py(tipR().y)" r="5" class="res" />
            <text [attr.x]="px(tipR().x) + 7" [attr.y]="py(tipR().y) - 6" class="hl-t">Q′</text>
            <text [attr.x]="px(tip.x) + 7" [attr.y]="py(tip.y) - 6" class="lbl">Q</text>
            <g class="handle" [class.active]="drag() === 'C'" tabindex="0" role="slider" aria-label="Pivot C" [attr.aria-valuetext]="fmt(pt('C'))"
               (pointerdown)="start($event, 'C')" (keydown)="key($event, 'C')">
              <circle [attr.cx]="px(pt('C').x)" [attr.cy]="py(pt('C').y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt('C').x)" [attr.cy]="py(pt('C').y)" r="5.5" class="dot alt" />
              <text [attr.x]="px(pt('C').x) - 14" [attr.y]="py(pt('C').y) + 16" class="hl-t">C</text>
            </g>
          </svg>
        } @else {
          <svg viewBox="0 0 300 290" class="view" role="img" [attr.aria-label]="message()">
            @for (a of frame; track a.l) {
              <line [attr.x1]="cam.p(o).x" [attr.y1]="cam.p(o).y" [attr.x2]="cam.p(a.v).x" [attr.y2]="cam.p(a.v).y" class="ax" />
              <text [attr.x]="cam.p(a.v).x + 3" [attr.y]="cam.p(a.v).y + 4" class="lbl">{{ a.l }}</text>
            }
            <line [attr.x1]="cam.p(axLine()[0]).x" [attr.y1]="cam.p(axLine()[0]).y" [attr.x2]="cam.p(axLine()[1]).x" [attr.y2]="cam.p(axLine()[1]).y" class="rot-ax" />
            @for (e of edges; track $index) {
              <line [attr.x1]="cam.p(box[e[0]]).x" [attr.y1]="cam.p(box[e[0]]).y" [attr.x2]="cam.p(box[e[1]]).x" [attr.y2]="cam.p(box[e[1]]).y" class="ghost3" />
            }
            <polygon [attr.points]="cam.pts(topR())" class="top" />
            @for (e of edges; track $index) {
              <line [attr.x1]="cam.p(boxR()[e[0]]).x" [attr.y1]="cam.p(boxR()[e[0]]).y" [attr.x2]="cam.p(boxR()[e[1]]).x" [attr.y2]="cam.p(boxR()[e[1]]).y" class="edge" />
            }
            <circle [attr.cx]="cam.p(boxR()[7]).x" [attr.cy]="cam.p(boxR()[7]).y" r="4.5" class="res" />
            <text [attr.x]="cam.p(boxR()[7]).x + 7" [attr.y]="cam.p(boxR()[7]).y - 5" class="hl-t">Q′</text>
          </svg>
        }
        <div>
          <label class="w-field mb-2">angle θ = {{ angle() }}°
            <input type="range" min="-180" max="180" step="5" [value]="angle()" (input)="angle.set(+$any($event.target).value)" />
          </label>
          @if (mode() === '2d') {
            <table class="wtable mono"><tbody>
              <tr><th>cos θ</th><td>{{ num(cos(), 3) }}</td></tr>
              <tr><th>sin θ</th><td>{{ num(sin(), 3) }}</td></tr>
              <tr><th>R</th><td>[{{ num(cos(), 3) }} {{ num(-sin(), 3) }}]<br />[{{ num(sin(), 3) }} {{ num(cos(), 3) }}]</td></tr>
              <tr><th>Q − C</th><td>{{ fmt(sub(tip, pt('C'))) }}</td></tr>
              <tr><th>Q′ = C + R(Q − C)</th><td class="ok">{{ fmt(tipR()) }}</td></tr>
            </tbody></table>
          } @else {
            <table class="wtable mono"><tbody>
              <tr><th>axis k</th><td>{{ f3(k(), 3) }}</td></tr>
              @for (r of R(); track $index) {
                <tr><th>{{ $index === 0 ? 'R' : '' }}</th><td>{{ row(r) }}</td></tr>
              }
              <tr><th>Q (3, 1, 2)</th><td>→ {{ f3(boxR()[7]) }}</td></tr>
              <tr><th>|Q′|</th><td>{{ num(lenQ(), 3) }} (was 3.742)</td></tr>
            </tbody></table>
          }
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .ghost { fill: none; stroke: var(--text-muted); stroke-width: 1.5; stroke-dasharray: 4 3; }
    .shape { fill: rgba(59, 130, 246, 0.25); stroke: #3b82f6; stroke-width: 2; stroke-linejoin: round; }
    .arc { fill: none; stroke: #f59e0b; stroke-width: 2.5; }
    .ax { stroke: var(--text-muted); stroke-width: 1.2; }
    .rot-ax { stroke: #f59e0b; stroke-width: 2.5; stroke-dasharray: 6 4; }
    .ghost3 { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.8; }
    .edge { stroke: #3b82f6; stroke-width: 2; stroke-linecap: round; }
    .top { fill: rgba(59, 130, 246, 0.2); stroke: none; }
  `]
})
export class RotationWidget extends DragPlane<K> {
  readonly num = num;
  readonly f3 = f3;
  readonly axes = AXES;
  /** Seen from the south-east, so that no axis offered here points straight at the camera. */
  readonly cam = new Iso(21, 115, 170, 'se');
  readonly o = v3(0, 0, 0);
  readonly frame = [{ l: 'X', v: v3(4.5, 0, 0) }, { l: 'Y', v: v3(0, 4.5, 0) }, { l: 'Z', v: v3(0, 0, 3.8) }];
  readonly box = BOX;
  readonly edges = EDGES;
  readonly shape = F_SHAPE.map(p => ({ x: p.x + 1, y: p.y + 1 }));
  /** The F's top-right corner, followed round the pivot. */
  readonly tip = { x: 2.8, y: 3.6 };

  protected readonly pts = { C: signal<P>({ x: 1, y: 1 }) };
  mode = signal<Mode>('2d');
  axis = signal<Axis>('z');
  angle = signal(60);

  cos = computed(() => Math.cos(rad(this.angle())));
  sin = computed(() => Math.sin(rad(this.angle())));
  rot = computed(() => mRotAbout(this.angle(), this.pt('C')));
  shapeR = computed(() => this.shape.map(p => mApply(this.rot(), p)));
  tipR = computed(() => mApply(this.rot(), this.tip));
  arc = computed(() => {
    const c = this.pt('C'), q = this.tip, a0 = Math.atan2(q.y - c.y, q.x - c.x), a1 = a0 + rad(this.angle()), r = 1.1;
    const s = { x: c.x + r * Math.cos(a0), y: c.y + r * Math.sin(a0) }, e = { x: c.x + r * Math.cos(a1), y: c.y + r * Math.sin(a1) };
    return `M ${this.pp(s)} A ${r * 25} ${r * 25} 0 0 ${this.angle() > 0 ? 0 : 1} ${this.pp(e)}`;
  });

  k = computed(() => AXES.find(a => a.k === this.axis())!.v);
  R = computed(() => rodrigues(this.k(), this.angle()));
  boxR = computed(() => BOX.map(p => apply3(this.R(), p)));
  topR = computed(() => TOP.map(i => this.boxR()[i]));
  axLine = computed(() => [mul3(this.k(), -2.5), mul3(this.k(), 4.5)]);
  lenQ = computed(() => { const q = this.boxR()[7]; return Math.sqrt(dot3(q, q)); });

  message = computed(() => {
    const t = this.angle();
    if (this.mode() === '2d') {
      return `Every point turns ${Math.abs(t)}° ${t >= 0 ? 'counterclockwise' : 'clockwise'} round C, and keeps its distance from C. Rotating about a pivot is three steps: move C to the origin, rotate, move back. Only C itself stays put.`;
    }
    const r = len3(cross3(this.k(), BOX[7]));
    return `Points on the orange axis stay still; every other point circles round it at a fixed distance (${num(r, 3)} for Q). The columns of R are where X, Y and Z go, and lengths never change: |Q′| = |Q|.`;
  });

  row(r: number[]) { return `[${r.map(x => num(x, 3)).join('  ')}]`; }
  sub(a: P, b: P): P { return { x: a.x - b.x, y: a.y - b.y }; }
  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
}
