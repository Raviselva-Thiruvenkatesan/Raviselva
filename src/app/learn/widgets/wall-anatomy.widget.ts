import { Component, computed, signal } from '@angular/core';

interface P { x: number; y: number }
type Handle = 'a' | 'b';

const SCALE = 30;                 // pixels per metre
const OX = 20, OY = 225;          // pixel position of the world origin
const W = 10, H = 7;              // visible world size in metres

/** A straight wall stored as two points and a thickness; everything else is computed. */
@Component({
  selector: 'w-wall-anatomy',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A wall is two points and a thickness</h3></div>
      <p class="w-hint">Drag the round handles (or focus one and use the arrow keys). Only the two points, the thickness and the height are stored; every number on the right is computed from them.</p>
      <div class="w-grid two">
        <div>
          <svg #svg viewBox="0 0 340 240" class="plan" role="img" [attr.aria-label]="'Wall from ' + fmt(a()) + ' to ' + fmt(b())"
               (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
            @for (g of gridX; track g) { <line [attr.x1]="px(g)" [attr.y1]="py(0)" [attr.x2]="px(g)" [attr.y2]="py(h)" class="grid" /> }
            @for (g of gridY; track g) { <line [attr.x1]="px(0)" [attr.y1]="py(g)" [attr.x2]="px(w)" [attr.y2]="py(g)" class="grid" /> }
            <text [attr.x]="px(0) + 3" [attr.y]="py(0) - 4" class="lbl">0, 0</text>
            <polygon [attr.points]="outline()" class="wall" />
            <line [attr.x1]="px(a().x)" [attr.y1]="py(a().y)" [attr.x2]="px(b().x)" [attr.y2]="py(b().y)" class="loc" />
            <!-- direction (u) and perpendicular (n) from the midpoint -->
            <line [attr.x1]="px(mid().x)" [attr.y1]="py(mid().y)" [attr.x2]="px(mid().x + u().x)" [attr.y2]="py(mid().y + u().y)" class="vec u" />
            <line [attr.x1]="px(mid().x)" [attr.y1]="py(mid().y)" [attr.x2]="px(mid().x + n().x)" [attr.y2]="py(mid().y + n().y)" class="vec n" />
            <text [attr.x]="px(mid().x + u().x * 1.25)" [attr.y]="py(mid().y + u().y * 1.25) + 4" class="vlbl u" text-anchor="middle">u</text>
            <text [attr.x]="px(mid().x + n().x * 1.3)" [attr.y]="py(mid().y + n().y * 1.3) + 4" class="vlbl n" text-anchor="middle">n</text>
            @for (c of corners(); track $index) {
              <circle [attr.cx]="px(c.x)" [attr.cy]="py(c.y)" r="3" class="corner" />
              <text [attr.x]="px(c.x) + cornerDx($index)" [attr.y]="py(c.y) + cornerDy($index)" class="clbl" text-anchor="middle">{{ $index + 1 }}</text>
            }
            @for (k of handles; track k) {
              <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Point ' + k.toUpperCase()" [attr.aria-valuetext]="fmt(pt(k))"
                 (pointerdown)="start($event, k)" (keydown)="key($event, k)">
                <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="11" class="hit" />
                <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6.5" class="dot" />
                <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 12" text-anchor="middle" class="hlbl">{{ k.toUpperCase() }}</text>
              </g>
            }
          </svg>
          <div class="w-controls mt-2">
            <label class="w-field">Thickness {{ t().toFixed(2) }} m
              <input type="range" min="0.1" max="0.6" step="0.05" [value]="t()" (input)="t.set(+$any($event.target).value)" />
            </label>
            <label class="w-field">Height {{ height().toFixed(1) }} m
              <input type="range" min="2.4" max="6" step="0.1" [value]="height()" (input)="height.set(+$any($event.target).value)" />
            </label>
          </div>
        </div>
        <div>
          <div class="w-label">Stored</div>
          <table class="wtable mono mb-3"><tbody>
            <tr><th>Start A</th><td>{{ fmt(a()) }}</td></tr>
            <tr><th>End B</th><td>{{ fmt(b()) }}</td></tr>
            <tr><th>Thickness, height</th><td>{{ t().toFixed(2) }}, {{ height().toFixed(1) }}</td></tr>
          </tbody></table>
          <div class="w-label">Computed</div>
          <table class="wtable mono"><tbody>
            <tr><th>Length</th><td>√({{ sq(d().x) }} + {{ sq(d().y) }}) ={{ len().toFixed(2) }} m</td></tr>
            <tr><th>Direction</th><td>{{ angle().toFixed(1) }}°</td></tr>
            <tr><th>u (unit direction)</th><td>({{ num(u().x) }}, {{ num(u().y) }})</td></tr>
            <tr><th>n (perpendicular)</th><td>({{ num(n().x) }}, {{ num(n().y) }})</td></tr>
            @for (c of corners(); track $index) { <tr><th>Corner {{ $index + 1 }}</th><td>{{ fmt(c) }}</td></tr> }
            <tr><th>Face area</th><td>{{ (len() * height()).toFixed(2) }} m²</td></tr>
            <tr><th>Volume</th><td>{{ (len() * t() * height()).toFixed(2) }} m³</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>Corner = end point ± n × thickness ÷ 2. n is u turned 90°: (−u.y, u.x). Move either end and all four corners, the area and the volume follow.</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plan { width: 100%; max-width: 440px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.6; }
    .lbl { font-size: 9px; fill: var(--text-muted); }
    .wall { fill: rgba(139, 92, 246, 0.22); stroke: #8b5cf6; stroke-width: 1.5; stroke-linejoin: round; }
    .loc { stroke: var(--text-main); stroke-width: 1.2; stroke-dasharray: 6 4; opacity: 0.7; }
    .vec { stroke-width: 2.5; stroke-linecap: round; }
    .vec.u { stroke: #0891b2; }
    .vec.n { stroke: #f59e0b; }
    .vlbl { font-size: 11px; font-weight: 800; }
    .vlbl.u { fill: #0891b2; }
    .vlbl.n { fill: #d97706; }
    .corner { fill: #8b5cf6; }
    .clbl { font-size: 10px; font-weight: 700; fill: #8b5cf6; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke: #10b981; stroke-width: 3; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(16, 185, 129, 0.35); }
    .hlbl { font-size: 11px; font-weight: 800; fill: #059669; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
  `]
})
export class WallAnatomyWidget {
  readonly handles: Handle[] = ['a', 'b'];
  readonly w = W;
  readonly h = H;
  readonly gridX = Array.from({ length: W + 1 }, (_, i) => i);
  readonly gridY = Array.from({ length: H + 1 }, (_, i) => i);

  a = signal<P>({ x: 1.5, y: 1.5 });
  b = signal<P>({ x: 7.5, y: 4.5 });
  t = signal(0.3);
  height = signal(3);
  drag = signal<Handle | null>(null);

  d = computed(() => ({ x: this.b().x - this.a().x, y: this.b().y - this.a().y }));
  len = computed(() => Math.hypot(this.d().x, this.d().y));
  u = computed(() => ({ x: this.d().x / this.len(), y: this.d().y / this.len() }));
  n = computed(() => ({ x: -this.u().y, y: this.u().x }));
  mid = computed(() => ({ x: (this.a().x + this.b().x) / 2, y: (this.a().y + this.b().y) / 2 }));
  angle = computed(() => { const deg = (Math.atan2(this.d().y, this.d().x) * 180) / Math.PI; return deg < 0 ? deg + 360 : deg; });
  corners = computed<P[]>(() => {
    const a = this.a(), b = this.b(), n = this.n(), k = this.t() / 2;
    return [
      { x: a.x + n.x * k, y: a.y + n.y * k }, { x: b.x + n.x * k, y: b.y + n.y * k },
      { x: b.x - n.x * k, y: b.y - n.y * k }, { x: a.x - n.x * k, y: a.y - n.y * k }
    ];
  });
  outline = computed(() => this.corners().map(c => `${this.px(c.x)},${this.py(c.y)}`).join(' '));

  px(x: number) { return OX + x * SCALE; }
  py(y: number) { return OY - y * SCALE; }
  pt(k: Handle) { return k === 'a' ? this.a() : this.b(); }
  fmt(p: P) { return `(${this.num(p.x)}, ${this.num(p.y)})`; }
  num(v: number) { return (Math.abs(v) < 0.005 ? 0 : v).toFixed(2).replace('-', '−'); }
  sq(v: number) { const s = v.toFixed(1).replace('-', '−'); return v < 0 ? `(${s})²` : `${s}²`; }
  /** Push corner labels outwards (along n) and past the end handles (along u). */
  cornerDx(i: number) { const s = i < 2 ? 1 : -1, along = i === 1 || i === 2 ? 1 : -1; return this.n().x * s * 12 + this.u().x * along * 17; }
  cornerDy(i: number) { const s = i < 2 ? 1 : -1, along = i === 1 || i === 2 ? 1 : -1; return -(this.n().y * s * 12) - this.u().y * along * 17 + 3.5; }

  start(e: PointerEvent, k: Handle) {
    this.drag.set(k);
    (e.currentTarget as Element).closest('svg')?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  move(e: PointerEvent, el: Element) {
    const svg = el as SVGSVGElement;
    const k = this.drag();
    if (!k) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    this.place(k, { x: (p.x - OX) / SCALE, y: (OY - p.y) / SCALE });
  }

  key(e: KeyboardEvent, k: Handle) {
    const step = e.shiftKey ? 1 : 0.1, p = this.pt(k);
    const delta: Record<string, P> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step } };
    const dd = delta[e.key];
    if (!dd) return;
    e.preventDefault();
    this.place(k, { x: p.x + dd.x, y: p.y + dd.y });
  }

  /** Snap to 0.1 m, keep inside the plan, and refuse a wall shorter than 0.5 m. */
  private place(k: Handle, p: P) {
    const q = { x: Math.round(Math.min(W - 0.3, Math.max(0.3, p.x)) * 10) / 10, y: Math.round(Math.min(H - 0.3, Math.max(0.3, p.y)) * 10) / 10 };
    const other = k === 'a' ? this.b() : this.a();
    if (Math.hypot(q.x - other.x, q.y - other.y) < 0.5) return;
    (k === 'a' ? this.a : this.b).set(q);
  }
}
