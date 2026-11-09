import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, cross, dot, len, minus, num, plus, times } from './vec-plane';

type K = 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'B';
type Op = 'union' | 'intersect' | 'diff' | 'offset';

const VERTS: K[] = ['V0', 'V1', 'V2', 'V3', 'V4'];
const W = 3.5, H = 2.5;   // the size of rectangle B

const signedArea = (p: P[]) => p.reduce((s, a, i) => s + cross(a, p[(i + 1) % p.length]), 0) / 2;

/** Sutherland–Hodgman: clip any polygon by a convex, counterclockwise one. */
function clip(subject: P[], clipper: P[]): P[] {
  let out = subject;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const a = clipper[i], b = clipper[(i + 1) % clipper.length], e = minus(b, a);
    const side = (p: P) => cross(e, minus(p, a));        // ≥ 0: inside (left of the edge)
    const input = out;
    out = [];
    input.forEach((p, j) => {
      const q = input[(j + 1) % input.length], sp = side(p), sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push(plus(p, times(minus(q, p), t))); }
    });
  }
  return out;
}

/** Offset a closed polygon outwards by delta (inwards if negative), with miter joins. */
function offsetClosed(p: P[], delta: number): P[] {
  const n = p.length, ccw = signedArea(p) > 0;
  const normals = p.map((a, i) => {
    const d = minus(p[(i + 1) % n], a), l = len(d) || 1;
    return ccw ? { x: d.y / l, y: -d.x / l } : { x: -d.y / l, y: d.x / l };   // outward normal of edge i
  });
  return p.map((v, i) => {
    const n1 = normals[(i + n - 1) % n], n2 = normals[i], k = 1 + dot(n1, n2);
    return k < 1e-6 ? plus(v, times(n2, delta)) : plus(v, times(plus(n1, n2), delta / k));
  });
}

