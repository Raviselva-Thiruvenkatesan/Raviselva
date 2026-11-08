import { Component, computed, signal } from '@angular/core';
import { P, arrowHead, keyDelta, num, shaftEnd, short, snap, svgPoint } from './vec-plane';

type Handle = 'a' | 'b';

const S = 25;                 // pixels per unit
const C = 150;                // pixel centre (the origin)
const R = 5.5;                // handles stay within ±R

/** The dot product as a number, an angle and a projection (shadow) of b onto a. */
@Component({
  selector: 'w-dot-product',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The dot product: angle and shadow</h3></div>
      <p class="w-hint">Drag the tips of <b class="ca">a</b> and <b class="cb">b</b>. The green arrow is b’s shadow on a’s line; the shaded half is every direction with a positive dot product with a.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'a dot b = ' + short(dot())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          <polygon [attr.points]="half()" class="half" />
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <!-- the line through a, and the line where a · v = 0 -->
          <line [attr.x1]="px(-ua().x * 9)" [attr.y1]="py(-ua().y * 9)" [attr.x2]="px(ua().x * 9)" [attr.y2]="py(ua().y * 9)" class="aline" />
          <line [attr.x1]="px(ua().y * 9)" [attr.y1]="py(-ua().x * 9)" [attr.x2]="px(-ua().y * 9)" [attr.y2]="py(ua().x * 9)" class="zero" />
          <path [attr.d]="arc()" class="arc" />
          <line [attr.x1]="px(b().x)" [attr.y1]="py(b().y)" [attr.x2]="px(foot().x)" [attr.y2]="py(foot().y)" class="drop" />
          @if (Math.abs(proj()) > 0.05) {
            <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="ftip().x" [attr.y2]="ftip().y" class="shaft p" />
            <polygon [attr.points]="fhead()" class="head p" />
          }
          <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="tip('a').x" [attr.y2]="tip('a').y" class="shaft a" />
          <polygon [attr.points]="headOf('a')" class="head a" />
          <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="tip('b').x" [attr.y2]="tip('b').y" class="shaft b" />
          <polygon [attr.points]="headOf('b')" class="head b" />
          <text [attr.x]="thPos().x" [attr.y]="thPos().y + 4" class="th" text-anchor="middle">θ</text>
          @for (k of handles; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Tip of vector ' + k" [attr.aria-valuetext]="fmt(vec(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(vec(k).x)" [attr.cy]="py(vec(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(vec(k).x)" [attr.cy]="py(vec(k).y)" r="6" [attr.class]="'dot ' + k" />
              <text [attr.x]="px(vec(k).x) + 10" [attr.y]="py(vec(k).y) - 9" [attr.class]="'vl ' + k">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th class="ca">a</th><td>{{ fmt(a()) }}</td></tr>
            <tr><th class="cb">b</th><td>{{ fmt(b()) }}</td></tr>
            <tr><th>a · b</th><td>{{ short(a().x) }}×{{ paren(b().x) }} + {{ short(a().y) }}×{{ paren(b().y) }}</td></tr>
            <tr><th></th><td [class.ok]="sign() > 0" [class.hl]="sign() < 0">= {{ short(dot()) }}</td></tr>
            <tr><th>|a|, |b|</th><td>{{ num(la()) }}, {{ num(lb()) }}</td></tr>
            <tr><th>cos θ = a·b ÷ (|a||b|)</th><td>{{ num(cos(), 3) }}</td></tr>
            <tr><th>θ</th><td>{{ num(theta(), 1) }}°</td></tr>
            <tr><th class="cp">shadow b · â</th><td>{{ num(proj()) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.ok]="sign() > 0" [class.info]="sign() === 0" [class.err]="sign() < 0" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plane { width: 100%; max-width: 340px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.55; }
    .grid.axis { stroke: var(--text-muted); opacity: 0.8; }
    .half { fill: rgba(16, 185, 129, 0.09); }
    .aline { stroke: #3b82f6; stroke-width: 1; opacity: 0.35; }
    .zero { stroke: var(--text-muted); stroke-width: 1.2; stroke-dasharray: 6 4; opacity: 0.8; }
    .arc { fill: rgba(245, 158, 11, 0.18); stroke: #f59e0b; stroke-width: 1.5; }
    .th { font-size: 11px; font-weight: 800; fill: #d97706; }
    .drop { stroke: var(--text-muted); stroke-width: 1.2; stroke-dasharray: 3 3; }
    .shaft { stroke-width: 3; stroke-linecap: round; }
    .shaft.a { stroke: #3b82f6; } .head.a { fill: #3b82f6; }
    .shaft.b { stroke: #8b5cf6; } .head.b { fill: #8b5cf6; }
    .shaft.p { stroke: #10b981; stroke-width: 9; opacity: 0.45; stroke-linecap: butt; } .head.p { fill: #059669; }
    .vl { font-size: 12px; font-weight: 800; font-style: italic; paint-order: stroke; stroke: var(--bg-secondary); stroke-width: 3px; }
    .vl.a { fill: #3b82f6; } .vl.b { fill: #8b5cf6; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke-width: 3; }
    .handle .dot.a { stroke: #3b82f6; }
    .handle .dot.b { stroke: #8b5cf6; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(139, 92, 246, 0.3); }
    .ca { color: #3b82f6; } .cb { color: #8b5cf6; } .cp { color: #059669; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
  `]
})
export class DotProductWidget {
  readonly Math = Math;
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly handles: Handle[] = ['a', 'b'];
  readonly num = num;
  readonly short = short;

  a = signal<P>({ x: 4, y: 1 });
  b = signal<P>({ x: 2, y: 3.5 });
  drag = signal<Handle | null>(null);

  dot = computed(() => this.a().x * this.b().x + this.a().y * this.b().y);
  la = computed(() => Math.hypot(this.a().x, this.a().y));
  lb = computed(() => Math.hypot(this.b().x, this.b().y));
  /** Clamped, because rounding can push the ratio just outside [-1, 1]. */
  cos = computed(() => Math.max(-1, Math.min(1, this.dot() / (this.la() * this.lb()))));
  theta = computed(() => (Math.acos(this.cos()) * 180) / Math.PI);
  ua = computed<P>(() => ({ x: this.a().x / this.la(), y: this.a().y / this.la() }));
  proj = computed(() => this.dot() / this.la());
  foot = computed<P>(() => ({ x: this.ua().x * this.proj(), y: this.ua().y * this.proj() }));
  sign = computed(() => (Math.abs(this.dot()) < 1e-9 ? 0 : Math.sign(this.dot())));

  /** The half of the plane where v · a > 0, as a big polygon clipped by the SVG. */
  half = computed(() => {
    const u = this.ua(), p = { x: -u.y, y: u.x }, k = 12;
    return [
      [p.x * k, p.y * k], [p.x * k + u.x * k, p.y * k + u.y * k], [-p.x * k + u.x * k, -p.y * k + u.y * k], [-p.x * k, -p.y * k]
    ].map(([x, y]) => `${this.px(x)},${this.py(y)}`).join(' ');
  });

  /** Signed turn from a to b, in (-pi, pi]. */
  private turn = computed(() => {
    let d = Math.atan2(this.b().y, this.b().x) - Math.atan2(this.a().y, this.a().x);
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    return d;
  });
  /** Where to put the θ label: on the bisector, just outside the wedge. */
  thPos = computed<P>(() => {
    const t = Math.atan2(this.a().y, this.a().x) + this.turn() / 2;
    return { x: C + 34 * Math.cos(t), y: C - 34 * Math.sin(t) };
  });

  /** Wedge from a to b, the short way round. */
  arc = computed(() => {
    const ta = Math.atan2(this.a().y, this.a().x), r = 22, d = this.turn();
    const sx = C + r * Math.cos(ta), sy = C - r * Math.sin(ta), ex = C + r * Math.cos(ta + d), ey = C - r * Math.sin(ta + d);
    return `M${C},${C} L${sx.toFixed(1)},${sy.toFixed(1)} A${r},${r} 0 0 ${d > 0 ? 0 : 1} ${ex.toFixed(1)},${ey.toFixed(1)} Z`;
  });

  ftip = computed(() => shaftEnd(this.px(0), this.py(0), this.px(this.foot().x), this.py(this.foot().y), 11));
  fhead = computed(() => arrowHead(this.px(0), this.py(0), this.px(this.foot().x), this.py(this.foot().y), 11));

  message = computed(() => {
    const t = num(this.theta(), 1), s = this.sign();
    if (s > 0) return `a · b = ${short(this.dot())} > 0: the angle (${t}°) is under 90°, so b points into the same half as a. If a were a face normal and b the direction to the sun, the face would be lit.`;
    if (s < 0) return `a · b = ${short(this.dot())} < 0: the angle (${t}°) is over 90°, so b points away from a and its shadow on a’s line points backwards. A face whose normal points away from the viewer is a back face.`;
    return 'a · b = 0: the vectors are exactly perpendicular, and b casts no shadow on a’s line. This is the standard test for “at right angles”, with a tolerance in real code.';
  });

  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  vec(k: Handle) { return k === 'a' ? this.a() : this.b(); }
  tip(k: Handle) { const v = this.vec(k); return shaftEnd(this.px(0), this.py(0), this.px(v.x), this.py(v.y), 11); }
  headOf(k: Handle) { const v = this.vec(k); return arrowHead(this.px(0), this.py(0), this.px(v.x), this.py(v.y), 11); }
  fmt(p: P) { return `⟨${short(p.x)}, ${short(p.y)}⟩`; }
  paren(v: number) { return v < 0 ? `(${short(v)})` : short(v); }

  start(e: PointerEvent, k: Handle) {
    this.drag.set(k);
    (e.currentTarget as Element).closest('svg')?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  move(e: PointerEvent, el: Element) {
    const k = this.drag();
    if (!k) return;
    const p = svgPoint(e, el);
    if (p) this.place(k, { x: (p.x - C) / S, y: (C - p.y) / S });
  }

  key(e: KeyboardEvent, k: Handle) {
    const d = keyDelta(e, 0.5);
    if (!d) return;
    e.preventDefault();
    this.place(k, { x: this.vec(k).x + d.x, y: this.vec(k).y + d.y });
  }

  /** Snap to half units and refuse the zero vector, which has no direction. */
  private place(k: Handle, p: P) {
    const q = { x: snap(p.x, 0.5, -R, R), y: snap(p.y, 0.5, -R, R) };
    if (!q.x && !q.y) return;
    (k === 'a' ? this.a : this.b).set(q);
  }
}
