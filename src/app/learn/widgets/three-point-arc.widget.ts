import { Component, computed, signal } from '@angular/core';
import { DragPlane, S } from './drag-plane';
import { P, cross, dot, len, minus, num, short } from './vec-plane';

type K = 'P1' | 'P2' | 'P3';

interface Arc { c: P; r: number; ccw: boolean; sweep: number; a1: number; a3: number }

const TAU = 2 * Math.PI;
const norm = (a: number) => ((a % TAU) + TAU) % TAU;

/** The arc through three points: perpendicular bisectors, centre, radius, sweep and length. */
@Component({
  selector: 'w-three-point-arc',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>An arc through three points</h3></div>
      <p class="w-hint">Drag the start P1, a point on the arc P2, and the end P3. Try putting all three in a line.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <!-- chords and their perpendicular bisectors -->
          <polyline [attr.points]="pp(pt('P1')) + ' ' + pp(pt('P2')) + ' ' + pp(pt('P3'))" class="chord" />
          @if (bisectors()) {
            @for (b of bisectors(); track $index) {
              <line [attr.x1]="px(b[0].x)" [attr.y1]="py(b[0].y)" [attr.x2]="px(b[1].x)" [attr.y2]="py(b[1].y)" class="bis" />
            }
          }
          @if (arc(); as a) {
            <circle [attr.cx]="px(a.c.x)" [attr.cy]="py(a.c.y)" [attr.r]="a.r * scale" class="full" />
            <line [attr.x1]="px(a.c.x)" [attr.y1]="py(a.c.y)" [attr.x2]="px(pt('P1').x)" [attr.y2]="py(pt('P1').y)" class="rad" />
            <line [attr.x1]="px(a.c.x)" [attr.y1]="py(a.c.y)" [attr.x2]="px(pt('P3').x)" [attr.y2]="py(pt('P3').y)" class="rad" />
            <path [attr.d]="path()" class="main" />
            <line [attr.x1]="px(pt('P1').x)" [attr.y1]="py(pt('P1').y)" [attr.x2]="px(tan().x)" [attr.y2]="py(tan().y)" class="tan" />
            <polygon [attr.points]="tanHead()" class="tan-h" />
            <circle [attr.cx]="px(a.c.x)" [attr.cy]="py(a.c.y)" r="5" class="res" />
            <text [attr.x]="px(a.c.x) + 8" [attr.y]="py(a.c.y) + 15" class="hl-t">centre</text>
          } @else {
            <line [attr.x1]="px(pt('P1').x)" [attr.y1]="py(pt('P1').y)" [attr.x2]="px(pt('P3').x)" [attr.y2]="py(pt('P3').y)" class="main bad" />
          }
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Point ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6" class="dot" [class.alt]="k === 'P2'" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 12" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            @if (arc(); as a) {
              <tr><th>centre</th><td>{{ fmt(a.c) }}</td></tr>
              <tr><th>radius</th><td>{{ num(a.r) }}</td></tr>
              <tr><th>direction</th><td>{{ a.ccw ? 'counterclockwise' : 'clockwise' }}</td></tr>
              <tr><th>start, end angle</th><td>{{ deg(a.a1) }}°, {{ deg(a.a3) }}°</td></tr>
              <tr><th>sweep</th><td>{{ a.ccw ? '' : '−' }}{{ deg(a.sweep) }}° = {{ num(a.sweep, 3) }} rad</td></tr>
              <tr><th>arc length r × sweep</th><td class="ok">{{ num(a.r * a.sweep) }}</td></tr>
              <tr><th>chord |P3 − P1|</th><td>{{ num(chord()) }}</td></tr>
            } @else {
              <tr><th>2 × (P2 − P1) × (P3 − P1)</th><td class="hl">{{ short(d2(), 4) }}</td></tr>
              <tr><th>result</th><td class="hl">collinear: no arc</td></tr>
            }
          </tbody></table>
          <p class="small mt-2 mb-0 legend"><span class="sw b"></span> perpendicular bisectors &nbsp; <span class="sw t"></span> tangent at P1</p>
        </div>
      </div>
      <div class="w-msg" [class.info]="!!arc()" [class.err]="!arc()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .chord { fill: none; stroke: var(--text-muted); stroke-width: 1.2; opacity: 0.7; }
    .bis { stroke: #8b5cf6; stroke-width: 1.2; stroke-dasharray: 4 4; opacity: 0.75; }
    .full { fill: none; stroke: #3b82f6; stroke-width: 1; stroke-dasharray: 2 4; opacity: 0.5; }
    .rad { stroke: #10b981; stroke-width: 1.2; opacity: 0.8; }
    .main.bad { stroke: #ef4444; }
    .tan { stroke: #f59e0b; stroke-width: 2.5; }
    .tan-h { fill: #f59e0b; }
    .legend { color: var(--text-muted); }
    .sw { display: inline-block; width: 18px; height: 3px; vertical-align: middle; border-radius: 2px; }
    .sw.b { background: repeating-linear-gradient(90deg, #8b5cf6 0 4px, transparent 4px 7px); }
    .sw.t { background: #f59e0b; }
  `]
})
export class ThreePointArcWidget extends DragPlane<K> {
  readonly keys: K[] = ['P1', 'P2', 'P3'];
  readonly scale = S;
  readonly num = num;

  protected readonly pts = { P1: signal<P>({ x: -4, y: -1 }), P2: signal<P>({ x: -1, y: 2 }), P3: signal<P>({ x: 4, y: 1 }) };

  /** Twice the signed area of the triangle: zero when the points are in a line. */
  d2 = computed(() => 2 * cross(minus(this.pt('P2'), this.pt('P1')), minus(this.pt('P3'), this.pt('P1'))));
  chord = computed(() => len(minus(this.pt('P3'), this.pt('P1'))));

  arc = computed<Arc | null>(() => {
    const a = this.pt('P1'), b = this.pt('P2'), c = this.pt('P3');
    const ab = minus(b, a), ac = minus(c, a), d = this.d2();
    // Nearly collinear: the radius would be huge and the centre far off-screen. Treat it as straight.
    const scaleLen = Math.max(dot(ab, ab), dot(ac, ac));
    if (Math.abs(d) < 0.02 * scaleLen) return null;
    const ab2 = dot(ab, ab), ac2 = dot(ac, ac);
    const ux = (ac.y * ab2 - ab.y * ac2) / d, uy = (ab.x * ac2 - ac.x * ab2) / d;
    const ctr = { x: a.x + ux, y: a.y + uy }, r = Math.hypot(ux, uy);
    if (r > 25) return null;              // a radius far larger than the plane: effectively straight
    const ccw = d > 0;
    const a1 = Math.atan2(a.y - ctr.y, a.x - ctr.x), a3 = Math.atan2(c.y - ctr.y, c.x - ctr.x);
    const sweep = ccw ? norm(a3 - a1) : norm(a1 - a3);
    return { c: ctr, r, ccw, sweep, a1, a3 };
  });

  path = computed(() => {
    const a = this.arc();
    if (!a) return '';
    const p1 = this.pt('P1'), p3 = this.pt('P3'), rr = a.r * S;
    // Screen y points down, so a counterclockwise arc in model space has SVG sweep-flag 0.
    return `M ${this.pp(p1)} A ${rr} ${rr} 0 ${a.sweep > Math.PI ? 1 : 0} ${a.ccw ? 0 : 1} ${this.pp(p3)}`;
  });

  /** End of a 1.6-unit tangent arrow at P1, in the direction of travel. */
  tan = computed(() => {
    const a = this.arc(), p = this.pt('P1');
    if (!a) return p;
    const rx = (p.x - a.c.x) / a.r, ry = (p.y - a.c.y) / a.r, k = 1.6;
    return a.ccw ? { x: p.x - ry * k, y: p.y + rx * k } : { x: p.x + ry * k, y: p.y - rx * k };
  });
  tanHead = computed(() => {
    const p = this.pt('P1'), t = this.tan();
    const x1 = this.px(p.x), y1 = this.py(p.y), x2 = this.px(t.x), y2 = this.py(t.y);
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    return `${x2 + ux * 6},${y2 + uy * 6} ${x2 - uy * 5},${y2 + ux * 5} ${x2 + uy * 5},${y2 - ux * 5}`;
  });

  /** Perpendicular bisectors of P1P2 and P2P3, long enough to cross at the centre. */
  bisectors = computed<[P, P][]>(() => {
    const pairs: [K, K][] = [['P1', 'P2'], ['P2', 'P3']];
    const reach = this.arc() ? Math.max(4, len(minus(this.arc()!.c, this.pt('P2'))) + 2) : 4;
    return pairs.map(([i, j]) => {
      const a = this.pt(i), b = this.pt(j), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const d = minus(b, a), l = len(d) || 1, n = { x: -d.y / l, y: d.x / l };
      return [{ x: m.x - n.x * reach, y: m.y - n.y * reach }, { x: m.x + n.x * reach, y: m.y + n.y * reach }] as [P, P];
    });
  });

  message = computed(() => {
    const a = this.arc();
    if (!a) return 'The three points are (almost) in a line. The perpendicular bisectors are parallel, so there is no centre: the radius would be infinite. Treat this as a straight segment.';
    if (a.sweep > Math.PI) return `The arc sweeps ${this.deg(a.sweep)}°, more than half a circle, so SVG and DXF need the “large arc” flag. Its length is r × sweep = ${num(a.r)} × ${num(a.sweep, 3)} = ${num(a.r * a.sweep)}.`;
    return `The centre is where the two perpendicular bisectors cross: it is ${num(a.r)} from all three points. The tangent at P1 (orange) is at right angles to the radius. Arc length r × sweep = ${num(a.r * a.sweep)}, against a chord of ${num(this.chord())}.`;
  });

  deg(rad: number) { return short((rad * 180) / Math.PI, 1); }

  protected override place(k: K, p: P) {
    super.place(k, p);
    for (const o of this.keys) {
      if (o !== k && len(minus(this.pt(o), this.pt(k))) < 0.25) this.pts[k].set({ x: this.pt(k).x + 0.5, y: this.pt(k).y });
    }
  }
}
