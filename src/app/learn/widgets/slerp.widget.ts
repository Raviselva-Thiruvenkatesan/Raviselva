import { Component, computed, signal } from '@angular/core';
import { Iso, V3, f3, unit3, v3 } from './iso';
import { M3, Q, euler, mApply3, mDet3, mToQ, noseBox, qAxisAngle, qDot, qId, qNeg, qNlerp, qSlerp, qToM } from './quat';
import { num } from './vec-plane';

type Method = 'matrix' | 'euler' | 'nlerp' | 'slerp';
type Target = 'z90' | 'z170' | 'diag' | 'z270';

const TARGETS: { k: Target; label: string; q: Q; e: [number, number, number] }[] = [
  { k: 'z90', label: 'Yaw 90°', q: qAxisAngle(v3(0, 0, 1), 90), e: [90, 0, 0] },
  { k: 'z170', label: 'Yaw 170°', q: qAxisAngle(v3(0, 0, 1), 170), e: [170, 0, 0] },
  { k: 'diag', label: '120° about (1, 1, 1)', q: qAxisAngle(unit3(v3(1, 1, 1)), 120), e: [90, 0, 90] },
  { k: 'z270', label: 'Yaw 270° (= −90°)', q: qAxisAngle(v3(0, 0, 1), 270), e: [270, 0, 0] }
];
const METHODS: { k: Method; label: string }[] = [
  { k: 'matrix', label: 'Lerp the matrix' },
  { k: 'euler', label: 'Lerp Euler angles' },
  { k: 'nlerp', label: 'Nlerp' },
  { k: 'slerp', label: 'Slerp' }
];
const BODY = noseBox(1.3, 0.55, 0.3);
const NOSE = v3(2.2, 0, 0);
const N = 60;
/** The angle between two orientations given as unit quaternions. */
const between = (a: Q, b: Q) => (2 * Math.acos(Math.min(1, Math.abs(qDot(a, b)))) * 180) / Math.PI;

