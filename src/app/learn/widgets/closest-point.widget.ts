import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, dot, len, lerp, minus, num, short } from './vec-plane';

type K = 'A' | 'B' | 'P';
type Kind = 'line' | 'segment';

/** Project P onto AB, clamp for a segment, and measure the distance. */
@Component({
  selector: 'w-closest-point',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Closest point on a line or segment</h3></div>
      <div class="w-controls" role="group" aria-label="Shape">
        <button type="button" class="w-btn" [class.on]="kind() === 'segment'" [attr.aria-pressed]="kind() === 'segment'" (click)="kind.set('segment')">Segment (a wall)</button>
        <button type="button" class="w-btn" [class.on]="kind() === 'line'" [attr.aria-pressed]="kind() === 'line'" (click)="kind.set('line')">Infinite line</button>
      </div>
      <p class="w-hint">Drag the cursor point P along and past the ends of the wall AB. A and B can be dragged too.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'Closest point ' + fmt(q()) + ', distance ' + num(dist())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <line [attr.x1]="px(far(-1).x)" [attr.y1]="py(far(-1).y)" [attr.x2]="px(far(1).x)" [attr.y2]="py(far(1).y)"
                [attr.class]="kind() === 'line' ? 'main' : 'ext'" />
          <line [attr.x1]="px(pt('A').x)" [attr.y1]="py(pt('A').y)" [attr.x2]="px(pt('B').x)" [attr.y2]="py(pt('B').y)" class="main" />
          @if (clamped()) {
            <!-- where the infinite line's foot would be -->
            <line [attr.x1]="px(pt('P').x)" [attr.y1]="py(pt('P').y)" [attr.x2]="px(foot().x)" [attr.y2]="py(foot().y)" class="ghost" />
            <circle [attr.cx]="px(foot().x)" [attr.cy]="py(foot().y)" r="4" class="ghost-dot" />
          } @else if (dist() > 0.2) {
            <polyline [attr.points]="corner()" class="square" />
          }
          <line [attr.x1]="px(pt('P').x)" [attr.y1]="py(pt('P').y)" [attr.x2]="px(q().x)" [attr.y2]="py(q().y)" class="gap" />
          <circle [attr.cx]="px(q().x)" [attr.cy]="py(q().y)" r="6" class="res" [class.warn]="clamped()" />
          <text [attr.x]="px(q().x) - side() * nrm().x * 15" [attr.y]="py(q().y) + side() * nrm().y * 15 + 4" text-anchor="middle" class="hl-t">Q</text>
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="k === 'P' ? 'Cursor point P' : 'Wall end ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6" class="dot" [class.alt]="k === 'P'" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 12" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th>d = B − A</th><td>{{ fmtV(d()) }}</td></tr>
            <tr><th>w = P − A</th><td>{{ fmtV(w()) }}</td></tr>
            <tr><th>t = (w·d) ÷ (d·d)</th><td>{{ short(dot(w(), d()), 2) }} ÷ {{ short(dot(d(), d()), 2) }} = {{ short(rawT(), 3) }}</td></tr>
            @if (kind() === 'segment') { <tr><th>clamped to 0…1</th><td [class.hl]="clamped()">{{ short(t(), 3) }}</td></tr> }
            <tr><th>Q = A + t × d</th><td>{{ fmt(q()) }}</td></tr>
            <tr><th>distance |P − Q|</th><td class="ok">{{ num(dist()) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.info]="!clamped()" [class.err]="clamped()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .gap { stroke: #10b981; stroke-width: 2.5; stroke-dasharray: 4 3; }
    .ghost { stroke: #ef4444; stroke-width: 1.5; stroke-dasharray: 2 3; opacity: 0.8; }
    .ghost-dot { fill: none; stroke: #ef4444; stroke-width: 1.5; }
    .square { fill: none; stroke: #10b981; stroke-width: 1.5; }
  `]
})
export class ClosestPointWidget extends DragPlane<K> {
  readonly keys: K[] = ['A', 'B', 'P'];
  readonly num = num;
  readonly dot = dot;

  protected readonly pts = { A: signal<P>({ x: -4, y: -1 }), B: signal<P>({ x: 2, y: 2 }), P: signal<P>({ x: 0, y: 3 }) };
  kind = signal<Kind>('segment');

  d = computed(() => minus(this.pt('B'), this.pt('A')));
  w = computed(() => minus(this.pt('P'), this.pt('A')));
  rawT = computed(() => dot(this.w(), this.d()) / (dot(this.d(), this.d()) || 1));
  t = computed(() => (this.kind() === 'segment' ? Math.min(1, Math.max(0, this.rawT())) : this.rawT()));
  clamped = computed(() => Math.abs(this.t() - this.rawT()) > 1e-9);
  q = computed(() => lerp(this.pt('A'), this.pt('B'), this.t()));
  foot = computed(() => lerp(this.pt('A'), this.pt('B'), this.rawT()));
  dist = computed(() => len(minus(this.pt('P'), this.q())));
  nrm = computed(() => { const l = len(this.d()) || 1; return { x: -this.d().y / l, y: this.d().x / l }; });
  /** +1 if P is on the left of AB: the Q label goes on the other side. */
  side = computed(() => (dot(this.w(), this.nrm()) >= 0 ? 1 : -1));

  /** A small right-angle mark at Q. */
  corner = computed(() => {
    const l = len(this.d()) || 1, u = { x: this.d().x / l, y: this.d().y / l }, n = { x: this.nrm().x * this.side(), y: this.nrm().y * this.side() };
    const q = this.q(), s = 0.35;
    const a = { x: q.x + u.x * s, y: q.y + u.y * s }, b = { x: a.x + n.x * s, y: a.y + n.y * s }, c = { x: q.x + n.x * s, y: q.y + n.y * s };
    return [a, b, c].map(p => this.pp(p)).join(' ');
  });

  message = computed(() => {
    const t = this.rawT();
    if (this.clamped()) {
      const end = t < 0 ? 'A' : 'B';
      return `t = ${short(t, 2)} is ${t < 0 ? 'before A' : 'past B'}, so the foot of the perpendicular (red) is off the wall. Clamping t to ${t < 0 ? 0 : 1} gives the closest point of the segment: the end ${end} itself, ${num(this.dist())} away.`;
    }
    if (this.dist() < 1e-9) return 'P is on the line: the distance is 0, and t tells you where along AB it is.';
    return `PQ meets the ${this.kind() === 'line' ? 'line' : 'wall'} at a right angle. Q is ${short(this.t() * 100, 1)}% of the way from A to B, and P is ${num(this.dist())} away from it.${this.kind() === 'line' && (t < 0 || t > 1) ? ' On a segment, this Q would be off the end.' : ''}`;
  });

  far(s: number) { const l = len(this.d()) || 1; return lerp(this.pt('A'), this.pt('B'), (s * 40) / l); }
  fmtV(v: P) { return `⟨${short(v.x, 2)}, ${short(v.y, 2)}⟩`; }

  protected override place(k: K, p: P) {
    super.place(k, p);
    if (len(this.d()) < 0.25) this.pts[k].set({ x: this.pt(k).x + 0.5, y: this.pt(k).y });
  }
}
