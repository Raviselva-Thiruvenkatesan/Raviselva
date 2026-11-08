import { Component, computed, signal } from '@angular/core';
import { P, arrowHead, keyDelta, num, shaftEnd, snap, svgPoint } from './vec-plane';

type Handle = 'a' | 'b';

const S = 25;                       // pixels per metre
const OX = 30, OY = 220;            // pixel position of the origin
const W = 11, H = 8;                // grid size in metres
const START = { a: { x: 2, y: 1.5 }, b: { x: 8, y: 4.5 } };

/** Two points, the vector between them, and what happens to each when everything moves. */
@Component({
  selector: 'w-point-vector',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Points move, vectors do not</h3></div>
      <p class="w-hint">Drag A and B (or focus one and use the arrow keys), then move both together with the buttons. Watch which numbers change.</p>
      <div class="w-grid two">
        <div>
          <svg #svg viewBox="0 0 320 250" class="plane" role="img" [attr.aria-label]="'A ' + fmt(a()) + ', B ' + fmt(b()) + ', vector ' + fmtV(v())"
               (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
            @for (g of gx; track g) { <line [attr.x1]="px(g)" [attr.y1]="py(0)" [attr.x2]="px(g)" [attr.y2]="py(h)" class="grid" /> }
            @for (g of gy; track g) { <line [attr.x1]="px(0)" [attr.y1]="py(g)" [attr.x2]="px(w)" [attr.y2]="py(g)" class="grid" /> }
            <circle [attr.cx]="px(0)" [attr.cy]="py(0)" r="3" class="origin" />
            <text [attr.x]="px(0) + 4" [attr.y]="py(0) + 13" class="lbl">origin</text>
            <!-- the same vector, drawn from the origin -->
            <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="tip0().x" [attr.y2]="tip0().y" class="vec ghost" />
            <polygon [attr.points]="head0()" class="head ghost" />
            <text [attr.x]="px(v().x * 0.5) + 6" [attr.y]="py(v().y * 0.5) + 14" class="vl ghost-t">v</text>
            <!-- position vectors of A and B, faint -->
            <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="px(a().x)" [attr.y2]="py(a().y)" class="pos" />
            <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="px(b().x)" [attr.y2]="py(b().y)" class="pos" />
            <!-- v = B - A, drawn from A -->
            <line [attr.x1]="px(a().x)" [attr.y1]="py(a().y)" [attr.x2]="tip().x" [attr.y2]="tip().y" class="vec" />
            <polygon [attr.points]="head()" class="head" />
            <text [attr.x]="px(mid().x) - n().x * 14" [attr.y]="py(mid().y) + n().y * 14 + 4" class="vl" text-anchor="middle">v</text>
            <circle [attr.cx]="px(mid().x)" [attr.cy]="py(mid().y)" r="3" class="midp" />
            @for (k of handles; track k) {
              <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Point ' + k.toUpperCase()" [attr.aria-valuetext]="fmt(pt(k))"
                 (pointerdown)="start($event, k)" (keydown)="key($event, k)">
                <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="12" class="hit" />
                <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6.5" class="dot" />
                <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 12" text-anchor="middle" class="hl">{{ k.toUpperCase() }}</text>
              </g>
            }
          </svg>
          <div class="w-controls mt-2" role="group" aria-label="Move both points">
            <button type="button" class="w-btn" (click)="shift(1, 0)">Move both 1 m east</button>
            <button type="button" class="w-btn" (click)="shift(0, 1)">Move both 1 m north</button>
            <button type="button" class="w-btn" (click)="reset()">Reset</button>
          </div>
        </div>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th>Point A</th><td [class.hl]="flash()">{{ fmt(a()) }}</td></tr>
            <tr><th>Point B</th><td [class.hl]="flash()">{{ fmt(b()) }}</td></tr>
            <tr><th>v = B − A</th><td [class.ok]="flash()">{{ fmtV(v()) }}</td></tr>
            <tr><th>A + v</th><td>{{ fmt(b()) }} = B</td></tr>
            <tr><th>Midpoint A + v ÷ 2</th><td>{{ fmt(mid()) }}</td></tr>
            <tr><th>Length of v</th><td>{{ num(len()) }} m</td></tr>
          </tbody></table>
          <p class="small mt-2 mb-0 legend"><span class="sw p"></span> v from A to B &nbsp; <span class="sw g"></span> the same v from the origin</p>
        </div>
      </div>
      <div class="w-msg" [class.ok]="flash()" [class.info]="!flash()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plane { width: 100%; max-width: 440px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.6; }
    .origin { fill: var(--text-muted); }
    .lbl { font-size: 9px; fill: var(--text-muted); }
    .pos { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.6; }
    .vec { stroke: #8b5cf6; stroke-width: 3; stroke-linecap: round; }
    .head { fill: #8b5cf6; }
    .vec.ghost { stroke-dasharray: 6 4; opacity: 0.55; }
    .head.ghost { opacity: 0.55; }
    .vl { font-size: 12px; font-weight: 800; fill: #8b5cf6; font-style: italic; }
    .ghost-t { opacity: 0.6; }
    .midp { fill: #f59e0b; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke: #10b981; stroke-width: 3; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(16, 185, 129, 0.35); }
    .hl { font-size: 11px; font-weight: 800; fill: #059669; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
    .legend { color: var(--text-muted); }
    .sw { display: inline-block; width: 18px; height: 3px; vertical-align: middle; background: #8b5cf6; border-radius: 2px; }
    .sw.g { opacity: 0.5; background: repeating-linear-gradient(90deg, #8b5cf6 0 6px, transparent 6px 9px); }
  `]
})
export class PointVectorWidget {
  readonly handles: Handle[] = ['a', 'b'];
  readonly w = W;
  readonly h = H;
  readonly gx = Array.from({ length: W + 1 }, (_, i) => i);
  readonly gy = Array.from({ length: H + 1 }, (_, i) => i);
  readonly num = num;

  a = signal<P>(START.a);
  b = signal<P>(START.b);
  drag = signal<Handle | null>(null);
  /** True right after both points were moved together, to highlight what changed and what did not. */
  flash = signal(false);
  moves = signal(0);

  v = computed<P>(() => ({ x: this.b().x - this.a().x, y: this.b().y - this.a().y }));
  len = computed(() => Math.hypot(this.v().x, this.v().y));
  mid = computed<P>(() => ({ x: this.a().x + this.v().x / 2, y: this.a().y + this.v().y / 2 }));
  /** Unit normal of v, used to put the label beside the arrow. */
  n = computed<P>(() => { const l = this.len() || 1; return { x: -this.v().y / l, y: this.v().x / l }; });
  tip = computed(() => shaftEnd(this.px(this.a().x), this.py(this.a().y), this.px(this.b().x), this.py(this.b().y), 11));
  head = computed(() => arrowHead(this.px(this.a().x), this.py(this.a().y), this.px(this.b().x), this.py(this.b().y), 11));
  tip0 = computed(() => shaftEnd(this.px(0), this.py(0), this.px(this.v().x), this.py(this.v().y), 11));
  head0 = computed(() => arrowHead(this.px(0), this.py(0), this.px(this.v().x), this.py(this.v().y), 11));

  message = computed(() => {
    if (this.flash()) return `Both points moved (${this.moves()} ${this.moves() === 1 ? 'step' : 'steps'}). A and B have new coordinates, but v = B − A is still ${this.fmtV(this.v())}: a vector has a length and a direction, not a position.`;
    return `v = B − A = ${this.fmtV(this.v())}. Point minus point gives a vector; point plus vector gives a point (A + v = B). The faint copy of v starts at the origin, and it is the same vector.`;
  });

  px(x: number) { return OX + x * S; }
  py(y: number) { return OY - y * S; }
  pt(k: Handle) { return k === 'a' ? this.a() : this.b(); }
  fmt(p: P) { return `(${num(p.x, 1)}, ${num(p.y, 1)})`; }
  fmtV(p: P) { return `⟨${num(p.x, 1)}, ${num(p.y, 1)}⟩`; }

  shift(dx: number, dy: number) {
    const a = this.a(), b = this.b();
    const maxX = Math.max(a.x, b.x), maxY = Math.max(a.y, b.y);
    // Wrap back to the left or bottom edge when the pair would leave the grid.
    const ox = maxX + dx > W - 0.5 ? -Math.min(a.x, b.x) + 0.5 : dx;
    const oy = maxY + dy > H - 0.5 ? -Math.min(a.y, b.y) + 0.5 : dy;
    this.a.set({ x: a.x + ox, y: a.y + oy });
    this.b.set({ x: b.x + ox, y: b.y + oy });
    this.moves.update(m => m + 1);
    this.flash.set(true);
  }

  reset() {
    this.a.set(START.a);
    this.b.set(START.b);
    this.moves.set(0);
    this.flash.set(false);
  }

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
    const d = keyDelta(e, 0.5);
    if (!d) return;
    e.preventDefault();
    this.place(k, { x: this.pt(k).x + d.x, y: this.pt(k).y + d.y });
  }

  private place(k: Handle, p: P) {
    const q = { x: snap(p.x, 0.5, 0, W), y: snap(p.y, 0.5, 0, H) };
    const other = k === 'a' ? this.b() : this.a();
    if (q.x === other.x && q.y === other.y) return;
    (k === 'a' ? this.a : this.b).set(q);
    this.flash.set(false);
    this.moves.set(0);
  }
}
