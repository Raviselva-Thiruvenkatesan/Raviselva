import { Component, computed, signal } from '@angular/core';
import { Iso, V3, add3, dot3, mul3, sub3, v3 } from './iso';
import { L_ROOM, Mesh, depthSe, houseMesh, prism, pyramidMesh, section, triCentre } from './solid';
import { num } from './vec-plane';

type Shape = 'room' | 'pyramid' | 'house';

const SHAPES: { k: Shape; label: string; mesh: Mesh; top: number; c: V3 }[] = [
  { k: 'room', label: 'L-shaped room', mesh: prism(L_ROOM, 3), top: 3, c: v3(2, 2, 0) },
  { k: 'pyramid', label: 'Pyramid', mesh: pyramidMesh(4, 3), top: 3, c: v3(2, 2, 0) },
  { k: 'house', label: 'Gable house', mesh: houseMesh(4, 3, 2, 3.2), top: 3.2, c: v3(2, 1.5, 0) }
];
const P2 = 26, PX = 75, PY = 75;

/** Cutting a mesh with a plane: every triangle that crosses it gives one segment, and the segments join into loops. */
@Component({
  selector: 'w-section',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Cutting a section through a mesh</h3></div>
      <div class="w-controls" role="group" aria-label="Solid">
        @for (s of shapes; track s.k) {
          <button type="button" class="w-btn" [class.on]="shape() === s.k" [attr.aria-pressed]="shape() === s.k" (click)="pick(s.k)">{{ s.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 260" class="view" role="img" [attr.aria-label]="message()">
          @for (f of faces(); track $index) {
            @if (!f.above) { <polygon [attr.points]="cam.pts(f.p)" class="face" /> }
          }
          <polygon [attr.points]="cam.pts(patch())" class="cut" />
          @for (f of faces(); track $index) {
            @if (f.above) { <polygon [attr.points]="cam.pts(f.p)" class="face up" /> }
          }
          @for (s of cut().segs; track $index) {
            <line [attr.x1]="cam.p(s[0]).x" [attr.y1]="cam.p(s[0]).y" [attr.x2]="cam.p(s[1]).x" [attr.y2]="cam.p(s[1]).y" class="seg" />
          }
        </svg>
        <div>
          <label class="w-field mb-1">cut height = {{ h() }} m
            <input type="range" min="0.2" [attr.max]="base().top - 0.2" step="0.1" [value]="h()" (input)="h.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">tilt about Y = {{ tilt() }}°
            <input type="range" min="0" max="40" step="5" [value]="tilt()" (input)="tilt.set(+$any($event.target).value)" />
          </label>
          <svg viewBox="0 0 150 150" class="flat" role="img" aria-label="The section drawn flat in the cutting plane">
            <rect x="1" y="1" width="148" height="148" class="frame" />
            @for (l of flat(); track $index) {
              <polygon [attr.points]="l" class="loop" />
            }
          </svg>
          <table class="wtable mono mt-2"><tbody>
            <tr><th>segments</th><td>{{ cut().segs.length }}</td></tr>
            <tr><th>loops</th><td>{{ cut().loops.length }}</td></tr>
            <tr><th>section area</th><td class="ok">{{ num(cut().area, 3) }} m²</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .flat { width: 100%; max-width: 170px; display: block; margin: 0 auto; }
    .frame { fill: none; stroke: var(--border-color); }
    .face { fill: rgba(148, 163, 184, 0.14); stroke: var(--text-muted); stroke-width: 1; stroke-linejoin: round; }
    .face.up { fill: none; stroke-dasharray: 3 3; opacity: 0.6; }
    .cut { fill: rgba(245, 158, 11, 0.16); stroke: #f59e0b; stroke-width: 1; stroke-dasharray: 5 4; }
    .seg { stroke: #ef4444; stroke-width: 3; stroke-linecap: round; }
    .loop { fill: rgba(239, 68, 68, 0.3); stroke: #ef4444; stroke-width: 2; stroke-linejoin: round; }
  `]
})
export class SectionWidget {
  readonly num = num;
  readonly shapes = SHAPES;
  readonly cam = new Iso(24, 120, 150, 'se');

  shape = signal<Shape>('room');
  h = signal(1.2);
  tilt = signal(0);

  base = computed(() => SHAPES.find(s => s.k === this.shape())!);
  /** Plane normal n, and the in-plane axes u, v with u × v = n. */
  frame = computed(() => {
    const t = (this.tilt() * Math.PI) / 180, s = Math.sin(t), c = Math.cos(t);
    return { n: v3(s, 0, c), u: v3(c, 0, -s), v: v3(0, 1, 0) };
  });
  origin = computed(() => v3(this.base().c.x, this.base().c.y, this.h()));
  cut = computed(() => { const f = this.frame(); return section(this.base().mesh, f.n, dot3(f.n, this.origin())); });
  patch = computed(() => {
    const { u, v } = this.frame(), o = this.origin();
    return [[-3, -3], [3, -3], [3, 3], [-3, 3]].map(([a, b]) => add3(o, add3(mul3(u, a), mul3(v, b))));
  });
  faces = computed(() => {
    const m = this.base().mesh, f = this.frame(), d = dot3(f.n, this.origin());
    return m.f
      .map(t => ({ p: t.map(i => m.v[i]), c: triCentre(m, t) }))
      .map(x => ({ p: x.p, above: dot3(f.n, x.c) > d, z: depthSe(x.c) }))
      .sort((a, b) => a.z - b.z);
  });
  /** Each loop drawn in the plane's own (u, v) coordinates. */
  flat = computed(() => {
    const { u, v } = this.frame(), o = this.origin();
    return this.cut().loops.map(l => l.map(p => { const r = sub3(p, o); return `${PX + dot3(r, u) * P2},${PY - dot3(r, v) * P2}`; }).join(' '));
  });

  message = computed(() => {
    const c = this.cut();
    const tilt = this.tilt() ? ` The plane is tilted ${this.tilt()}°, so the loop is drawn flat in the plane’s own axes before its area is measured.` : '';
    return `${c.segs.length} triangles cross the plane, and each gives one segment. Joined end to start they make ${c.loops.length === 1 ? 'one closed loop' : `${c.loops.length} loops`} with an area of ${num(c.area, 2)} m².${tilt}`;
  });

  pick(s: Shape) { this.shape.set(s); this.h.set(1.2); }
}
