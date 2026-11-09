import { Component, computed, signal } from '@angular/core';
import { Iso, f3, v3 } from './iso';
import { L_ROOM, Mesh, boxMesh, depthSe, houseMesh, meshArea, prism, pyramidMesh, tetVolume, triCentre } from './solid';
import { num } from './vec-plane';

type Shape = 'box' | 'room' | 'pyramid' | 'house';

const SHAPES: { k: Shape; label: string; mesh: Mesh; exact: string }[] = [
  { k: 'box', label: 'Box 4 × 3 × 2.5', mesh: boxMesh(4, 3, 2.5), exact: '4 × 3 × 2.5 = 30' },
  { k: 'room', label: 'L-shaped room', mesh: prism(L_ROOM, 3), exact: 'floor 12 × height 3 = 36' },
  { k: 'pyramid', label: 'Pyramid', mesh: pyramidMesh(4, 3), exact: '⅓ × 16 × 3 = 16' },
  { k: 'house', label: 'Gable house', mesh: houseMesh(4, 3, 2, 3.2), exact: '4 × 3 × 2 + 4 × ½ × 3 × 1.2 = 31.2' }
];

/** Volume from a closed mesh: add up signed tetrahedra from any point O to every triangle. */
@Component({
  selector: 'w-volume',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Volume from signed tetrahedra</h3></div>
      <div class="w-controls" role="group" aria-label="Solid">
        @for (s of shapes; track s.k) {
          <button type="button" class="w-btn" [class.on]="shape() === s.k" [attr.aria-pressed]="shape() === s.k" (click)="pick(s.k)">{{ s.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 270" class="view" role="img" [attr.aria-label]="message()">
          @for (f of faces(); track f.i) {
            <polygon [attr.points]="cam.pts(f.p)" class="face" [class.cur]="f.i === k()" />
          }
          @for (p of tetSides(); track $index) {
            <polygon [attr.points]="cam.pts(p)" class="tet" [class.neg]="tet() < 0" />
          }
          @for (p of tri(); track $index) {
            <line [attr.x1]="cam.p(o()).x" [attr.y1]="cam.p(o()).y" [attr.x2]="cam.p(p).x" [attr.y2]="cam.p(p).y" class="spoke" [class.neg]="tet() < 0" />
          }
          <circle [attr.cx]="cam.p(o()).x" [attr.cy]="cam.p(o()).y" r="4.5" class="org" />
          <text [attr.x]="cam.p(o()).x + 7" [attr.y]="cam.p(o()).y - 5" class="hl-t">O</text>
        </svg>
        <div>
          <label class="w-field mb-1">O at x = {{ ox() }}
            <input type="range" min="-3" max="7" step="0.5" [value]="ox()" (input)="ox.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">triangle {{ k() + 1 }} of {{ mesh().f.length }}
            <input type="range" min="0" [attr.max]="mesh().f.length - 1" step="1" [value]="k()" (input)="k.set(+$any($event.target).value)" />
          </label>
          <label class="d-flex align-items-center gap-2 small mb-2"><input type="checkbox" [checked]="flip()" (change)="flip.set(!flip())" /> Flip this triangle</label>
          <table class="wtable mono"><tbody>
            <tr><th>O</th><td>{{ f3(o(), 1) }}</td></tr>
            <tr><th>this tetrahedron</th><td [class.ok]="tet() > 0" [class.hl]="tet() < 0">{{ sign(tet()) }} m³</td></tr>
            <tr><th>sum of the + ones</th><td>{{ num(pos(), 3) }} m³</td></tr>
            <tr><th>sum of the − ones</th><td>{{ num(neg(), 3) }} m³</td></tr>
            <tr><th>total volume</th><td [class.ok]="!flip()" [class.hl]="flip()">{{ num(pos() + neg(), 3) }} m³</td></tr>
            <tr><th>by formula</th><td>{{ base().exact }}</td></tr>
            <tr><th>surface area</th><td>{{ num(area(), 2) }} m²</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="flip()" [class.info]="!flip()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .face { fill: rgba(148, 163, 184, 0.1); stroke: var(--text-muted); stroke-width: 1; stroke-linejoin: round; }
    .face.cur { fill: rgba(59, 130, 246, 0.4); stroke: #3b82f6; stroke-width: 2; }
    .tet { fill: rgba(16, 185, 129, 0.18); stroke: none; }
    .tet.neg { fill: rgba(245, 158, 11, 0.22); }
    .spoke { stroke: #10b981; stroke-width: 1.6; stroke-dasharray: 4 3; }
    .spoke.neg { stroke: #f59e0b; }
    .org { fill: #8b5cf6; }
  `]
})
export class VolumeWidget {
  readonly num = num;
  readonly f3 = f3;
  readonly shapes = SHAPES;
  readonly cam = new Iso(23, 118, 150, 'se');

  shape = signal<Shape>('box');
  ox = signal(1);
  k = signal(1);
  flip = signal(false);

  base = computed(() => SHAPES.find(s => s.k === this.shape())!);
  mesh = computed<Mesh>(() => {
    const m = this.base().mesh, k = this.k();
    if (!this.flip()) return m;
    return { v: m.v, f: m.f.map((t, i) => (i === k ? [t[0], t[2], t[1]] : t) as [number, number, number]) };
  });
  o = computed(() => v3(this.ox(), 1.5, 1.2));
  vols = computed(() => this.mesh().f.map(t => tetVolume(this.mesh(), t, this.o())));
  pos = computed(() => this.vols().filter(v => v > 0).reduce((a, v) => a + v, 0));
  neg = computed(() => this.vols().filter(v => v < 0).reduce((a, v) => a + v, 0));
  tet = computed(() => this.vols()[this.k()]);
  area = computed(() => meshArea(this.mesh()));
  tri = computed(() => this.mesh().f[this.k()].map(i => this.mesh().v[i]));
  tetSides = computed(() => { const [a, b, c] = this.tri(), o = this.o(); return [[o, a, b], [o, b, c], [o, c, a]]; });
  faces = computed(() => {
    const m = this.mesh();
    return m.f.map((t, i) => ({ i, p: t.map(j => m.v[j]), d: depthSe(triCentre(m, t)) })).sort((a, b) => a.d - b.d);
  });

  message = computed(() => {
    const t = this.tet();
    if (this.flip()) return `With triangle ${this.k() + 1} turned the wrong way, its tetrahedron changes sign, so the total is off by twice ${num(Math.abs(t), 3)} m³, and the error now depends on where O is. Volumes are only right for a closed mesh with consistent winding.`;
    if (Math.abs(t) < 1e-9) return `O lies in the plane of triangle ${this.k() + 1}, so its tetrahedron is flat and adds nothing. The total stays ${num(this.pos() + this.neg(), 3)} m³.`;
    return `Triangle ${this.k() + 1} faces ${t > 0 ? 'away from O, so its tetrahedron counts as positive' : 'towards O, so its tetrahedron counts as negative'}. Move O anywhere, even outside the solid: the parts outside cancel, and the total stays ${num(this.pos() + this.neg(), 3)} m³.`;
  });

  pick(s: Shape) { this.shape.set(s); this.k.set(1); this.flip.set(false); }
  sign(v: number) { return (v > 0 ? '+' : v < 0 ? '−' : '') + num(Math.abs(v), 3); }
}
