import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, cross, len, lerp, minus, short } from './vec-plane';

type K = 'A' | 'B' | 'C' | 'D';
type State = 'cross' | 'lines' | 'parallel' | 'collinear';

const PRESETS: { label: string; v: Record<K, P> }[] = [
  { label: 'Crossing', v: { A: { x: -4, y: -3 }, B: { x: 4, y: 3 }, C: { x: -4, y: 3 }, D: { x: 3, y: -3 } } },
  { label: 'Stops short', v: { A: { x: -5, y: -1 }, B: { x: 1, y: -1 }, C: { x: 3, y: -4 }, D: { x: 3, y: 4 } } },
  { label: 'Parallel', v: { A: { x: -4, y: -2 }, B: { x: 4, y: 0 }, C: { x: -4, y: 1 }, D: { x: 4, y: 3 } } },
  { label: 'Collinear', v: { A: { x: -5, y: -2 }, B: { x: 1, y: 1 }, C: { x: -1, y: 0 }, D: { x: 5, y: 3 } } }
];

/** Two segments: where do their lines meet, and is that point on both segments? */
@Component({
  selector: 'w-line-intersect',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where do two walls meet?</h3></div>
      <div class="w-controls" role="group" aria-label="Examples">
        @for (pr of presets; track pr.label) { <button type="button" class="w-btn" (click)="load(pr.v)">{{ pr.label }}</button> }
      </div>
      <p class="w-hint">Drag the ends of wall AB (blue) and wall CD (purple). Dashed lines are their extensions.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @for (s of segs; track s[0]) {
            <line [attr.x1]="px(far(s, -1).x)" [attr.y1]="py(far(s, -1).y)" [attr.x2]="px(far(s, 1).x)" [attr.y2]="py(far(s, 1).y)" class="ext" />
          }
          <line [attr.x1]="px(pt('A').x)" [attr.y1]="py(pt('A').y)" [attr.x2]="px(pt('B').x)" [attr.y2]="py(pt('B').y)" class="main" />
          <line [attr.x1]="px(pt('C').x)" [attr.y1]="py(pt('C').y)" [attr.x2]="px(pt('D').x)" [attr.y2]="py(pt('D').y)" class="main alt" />
          @if (x(); as p) {
            <circle [attr.cx]="px(p.x)" [attr.cy]="py(p.y)" r="7" class="res" [class.warn]="state() === 'lines'" />
            <text [attr.x]="px(p.x) + 11" [attr.y]="py(p.y) + 16" class="hl-t">X</text>
          }
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Point ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6" class="dot" [class.alt]="k === 'C' || k === 'D'" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 12" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th>r = B − A</th><td>{{ fmtV(r()) }}</td></tr>
            <tr><th>s = D − C</th><td>{{ fmtV(s()) }}</td></tr>
            <tr><th>r × s</th><td [class.hl]="state() === 'parallel' || state() === 'collinear'">{{ short(den(), 3) }}</td></tr>
            @if (x()) {
              <tr><th>t = ((C − A) × s) ÷ (r × s)</th><td [class.ok]="inT()" [class.hl]="!inT()">{{ short(t(), 3) }}</td></tr>
              <tr><th>u = ((C − A) × r) ÷ (r × s)</th><td [class.ok]="inU()" [class.hl]="!inU()">{{ short(u(), 3) }}</td></tr>
              <tr><th>X = A + t × r</th><td>{{ fmt(x()!) }}</td></tr>
            } @else {
              <tr><th>(C − A) × r</th><td>{{ short(side(), 3) }}</td></tr>
            }
            <tr><th>result</th><td [class.ok]="state() === 'cross'">{{ verdict() }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.ok]="state() === 'cross'" [class.info]="state() === 'lines'" [class.err]="state() === 'parallel' || state() === 'collinear'" aria-live="polite">
        <span>{{ message() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss']
})
export class LineIntersectWidget extends DragPlane<K> {
  readonly keys: K[] = ['A', 'B', 'C', 'D'];
  readonly presets = PRESETS;
  readonly segs: [K, K][] = [['A', 'B'], ['C', 'D']];

  protected readonly pts = {
    A: signal<P>(PRESETS[1].v.A), B: signal<P>(PRESETS[1].v.B), C: signal<P>(PRESETS[1].v.C), D: signal<P>(PRESETS[1].v.D)
  };

  r = computed(() => minus(this.pt('B'), this.pt('A')));
  s = computed(() => minus(this.pt('D'), this.pt('C')));
  ca = computed(() => minus(this.pt('C'), this.pt('A')));
  den = computed(() => cross(this.r(), this.s()));
  side = computed(() => cross(this.ca(), this.r()));
  t = computed(() => cross(this.ca(), this.s()) / this.den());
  u = computed(() => cross(this.ca(), this.r()) / this.den());
  inT = computed(() => this.t() >= -1e-9 && this.t() <= 1 + 1e-9);
  inU = computed(() => this.u() >= -1e-9 && this.u() <= 1 + 1e-9);

  state = computed<State>(() => {
    const rl = len(this.r()), sl = len(this.s());
    if (Math.abs(this.den()) <= 1e-9 * rl * sl) return Math.abs(this.side()) <= 1e-9 * rl * (len(this.ca()) || 1) ? 'collinear' : 'parallel';
    return this.inT() && this.inU() ? 'cross' : 'lines';
  });
  x = computed(() => (this.state() === 'cross' || this.state() === 'lines' ? lerp(this.pt('A'), this.pt('B'), this.t()) : null));

  verdict = computed(() => ({ cross: 'the walls cross', lines: 'only the lines meet', parallel: 'parallel', collinear: 'collinear' })[this.state()]);

  message = computed(() => {
    const t = this.t(), u = this.u();
    switch (this.state()) {
      case 'cross': return `Both 0 ≤ t ≤ 1 and 0 ≤ u ≤ 1, so X is on both walls: ${short(t * 100, 1)}% along AB and ${short(u * 100, 1)}% along CD.`;
      case 'lines': {
        const bits: string[] = [];
        if (!this.inT()) bits.push(t > 1 ? `AB would have to be extended past B (t = ${short(t, 2)})` : `AB would have to be extended back past A (t = ${short(t, 2)})`);
        if (!this.inU()) bits.push(u > 1 ? `CD past D (u = ${short(u, 2)})` : `CD back past C (u = ${short(u, 2)})`);
        return `The lines meet at X, but the walls do not: ${bits.join(', and ')}. A trim/extend join uses exactly this.`;
      }
      case 'parallel': return 'r × s = 0: the walls are parallel and their lines never meet. Dividing by r × s here would give Infinity or NaN, so test it first.';
      default: return 'r × s = 0 and (C − A) × r = 0: both walls lie on the same line. They may overlap; compare their t ranges along AB to find out.';
    }
  });

  far(s: [K, K], dir: number) {
    const a = this.pt(s[0]), b = this.pt(s[1]);
    return lerp(a, b, (dir * 40) / (len(minus(b, a)) || 1));
  }
  fmtV(v: P) { return `⟨${short(v.x, 2)}, ${short(v.y, 2)}⟩`; }

  protected override place(k: K, p: P) {
    super.place(k, p);
    const pair: Record<K, K> = { A: 'B', B: 'A', C: 'D', D: 'C' };
    const o = this.pt(pair[k]);
    if (len(minus(this.pt(k), o)) < 0.25) this.pts[k].set({ x: o.x + 0.5, y: o.y });
  }
}
