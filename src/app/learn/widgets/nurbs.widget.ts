import { Component, computed, signal } from '@angular/core';
import { P, num } from './vec-plane';

type Preset = 'free' | 'arc';
const FREE: P[] = [{ x: 0.4, y: 0.6 }, { x: 1.4, y: 4.2 }, { x: 3, y: 1 }, { x: 4.6, y: 4.6 }, { x: 5.8, y: 1.4 }];
const C0: P = { x: 1, y: 0.6 }, R = 4.4;
const ARC: P[] = [{ x: C0.x + R, y: C0.y }, { x: C0.x + R, y: C0.y + R }, { x: C0.x, y: C0.y + R }];
const S = 40, OX = 14, OY = 236, SAMPLES = 120;

/** Clamped, uniform knot vector: p + 1 zeros, evenly spaced inner knots, p + 1 ones. */
export function clampedKnots(n: number, p: number): number[] {
  const inner = n - p - 1, k: number[] = [];
  for (let i = 0; i <= p; i++) k.push(0);
  for (let i = 1; i <= inner; i++) k.push(i / (inner + 1));
  for (let i = 0; i <= p; i++) k.push(1);
  return k;
}

/** Cox–de Boor: every basis function N(i, p) at t, with the last span closed so t = 1 works. */
export function basis(t: number, p: number, k: number[], n: number): number[] {
  let N: number[] = k.slice(0, -1).map((_, i) => ((t >= k[i] && t < k[i + 1]) || (t === 1 && k[i] < 1 && k[i + 1] === 1) ? 1 : 0));
  for (let d = 1; d <= p; d++) {
    const next: number[] = [];
    for (let i = 0; i < k.length - d - 1; i++) {
      const a = k[i + d] - k[i], b = k[i + d + 1] - k[i + 1];
      next.push((a ? ((t - k[i]) / a) * N[i] : 0) + (b ? ((k[i + d + 1] - t) / b) * N[i + 1] : 0));
    }
    N = next;
  }
  return N.slice(0, n);
}