/** Four ways to get from one orientation to another, and which of them is really a rotation at constant speed. */
@Component({
  selector: 'w-slerp',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From one orientation to another</h3></div>
      <div class="w-controls" role="group" aria-label="End orientation">
        @for (g of targets; track g.k) {
          <button type="button" class="w-btn" [class.on]="target() === g.k" [attr.aria-pressed]="target() === g.k" (click)="target.set(g.k)">{{ g.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Method">
        @for (m of methods; track m.k) {
          <button type="button" class="w-btn" [class.on]="method() === m.k" [attr.aria-pressed]="method() === m.k" (click)="method.set(m.k)">{{ m.label }}</button>
        }
      </div>
      <div class="w-controls">
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="shortest()" (change)="shortest.set(!shortest())" /> Shortest-path check (use −B when A·B &lt; 0)</label>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 270" class="view" role="img" [attr.aria-label]="message()">
          @for (a of frame; track a.l) {
            <line [attr.x1]="cam.p(o).x" [attr.y1]="cam.p(o).y" [attr.x2]="cam.p(a.v).x" [attr.y2]="cam.p(a.v).y" class="ax" />
            <text [attr.x]="cam.p(a.v).x + 3" [attr.y]="cam.p(a.v).y + 4" class="lbl">{{ a.l }}</text>
          }
          @for (e of edges; track $index) {
            <line [attr.x1]="cam.p(boxA[e[0]]).x" [attr.y1]="cam.p(boxA[e[0]]).y" [attr.x2]="cam.p(boxA[e[1]]).x" [attr.y2]="cam.p(boxA[e[1]]).y" class="ghost3" />
            <line [attr.x1]="cam.p(boxB()[e[0]]).x" [attr.y1]="cam.p(boxB()[e[0]]).y" [attr.x2]="cam.p(boxB()[e[1]]).x" [attr.y2]="cam.p(boxB()[e[1]]).y" class="ghost3 b" />
          }
          <polyline [attr.points]="cam.pts(trailRef())" class="trail ref" />
          <polyline [attr.points]="cam.pts(trail())" class="trail" />
          <polygon [attr.points]="cam.pts(top())" class="top" />
          @for (e of edges; track $index) {
            <line [attr.x1]="cam.p(body()[e[0]]).x" [attr.y1]="cam.p(body()[e[0]]).y" [attr.x2]="cam.p(body()[e[1]]).x" [attr.y2]="cam.p(body()[e[1]]).y" class="edge" />
          }
          <text [attr.x]="cam.p(nA).x + 4" [attr.y]="cam.p(nA).y + 12" class="lbl">A</text>
          <text [attr.x]="cam.p(nB()).x + 4" [attr.y]="cam.p(nB()).y - 6" class="lbl">B</text>
        </svg>
        <div>
          <label class="w-field mb-2">t = {{ num(t(), 2) }}
            <input type="range" min="0" max="1" step="0.05" [value]="t()" (input)="t.set(+$any($event.target).value)" />
          </label>
          <svg viewBox="0 0 300 150" class="plot" role="img" aria-label="Angle turned against t for Euler lerp, nlerp and slerp">
            <line x1="34" y1="128" x2="292" y2="128" class="pax" />
            <line x1="34" y1="10" x2="34" y2="128" class="pax" />
            <text x="30" y="14" text-anchor="end" class="lbl">{{ num(maxAngle(), 0) }}°</text>
            <text x="30" y="131" text-anchor="end" class="lbl">0</text>
            <text x="292" y="143" text-anchor="end" class="lbl">t = 1</text>
            @for (c of curves(); track c.k) {
              <polyline [attr.points]="c.pts" class="curve" [class]="'curve ' + c.k" [class.on]="method() === c.k" />
            }
            <line [attr.x1]="34 + t() * 258" y1="10" [attr.x2]="34 + t() * 258" y2="128" class="now" />
          </svg>
          <div class="legend small"><span class="k euler">Euler</span><span class="k nlerp">nlerp</span><span class="k slerp">slerp</span><span class="text-muted">turned so far</span></div>
          <table class="wtable mono mt-2"><tbody>
            <tr><th>turned so far</th><td>{{ method() === 'matrix' ? 'not a rotation' : num(turned(), 1) + '°' }}</td></tr>
            <tr><th>slerp at this t</th><td>{{ num(slerpTurned(), 1) }}°</td></tr>
            <tr><th>|X column|</th><td [class.hl]="bad()">{{ num(colLen(), 3) }}</td></tr>
            <tr><th>det</th><td [class.hl]="bad()" [class.ok]="!bad()">{{ num(det(), 3) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="bad() || longWay()" [class.info]="!bad() && !longWay()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .plot { width: 100%; max-width: 360px; display: block; }
    .ax, .pax { stroke: var(--text-muted); stroke-width: 1.2; }
    .ghost3 { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.7; }
    .ghost3.b { stroke: #8b5cf6; }
    .edge { stroke: #3b82f6; stroke-width: 2; stroke-linecap: round; }
    .top { fill: rgba(59, 130, 246, 0.25); stroke: none; }
    .trail { fill: none; stroke: #f59e0b; stroke-width: 2.5; }
    .trail.ref { stroke: #10b981; stroke-width: 1.5; stroke-dasharray: 5 4; }
    .curve { fill: none; stroke-width: 1.8; opacity: 0.55; }
    .curve.on { stroke-width: 3.2; opacity: 1; }
    .curve.euler, .k.euler::before { stroke: #ef4444; background: #ef4444; }
    .curve.nlerp, .k.nlerp::before { stroke: #8b5cf6; background: #8b5cf6; }
    .curve.slerp, .k.slerp::before { stroke: #10b981; background: #10b981; }
    .now { stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 4 3; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; }
    .legend .k::before { content: ''; display: inline-block; width: 14px; height: 3px; margin-right: 5px; vertical-align: middle; }
  `]
})
export class SlerpWidget {
  readonly num = num;
  readonly f3 = f3;
  readonly targets = TARGETS;
  readonly methods = METHODS;
  readonly cam = new Iso(28, 150, 140, 'se');
  readonly o = v3(0, 0, 0);
  readonly frame = [{ l: 'X', v: v3(3.4, 0, 0) }, { l: 'Y', v: v3(0, 3.4, 0) }, { l: 'Z', v: v3(0, 0, 3) }];
  readonly edges = BODY.edges;
  readonly boxA = BODY.corners;
  readonly nA = NOSE;

  target = signal<Target>('diag');
  method = signal<Method>('slerp');
  shortest = signal(true);
  t = signal(0.5);

  tg = computed(() => TARGETS.find(g => g.k === this.target())!);
  qB = computed(() => this.tg().q);
  /** B as the interpolators use it: flipped to −B when that is closer to A. */
  qB2 = computed(() => (this.shortest() && qDot(qId, this.qB()) < 0 ? qNeg(this.qB()) : this.qB()));
  mB = computed(() => qToM(this.qB()));
  boxB = computed(() => BODY.corners.map(p => mApply3(this.mB(), p)));
  nB = computed(() => mApply3(this.mB(), NOSE));
  longWay = computed(() => !this.shortest() && qDot(qId, this.qB()) < 0 && (this.method() === 'slerp' || this.method() === 'nlerp'));

  /** The matrix each method gives at time t. */
  at(method: Method, t: number): M3 {
    const B = this.mB();
    if (method === 'matrix') return [0, 1, 2].map(i => [0, 1, 2].map(j => (i === j ? 1 - t : 0) + t * B[i][j]));
    if (method === 'euler') { const e = this.tg().e; return euler(e[0] * t, e[1] * t, e[2] * t); }
    return qToM(method === 'nlerp' ? qNlerp(qId, this.qB2(), t) : qSlerp(qId, this.qB2(), t));
  }

  m = computed(() => this.at(this.method(), this.t()));
  body = computed(() => BODY.corners.map(p => mApply3(this.m(), p)));
  top = computed(() => BODY.top.map(i => this.body()[i]));
  trail = computed(() => this.path(this.method()));
  trailRef = computed(() => this.path('slerp'));
  det = computed(() => mDet3(this.m()));
  colLen = computed(() => { const m = this.m(); return Math.hypot(m[0][0], m[1][0], m[2][0]); });
  bad = computed(() => Math.abs(this.det() - 1) > 1e-6);

  /** Angle turned so far, summed along the path, for each method that stays a rotation. */
  turnedCurve = computed(() => {
    const out: Record<'euler' | 'nlerp' | 'slerp', number[]> = { euler: [0], nlerp: [0], slerp: [0] };
    for (const k of ['euler', 'nlerp', 'slerp'] as const) {
      let prev = qId;
      for (let i = 1; i <= N; i++) {
        const q = mToQ(this.at(k, i / N));
        out[k].push(out[k][i - 1] + between(prev, q));
        prev = q;
      }
    }
    return out;
  });
  maxAngle = computed(() => Math.max(1, ...Object.values(this.turnedCurve()).map(c => c[N])));
  curves = computed(() => {
    const c = this.turnedCurve(), m = this.maxAngle();
    return (['euler', 'nlerp', 'slerp'] as const).map(k => ({
      k, pts: c[k].map((a, i) => `${34 + (i / N) * 258},${128 - (a / m) * 118}`).join(' ')
    }));
  });
  turned = computed(() => { const m = this.method(); return this.sample(m === 'matrix' ? 'slerp' : m); });
  slerpTurned = computed(() => this.sample('slerp'));

  message = computed(() => {
    const t = num(this.t(), 2);
    switch (this.method()) {
      case 'matrix':
        return `Blending the nine matrix entries does not give a rotation. At t = ${t} the columns have length ${num(this.colLen(), 3)} and det = ${num(this.det(), 3)}, so the box is squashed as it turns. The further apart A and B are, the worse it gets.`;
      case 'euler':
        return this.tg().e[1] === 0 && this.tg().e[2] === 0
          ? (this.target() === 'z270'
            ? `Blending the yaw from 0° to 270° turns the long way round, through 270°, while slerp (dashed green) turns 90° the other way. Angles wrap; orientations do not care.`
            : `For a turn about Z alone, blending the yaw angle gives the same path as slerp. Pick 120° about (1, 1, 1) to see Euler blending leave the slerp path.`)
          : `Blending yaw, pitch and roll separately is a rotation at every t, but the nose (orange) leaves the shortest arc (dashed green) and turns ${num(this.turnedCurve().euler[N], 0)}° in all, not ${num(this.turnedCurve().slerp[N], 0)}°.`;
      case 'nlerp':
        return this.longWay() ? this.longMsg() : `Nlerp blends the four numbers and then rescales to length 1. It follows the same arc as slerp, but not at a constant speed: at t = ${t} it has turned ${num(this.turned(), 1)}°, slerp ${num(this.slerpTurned(), 1)}°. Cheap, and good enough for small steps.`;
      default:
        return this.longWay() ? this.longMsg() : `Slerp moves along the shortest arc between A and B at a constant angular speed: at t = ${t} the box has turned exactly ${t} of the way. This is what animation, camera paths and 4D sequencing tools use.`;
    }
  });

  private longMsg() {
    return `B’s quaternion has w < 0, so A·B < 0 and the blend goes the long way round: ${num(this.turnedCurve()[this.method() === 'nlerp' ? 'nlerp' : 'slerp'][N], 0)}° instead of 90°. q and −q are the same rotation, so switch on the shortest-path check to use −B.`;
  }
  private sample(k: 'euler' | 'nlerp' | 'slerp') {
    const c = this.turnedCurve()[k], x = this.t() * N, i = Math.floor(x), f = x - i;
    return i >= N ? c[N] : c[i] + (c[i + 1] - c[i]) * f;
  }
  private path(k: Method): V3[] {
    return Array.from({ length: N + 1 }, (_, i) => mApply3(this.at(k, i / N), NOSE));
  }
}
