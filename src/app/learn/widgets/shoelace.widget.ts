import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, cross, len, minus, num, short } from './vec-plane';

type K = 'V0' | 'V1' | 'V2' | 'V3' | 'V4';

/** True if segments ab and cd properly cross. */
function crosses(a: P, b: P, c: P, d: P) {
  const d1 = cross(minus(b, a), minus(c, a)), d2 = cross(minus(b, a), minus(d, a));
  const d3 = cross(minus(d, c), minus(a, c)), d4 = cross(minus(d, c), minus(b, c));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Signed area by the shoelace formula, shown as triangles from the origin. */
@Component({
  selector: 'w-shoelace',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Shoelace area and winding</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn" (click)="reverse()">Reverse the order</button>
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="tris()" (change)="tris.set(!tris())" /> Show triangles from the origin</label>
      </div>
      <p class="w-hint">Drag the vertices. Blue triangles add area, red ones subtract it; what is left is the polygon.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'Signed area ' + num(signed())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <polygon [attr.points]="line(verts())" class="poly" [class.cw]="signed() < 0" [class.bad]="selfCross()" />
          @if (tris()) {
            @for (t of terms(); track $index) {
              <polygon [attr.points]="pp({ x: 0, y: 0 }) + ' ' + pp(t.a) + ' ' + pp(t.b)" class="tri" [class.neg]="t.v < 0" />
            }
          }
          @for (e of arrows(); track $index) { <polygon [attr.points]="e" class="dir" /> }
          @if (!selfCross()) {
            <circle [attr.cx]="px(centroid().x)" [attr.cy]="py(centroid().y)" r="4" class="cen" />
            <text [attr.x]="px(centroid().x) + 7" [attr.y]="py(centroid().y) + 4" class="lbl">centroid</text>
          }
          @for (k of order(); track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Vertex ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="5.5" class="dot" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 11" text-anchor="middle" class="hl-t">{{ label(k) }}</text>
            </g>
          }
        </svg>
        <div class="tscroll">
          <table class="wtable mono"><tbody>
            @for (t of terms(); track $index) {
              <tr><th>P{{ $index }} × P{{ ($index + 1) % terms().length }}</th><td [class.neg-t]="t.v < 0">{{ short(t.v, 2) }}</td></tr>
            }
            <tr><th>sum ÷ 2 = signed area</th><td [class.ok]="signed() > 0" [class.hl]="signed() <= 0">{{ num(signed()) }}</td></tr>
            <tr><th>winding</th><td>{{ signed() > 0 ? 'counterclockwise' : signed() < 0 ? 'clockwise' : 'degenerate' }}</td></tr>
            <tr><th>area</th><td>{{ num(Math.abs(signed())) }}</td></tr>
            <tr><th>perimeter</th><td>{{ num(perimeter()) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.ok]="!selfCross() && signed() > 0" [class.info]="!selfCross() && signed() <= 0" [class.err]="selfCross()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .poly { fill: rgba(16, 185, 129, 0.22); stroke: #10b981; stroke-width: 2.5; stroke-linejoin: round; }
    .poly.cw { fill: rgba(245, 158, 11, 0.22); stroke: #f59e0b; }
    .poly.bad { fill: rgba(239, 68, 68, 0.18); stroke: #ef4444; }
    .tri { fill: rgba(59, 130, 246, 0.14); stroke: #3b82f6; stroke-width: 0.8; stroke-dasharray: 3 2; }
    .tri.neg { fill: rgba(239, 68, 68, 0.14); stroke: #ef4444; }
    .dir { fill: var(--text-muted); }
    .cen { fill: #8b5cf6; }
    .neg-t { color: #dc2626; }
  `]
})
export class ShoelaceWidget extends DragPlane<K> {
  readonly num = num;
  readonly Math = Math;

  protected readonly pts = {
    V0: signal<P>({ x: 1, y: -4 }), V1: signal<P>({ x: 5, y: -3 }), V2: signal<P>({ x: 5.5, y: 2 }), V3: signal<P>({ x: 2, y: 5 }), V4: signal<P>({ x: 0.5, y: 1 })
  };
  /** The vertex order; reversing it flips the winding without moving anything. */
  order = signal<K[]>(['V0', 'V1', 'V2', 'V3', 'V4']);
  tris = signal(true);

  verts = computed(() => this.order().map(k => this.pt(k)));
  terms = computed(() => this.verts().map((a, i, v) => { const b = v[(i + 1) % v.length]; return { a, b, v: cross(a, b) }; }));
  signed = computed(() => this.terms().reduce((s, t) => s + t.v, 0) / 2);
  perimeter = computed(() => this.terms().reduce((s, t) => s + len(minus(t.b, t.a)), 0));
  centroid = computed(() => {
    const A = this.signed() || 1;
    const c = this.terms().reduce((s, t) => ({ x: s.x + (t.a.x + t.b.x) * t.v, y: s.y + (t.a.y + t.b.y) * t.v }), { x: 0, y: 0 });
    return { x: c.x / (6 * A), y: c.y / (6 * A) };
  });
  selfCross = computed(() => {
    const v = this.verts(), n = v.length;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;           // neighbours through the wrap-around
      if (crosses(v[i], v[(i + 1) % n], v[j], v[(j + 1) % n])) return true;
    }
    return false;
  });
  /** Small arrow heads at the middle of each edge, showing the order. */
  arrows = computed(() => this.terms().map(t => {
    const mx = this.px((t.a.x + t.b.x) / 2), my = this.py((t.a.y + t.b.y) / 2);
    const dx = this.px(t.b.x) - this.px(t.a.x), dy = this.py(t.b.y) - this.py(t.a.y), l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l, s = 6;
    return `${mx + ux * s},${my + uy * s} ${mx - ux * s - uy * s * 0.8},${my - uy * s + ux * s * 0.8} ${mx - ux * s + uy * s * 0.8},${my - uy * s - ux * s * 0.8}`;
  }));

  message = computed(() => {
    if (this.selfCross()) return 'Two edges cross: the polygon is self-intersecting. The shoelace sum now subtracts one loop from the other, so its “area” means nothing. Validate boundaries before measuring them.';
    const a = this.signed();
    if (a > 0) return `The vertices run counterclockwise, so the signed area is positive: ${num(a)}. Each term x_i·y_i+1 − x_i+1·y_i is twice the signed area of a triangle from the origin; the parts outside the polygon cancel out.`;
    return `The vertices run clockwise, so the signed area is negative: ${num(a)}. The size is the same; only the sign says which way round the boundary goes. Many formats use clockwise for holes.`;
  });

  label(k: K) { return `P${this.order().indexOf(k)}`; }
  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
  reverse() { this.order.update(o => [...o].reverse()); }
}
