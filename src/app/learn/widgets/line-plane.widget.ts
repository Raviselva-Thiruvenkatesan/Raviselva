import { Component, computed, signal } from '@angular/core';
import { Iso, V3, add3, cross3, deg, dot3, f3, len3, mul3, rad, unit3, v3 } from './iso';
import { num } from './vec-plane';

type Mode = 'line' | 'planes';
type Roof = 'gable' | 'hip';

const A = v3(1, 1, 0.3);            // the pipe starts here
const EAVES = 2;

/** f(x, y) = z of a roof plane, written as z = EAVES + k·(gx·x + gy·y + c). */
interface Slope { k: number; gx: number; gy: number; c: number }
const zOf = (s: Slope, x: number, y: number) => EAVES + s.k * (s.gx * x + s.gy * y + s.c);
const normalOf = (s: Slope) => unit3(v3(-s.k * s.gx, -s.k * s.gy, 1));

/** Keep the part of a plan polygon where g(x, y) ≤ 0 (one step of Sutherland–Hodgman). */
function clipHalf(poly: [number, number][], g: (x: number, y: number) => number): [number, number][] {
  const out: [number, number][] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], gp = g(...p), gq = g(...q);
    if (gp <= 0) out.push(p);
    if ((gp < 0 && gq > 0) || (gp > 0 && gq < 0)) {
      const t = gp / (gp - gq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
}

/** A pipe through a sloping slab, and the line where two roof planes meet. */
@Component({
  selector: 'w-line-plane',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where lines and planes meet</h3></div>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="mode() === 'line'" [attr.aria-pressed]="mode() === 'line'" (click)="mode.set('line')">Pipe through a slab</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'planes'" [attr.aria-pressed]="mode() === 'planes'" (click)="mode.set('planes')">Two roof planes</button>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 290" class="view" role="img" [attr.aria-label]="message()">
          <polygon [attr.points]="cam.pts(ground)" class="ground" />
          @if (mode() === 'line') {
            <polygon [attr.points]="cam.pts(slab())" class="slab" />
            <line [attr.x1]="cam.p(a).x" [attr.y1]="cam.p(a).y" [attr.x2]="cam.p(b()).x" [attr.y2]="cam.p(b()).y" class="pipe" />
            <circle [attr.cx]="cam.p(a).x" [attr.cy]="cam.p(a).y" r="4" class="end" />
            <text [attr.x]="cam.p(a).x - 14" [attr.y]="cam.p(a).y + 4" class="hl-t">A</text>
            <circle [attr.cx]="cam.p(b()).x" [attr.cy]="cam.p(b()).y" r="4" class="end" />
            <text [attr.x]="cam.p(b()).x + 7" [attr.y]="cam.p(b()).y + 4" class="hl-t">B</text>
            @if (hit(); as x) {
              <circle [attr.cx]="cam.p(x).x" [attr.cy]="cam.p(x).y" r="6.5" class="res" [class.warn]="!onPipe()" />
              <text [attr.x]="cam.p(x).x + 9" [attr.y]="cam.p(x).y - 7" class="hl-t">X</text>
            }
          } @else {
            @for (r of regions(); track $index) { <polygon [attr.points]="cam.pts(r)" [attr.class]="'face f' + $index" /> }
            @if (seam().length === 2) {
              <polyline [attr.points]="cam.pts(seam())" class="seam" />
              <text [attr.x]="cam.p(seam()[1]).x + 6" [attr.y]="cam.p(seam()[1]).y - 6" class="hl-t">{{ roof() === 'gable' ? 'ridge' : 'hip' }}</text>
            }
          }
        </svg>
        <div>
          @if (mode() === 'line') {
            <label class="w-field mb-1">slab height h = {{ num(h(), 2) }}
              <input type="range" min="1" max="4" step="0.25" [value]="h()" (input)="h.set(+$any($event.target).value)" />
            </label>
            <label class="w-field mb-1">slab slope = {{ tilt() }}°
              <input type="range" min="0" max="40" step="1" [value]="tilt()" (input)="tilt.set(+$any($event.target).value)" />
            </label>
            <label class="w-field mb-1">pipe angle from vertical = {{ alpha() }}°
              <input type="range" min="0" max="90" step="1" [value]="alpha()" (input)="alpha.set(+$any($event.target).value)" />
            </label>
            <table class="wtable mono mt-2"><tbody>
              <tr><th>n·(B − A)</th><td [class.hl]="parallel()">{{ num(nu(), 3) }}</td></tr>
              <tr><th>n·A + d</th><td>{{ num(na(), 3) }}</td></tr>
              @if (hit(); as x) {
                <tr><th>t = −(n·A + d) ÷ n·(B − A)</th><td [class.ok]="onPipe()" [class.hl]="!onPipe()">{{ num(t(), 3) }}</td></tr>
                <tr><th>X = A + t(B − A)</th><td>{{ f3(x) }}</td></tr>
              } @else {
                <tr><th>result</th><td class="hl">parallel: no single point</td></tr>
              }
            </tbody></table>
          } @else {
            <div class="w-controls mb-2" role="group" aria-label="Roof type">
              <button type="button" class="w-btn" [class.on]="roof() === 'gable'" [attr.aria-pressed]="roof() === 'gable'" (click)="roof.set('gable')">Gable: opposite slopes</button>
              <button type="button" class="w-btn" [class.on]="roof() === 'hip'" [attr.aria-pressed]="roof() === 'hip'" (click)="roof.set('hip')">Hip: slopes at a corner</button>
            </div>
            <label class="w-field mb-1">pitch of the blue slope = {{ p1() }}°
              <input type="range" min="10" max="55" step="1" [value]="p1()" (input)="p1.set(+$any($event.target).value)" />
            </label>
            <label class="w-field mb-1">pitch of the purple slope = {{ p2() }}°
              <input type="range" min="10" max="55" step="1" [value]="p2()" (input)="p2.set(+$any($event.target).value)" />
            </label>
            <table class="wtable mono mt-2"><tbody>
              <tr><th>n1</th><td>{{ f3(n1(), 3) }}</td></tr>
              <tr><th>n2</th><td>{{ f3(n2(), 3) }}</td></tr>
              <tr><th>direction n1 × n2</th><td class="ok">{{ f3(dir(), 3) }}</td></tr>
              <tr><th>slope of the line</th><td>{{ num(linePitch(), 1) }}°</td></tr>
              <tr><th>angle in plan</th><td>{{ num(planAngle(), 1) }}°</td></tr>
            </tbody></table>
          }
        </div>
      </div>
      <div class="w-msg" [class.info]="mode() === 'planes' || onPipe()" [class.err]="mode() === 'line' && !onPipe()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .ground { fill: rgba(148, 163, 184, 0.12); stroke: var(--border-color); stroke-width: 1; }
    .slab { fill: rgba(59, 130, 246, 0.25); stroke: #3b82f6; stroke-width: 2; }
    .pipe { stroke: #f59e0b; stroke-width: 5; stroke-linecap: round; opacity: 0.9; }
    .end { fill: #d97706; }
    .face { stroke-width: 1.5; stroke-linejoin: round; }
    .face.f0 { fill: rgba(59, 130, 246, 0.35); stroke: #3b82f6; }
    .face.f1 { fill: rgba(139, 92, 246, 0.35); stroke: #8b5cf6; }
    .seam { stroke: #ef4444; stroke-width: 3.5; stroke-linecap: round; }
  `]
})
export class LinePlaneWidget {
  readonly cam = new Iso(18, 70, 215, 'se');
  readonly ground: V3[] = [v3(0, 0, 0), v3(5, 0, 0), v3(5, 5, 0), v3(0, 5, 0)];
  readonly a = A;
  readonly num = num;
  readonly f3 = f3;

  mode = signal<Mode>('line');
  // pipe through a slab
  h = signal(2.5);
  tilt = signal(10);
  alpha = signal(35);
  // two roof planes
  roof = signal<Roof>('gable');
  p1 = signal(35);
  p2 = signal(35);

  // ---------------------------------------------------------------- line–plane
  n = computed(() => { const t = rad(this.tilt()); return v3(0, -Math.sin(t) || 0, Math.cos(t)); });
  d = computed(() => -dot3(this.n(), v3(0, 0, this.h())));
  /** B − A: the pipe is 5.5 long, heading north-east in plan. */
  u = computed(() => { const a = rad(this.alpha()), L = 5.5; return v3(0.6 * Math.sin(a) * L, 0.8 * Math.sin(a) * L, Math.cos(a) * L); });
  b = computed(() => add3(A, this.u()));
  nu = computed(() => dot3(this.n(), this.u()));
  na = computed(() => dot3(this.n(), A) + this.d());
  parallel = computed(() => Math.abs(this.nu()) < 1e-9 * len3(this.u()));
  t = computed(() => -this.na() / this.nu());
  hit = computed(() => (this.parallel() ? null : add3(A, mul3(this.u(), this.t()))));
  onPipe = computed(() => !this.parallel() && this.t() >= 0 && this.t() <= 1);
  slab = computed(() => {
    const k = Math.tan(rad(this.tilt())), h = this.h();
    return [v3(0, 0, h), v3(5, 0, h), v3(5, 5, h + 5 * k), v3(0, 5, h + 5 * k)];
  });

  // ---------------------------------------------------------------- plane–plane
  s1 = computed<Slope>(() => ({ k: Math.tan(rad(this.p1())), gx: 0, gy: 1, c: 0 }));
  s2 = computed<Slope>(() => {
    const k = Math.tan(rad(this.p2()));
    return this.roof() === 'gable' ? { k, gx: 0, gy: -1, c: 5 } : { k, gx: 1, gy: 0, c: 0 };
  });
  n1 = computed(() => normalOf(this.s1()));
  n2 = computed(() => normalOf(this.s2()));
  dir = computed(() => {
    const L = unit3(cross3(this.n1(), this.n2()));
    return L.z < 0 || (Math.abs(L.z) < 1e-9 && L.x < 0) ? mul3(L, -1) : L;   // point it up, or along +X
  });
  linePitch = computed(() => deg(Math.asin(Math.min(1, Math.abs(this.dir().z)))));
  planAngle = computed(() => (deg(Math.atan2(this.dir().y, this.dir().x)) + 360) % 360);
  /** Each slope covers the part of the 5 × 5 plan where it is the lower of the two. */
  regions = computed(() => {
    const sq: [number, number][] = [[0, 0], [5, 0], [5, 5], [0, 5]];
    const s1 = this.s1(), s2 = this.s2();
    const diff = (x: number, y: number) => zOf(s1, x, y) - zOf(s2, x, y);
    const r1 = clipHalf(sq, diff).map(([x, y]) => v3(x, y, zOf(s1, x, y)));
    const r2 = clipHalf(sq, (x, y) => -diff(x, y)).map(([x, y]) => v3(x, y, zOf(s2, x, y)));
    return [r1, r2];
  });
  seam = computed(() => {
    const s1 = this.s1(), s2 = this.s2();
    const pts = this.regions()[0].filter(p => Math.abs(zOf(s1, p.x, p.y) - zOf(s2, p.x, p.y)) < 1e-6);
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : [];
  });

  message = computed(() => {
    if (this.mode() === 'line') {
      if (this.parallel()) return 'n·(B − A) = 0: the pipe runs parallel to the slab. There is no single crossing point (or, if n·A + d = 0 too, the pipe lies in the slab).';
      const t = this.t();
      if (!this.onPipe()) return `t = ${num(t, 3)} is outside 0…1: the pipe’s line meets the slab ${t < 0 ? 'before A' : 'beyond B'}, so this pipe never passes through it.`;
      return `t = ${num(t, 3)}: the pipe passes through the slab at X, ${num(t * 100, 0)}% of the way from A to B. That is where the sleeve (the opening in the slab) goes.`;
    }
    const kind = this.roof() === 'gable' ? 'ridge' : 'hip';
    const flat = this.linePitch() < 0.05;
    return `The ${kind} runs along n1 × n2, which is at right angles to both normals. ${flat ? 'It is level: opposite slopes always meet in a horizontal ridge.' : `It slopes at ${num(this.linePitch(), 1)}°, flatter than either roof slope: a hip rafter is always flatter than the common rafters.`} ${this.p1() === this.p2() ? '' : 'Unequal pitches move the line off the centre in plan.'}`.trim();
  });
}
