import { Component, computed, signal } from '@angular/core';
import { P, arrowHead, keyDelta, num, shaftEnd, snap, svgPoint } from './vec-plane';

type Handle = 'a' | 'b';

const S = 25;                       // pixels per metre
const OX = 30, OY = 220;            // pixel position of the origin
const W = 11, H = 8;                // grid size in metres

/** Place a door a given distance along a wall: with a unit vector, and without one. */
@Component({
  selector: 'w-unit-vector',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Unit vectors: a door 1.2 m along a wall</h3></div>
      <p class="w-hint">Drag the wall ends A and B, and set the distance from A. Then switch normalising off to see the classic bug.</p>
      <div class="w-controls" role="group" aria-label="Formula">
        <button type="button" class="w-btn" [class.on]="norm()" (click)="norm.set(true)" [attr.aria-pressed]="norm()">A + u × d (normalised)</button>
        <button type="button" class="w-btn" [class.on]="!norm()" (click)="norm.set(false)" [attr.aria-pressed]="!norm()">A + (B − A) × d (not normalised)</button>
      </div>
      <div class="w-grid two">
        <div>
          <svg #svg viewBox="0 0 320 250" class="plane" role="img" [attr.aria-label]="'Door at ' + fmt(shown())"
               (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
            @for (g of gx; track g) { <line [attr.x1]="px(g)" [attr.y1]="py(0)" [attr.x2]="px(g)" [attr.y2]="py(h)" class="grid" /> }
            @for (g of gy; track g) { <line [attr.x1]="px(0)" [attr.y1]="py(g)" [attr.x2]="px(w)" [attr.y2]="py(g)" class="grid" /> }
            <line [attr.x1]="px(a().x)" [attr.y1]="py(a().y)" [attr.x2]="px(b().x)" [attr.y2]="py(b().y)" class="wall" />
            <!-- a tick every metre along the wall -->
            @for (t of ticks(); track $index) {
              <line [attr.x1]="px(t.x) - n().x * 7" [attr.y1]="py(t.y) + n().y * 7" [attr.x2]="px(t.x) + n().x * 7" [attr.y2]="py(t.y) - n().y * 7" class="tick" />
            }
            <line [attr.x1]="px(a().x)" [attr.y1]="py(a().y)" [attr.x2]="uTip().x" [attr.y2]="uTip().y" class="u" />
            <polygon [attr.points]="uHead()" class="uh" />
            <text [attr.x]="px(a().x + u().x * 0.5) + n().x * 13" [attr.y]="py(a().y + u().y * 0.5) - n().y * 13 + 4" class="ul" text-anchor="middle">u</text>
            @if (inView(door())) {
              <rect [attr.x]="px(door().x) - 6" [attr.y]="py(door().y) - 6" width="12" height="12" rx="2" class="door ok" [class.dim]="!norm()" />
            }
            @if (!norm() && inView(wrong())) {
              <rect [attr.x]="px(wrong().x) - 6" [attr.y]="py(wrong().y) - 6" width="12" height="12" rx="2" class="door bad" />
            }
            @for (k of handles; track k) {
              <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Wall end ' + k.toUpperCase()" [attr.aria-valuetext]="fmt(pt(k))"
                 (pointerdown)="start($event, k)" (keydown)="key($event, k)">
                <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="12" class="hit" />
                <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6" class="dot" />
                <text [attr.x]="px(pt(k).x) - u().x * (k === 'a' ? 15 : -15)" [attr.y]="py(pt(k).y) + u().y * (k === 'a' ? 15 : -15) + 4" text-anchor="middle" class="hl">{{ k.toUpperCase() }}</text>
              </g>
            }
          </svg>
          <label class="w-field d-flex mt-2">Distance from A: d = {{ d().toFixed(1) }} m
            <input type="range" min="0" max="12" step="0.1" [value]="d()" (input)="d.set(+$any($event.target).value)" />
          </label>
        </div>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th>B − A</th><td>{{ fmtV(diff()) }}</td></tr>
            <tr><th>|B − A|</th><td>{{ num(len(), 3) }} m</td></tr>
            <tr><th>u = (B − A) ÷ |B − A|</th><td>{{ fmtV(u(), 3) }}</td></tr>
            <tr><th>|u|</th><td>{{ num(1, 3) }}</td></tr>
            <tr><th>A + u × d</th><td [class.ok]="norm()">{{ fmt(door()) }}</td></tr>
            <tr><th>A + (B − A) × d</th><td [class.hl]="!norm()">{{ fmt(wrong()) }}</td></tr>
          </tbody></table>
          <p class="small mt-2 mb-0 legend"><span class="sw ok"></span> door with u &nbsp; <span class="sw bad"></span> door without normalising &nbsp; ticks every 1 m</p>
        </div>
      </div>
      <div class="w-msg" [class.ok]="norm()" [class.err]="!norm()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plane { width: 100%; max-width: 440px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.6; }
    .wall { stroke: var(--text-muted); stroke-width: 7; stroke-linecap: butt; opacity: 0.45; }
    .tick { stroke: var(--text-main); stroke-width: 1.2; opacity: 0.6; }
    .u { stroke: #0891b2; stroke-width: 3; stroke-linecap: round; }
    .uh, .ul { fill: #0891b2; }
    .ul { font-size: 12px; font-weight: 800; font-style: italic; }
    .door { stroke-width: 2; }
    .door.ok { fill: rgba(16, 185, 129, 0.45); stroke: #059669; }
    .door.ok.dim { opacity: 0.45; }
    .door.bad { fill: rgba(239, 68, 68, 0.4); stroke: #dc2626; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke: #8b5cf6; stroke-width: 3; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(139, 92, 246, 0.3); }
    .hl { font-size: 11px; font-weight: 800; fill: #7c3aed; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
    .w-field input { width: 100%; }
    .legend { color: var(--text-muted); }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: middle; }
    .sw.ok { background: rgba(16, 185, 129, 0.6); }
    .sw.bad { background: rgba(239, 68, 68, 0.6); }
  `]
})
export class UnitVectorWidget {
  readonly handles: Handle[] = ['a', 'b'];
  readonly w = W;
  readonly h = H;
  readonly gx = Array.from({ length: W + 1 }, (_, i) => i);
  readonly gy = Array.from({ length: H + 1 }, (_, i) => i);
  readonly num = num;

  a = signal<P>({ x: 1, y: 1 });
  b = signal<P>({ x: 7, y: 6 });
  d = signal(1.2);
  norm = signal(true);
  drag = signal<Handle | null>(null);

  diff = computed<P>(() => ({ x: this.b().x - this.a().x, y: this.b().y - this.a().y }));
  len = computed(() => Math.hypot(this.diff().x, this.diff().y));
  u = computed<P>(() => ({ x: this.diff().x / this.len(), y: this.diff().y / this.len() }));
  n = computed<P>(() => ({ x: -this.u().y, y: this.u().x }));
  door = computed<P>(() => ({ x: this.a().x + this.u().x * this.d(), y: this.a().y + this.u().y * this.d() }));
  wrong = computed<P>(() => ({ x: this.a().x + this.diff().x * this.d(), y: this.a().y + this.diff().y * this.d() }));
  shown = computed(() => (this.norm() ? this.door() : this.wrong()));
  ticks = computed<P[]>(() => {
    const out: P[] = [];
    for (let i = 1; i < this.len(); i++) out.push({ x: this.a().x + this.u().x * i, y: this.a().y + this.u().y * i });
    return out;
  });
  uTip = computed(() => shaftEnd(this.px(this.a().x), this.py(this.a().y), this.px(this.a().x + this.u().x), this.py(this.a().y + this.u().y), 9));
  uHead = computed(() => arrowHead(this.px(this.a().x), this.py(this.a().y), this.px(this.a().x + this.u().x), this.py(this.a().y + this.u().y), 9));

  message = computed(() => {
    const d = this.d(), len = this.len();
    const past = d > len + 1e-9 ? ` That is past B (the wall is only ${num(len)} m long), so a real tool would refuse it.` : '';
    if (this.norm()) return `u has length 1, so stepping d = ${d.toFixed(1)} along u moves exactly ${d.toFixed(1)} m: the door lands at ${this.fmt(this.door())}.${past}`;
    const off = this.inView(this.wrong()) ? '' : ' (off the plan)';
    return `Without normalising, B − A is ${num(len)} m long, so “× d” moves ${num(len * d)} m instead of ${d.toFixed(1)} m and the door lands at ${this.fmt(this.wrong())}${off}. Only a unit vector turns “d metres” into the right step.`;
  });

  px(x: number) { return OX + x * S; }
  py(y: number) { return OY - y * S; }
  pt(k: Handle) { return k === 'a' ? this.a() : this.b(); }
  inView(p: P) { return p.x >= -1 && p.x <= W + 0.5 && p.y >= -1 && p.y <= H + 0.5; }
  fmt(p: P) { return `(${num(p.x)}, ${num(p.y)})`; }
  fmtV(p: P, d = 1) { return `⟨${num(p.x, d)}, ${num(p.y, d)}⟩`; }

  start(e: PointerEvent, k: Handle) {
    this.drag.set(k);
    (e.currentTarget as Element).closest('svg')?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  move(e: PointerEvent, el: Element) {
    const k = this.drag();
    if (!k) return;
    const p = svgPoint(e, el);
    if (p) this.place(k, { x: (p.x - OX) / S, y: (OY - p.y) / S });
  }

  key(e: KeyboardEvent, k: Handle) {
    const dd = keyDelta(e, 0.5);
    if (!dd) return;
    e.preventDefault();
    this.place(k, { x: this.pt(k).x + dd.x, y: this.pt(k).y + dd.y });
  }

  /** Snap to 0.5 m and keep the wall at least 1 m long. */
  private place(k: Handle, p: P) {
    const q = { x: snap(p.x, 0.5, 0, W), y: snap(p.y, 0.5, 0, H) };
    const other = k === 'a' ? this.b() : this.a();
    if (Math.hypot(q.x - other.x, q.y - other.y) < 1) return;
    (k === 'a' ? this.a : this.b).set(q);
  }
}
