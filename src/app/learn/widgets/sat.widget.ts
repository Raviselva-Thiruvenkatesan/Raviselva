import { Component, computed, signal } from '@angular/core';
import { Box2, axes2, corners2, overlap, project2 } from './solid';
import { P, num } from './vec-plane';

const S = 28, OX = 26, OY = 226;
const DUCT: Box2 = { c: { x: 3.4, y: 3.2 }, hx: 2.2, hy: 0.8, a: 20 };
const NAMES = ['A₁', 'A₂', 'B₁', 'B₂'];

/** The separating-axis test for two boxes in plan: project both onto each edge normal and look for a gap. */
@Component({
  selector: 'w-sat',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Separating-axis test</h3></div>
      <div class="w-controls" role="group" aria-label="Axis to show">
        @for (r of rows(); track r.i) {
          <button type="button" class="w-btn" [class.on]="sel() === r.i" [attr.aria-pressed]="sel() === r.i" (click)="sel.set(r.i)">Axis {{ r.name }}</button>
        }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 320 250" class="view" role="img" [attr.aria-label]="message()">
          <defs><clipPath id="sat-clip"><rect x="0" y="0" width="320" height="250" /></clipPath></defs>
          <g clip-path="url(#sat-clip)">
            <line [attr.x1]="axisLine()[0].x" [attr.y1]="axisLine()[0].y" [attr.x2]="axisLine()[1].x" [attr.y2]="axisLine()[1].y" class="axl" />
            @for (g of guides(); track $index) {
              <line [attr.x1]="g[0].x" [attr.y1]="g[0].y" [attr.x2]="g[1].x" [attr.y2]="g[1].y" class="guide" [class.b]="$index >= 2" />
            }
            <polygon [attr.points]="pts(ca)" class="box a" />
            <polygon [attr.points]="pts(cb())" class="box b" [class.hit]="clash()" />
            <line [attr.x1]="ia()[0].x" [attr.y1]="ia()[0].y" [attr.x2]="ia()[1].x" [attr.y2]="ia()[1].y" class="iv a" />
            <line [attr.x1]="ib()[0].x" [attr.y1]="ib()[0].y" [attr.x2]="ib()[1].x" [attr.y2]="ib()[1].y" class="iv b" />
            <text [attr.x]="sx(DUCT.c.x) - 4" [attr.y]="sy(DUCT.c.y) + 4" class="hl-t">A</text>
            <text [attr.x]="sx(bx()) - 4" [attr.y]="sy(by()) + 4" class="hl-t">B</text>
          </g>
        </svg>
        <div>
          <label class="w-field mb-1">B position x = {{ bx() }} m
            <input type="range" min="3" max="9" step="0.1" [value]="bx()" (input)="bx.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-1">B position y = {{ by() }} m
            <input type="range" min="0.6" max="6.4" step="0.1" [value]="by()" (input)="by.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">B angle = {{ ba() }}°
            <input type="range" min="0" max="180" step="5" [value]="ba()" (input)="ba.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            <tr><th>axis</th><th>overlap</th></tr>
            @for (r of rows(); track r.i) {
              <tr [class.hl]="sel() === r.i"><td>{{ r.name }}</td><td [class.ok]="r.ov <= 0">{{ r.ov > 0 ? num(r.ov, 2) + ' m' : 'gap ' + num(-r.ov, 2) + ' m' }}</td></tr>
            }
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="clash()" [class.ok]="!clash()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 380px; display: block; margin: 0 auto; }
    .box { stroke-width: 2; }
    .box.a { fill: rgba(59, 130, 246, 0.3); stroke: #3b82f6; }
    .box.b { fill: rgba(139, 92, 246, 0.3); stroke: #8b5cf6; }
    .box.b.hit { fill: rgba(239, 68, 68, 0.4); stroke: #ef4444; }
    .axl { stroke: var(--text-muted); stroke-width: 1.2; }
    .guide { stroke: #3b82f6; stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.7; }
    .guide.b { stroke: #8b5cf6; }
    .iv { stroke-width: 6; stroke-linecap: round; opacity: 0.85; }
    .iv.a { stroke: #3b82f6; }
    .iv.b { stroke: #8b5cf6; stroke-width: 3; }
  `]
})
export class SatWidget {
  readonly num = num;
  readonly DUCT = DUCT;
  readonly ca = corners2(DUCT);

  bx = signal(6.4);
  by = signal(5.4);
  ba = signal(30);
  sel = signal(2);

  b = computed<Box2>(() => ({ c: { x: this.bx(), y: this.by() }, hx: 1.3, hy: 0.6, a: this.ba() }));
  cb = computed(() => corners2(this.b()));
  axes = computed(() => [...axes2(DUCT), ...axes2(this.b())]);
  rows = computed(() => this.axes().map((ax, i) => ({ i, name: NAMES[i], ax, pa: project2(this.ca, ax), pb: project2(this.cb(), ax), ov: overlap(project2(this.ca, ax), project2(this.cb(), ax)) })));
  clash = computed(() => this.rows().every(r => r.ov > 0));
  cur = computed(() => this.rows()[this.sel()]);

  /** The axis is drawn beside the boxes through q; the value s on it is the point q + (s − q·axis) · axis. */
  q = computed<P>(() => {
    // n is at right angles to the axis, pointing up (or right); the line goes just below / left of both boxes.
    const a = this.cur().ax, n = a.x > 1e-9 || (Math.abs(a.x) <= 1e-9 && a.y < 0) ? { x: -a.y, y: a.x } : { x: a.y, y: -a.x };
    const low = Math.min(project2(this.ca, n)[0], project2(this.cb(), n)[0]) - 0.7;
    return { x: n.x * low, y: n.y * low };
  });
  axisLine = computed(() => { const a = this.cur().ax, q0 = this.q().x * a.x + this.q().y * a.y; return [this.at(a, q0 - 20), this.at(a, q0 + 20)]; });
  ia = computed(() => { const r = this.cur(); return [this.at(r.ax, r.pa[0]), this.at(r.ax, r.pa[1])]; });
  ib = computed(() => { const r = this.cur(); return [this.at(r.ax, r.pb[0]), this.at(r.ax, r.pb[1])]; });
  /** Dashed lines from the extreme corners of each box down to the axis. */
  guides = computed(() => {
    const r = this.cur(), out: P[][] = [];
    for (const [cs, iv] of [[this.ca, r.pa], [this.cb(), r.pb]] as [P[], [number, number]][]) {
      for (const s of iv) {
        const c = cs.reduce((best, p) => (Math.abs(p.x * r.ax.x + p.y * r.ax.y - s) < Math.abs(best.x * r.ax.x + best.y * r.ax.y - s) ? p : best));
        out.push([{ x: this.sx(c.x), y: this.sy(c.y) }, this.at(r.ax, s)]);
      }
    }
    return out;
  });

  message = computed(() => {
    const gaps = this.rows().filter(r => r.ov <= 0);
    if (gaps.length) {
      const g = gaps.reduce((a, r) => (r.ov < a.ov ? r : a));
      return `No clash. On axis ${g.name} the two shadows have a gap of ${num(-g.ov, 2)} m, and one gap is enough: a line at right angles to that axis fits between the boxes.`;
    }
    const m = this.rows().reduce((a, r) => (r.ov < a.ov ? r : a));
    return `Clash. All four shadows overlap, and for two convex shapes that proves they intersect. The smallest overlap, ${num(m.ov, 2)} m on axis ${m.name}, is the shortest push that would separate them.`;
  });

  sx(x: number) { return OX + x * S; }
  sy(y: number) { return OY - y * S; }
  at(a: P, s: number): P {
    const q = this.q(), t = s - (q.x * a.x + q.y * a.y);
    return { x: this.sx(q.x + a.x * t), y: this.sy(q.y + a.y * t) };
  }
  pts(ps: P[]) { return ps.map(p => `${this.sx(p.x)},${this.sy(p.y)}`).join(' '); }
}
