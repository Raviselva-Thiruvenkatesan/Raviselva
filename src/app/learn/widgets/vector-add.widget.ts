import { Component, computed, signal } from '@angular/core';
import { P, arrowHead, keyDelta, short, shaftEnd, snap, svgPoint } from './vec-plane';

type Mode = 'add' | 'sub' | 'scale';
type Handle = 'a' | 'b';

const S = 25;                 // pixels per unit
const C = 150;                // pixel centre (the origin)
const R = 5.5;                // handles stay within ±R

interface Arrow { x1: number; y1: number; tx: number; ty: number; head: string; cls: string; label: string; lx: number; ly: number }

/** Add, subtract and scale two 2D vectors, with the head-to-tail picture. */
@Component({
  selector: 'w-vector-add',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Adding, subtracting and scaling</h3></div>
      <div class="w-controls" role="group" aria-label="Operation">
        <button type="button" class="w-btn" [class.on]="mode() === 'add'" (click)="mode.set('add')" [attr.aria-pressed]="mode() === 'add'">a + b</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'sub'" (click)="mode.set('sub')" [attr.aria-pressed]="mode() === 'sub'">a − b</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'scale'" (click)="mode.set('scale')" [attr.aria-pressed]="mode() === 'scale'">k × a</button>
      </div>
      <p class="w-hint">
        @if (mode() === 'scale') { Drag the tip of <b class="ca">a</b> and move the k slider } @else { Drag the tips of <b class="ca">a</b> and <b class="cb">b</b> }
        (or focus a tip and use the arrow keys).
      </p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'Result ' + fmt(result())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @if (mode() === 'add') { <polygon [attr.points]="para()" class="para" /> }
          @for (ar of arrows(); track $index) {
            <line [attr.x1]="ar.x1" [attr.y1]="ar.y1" [attr.x2]="ar.tx" [attr.y2]="ar.ty" [attr.class]="'shaft ' + ar.cls" />
            <polygon [attr.points]="ar.head" [attr.class]="'head ' + ar.cls" />
            @if (ar.label) { <text [attr.x]="ar.lx" [attr.y]="ar.ly" [attr.class]="'vl ' + ar.cls" text-anchor="middle">{{ ar.label }}</text> }
          }
          @for (k of handles(); track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Tip of vector ' + k" [attr.aria-valuetext]="fmt(vec(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(vec(k).x)" [attr.cy]="py(vec(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(vec(k).x)" [attr.cy]="py(vec(k).y)" r="6" [attr.class]="'dot ' + k" />
            </g>
          }
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th class="ca">a</th><td>{{ fmt(a()) }}</td></tr>
            @if (mode() !== 'scale') { <tr><th class="cb">b</th><td>{{ fmt(b()) }}</td></tr> }
            @if (mode() === 'scale') { <tr><th>k</th><td>{{ short(k()) }}</td></tr> }
            <tr><th class="cr">{{ resultName() }}</th><td>{{ working() }}</td></tr>
            <tr><th></th><td class="ok">= {{ fmt(result()) }}</td></tr>
            <tr><th>length</th><td>{{ short(lenOf(result()), 2) }}</td></tr>
          </tbody></table>
          @if (mode() === 'scale') {
            <label class="w-field d-flex mt-2">k = {{ short(k()) }}
              <input type="range" min="-2" max="2" step="0.25" [value]="k()" (input)="k.set(+$any($event.target).value)" />
            </label>
          }
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plane { width: 100%; max-width: 340px; display: block; margin: 0 auto; touch-action: none; user-select: none; }
    .grid { stroke: var(--border-color); stroke-width: 1; opacity: 0.55; }
    .grid.axis { stroke: var(--text-muted); opacity: 0.8; }
    .para { fill: rgba(16, 185, 129, 0.1); stroke: none; }
    .shaft { stroke-width: 3; stroke-linecap: round; }
    .shaft.ghost { stroke-width: 2; stroke-dasharray: 5 4; opacity: 0.55; }
    .head.ghost, .vl.ghost { opacity: 0.55; }
    .shaft.a { stroke: #3b82f6; } .head.a, .vl.a { fill: #3b82f6; }
    .shaft.b { stroke: #8b5cf6; } .head.b, .vl.b { fill: #8b5cf6; }
    .shaft.r { stroke: #10b981; stroke-width: 3.5; } .head.r, .vl.r { fill: #059669; }
    .shaft.s { stroke: #f59e0b; stroke-width: 3.5; } .head.s, .vl.s { fill: #d97706; }
    .vl { font-size: 11px; font-weight: 800; paint-order: stroke; stroke: var(--bg-secondary); stroke-width: 3px; }
    .handle { cursor: grab; outline: none; }
    .handle .hit { fill: transparent; }
    .handle .dot { fill: var(--bg-main); stroke-width: 3; }
    .handle .dot.a { stroke: #3b82f6; }
    .handle .dot.b { stroke: #8b5cf6; }
    .handle:focus-visible .dot, .handle.active .dot { fill: rgba(139, 92, 246, 0.3); }
    .ca { color: #3b82f6; } .cb { color: #8b5cf6; } .cr { color: #059669; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
    .w-field input { width: 100%; }
  `]
})
export class VectorAddWidget {
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly short = short;

  mode = signal<Mode>('add');
  a = signal<P>({ x: 3, y: 1 });
  b = signal<P>({ x: 1, y: 3 });
  k = signal(1.5);
  drag = signal<Handle | null>(null);

  handles = computed<Handle[]>(() => (this.mode() === 'scale' ? ['a'] : ['a', 'b']));

  result = computed<P>(() => {
    const a = this.a(), b = this.b();
    switch (this.mode()) {
      case 'add': return { x: a.x + b.x, y: a.y + b.y };
      case 'sub': return { x: a.x - b.x, y: a.y - b.y };
      default: return { x: a.x * this.k(), y: a.y * this.k() };
    }
  });
  resultName = computed(() => ({ add: 'a + b', sub: 'a − b', scale: 'k × a' })[this.mode()]);
  working = computed(() => {
    const a = this.a(), b = this.b(), k = short(this.k());
    switch (this.mode()) {
      case 'add': return `⟨${short(a.x)} + ${this.paren(b.x)}, ${short(a.y)} + ${this.paren(b.y)}⟩`;
      case 'sub': return `⟨${short(a.x)} − ${this.paren(b.x)}, ${short(a.y)} − ${this.paren(b.y)}⟩`;
      default: return `⟨${k} × ${this.paren(a.x)}, ${k} × ${this.paren(a.y)}⟩`;
    }
  });

  para = computed(() => {
    const a = this.a(), b = this.b();
    return [[0, 0], [a.x, a.y], [a.x + b.x, a.y + b.y], [b.x, b.y]].map(([x, y]) => `${this.px(x)},${this.py(y)}`).join(' ');
  });

  arrows = computed<Arrow[]>(() => {
    const a = this.a(), b = this.b(), r = this.result(), o = { x: 0, y: 0 };
    switch (this.mode()) {
      case 'add': return [
        this.arrow(a, { x: a.x + b.x, y: a.y + b.y }, 'b ghost', ''),
        this.arrow(b, { x: a.x + b.x, y: a.y + b.y }, 'a ghost', ''),
        this.arrow(o, r, 'r', 'a + b'),
        this.arrow(o, a, 'a', 'a'),
        this.arrow(o, b, 'b', 'b')
      ];
      case 'sub': return [
        this.arrow(o, r, 'r ghost', ''),
        this.arrow(b, a, 's', 'a − b'),
        this.arrow(o, a, 'a', 'a'),
        this.arrow(o, b, 'b', 'b')
      ];
      default: return [this.arrow(o, r, 'r', 'k × a'), this.arrow(o, a, 'a', 'a', -1)];
    }
  });

  message = computed(() => {
    const r = this.fmt(this.result());
    switch (this.mode()) {
      case 'add': return `Head to tail: walk along a, then along b, and you end at ${r}. The other way round (b, then a) ends at the same place, so a + b = b + a. Components simply add.`;
      case 'sub': return `a − b = ${r} is the arrow from the tip of b to the tip of a. That is how “point minus point” works: B − A is the step that takes you from A to B.`;
      default: {
        const k = this.k();
        if (k === 0) return 'k = 0 squashes any vector to the zero vector ⟨0, 0⟩, which has no direction.';
        if (k < 0) return `A negative k flips the direction and scales the length by ${short(Math.abs(k))}. k = −1 gives the opposite vector, −a.`;
        return `k = ${short(k)} keeps the direction and multiplies the length by ${short(k)}: |k × a| = ${short(k)} × |a|.`;
      }
    }
  });

  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  vec(k: Handle) { return k === 'a' ? this.a() : this.b(); }
  lenOf(p: P) { return Math.hypot(p.x, p.y); }
  fmt(p: P) { return `⟨${short(p.x)}, ${short(p.y)}⟩`; }
  private paren(v: number) { return v < 0 ? `(${short(v)})` : short(v); }

  private arrow(from: P, to: P, cls: string, label: string, side = 1): Arrow {
    const x1 = this.px(from.x), y1 = this.py(from.y), x2 = this.px(to.x), y2 = this.py(to.y);
    const t = shaftEnd(x1, y1, x2, y2, 10);
    const l = Math.hypot(x2 - x1, y2 - y1) || 1;
    // Label beside the middle of the arrow: on its left-hand side, or its right for side = -1.
    const lx = (x1 + x2) / 2 + ((y2 - y1) / l) * 11 * side, ly = (y1 + y2) / 2 - ((x2 - x1) / l) * 11 * side + 4;
    return { x1, y1, tx: t.x, ty: t.y, head: arrowHead(x1, y1, x2, y2, 10), cls, label, lx, ly };
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
    if (p) this.place(k, { x: (p.x - C) / S, y: (C - p.y) / S });
  }

  key(e: KeyboardEvent, k: Handle) {
    const d = keyDelta(e, 0.5);
    if (!d) return;
    e.preventDefault();
    this.place(k, { x: this.vec(k).x + d.x, y: this.vec(k).y + d.y });
  }

  private place(k: Handle, p: P) {
    (k === 'a' ? this.a : this.b).set({ x: snap(p.x, 0.5, -R, R), y: snap(p.y, 0.5, -R, R) });
  }
}
