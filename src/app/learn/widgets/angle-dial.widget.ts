import { Component, computed, signal } from '@angular/core';

const S = 24;                  // pixels per unit
const C = 150;                 // pixel centre of the dial
const R = 5;                   // dial radius in units

const deg = (rad: number) => (rad * 180) / Math.PI;

/** Drag a direction around the origin and compare Atan(dy / dx) with Atan2(dy, dx). */
@Component({
  selector: 'w-angle-dial',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Atan vs Atan2</h3></div>
      <p class="w-hint">Drag the green point (or focus it and use the arrow keys). The purple line is the true direction from Atan2; the red dashed line is what Atan(dy / dx) thinks.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="dial" role="img" [attr.aria-label]="'Direction ' + a360().toFixed(1) + ' degrees'"
             (pointermove)="move($event, svg)" (pointerup)="dragging.set(false)" (pointercancel)="dragging.set(false)">
          <circle [attr.cx]="c" [attr.cy]="c" [attr.r]="r * s" class="ring" />
          <line [attr.x1]="c - r * s - 8" [attr.y1]="c" [attr.x2]="c + r * s + 8" [attr.y2]="c" class="ax" />
          <line [attr.x1]="c" [attr.y1]="c - r * s - 8" [attr.x2]="c" [attr.y2]="c + r * s + 8" class="ax" />
          <text [attr.x]="c + r * s + 8" [attr.y]="c - 5" class="tl" text-anchor="end">+X 0°</text>
          <text [attr.x]="c + 4" [attr.y]="c - r * s - 10" class="tl">+Y 90°</text>
          <text [attr.x]="c - r * s - 10" [attr.y]="c - 5" class="tl" text-anchor="end">180°</text>
          <text [attr.x]="c + 4" [attr.y]="c + r * s + 18" class="tl">270°</text>
          @for (q of quads; track q.n) { <text [attr.x]="c + q.x * 92" [attr.y]="c - q.y * 92 + 4" class="ql" [class.on]="quadrant() === q.n" text-anchor="middle">Q{{ q.n }}</text> }
          @if (len() > 0) {
            <path [attr.d]="arc()" class="arc" />
            @if (differs()) {
              <line [attr.x1]="c" [attr.y1]="c" [attr.x2]="c + Math.cos(atanRad()) * r * s" [attr.y2]="c - Math.sin(atanRad()) * r * s" class="wrong" />
            }
            <line [attr.x1]="c" [attr.y1]="c" [attr.x2]="px(p().x)" [attr.y2]="py(p().y)" class="dir" />
            <line [attr.x1]="px(p().x)" [attr.y1]="c" [attr.x2]="px(p().x)" [attr.y2]="py(p().y)" class="leg" />
            <line [attr.x1]="c" [attr.y1]="c" [attr.x2]="px(p().x)" [attr.y2]="c" class="leg" />
          }
          <g class="handle" [class.active]="dragging()" tabindex="0" role="slider" aria-label="Direction point" [attr.aria-valuetext]="'dx ' + p().x + ', dy ' + p().y"
             (pointerdown)="start($event)" (keydown)="key($event)">
            <circle [attr.cx]="px(p().x)" [attr.cy]="py(p().y)" r="13" class="hit" />
            <circle [attr.cx]="px(p().x)" [attr.cy]="py(p().y)" r="7" class="dot" />
          </g>
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th>dx, dy</th><td>{{ p().x }}, {{ p().y }}</td></tr>
            <tr><th>Atan(dy / dx)</th><td [class.hl]="differs()">{{ atanText() }}</td></tr>
            <tr><th>Atan2(dy, dx)</th><td class="ok">{{ len() ? a180().toFixed(1) + '°' : '0° (no direction)' }}</td></tr>
            <tr><th>in radians</th><td>{{ len() ? (a180() * Math.PI / 180).toFixed(3) : '0' }}</td></tr>
            <tr><th>normalised [0, 360)</th><td>{{ len() ? a360().toFixed(1) + '°' : '–' }}</td></tr>
            <tr><th>compass bearing</th><td>{{ len() ? bearing().toFixed(1) + '°' : '–' }}</td></tr>
          </tbody></table>
          <div class="w-controls mt-2">
            @for (pr of presets; track pr.label) { <button type="button" class="w-btn" (click)="p.set({ x: pr.x, y: pr.y })">{{ pr.label }}</button> }
          </div>
        </div>
      </div>
      <div class="w-msg" [class.ok]="!differs()" [class.err]="differs()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .dial { width: 100%; max-width: 320px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .ring { fill: var(--bg-main); stroke: var(--border-color); stroke-width: 1.5; }
    .ax { stroke: var(--text-muted); stroke-width: 1; opacity: 0.6; }
    .tl { font-size: 10px; fill: var(--text-muted); font-weight: 600; }
    .ql { font-size: 11px; font-weight: 700; fill: var(--text-muted); opacity: 0.45; }
    .ql.on { fill: #8b5cf6; opacity: 1; }
    .arc { fill: rgba(139, 92, 246, 0.15); stroke: #8b5cf6; stroke-width: 1.5; }
    .dir { stroke: #8b5cf6; stroke-width: 3; stroke-linecap: round; }
    .wrong { stroke: #ef4444; stroke-width: 2.5; stroke-dasharray: 6 4; }
    .leg { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke: #10b981; stroke-width: 3; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(16, 185, 129, 0.35); }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
  `]
})
export class AngleDialWidget {
  readonly Math = Math;
  readonly c = C;
  readonly s = S;
  readonly r = R;
  readonly quads = [{ n: 1, x: 0.7, y: 0.7 }, { n: 2, x: -0.7, y: 0.7 }, { n: 3, x: -0.7, y: -0.7 }, { n: 4, x: 0.7, y: -0.7 }];
  readonly presets = [{ label: '(2, 2)', x: 2, y: 2 }, { label: '(−2, −2)', x: -2, y: -2 }, { label: '(0, 4)', x: 0, y: 4 }, { label: '(−4, 0)', x: -4, y: 0 }, { label: '(3, −3)', x: 3, y: -3 }];

  p = signal({ x: -3, y: 2 });
  dragging = signal(false);

  len = computed(() => Math.hypot(this.p().x, this.p().y));
  a180 = computed(() => deg(Math.atan2(this.p().y, this.p().x)));
  a360 = computed(() => (this.a180() < 0 ? this.a180() + 360 : this.a180()));
  bearing = computed(() => { const b = (90 - this.a360()) % 360; return b < 0 ? b + 360 : b; });
  atanRad = computed(() => Math.atan(this.p().y / this.p().x));
  differs = computed(() => {
    const t = this.atanRad();
    if (!this.len()) return false;
    if (Number.isNaN(t)) return true;
    const d = Math.abs(((deg(t) - this.a180()) % 360 + 540) % 360 - 180);
    return d > 1e-6;
  });
  quadrant = computed(() => {
    const { x, y } = this.p();
    if (!x || !y) return 0;
    return x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
  });
  atanText = computed(() => {
    const t = this.atanRad();
    if (Number.isNaN(t)) return 'NaN (0 / 0)';
    const v = deg(t).toFixed(1) + '°';
    return this.p().x === 0 ? `${v} (dy / 0 = ${this.p().y > 0 ? '+' : '−'}∞)` : v;
  });
  message = computed(() => {
    const { x, y } = this.p();
    if (!this.len()) return 'A zero-length direction has no angle. Atan(0 / 0) is NaN; Atan2(0, 0) returns 0. Check for zero length before asking for an angle.';
    if (this.differs()) return `dx is negative, so dy / dx = ${(y / x).toFixed(2)} lost the signs. Atan sees the same slope as the opposite direction and is off by 180°. Atan2 keeps dy and dx separate and gets ${this.a360().toFixed(1)}°.`;
    if (x === 0) return 'Vertical: dy / 0 is ±∞ for doubles, and Atan(±∞) happens to be ±90°. With int coordinates the division would throw instead. Atan2 needs no special case.';
    return `dx is positive, so here both agree. Atan only covers −90° to 90°; Atan2 covers the full circle.`;
  });

  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }

  arc = computed(() => {
    const rr = 1.4 * S, a = this.a360();
    if (a === 0) return '';
    const end = { x: C + rr * Math.cos((a * Math.PI) / 180), y: C - rr * Math.sin((a * Math.PI) / 180) };
    return `M${C},${C} L${C + rr},${C} A${rr},${rr} 0 ${a > 180 ? 1 : 0} 0 ${end.x.toFixed(1)},${end.y.toFixed(1)} Z`;
  });

  start(e: PointerEvent) {
    this.dragging.set(true);
    (e.currentTarget as Element).closest('svg')?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  move(e: PointerEvent, el: Element) {
    const svg = el as SVGSVGElement;
    if (!this.dragging()) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    this.place((q.x - C) / S, (C - q.y) / S);
  }

  key(e: KeyboardEvent) {
    const d: Record<string, [number, number]> = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, 0.5], ArrowDown: [0, -0.5] };
    const k = d[e.key];
    if (!k) return;
    e.preventDefault();
    this.place(this.p().x + k[0], this.p().y + k[1]);
  }

  /** Snap to half units and stay inside the dial. */
  private place(x: number, y: number) {
    const l = Math.hypot(x, y);
    if (l > R) { x = (x / l) * R; y = (y / l) * R; }
    let sx = Math.round(x * 2) / 2 || 0, sy = Math.round(y * 2) / 2 || 0;
    if (Math.hypot(sx, sy) > R + 0.01) { sx = Math.trunc(x * 2) / 2 || 0; sy = Math.trunc(y * 2) / 2 || 0; }
    this.p.set({ x: sx, y: sy });
  }
}
