import { Component, computed, signal } from '@angular/core';
import { DragPlane, S } from './drag-plane';
import { P, cross, dot, len, minus, num, plus, times } from './vec-plane';

type K = 'V0' | 'V1' | 'V2' | 'V3';
type Mode = 'offset' | 'fillet';

interface Corner { v: P; t1: P; t2: P; c: P; phi: number; t: number; left: boolean; fits: boolean }

const unit = (a: P): P => times(a, 1 / (len(a) || 1));
const leftOf = (a: P): P => ({ x: -a.y, y: a.x });

/** Offset a polyline into a wall's two faces, or fillet its corners with arcs. */
@Component({
  selector: 'w-polyline-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Polyline: offset and fillet</h3></div>
      <div class="w-controls" role="group" aria-label="Operation">
        <button type="button" class="w-btn" [class.on]="mode() === 'offset'" [attr.aria-pressed]="mode() === 'offset'" (click)="mode.set('offset')">Offset (wall faces)</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'fillet'" [attr.aria-pressed]="mode() === 'fillet'" (click)="mode.set('fillet')">Fillet (bends)</button>
      </div>
      <p class="w-hint">Drag the vertices V0 to V3 and move the slider. Make a corner sharp to see what goes wrong.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @if (mode() === 'offset') {
            <polygon [attr.points]="wallFill()" class="wall" />
            <polyline [attr.points]="line(left())" class="face" />
            <polyline [attr.points]="line(right())" class="face r" />
            <polyline [attr.points]="line(verts())" class="centre" />
            @for (s of spikes(); track $index) { <circle [attr.cx]="px(s.x)" [attr.cy]="py(s.y)" r="5" class="res warn" /> }
          } @else {
            <polyline [attr.points]="line(verts())" class="ext" />
            @for (c of corners(); track $index) {
              @if (c.fits && radius() > 0) {
                <line [attr.x1]="px(c.c.x)" [attr.y1]="py(c.c.y)" [attr.x2]="px(c.t1.x)" [attr.y2]="py(c.t1.y)" class="rad" />
                <line [attr.x1]="px(c.c.x)" [attr.y1]="py(c.c.y)" [attr.x2]="px(c.t2.x)" [attr.y2]="py(c.t2.y)" class="rad" />
                <circle [attr.cx]="px(c.c.x)" [attr.cy]="py(c.c.y)" r="2.5" class="ctr" />
                <circle [attr.cx]="px(c.t1.x)" [attr.cy]="py(c.t1.y)" r="3.5" class="res" />
                <circle [attr.cx]="px(c.t2.x)" [attr.cy]="py(c.t2.y)" r="3.5" class="res" />
              }
              @if (!c.fits) { <circle [attr.cx]="px(c.v.x)" [attr.cy]="py(c.v.y)" r="11" class="toobig" /> }
            }
            <path [attr.d]="filletPath()" class="main" />
          }
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Vertex ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="5.5" class="dot" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 11" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          @if (mode() === 'offset') {
            <label class="w-field mb-2">offset δ (half the wall thickness) = {{ num(delta()) }}
              <input type="range" min="0" max="1.5" step="0.05" [value]="delta()" (input)="delta.set(+$any($event.target).value)" />
            </label>
            <table class="wtable mono"><tbody>
              <tr><th>centreline length</th><td>{{ num(total()) }}</td></tr>
              <tr><th>left face (+δ)</th><td>{{ num(pathLen(left())) }}</td></tr>
              <tr><th>right face (−δ)</th><td>{{ num(pathLen(right())) }}</td></tr>
              @for (m of miters(); track $index) {
                <tr><th>miter at V{{ $index + 1 }}</th><td [class.hl]="m > 3">{{ num(m) }} × δ</td></tr>
              }
            </tbody></table>
          } @else {
            <label class="w-field mb-2">radius r = {{ num(radius()) }}
              <input type="range" min="0" max="3" step="0.125" [value]="radius()" (input)="radius.set(+$any($event.target).value)" />
            </label>
            <table class="wtable mono"><tbody>
              <tr><th>sharp length</th><td>{{ num(total()) }}</td></tr>
              @for (c of corners(); track $index) {
                <tr><th>V{{ $index + 1 }}: turn φ, T = r tan(φ/2)</th><td [class.hl]="!c.fits">{{ deg(c.phi) }}°, {{ num(c.t) }}{{ c.fits ? '' : ' (too big)' }}</td></tr>
              }
              <tr><th>filleted length</th><td class="ok">{{ num(filletLen()) }}</td></tr>
            </tbody></table>
          }
        </div>
      </div>
      <div class="w-msg" [class.info]="!problem()" [class.err]="problem()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .wall { fill: rgba(59, 130, 246, 0.16); stroke: none; }
    .face { fill: none; stroke: #3b82f6; stroke-width: 2.5; stroke-linejoin: miter; }
    .face.r { stroke: #8b5cf6; }
    .centre { fill: none; stroke: var(--text-muted); stroke-width: 1.5; stroke-dasharray: 6 3 1 3; }
    .rad { stroke: #10b981; stroke-width: 1; stroke-dasharray: 2 2; }
    .ctr { fill: #10b981; }
    .toobig { fill: rgba(239, 68, 68, 0.15); stroke: #ef4444; stroke-width: 2; }
  `]
})
export class PolylineLabWidget extends DragPlane<K> {
  readonly keys: K[] = ['V0', 'V1', 'V2', 'V3'];
  readonly num = num;

  protected readonly pts = {
    V0: signal<P>({ x: -5, y: -3 }), V1: signal<P>({ x: -2, y: 2 }), V2: signal<P>({ x: 2, y: -1 }), V3: signal<P>({ x: 5, y: 3 })
  };
  mode = signal<Mode>('offset');
  delta = signal(0.4);
  radius = signal(1);

  verts = computed(() => this.keys.map(k => this.pt(k)));
  /** Unit direction and left normal of each segment. */
  dirs = computed(() => this.verts().slice(1).map((v, i) => unit(minus(v, this.verts()[i]))));
  normals = computed(() => this.dirs().map(leftOf));
  total = computed(() => this.pathLen(this.verts()));

  // ---------------------------------------------------------------- offset
  left = computed(() => this.offset(this.delta()));
  right = computed(() => this.offset(-this.delta()));
  /** How far each miter corner moves, as a multiple of δ. */
  miters = computed(() => this.normals().slice(1).map((n2, i) => {
    const n1 = this.normals()[i], k = 1 + dot(n1, n2);
    return k < 1e-6 ? Infinity : len(plus(n1, n2)) / k;
  }));
  spikes = computed(() => (this.delta() > 0 ? this.miters().flatMap((m, i) => (m > 3 ? [this.left()[i + 1], this.right()[i + 1]] : [])) : []));
  wallFill = computed(() => this.line([...this.left(), ...[...this.right()].reverse()]));

  // ---------------------------------------------------------------- fillet
  corners = computed<Corner[]>(() => {
    const v = this.verts(), u = this.dirs(), r = this.radius(), n = v.length;
    const lens = v.slice(1).map((p, i) => len(minus(p, v[i])));
    const out: Corner[] = [];
    for (let i = 1; i < n - 1; i++) {
      const u1 = u[i - 1], u2 = u[i];
      const phi = Math.acos(Math.max(-1, Math.min(1, dot(u1, u2))));
      const t = phi < 1e-6 ? 0 : r * Math.tan(phi / 2);
      // A tangent distance may use all of an end segment, but only half of a segment shared with another corner.
      const room = Math.min(lens[i - 1] * (i - 1 === 0 ? 1 : 0.5), lens[i] * (i + 1 === n - 1 ? 1 : 0.5));
      const left = cross(u1, u2) > 0;
      const t1 = minus(v[i], times(u1, t)), t2 = plus(v[i], times(u2, t));
      const c = plus(t1, times(leftOf(u1), left ? r : -r));
      out.push({ v: v[i], t1, t2, c, phi, t, left, fits: t <= room + 1e-9 && phi < Math.PI - 1e-6 });
    }
    return out;
  });
  filletPath = computed(() => {
    const v = this.verts(), rr = this.radius() * S;
    let d = `M ${this.pp(v[0])}`;
    for (const c of this.corners()) {
      if (c.fits && rr > 0 && c.t > 0) d += ` L ${this.pp(c.t1)} A ${rr} ${rr} 0 0 ${c.left ? 0 : 1} ${this.pp(c.t2)}`;
      else d += ` L ${this.pp(c.v)}`;
    }
    return `${d} L ${this.pp(v[v.length - 1])}`;
  });
  filletLen = computed(() => this.corners().reduce((s, c) => s - (c.fits ? 2 * c.t - this.radius() * c.phi : 0), this.total()));

  problem = computed(() => (this.mode() === 'offset' ? this.miters().some(m => m > 3) : this.corners().some(c => !c.fits)));

  message = computed(() => {
    if (this.mode() === 'offset') {
      if (this.problem()) return 'A sharp corner: the miter point is more than 3 δ from the vertex (orange dots), so the face shoots out into a spike. Real tools apply a miter limit and bevel the corner instead.';
      return `Each segment moves δ = ${num(this.delta())} along its normal, and neighbours are joined where their offset lines meet: V + (n1 + n2) × δ ÷ (1 + n1·n2). The inside face is shorter than the centreline and the outside face longer.`;
    }
    if (this.problem()) return 'At each red corner, r × tan(φ ÷ 2) is longer than the room on its segments, so the arc would run past the next corner. Reduce the radius or lengthen the segments.';
    if (this.radius() === 0) return 'r = 0 leaves the corners sharp. Move the slider to round them.';
    return `Each corner is cut back by T = r tan(φ ÷ 2) on both sides and replaced by an arc of length r × φ, which is always shorter than 2T. The run gets ${num(this.total() - this.filletLen())} shorter.`;
  });

  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
  pathLen(pts: P[]) { return pts.slice(1).reduce((s, p, i) => s + len(minus(p, pts[i])), 0); }
  deg(rad: number) { return num((rad * 180) / Math.PI, 1); }

  private offset(delta: number): P[] {
    const v = this.verts(), n = this.normals();
    return v.map((p, i) => {
      if (i === 0) return plus(p, times(n[0], delta));
      if (i === v.length - 1) return plus(p, times(n[n.length - 1], delta));
      const n1 = n[i - 1], n2 = n[i], k = 1 + dot(n1, n2);
      return k < 1e-6 ? plus(p, times(n2, delta)) : plus(p, times(plus(n1, n2), delta / k));
    });
  }

  protected override place(k: K, p: P) {
    const i = this.keys.indexOf(k);
    super.place(k, p);
    // Keep neighbouring vertices apart, or a segment would have no direction.
    for (const j of [i - 1, i + 1]) {
      const o = this.keys[j];
      if (o && len(minus(this.pt(o), this.pt(k))) < 0.25) this.pts[k].set({ x: this.pt(k).x + 0.5, y: this.pt(k).y });
    }
  }
}