/** A NURBS curve: degree, knots, weights, and the rational basis functions under it. */
@Component({
  selector: 'w-nurbs',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Control points, weights and knots</h3></div>
      <div class="w-controls" role="group" aria-label="Curve">
        <button type="button" class="w-btn" [class.on]="preset() === 'free'" [attr.aria-pressed]="preset() === 'free'" (click)="pick('free')">Free-form curve</button>
        <button type="button" class="w-btn" [class.on]="preset() === 'arc'" [attr.aria-pressed]="preset() === 'arc'" (click)="pick('arc')">Quarter circle</button>
      </div>
      <div class="w-grid two">
        <div>
          <svg viewBox="0 0 270 250" class="view" role="img" [attr.aria-label]="message()">
            @if (preset() === 'arc') {
              <path [attr.d]="circle" class="truth" />
            }
            <polyline [attr.points]="pts(ctrl())" class="poly" />
            <polyline [attr.points]="curvePts()" class="curve" />
            @for (c of ctrl(); track $index) {
              <circle [attr.cx]="sx(c.x)" [attr.cy]="sy(c.y)" [attr.r]="3 + 3 * weights()[$index]" class="cp" [class.on]="$index === wi()" />
              <text [attr.x]="sx(c.x) + 8" [attr.y]="sy(c.y) - 6" class="lbl">P{{ $index }}</text>
            }
            <circle [attr.cx]="sx(point().x)" [attr.cy]="sy(point().y)" r="5" class="pt" />
          </svg>
        </div>
        <div>
          @if (preset() === 'free') {
            <div class="w-controls" role="group" aria-label="Degree">
              @for (d of [1, 2, 3, 4]; track d) {
                <button type="button" class="w-btn" [class.on]="deg() === d" [attr.aria-pressed]="deg() === d" (click)="deg.set(d)">degree {{ d }}</button>
              }
            </div>
          }
          <label class="w-field mb-1">weight of P{{ wi() }} = {{ num(w(), 3) }}
            <input type="range" min="0.1" max="4" step="0.01" [value]="w()" (input)="w.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">t = {{ num(t(), 2) }}
            <input type="range" min="0" max="1" step="0.01" [value]="t()" (input)="t.set(+$any($event.target).value)" />
          </label>
          <svg viewBox="0 0 220 96" class="basis" role="img" aria-label="The rational basis functions: how much each control point pulls at each t">
            <rect x="10" y="6" width="200" height="80" class="frame" />
            @for (b of basisPaths(); track $index) {
              <polyline [attr.points]="b" class="bf" [class.on]="$index === wi()" [style.stroke]="colour($index)" />
            }
            <line [attr.x1]="10 + t() * 200" y1="6" [attr.x2]="10 + t() * 200" y2="86" class="tl" />
          </svg>
          <p class="mono knots">knots [{{ knotText() }}]</p>
          @if (preset() === 'arc') {
            <table class="wtable mono"><tbody>
              <tr><th>largest radius error</th><td [class.ok]="err() < 1e-9" [class.hl]="err() >= 1e-9">{{ err() < 1e-9 ? '0 (exact)' : num(err() * 1000, 1) + ' mm' }}</td></tr>
            </tbody></table>
          }
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 330px; display: block; margin: 0 auto; }
    .basis { width: 100%; max-width: 300px; display: block; margin: 0 auto; }
    .frame { fill: none; stroke: var(--border-color); }
    .poly { fill: none; stroke: var(--text-muted); stroke-width: 1.2; stroke-dasharray: 4 3; }
    .curve { fill: none; stroke: #3b82f6; stroke-width: 3; stroke-linejoin: round; }
    .truth { fill: none; stroke: #ef4444; stroke-width: 1.2; stroke-dasharray: 2 3; }
    .cp { fill: var(--bg-main); stroke: #8b5cf6; stroke-width: 2; }
    .cp.on { fill: rgba(139, 92, 246, 0.35); }
    .pt { fill: #f59e0b; stroke: var(--bg-main); stroke-width: 2; }
    .bf { fill: none; stroke-width: 1.5; opacity: 0.75; }
    .bf.on { stroke-width: 3; opacity: 1; }
    .tl { stroke: #f59e0b; stroke-width: 1.5; }
    .knots { font-size: 0.78rem; margin: 6px 0; overflow-wrap: anywhere; }
  `]
})
export class NurbsWidget {
  readonly num = num;
  readonly circle = `M ${OX + (C0.x + R) * S} ${OY - C0.y * S} A ${R * S} ${R * S} 0 0 0 ${OX + C0.x * S} ${OY - (C0.y + R) * S}`;

  preset = signal<Preset>('free');
  deg = signal(3);
  w = signal(1);
  t = signal(0.5);

  ctrl = computed(() => (this.preset() === 'free' ? FREE : ARC));
  p = computed(() => (this.preset() === 'free' ? this.deg() : 2));
  wi = computed(() => (this.preset() === 'free' ? 2 : 1));
  weights = computed(() => this.ctrl().map((_, i) => (i === this.wi() ? this.w() : 1)));
  knots = computed(() => clampedKnots(this.ctrl().length, this.p()));
  knotText = computed(() => this.knots().map(k => num(k, 2)).join(', '));

  /** R(i) = w(i)·N(i) / Σ w(j)·N(j): the rational basis, which still adds up to 1. */
  rational(t: number) {
    const N = basis(t, this.p(), this.knots(), this.ctrl().length), w = this.weights();
    const den = N.reduce((s, n, i) => s + n * w[i], 0);
    return N.map((n, i) => (n * w[i]) / den);
  }
  at(t: number): P {
    const r = this.rational(t), c = this.ctrl();
    return r.reduce((s, v, i) => ({ x: s.x + v * c[i].x, y: s.y + v * c[i].y }), { x: 0, y: 0 });
  }
  samples = computed(() => Array.from({ length: SAMPLES + 1 }, (_, i) => this.at(i / SAMPLES)));
  curvePts = computed(() => this.pts(this.samples()));
  point = computed(() => this.at(this.t()));
  basisPaths = computed(() => {
    const rows = Array.from({ length: 101 }, (_, i) => this.rational(i / 100));
    return this.ctrl().map((_, j) => rows.map((r, i) => `${10 + i * 2},${86 - r[j] * 80}`).join(' '));
  });
  err = computed(() => Math.max(...this.samples().map(p => Math.abs(Math.hypot(p.x - C0.x, p.y - C0.y) - R))));

  message = computed(() => {
    if (this.preset() === 'arc') {
      const off = Math.abs(this.w() - Math.SQRT1_2);
      if (off < 1e-9) return `With the middle weight at exactly cos 45° ≈ 0.7071 the rational quadratic is an exact quarter circle: every point is ${R} m from the centre. No polynomial curve can do that, which is why kernels store arcs and cylinders as NURBS or as true analytic surfaces.`;
      if (off < 0.006) return `Close: weight ${num(this.w(), 3)} is within a hair of cos 45°, and the curve is ${num(this.err() * 1000, 1)} mm off the circle. Only exactly cos 45° makes the error zero; press Quarter circle again to reset it.`;
      return `The middle weight is ${num(this.w(), 3)}, so the curve is a conic but not this circle: it is up to ${num(this.err() * 1000, 0)} mm off the dashed arc. A weight of cos 45° ≈ 0.7071 makes the error zero.`;
    }
    const r = this.rational(this.t()), top = r.indexOf(Math.max(...r));
    return `Degree ${this.p()} with ${this.ctrl().length} control points: each point is a blend of at most ${this.p() + 1} control points, weighted by the basis functions below. At t = ${num(this.t(), 2)}, P${top} pulls hardest (${num(r[top] * 100, 0)}%). A larger weight on P2 draws the curve towards it without moving anything else.`;
  });

  pick(p: Preset) { this.preset.set(p); this.w.set(p === 'arc' ? Math.SQRT1_2 : 1); this.t.set(0.5); }
  sx(x: number) { return OX + x * S; }
  sy(y: number) { return OY - y * S; }
  pts(ps: P[]) { return ps.map(p => `${this.sx(p.x)},${this.sy(p.y)}`).join(' '); }
  colour(i: number) { return ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][i]; }
}
