import { Component, computed, signal } from '@angular/core';
import { P, num } from './vec-plane';

type Shape = 'rect' | 'l';
const S = 24, OX = 30, OY = 214;

/** Signed area by the shoelace formula: positive for counter-clockwise loops. */
export function area(ps: P[]) {
  let a = 0;
  for (let i = 0; i < ps.length; i++) { const p = ps[i], q = ps[(i + 1) % ps.length]; a += p.x * q.y - q.x * p.y; }
  return a / 2;
}
export function perimeter(ps: P[]) {
  return ps.reduce((s, p, i) => { const q = ps[(i + 1) % ps.length]; return s + Math.hypot(q.x - p.x, q.y - p.y); }, 0);
}

/** Move every edge of a counter-clockwise loop d to its left (inwards), then meet neighbouring edges again. */
export function offset(ps: P[], d: number): P[] {
  const n = ps.length, lines = ps.map((p, i) => {
    const q = ps[(i + 1) % n], len = Math.hypot(q.x - p.x, q.y - p.y);
    const nx = -(q.y - p.y) / len, ny = (q.x - p.x) / len;
    return { p: { x: p.x + nx * d, y: p.y + ny * d }, v: { x: q.x - p.x, y: q.y - p.y } };
  });
  return lines.map((b, i) => {
    const a = lines[(i + n - 1) % n], den = a.v.x * b.v.y - a.v.y * b.v.x;
    if (Math.abs(den) < 1e-12) return b.p;              // straight on: no corner to meet
    const t = ((b.p.x - a.p.x) * b.v.y - (b.p.y - a.p.y) * b.v.x) / den;
    return { x: a.p.x + a.v.x * t, y: a.p.y + a.v.y * t };
  });
}

/** Wall centrelines in, rooms and quantities out: offsets, mitred corners, shoelace areas and extruded volumes. */
@Component({
  selector: 'w-room-engine',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Walls in, rooms and quantities out</h3></div>
      <div class="w-controls" role="group" aria-label="Outline">
        <button type="button" class="w-btn" [class.on]="shape() === 'rect'" [attr.aria-pressed]="shape() === 'rect'" (click)="shape.set('rect')">Rectangle</button>
        <button type="button" class="w-btn" [class.on]="shape() === 'l'" [attr.aria-pressed]="shape() === 'l'" (click)="shape.set('l')">L-shape</button>
        <button type="button" class="w-btn" [class.on]="showCl()" [attr.aria-pressed]="showCl()" (click)="showCl.set(!showCl())">Centrelines</button>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 230" class="view" role="img" [attr.aria-label]="message()">
          <polygon [attr.points]="pts(gross())" class="wall" />
          @for (r of rooms(); track r.name) {
            <polygon [attr.points]="pts(r.loop)" class="room" [class.b]="$index === 1" />
            <text [attr.x]="sx(r.c.x)" [attr.y]="sy(r.c.y) - 4" class="hl-t mid">{{ r.name }}</text>
            <text [attr.x]="sx(r.c.x)" [attr.y]="sy(r.c.y) + 10" class="lbl mid">{{ num(r.area, 2) }} m²</text>
          }
          @if (showCl()) {
            <polygon [attr.points]="pts(outer())" class="cl" />
            <line [attr.x1]="sx(split())" [attr.y1]="sy(0)" [attr.x2]="sx(split())" [attr.y2]="sy(7)" class="cl" />
          }
        </svg>
        <div>
          <label class="w-field mb-1">wall thickness = {{ t() }} m
            <input type="range" min="0.1" max="0.5" step="0.05" [value]="t()" (input)="t.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-1">internal wall at x = {{ split() }} m
            <input type="range" min="2" max="5" step="0.25" [value]="split()" (input)="split.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">storey height = {{ h() }} m
            <input type="range" min="2.4" max="4" step="0.1" [value]="h()" (input)="h.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            <tr><th></th><th>area m²</th><th>volume m³</th></tr>
            @for (r of rooms(); track r.name) {
              <tr><th>{{ r.name }}</th><td>{{ num(r.area, 3) }}</td><td>{{ num(r.area * h(), 3) }}</td></tr>
            }
            <tr><th>walls</th><td>{{ num(wallArea(), 3) }}</td><td>{{ num(wallArea() * h(), 3) }}</td></tr>
            <tr><th>gross</th><td class="ok">{{ num(area(gross()), 3) }}</td><td class="ok">{{ num(area(gross()) * h(), 3) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg ok" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .wall { fill: #64748b; stroke: var(--text-main); stroke-width: 1.2; stroke-linejoin: miter; }
    .room { fill: rgba(59, 130, 246, 0.22); stroke: #3b82f6; stroke-width: 1.2; }
    .room.b { fill: rgba(16, 185, 129, 0.22); stroke: #10b981; }
    .cl { fill: none; stroke: #f59e0b; stroke-width: 1.2; stroke-dasharray: 6 3 1 3; }
    .mid { text-anchor: middle; }
  `]
})
export class RoomEngineWidget {
  readonly num = num;
  readonly area = area;

  shape = signal<Shape>('l');
  showCl = signal(true);
  t = signal(0.3);
  split = signal(4);
  h = signal(3);

  /** The outer wall centreline, counter-clockwise. */
  outer = computed<P[]>(() => this.shape() === 'rect'
    ? [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 7 }, { x: 0, y: 7 }]
    : [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 7 }, { x: 0, y: 7 }]);
  /** The outside face of the outer walls: the centreline pushed out by half a thickness. */
  gross = computed(() => offset(this.outer(), -this.t() / 2));
  /** Each room is bounded by wall centrelines; its finished outline is that loop pushed in by half a thickness. */
  rooms = computed(() => {
    const s = this.split(), o = this.outer();
    const a: P[] = [{ x: 0, y: 0 }, { x: s, y: 0 }, { x: s, y: 7 }, { x: 0, y: 7 }];
    const b: P[] = [{ x: s, y: 0 }, ...o.slice(1, -1).filter(p => p.x > s), { x: s, y: 7 }];
    return [{ name: 'Room 1', cl: a }, { name: 'Room 2', cl: b }].map(r => {
      const loop = offset(r.cl, this.t() / 2), ar = area(loop);
      return { name: r.name, loop, area: ar, c: this.centroid(loop) };
    });
  });
  wallArea = computed(() => area(this.gross()) - this.rooms().reduce((s, r) => s + r.area, 0));

  message = computed(() => {
    const t = this.t(), L = perimeter(this.outer()), inner = 7 - t;
    const check = L * t + inner * t;
    return `Wall footprint ${num(this.wallArea(), 3)} m² = gross ${num(area(this.gross()), 3)} m² minus both rooms. Check from the centrelines: ${num(L, 1)} m of outer wall × ${t} m plus the internal wall’s ${num(inner, 2)} m between faces × ${t} m = ${num(check, 3)} m². The mitred corners make the two ways agree exactly.`;
  });

  centroid(ps: P[]): P {
    const a = area(ps);
    let cx = 0, cy = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i], q = ps[(i + 1) % ps.length], k = p.x * q.y - q.x * p.y;
      cx += (p.x + q.x) * k; cy += (p.y + q.y) * k;
    }
    return { x: cx / (6 * a), y: cy / (6 * a) };
  }
  sx(x: number) { return OX + x * S; }
  sy(y: number) { return OY - y * S; }
  pts(ps: P[]) { return ps.map(p => `${this.sx(p.x)},${this.sy(p.y)}`).join(' '); }
}