/** Union, intersection and difference of a room and a rectangle, and offsetting the room. */
@Component({
  selector: 'w-poly-boolean',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Polygon booleans and offsets</h3></div>
      <div class="w-controls" role="group" aria-label="Operation">
        @for (o of ops; track o.k) {
          <button type="button" class="w-btn" [class.on]="op() === o.k" [attr.aria-pressed]="op() === o.k" (click)="op.set(o.k)">{{ o.label }}</button>
        }
      </div>
      <p class="w-hint">{{ op() === 'offset' ? 'Move the slider to offset the room A, and drag its corners.' : 'Drag the room A’s corners, and the rectangle B by its centre; the slider turns B.' }}</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @switch (op()) {
            @case ('union') {
              <g class="res-fill"><polygon [attr.points]="line(a())" /><polygon [attr.points]="line(b())" /></g>
            }
            @case ('intersect') {
              @if (inter().length > 2) { <polygon [attr.points]="line(inter())" class="res-solid" /> }
            }
            @case ('diff') {
              <path [attr.d]="diffPath()" class="res-solid" fill-rule="evenodd" />
            }
            @case ('offset') {
              <polygon [attr.points]="line(off())" class="off" />
            }
          }
          <polygon [attr.points]="line(a())" class="outline a" />
          @if (op() !== 'offset') {
            <polygon [attr.points]="line(b())" class="outline b" />
            <text [attr.x]="px(pt('B').x)" [attr.y]="py(pt('B').y) + 22" text-anchor="middle" class="lbl">B</text>
          }
          <text [attr.x]="px(aLabel().x)" [attr.y]="py(aLabel().y)" text-anchor="middle" class="lbl">A</text>
          @for (k of keys(); track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="k === 'B' ? 'Centre of rectangle B' : 'Corner ' + k + ' of room A'" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="5" class="dot" [class.alt]="k === 'B'" />
            </g>
          }
        </svg>
        <div>
          @if (op() === 'offset') {
            <label class="w-field mb-2">offset δ = {{ num(delta()) }} ({{ delta() >= 0 ? 'outwards' : 'inwards' }})
              <input type="range" min="-1" max="1.5" step="0.05" [value]="delta()" (input)="delta.set(+$any($event.target).value)" />
            </label>
          } @else {
            <label class="w-field mb-2">rotation of B = {{ turn() }}°
              <input type="range" min="0" max="90" step="5" [value]="turn()" (input)="turn.set(+$any($event.target).value)" />
            </label>
          }
          <table class="wtable mono"><tbody>
            <tr><th>area A</th><td>{{ num(areaA()) }}</td></tr>
            @if (op() === 'offset') {
              <tr><th>perimeter A</th><td>{{ num(perimA()) }}</td></tr>
              <tr><th>A + perimeter × δ</th><td>{{ num(areaA() + perimA() * delta()) }}</td></tr>
              <tr><th>area of the offset</th><td class="ok">{{ num(areaOff()) }}</td></tr>
            } @else {
              <tr><th>area B</th><td>{{ num(areaB) }}</td></tr>
              <tr><th>area A ∩ B (clipped)</th><td>{{ num(areaI()) }}</td></tr>
              <tr><th>{{ resultName() }}</th><td class="ok">{{ num(result()) }}</td></tr>
            }
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .res-fill { fill: #10b981; opacity: 0.32; }
    .res-solid { fill: rgba(16, 185, 129, 0.4); stroke: #059669; stroke-width: 1.5; }
    .off { fill: rgba(245, 158, 11, 0.25); stroke: #f59e0b; stroke-width: 2; stroke-dasharray: 5 3; }
    .outline { fill: none; stroke-width: 2; stroke-linejoin: round; }
    .outline.a { stroke: #3b82f6; }
    .outline.b { stroke: #8b5cf6; stroke-dasharray: 5 3; }
  `]
})
export class PolyBooleanWidget extends DragPlane<K> {
  readonly num = num;
  readonly areaB = W * H;
  readonly ops: { k: Op; label: string }[] = [
    { k: 'diff', label: 'A − B' }, { k: 'intersect', label: 'A ∩ B' }, { k: 'union', label: 'A ∪ B' }, { k: 'offset', label: 'Offset A' }
  ];

  protected readonly pts = {
    V0: signal<P>({ x: -5, y: -4 }), V1: signal<P>({ x: 3, y: -4 }), V2: signal<P>({ x: 3, y: 0 }), V3: signal<P>({ x: 0, y: 3 }), V4: signal<P>({ x: -5, y: 3 }),
    B: signal<P>({ x: 2, y: 0.5 })
  };
  op = signal<Op>('diff');
  turn = signal(20);
  delta = signal(0.5);

  keys = computed<K[]>(() => (this.op() === 'offset' ? VERTS : [...VERTS, 'B']));
  a = computed(() => VERTS.map(k => this.pt(k)));
  b = computed(() => {
    const c = this.pt('B'), t = (this.turn() * Math.PI) / 180, u = { x: Math.cos(t), y: Math.sin(t) }, v = { x: -u.y, y: u.x };
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => plus(c, plus(times(u, (i * W) / 2), times(v, (j * H) / 2))));
  });
  inter = computed(() => clip(this.a(), this.b()));
  areaA = computed(() => Math.abs(signedArea(this.a())));
  areaI = computed(() => (this.inter().length > 2 ? Math.abs(signedArea(this.inter())) : 0));
  perimA = computed(() => this.a().reduce((s, p, i, v) => s + len(minus(v[(i + 1) % v.length], p)), 0));
  off = computed(() => offsetClosed(this.a(), this.delta()));
  areaOff = computed(() => Math.abs(signedArea(this.off())));
  /** A with the overlap cut out: draw both, and let the even-odd rule leave a hole. */
  diffPath = computed(() => {
    const ring = (p: P[]) => (p.length > 2 ? `M ${p.map(q => this.pp(q)).join(' L ')} Z` : '');
    return `${ring(this.a())} ${ring(this.inter())}`;
  });
  aLabel = computed(() => { const v = this.a(); return { x: (v[0].x + v[1].x + v[4].x) / 3 + 0.3, y: (v[0].y + v[1].y + v[4].y) / 3 }; });

  resultName = computed(() => ({ union: 'area A ∪ B', intersect: 'area A ∩ B', diff: 'area A − B', offset: '' })[this.op()]);
  result = computed(() => {
    switch (this.op()) {
      case 'union': return this.areaA() + this.areaB - this.areaI();
      case 'intersect': return this.areaI();
      default: return this.areaA() - this.areaI();
    }
  });

  message = computed(() => {
    const i = this.areaI();
    switch (this.op()) {
      case 'diff': return `Net area = A − (A ∩ B) = ${num(this.areaA())} − ${num(i)} = ${num(this.result())}. Only the part of B inside the room is deducted: this is how net floor area handles a column half buried in a wall.`;
      case 'intersect': return i > 0 ? `The overlap is B clipped against each edge of A in turn (Sutherland–Hodgman works because B is convex). Its area is ${num(i)}.` : 'No overlap: the intersection is empty, so A − B = A and A ∪ B is just both shapes.';
      case 'union': return `Area of the union = A + B − overlap = ${num(this.areaA())} + ${num(this.areaB)} − ${num(i)} = ${num(this.result())}. Subtracting the overlap stops it being counted twice.`;
      default: {
        const d = this.delta(), est = this.areaA() + this.perimA() * d;
        return `Every edge moves ${num(Math.abs(d))} ${d >= 0 ? 'out' : 'in'} and the corners are mitred. The area changes by about perimeter × δ (${num(est)}); the difference, ${num(this.areaOff() - est)}, comes from the corners.`;
      }
    }
  });

  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
}
