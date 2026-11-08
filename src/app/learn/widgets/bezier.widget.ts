import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, arrowHead, len, lerp, minus, num, short, times } from './vec-plane';

type K = 'P0' | 'P1' | 'P2' | 'P3';

/** de Casteljau: every stage of interpolation, from four points down to one. */
function stages(pts: P[], t: number): P[][] {
  const out = [pts];
  while (out[out.length - 1].length > 1) {
    const prev = out[out.length - 1];
    out.push(prev.slice(1).map((p, i) => lerp(prev[i], p, t)));
  }
  return out;
}

/** A cubic Bézier curve with de Casteljau's construction, its tangent, and its length by sampling. */
@Component({
  selector: 'w-bezier',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Cubic Bézier curve</h3></div>
      <p class="w-hint">Drag the control points and move t. The thin lines are de Casteljau’s interpolation, stage by stage.</p>
      <div class="w-controls">
        <label class="d-flex align-items-center gap-2"><input type="checkbox" [checked]="steps()" (change)="steps.set(!steps())" /> Show construction</label>
        <label class="d-flex align-items-center gap-2"><input type="checkbox" [checked]="showPoly()" (change)="showPoly.set(!showPoly())" /> Show the {{ n() }}-segment approximation</label>
      </div>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'B(' + short(t(), 2) + ') = ' + fmt(b())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <polyline [attr.points]="line(ctrl())" class="ext" />
          <path [attr.d]="curve()" class="main" />
          @if (showPoly()) {
            <polyline [attr.points]="line(samples())" class="approx" />
            @for (s of samples(); track $index) { <circle [attr.cx]="px(s.x)" [attr.cy]="py(s.y)" r="2.5" class="sample" /> }
          }
          @if (steps()) {
            @for (st of stages().slice(1, 3); track $index; let si = $index) {
              <polyline [attr.points]="line(st)" [attr.class]="'stage s' + si" />
              @for (q of st; track $index) { <circle [attr.cx]="px(q.x)" [attr.cy]="py(q.y)" r="3" [attr.class]="'sp s' + si" /> }
            }
          }
          <line [attr.x1]="px(b().x)" [attr.y1]="py(b().y)" [attr.x2]="px(tanEnd().x)" [attr.y2]="py(tanEnd().y)" class="tan" />
          <polygon [attr.points]="tanHead()" class="tan-h" />
          <circle [attr.cx]="px(b().x)" [attr.cy]="py(b().y)" r="6" class="res" />
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Control point ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="5.5" class="dot" [class.ctl]="k === 'P1' || k === 'P2'" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 11" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <label class="w-field mb-2">t = {{ short(t(), 2) }}
            <input type="range" min="0" max="1" step="0.01" [value]="t()" (input)="t.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">segments for the length = {{ n() }}
            <input type="range" min="1" max="6" step="1" [value]="nExp()" (input)="nExp.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            <tr><th>weights of P0…P3</th><td>{{ weights() }}</td></tr>
            <tr><th>B(t)</th><td class="ok">{{ fmt(b()) }}</td></tr>
            <tr><th>tangent B′(t)</th><td>{{ fmtV(deriv()) }}</td></tr>
            <tr><th>length, {{ n() }} segments</th><td>{{ num(approxLen(), 4) }}</td></tr>
            <tr><th>length, 1024 segments</th><td>{{ num(trueLen(), 4) }}</td></tr>
            <tr><th>chord, polygon</th><td>{{ num(chord(), 2) }}, {{ num(polyLen(), 2) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .stage { fill: none; stroke-width: 1.5; }
    .stage.s0 { stroke: #8b5cf6; }
    .stage.s1 { stroke: #f59e0b; stroke-width: 2; }
    .sp.s0 { fill: #8b5cf6; }
    .sp.s1 { fill: #f59e0b; }
    .approx { fill: none; stroke: #ef4444; stroke-width: 1.2; opacity: 0.85; }
    .sample { fill: #ef4444; }
    .tan { stroke: #10b981; stroke-width: 2.5; }
    .tan-h { fill: #10b981; }
    .w-controls label { font-size: 0.88rem; }
    .w-controls input[type='checkbox'] { accent-color: #8b5cf6; }
  `]
})
export class BezierWidget extends DragPlane<K> {
  readonly keys: K[] = ['P0', 'P1', 'P2', 'P3'];
  readonly num = num;

  protected readonly pts = {
    P0: signal<P>({ x: -5, y: -3 }), P1: signal<P>({ x: -3, y: 4 }), P2: signal<P>({ x: 3, y: 4 }), P3: signal<P>({ x: 5, y: -2 })
  };
  t = signal(0.35);
  steps = signal(true);
  showPoly = signal(false);
  /** Segments for the length estimate: 2^nExp. */
  nExp = signal(2);
  n = computed(() => 2 ** this.nExp());

  ctrl = computed(() => this.keys.map(k => this.pt(k)));
  stages = computed(() => stages(this.ctrl(), this.t()));
  b = computed(() => this.stages()[3][0]);
  deriv = computed(() => { const s = this.stages()[2]; return times(minus(s[1], s[0]), 3); });
  curve = computed(() => { const [a, b, c, d] = this.ctrl(); return `M ${this.pp(a)} C ${this.pp(b)} ${this.pp(c)} ${this.pp(d)}`; });
  samples = computed(() => this.sample(this.n()));
  approxLen = computed(() => this.pathLen(this.samples()));
  trueLen = computed(() => this.pathLen(this.sample(1024)));
  chord = computed(() => len(minus(this.pt('P3'), this.pt('P0'))));
  polyLen = computed(() => this.pathLen(this.ctrl()));
  weights = computed(() => {
    const t = this.t(), s = 1 - t;
    return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t].map(w => short(w, 3)).join(', ');
  });

  /** End of the tangent arrow: B′ scaled down so it fits on the plane. */
  tanEnd = computed(() => {
    const d = this.deriv(), l = len(d);
    return l < 1e-9 ? this.b() : { x: this.b().x + (d.x / l) * 1.8, y: this.b().y + (d.y / l) * 1.8 };
  });
  tanHead = computed(() => {
    const a = this.b(), e = this.tanEnd();
    return arrowHead(this.px(a.x), this.py(a.y), this.px(e.x), this.py(e.y), 9);
  });

  message = computed(() => {
    const t = this.t();
    if (t < 0.005) return 'At t = 0 the curve is at P0, and the tangent points straight at P1: B′(0) = 3(P1 − P0).';
    if (t > 0.995) return 'At t = 1 the curve is at P3, arriving from the direction of P2: B′(1) = 3(P3 − P2).';
    if (this.showPoly()) {
      const err = this.trueLen() - this.approxLen();
      return `${this.n()} straight segments give ${num(this.approxLen(), 4)}, ${num(err, 4)} short of the true length. Chords always under-measure a curve; doubling the count shrinks the error about four times.`;
    }
    return `Lerp the 4 control points to 3 (purple), those to 2 (orange), and those to 1: the point B(${short(t, 2)}). The weights always add up to 1, so the curve stays inside the control polygon.`;
  });

  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
  pathLen(pts: P[]) { return pts.slice(1).reduce((s, p, i) => s + len(minus(p, pts[i])), 0); }
  fmtV(v: P) { return `⟨${short(v.x, 2)}, ${short(v.y, 2)}⟩`; }
  private sample(n: number) { const c = this.ctrl(); return Array.from({ length: n + 1 }, (_, i) => stages(c, i / n)[3][0]); }
}
