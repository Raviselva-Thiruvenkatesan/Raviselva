import { Component, computed, signal } from '@angular/core';
import { P, arrowHead, keyDelta, num, shaftEnd, short, snap, svgPoint } from './vec-plane';

type Mode = 'area' | 'side';
type Handle = 'a' | 'b' | 'p';

const S = 25;                 // pixels per unit
const C = 150;                // pixel centre (the origin)
const R = 5.5;                // handles stay within ±R
const WA: P = { x: -4, y: -2 }, WB: P = { x: 4, y: 2 };   // the fixed wall in "side" mode

/** The 2D cross product: signed area, turn direction, and which side of a wall a point is on. */
@Component({
  selector: 'w-cross-product',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The cross product: area and side</h3></div>
      <div class="w-controls" role="group" aria-label="View">
        <button type="button" class="w-btn" [class.on]="mode() === 'area'" (click)="mode.set('area')" [attr.aria-pressed]="mode() === 'area'">Signed area of a and b</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'side'" (click)="mode.set('side')" [attr.aria-pressed]="mode() === 'side'">Which side of the wall?</button>
      </div>
      <p class="w-hint">{{ mode() === 'area' ? 'Drag the tips of a and b. Green means b is counter-clockwise from a (to its left); red means clockwise.' : 'Drag the point P. The wall runs from A to B; the sign of the cross product says which side P is on.' }}</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'Cross product ' + short(z())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @if (mode() === 'side') {
            <polygon [attr.points]="sideFill(1)" class="left" />
            <polygon [attr.points]="sideFill(-1)" class="right" />
          }
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @if (mode() === 'area') {
            <polygon [attr.points]="para()" class="para" [class.neg]="z() < 0" />
            <polygon [attr.points]="tri()" class="tri" [class.neg]="z() < 0" />
            <path [attr.d]="turnArc()" class="turn" [class.neg]="z() < 0" />
            <polygon [attr.points]="turnHead()" class="turnh" [class.neg]="z() < 0" />
            @for (k of ab; track k) {
              <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="tipOf(k).x" [attr.y2]="tipOf(k).y" [attr.class]="'shaft ' + k" />
              <polygon [attr.points]="headOf(k)" [attr.class]="'head ' + k" />
            }
            <text [attr.x]="px(0) - 16" [attr.y]="py(0) + 22" class="zsym" [class.neg]="z() < 0" text-anchor="middle">{{ z() > 0 ? '⊙' : z() < 0 ? '⊗' : '' }}</text>
          } @else {
            <line [attr.x1]="px(wa.x * 3)" [attr.y1]="py(wa.y * 3)" [attr.x2]="px(wb.x * 3)" [attr.y2]="py(wb.y * 3)" class="ext" />
            <line [attr.x1]="px(wa.x)" [attr.y1]="py(wa.y)" [attr.x2]="px(wb.x)" [attr.y2]="py(wb.y)" class="wall" />
            <polygon [attr.points]="wallHead()" class="wallh" />
            <line [attr.x1]="px(wa.x)" [attr.y1]="py(wa.y)" [attr.x2]="px(p().x)" [attr.y2]="py(p().y)" class="ap" />
            <text [attr.x]="px(wa.x) - 4" [attr.y]="py(wa.y) + 16" class="wl" text-anchor="middle">A</text>
            <text [attr.x]="px(wb.x) + 4" [attr.y]="py(wb.y) - 10" class="wl" text-anchor="middle">B</text>
            <text x="16" y="24" class="sl">left (+)</text>
            <text x="284" y="290" class="sl r" text-anchor="end">right (−)</text>
          }
          @for (k of handles(); track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="k === 'p' ? 'Point P' : 'Tip of vector ' + k" [attr.aria-valuetext]="fmt(pos(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pos(k).x)" [attr.cy]="py(pos(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pos(k).x)" [attr.cy]="py(pos(k).y)" r="6" [attr.class]="'dot ' + k" />
              <text [attr.x]="px(pos(k).x) + 10" [attr.y]="py(pos(k).y) - 9" [attr.class]="'vl ' + k">{{ k === 'p' ? 'P' : k }}</text>
            </g>
          }
        </svg>
        <div>
          @if (mode() === 'area') {
            <table class="wtable mono"><tbody>
              <tr><th class="ca">a</th><td>{{ fmt(a()) }}</td></tr>
              <tr><th class="cb">b</th><td>{{ fmt(b()) }}</td></tr>
              <tr><th>a × b (z)</th><td>{{ short(a().x) }}×{{ paren(b().y) }} − {{ paren(a().y) }}×{{ paren(b().x) }}</td></tr>
              <tr><th></th><td [class.ok]="z() > 0" [class.hl]="z() < 0">= {{ short(z()) }}</td></tr>
              <tr><th>parallelogram</th><td>|z| = {{ short(Math.abs(z())) }}</td></tr>
              <tr><th>triangle 0, a, b</th><td>|z| ÷ 2 = {{ short(Math.abs(z()) / 2) }}</td></tr>
              <tr><th>|a| |b| sin θ</th><td>{{ num(la()) }} × {{ num(lb()) }} × {{ num(sin(), 3) }}</td></tr>
              <tr><th>3D a × b</th><td>⟨0, 0, {{ short(z()) }}⟩</td></tr>
            </tbody></table>
          } @else {
            <table class="wtable mono"><tbody>
              <tr><th>wall B − A</th><td>{{ fmt(wd) }}</td></tr>
              <tr><th>P − A</th><td>{{ fmt(ap()) }}</td></tr>
              <tr><th>(B − A) × (P − A)</th><td>{{ short(wd.x) }}×{{ paren(ap().y) }} − {{ paren(wd.y) }}×{{ paren(ap().x) }}</td></tr>
              <tr><th></th><td [class.ok]="side() > 0" [class.hl]="side() < 0">= {{ short(side()) }}</td></tr>
              <tr><th>P is</th><td>{{ side() > 0 ? 'left of the wall' : side() < 0 ? 'right of the wall' : 'on the wall line' }}</td></tr>
              <tr><th>distance to line</th><td>|cross| ÷ |B − A| = {{ num(Math.abs(side()) / wlen) }}</td></tr>
            </tbody></table>
          }
        </div>
      </div>
      <div class="w-msg" [class.ok]="val() > 0" [class.err]="val() < 0" [class.info]="val() === 0" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plane { width: 100%; max-width: 340px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.55; }
    .grid.axis { stroke: var(--text-muted); opacity: 0.8; }
    .para { fill: rgba(16, 185, 129, 0.14); stroke: #10b981; stroke-width: 1; stroke-dasharray: 4 3; }
    .tri { fill: rgba(16, 185, 129, 0.22); }
    .para.neg { fill: rgba(239, 68, 68, 0.12); stroke: #ef4444; }
    .tri.neg { fill: rgba(239, 68, 68, 0.2); }
    .turn { fill: none; stroke: #059669; stroke-width: 2; }
    .turnh { fill: #059669; }
    .turn.neg { stroke: #dc2626; } .turnh.neg { fill: #dc2626; }
    .zsym { font-size: 20px; fill: #059669; }
    .zsym.neg { fill: #dc2626; }
    .shaft { stroke-width: 3; stroke-linecap: round; }
    .shaft.a { stroke: #3b82f6; } .head.a { fill: #3b82f6; }
    .shaft.b { stroke: #8b5cf6; } .head.b { fill: #8b5cf6; }
    .vl { font-size: 12px; font-weight: 800; font-style: italic; paint-order: stroke; stroke: var(--bg-secondary); stroke-width: 3px; }
    .vl.a { fill: #3b82f6; } .vl.b { fill: #8b5cf6; } .vl.p { fill: #d97706; font-style: normal; }
    .left { fill: rgba(16, 185, 129, 0.1); }
    .right { fill: rgba(239, 68, 68, 0.08); }
    .ext { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 6 4; opacity: 0.7; }
    .wall { stroke: var(--text-main); stroke-width: 5; opacity: 0.55; }
    .wallh { fill: var(--text-main); opacity: 0.55; }
    .wl { font-size: 11px; font-weight: 800; fill: var(--text-main); }
    .ap { stroke: #d97706; stroke-width: 1.5; stroke-dasharray: 4 3; }
    .sl { font-size: 11px; font-weight: 700; fill: #059669; }
    .sl.r { fill: #dc2626; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke-width: 3; }
    .handle .dot.a { stroke: #3b82f6; }
    .handle .dot.b { stroke: #8b5cf6; }
    .handle .dot.p { stroke: #d97706; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(139, 92, 246, 0.3); }
    .ca { color: #3b82f6; } .cb { color: #8b5cf6; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
  `]
})
export class CrossProductWidget {
  readonly Math = Math;
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly ab: Handle[] = ['a', 'b'];
  readonly wa = WA;
  readonly wb = WB;
  readonly wd: P = { x: WB.x - WA.x, y: WB.y - WA.y };
  readonly wlen = Math.hypot(WB.x - WA.x, WB.y - WA.y);
  readonly num = num;
  readonly short = short;

  mode = signal<Mode>('area');
  a = signal<P>({ x: 4, y: 1 });
  b = signal<P>({ x: 1.5, y: 3.5 });
  p = signal<P>({ x: -1, y: 3 });
  drag = signal<Handle | null>(null);

  handles = computed<Handle[]>(() => (this.mode() === 'area' ? ['a', 'b'] : ['p']));
  z = computed(() => this.a().x * this.b().y - this.a().y * this.b().x);
  la = computed(() => Math.hypot(this.a().x, this.a().y));
  lb = computed(() => Math.hypot(this.b().x, this.b().y));
  sin = computed(() => this.z() / (this.la() * this.lb()));
  ap = computed<P>(() => ({ x: this.p().x - WA.x, y: this.p().y - WA.y }));
  side = computed(() => this.wd.x * this.ap().y - this.wd.y * this.ap().x);
  /** The value whose sign the message and colours follow in the current mode. */
  val = computed(() => { const v = this.mode() === 'area' ? this.z() : this.side(); return Math.abs(v) < 1e-9 ? 0 : v; });

  para = computed(() => this.poly([[0, 0], [this.a().x, this.a().y], [this.a().x + this.b().x, this.a().y + this.b().y], [this.b().x, this.b().y]]));
  tri = computed(() => this.poly([[0, 0], [this.a().x, this.a().y], [this.b().x, this.b().y]]));

  /** Arc from a's direction to b's direction (the short way), with an arrow head at the end. */
  private arcPts = computed(() => {
    const ta = Math.atan2(this.a().y, this.a().x);
    let d = Math.atan2(this.b().y, this.b().x) - ta;
    while (d <= -Math.PI) d += 2 * Math.PI;
    while (d > Math.PI) d -= 2 * Math.PI;
    const r = 30, pts: P[] = [];
    for (let i = 0; i <= 16; i++) { const t = ta + (d * i) / 16; pts.push({ x: C + r * Math.cos(t), y: C - r * Math.sin(t) }); }
    return pts;
  });
  turnArc = computed(() => this.arcPts().map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' '));
  turnHead = computed(() => {
    const pts = this.arcPts(), e = pts[pts.length - 1], f = pts[pts.length - 3];
    return Math.abs(this.z()) < 1e-9 ? '' : arrowHead(f.x, f.y, e.x, e.y, 8);
  });

  wallHead = computed(() => arrowHead(this.px(WA.x), this.py(WA.y), this.px(WB.x), this.py(WB.y), 12));

  message = computed(() => {
    if (this.mode() === 'area') {
      const z = this.z();
      if (Math.abs(z) < 1e-9) return 'a × b = 0: the vectors are parallel (or one is zero), so they span no area. This is the standard parallel test, with a tolerance in real code.';
      return z > 0
        ? `a × b = ${short(z)} > 0: turning from a to b is counter-clockwise, b is to the LEFT of a, and in 3D the cross product points up out of the screen (⊙). The parallelogram’s area is ${short(z)}.`
        : `a × b = ${short(z)} < 0: turning from a to b is clockwise, b is to the RIGHT of a, and in 3D the cross product points into the screen (⊗). The area is still ${short(-z)}; only the sign changed.`;
    }
    const s = this.side();
    if (Math.abs(s) < 1e-9) return 'The cross product is 0, so P lies exactly on the wall’s line (perhaps beyond its ends).';
    return `The cross product is ${short(s)}, so P is on the ${s > 0 ? 'LEFT' : 'RIGHT'} of the wall as you walk from A to B. Dividing by the wall length gives the distance from the line: ${num(Math.abs(s) / this.wlen)}.`;
  });

  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  pos(k: Handle) { return k === 'a' ? this.a() : k === 'b' ? this.b() : this.p(); }
  tipOf(k: Handle) { const v = this.pos(k); return shaftEnd(this.px(0), this.py(0), this.px(v.x), this.py(v.y), 11); }
  headOf(k: Handle) { const v = this.pos(k); return arrowHead(this.px(0), this.py(0), this.px(v.x), this.py(v.y), 11); }
  fmt(p: P) { return `⟨${short(p.x)}, ${short(p.y)}⟩`; }
  paren(v: number) { return v < 0 ? `(${short(v)})` : short(v); }
  private poly(pts: number[][]) { return pts.map(([x, y]) => `${this.px(x)},${this.py(y)}`).join(' '); }

  /** Half-plane to the left (+1) or right (-1) of the wall line, as a big polygon clipped by the SVG. */
  sideFill(s: number) {
    const l = this.wlen, u = { x: this.wd.x / l, y: this.wd.y / l }, n = { x: -u.y * s, y: u.x * s }, k = 14;
    return this.poly([[-u.x * k, -u.y * k], [u.x * k, u.y * k], [u.x * k + n.x * k, u.y * k + n.y * k], [-u.x * k + n.x * k, -u.y * k + n.y * k]]);
  }

  start(e: PointerEvent, k: Handle) {
    this.drag.set(k);
    (e.currentTarget as Element).closest('svg')?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  move(e: PointerEvent, el: Element) {
    const k = this.drag();
    if (!k) return;
    const q = svgPoint(e, el);
    if (q) this.place(k, { x: (q.x - C) / S, y: (C - q.y) / S });
  }

  key(e: KeyboardEvent, k: Handle) {
    const d = keyDelta(e, 0.5);
    if (!d) return;
    e.preventDefault();
    this.place(k, { x: this.pos(k).x + d.x, y: this.pos(k).y + d.y });
  }

  private place(k: Handle, q: P) {
    const s = { x: snap(q.x, 0.5, -R, R), y: snap(q.y, 0.5, -R, R) };
    if (k !== 'p' && !s.x && !s.y) return;
    (k === 'a' ? this.a : k === 'b' ? this.b : this.p).set(s);
  }
}
