import { Component, computed, signal } from '@angular/core';
import { Iso, dot3, len3, mul3, add3, v3 } from './iso';
import { Mesh, VIEW_SE, boxMesh, centreOf, depthSe, edgeCheck, flatVertexCount, houseMesh, meshArea, meshVolume, moved, pyramidMesh, triCentre, triCross } from './solid';
import { num } from './vec-plane';

type Shape = 'box' | 'house' | 'pyramid';

const centred = (m: Mesh) => { const c = centreOf(m); return moved(m, v3(-c.x, -c.y, -c.z)); };
const SHAPES: { k: Shape; label: string; mesh: Mesh; flip: number }[] = [
  { k: 'box', label: 'Box', mesh: centred(boxMesh(3, 2, 1.6)), flip: 1 },
  { k: 'house', label: 'Gable house', mesh: centred(houseMesh(3, 2.4, 1.5, 2.4)), flip: 1 },
  { k: 'pyramid', label: 'Pyramid', mesh: centred(pyramidMesh(3, 2.2)), flip: 0 }
];

/** A mesh as a vertex list and a triangle list: normals, winding and what one flipped triangle breaks. */
@Component({
  selector: 'w-mesh',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Vertices, triangles and normals</h3></div>
      <div class="w-controls" role="group" aria-label="Shape">
        @for (s of shapes; track s.k) {
          <button type="button" class="w-btn" [class.on]="shape() === s.k" [attr.aria-pressed]="shape() === s.k" (click)="shape.set(s.k)">{{ s.label }}</button>
        }
      </div>
      <div class="w-controls">
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="normals()" (change)="normals.set(!normals())" /> Face normals</label>
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="labels()" (change)="labels.set(!labels())" /> Vertex numbers</label>
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="flip()" (change)="flip.set(!flip())" /> Flip one triangle</label>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 260" class="view" role="img" [attr.aria-label]="message()">
          @for (f of faces(); track f.i) {
            <polygon [attr.points]="cam.pts(f.p)" class="face" [class.back]="!f.front" [class.flipped]="f.flipped" />
          }
          @for (f of faces(); track f.i) {
            @if (normals() && (f.front || f.flipped)) {
              <line [attr.x1]="cam.p(f.c).x" [attr.y1]="cam.p(f.c).y" [attr.x2]="cam.p(f.tip).x" [attr.y2]="cam.p(f.tip).y" class="nrm" [class.bad]="f.flipped" />
              <circle [attr.cx]="cam.p(f.tip).x" [attr.cy]="cam.p(f.tip).y" r="2.5" class="tip" [class.bad]="f.flipped" />
            }
          }
          @if (labels()) {
            @for (p of mesh().v; track $index) {
              <circle [attr.cx]="cam.p(p).x" [attr.cy]="cam.p(p).y" r="2.5" class="vtx" />
              <text [attr.x]="cam.p(p).x + 4" [attr.y]="cam.p(p).y - 4" class="hl-t">{{ $index }}</text>
            }
          }
        </svg>
        <div>
          <table class="wtable mono"><tbody>
            <tr><th>vertices V</th><td>{{ mesh().v.length }}</td></tr>
            <tr><th>edges E</th><td>{{ check().edges }}</td></tr>
            <tr><th>triangles F</th><td>{{ mesh().f.length }}</td></tr>
            <tr><th>V − E + F</th><td [class.ok]="euler() === 2">{{ euler() }}</td></tr>
            <tr><th>vertices with flat normals</th><td>{{ flatCount() }}</td></tr>
            <tr><th>surface area</th><td>{{ num(area(), 2) }} m²</td></tr>
            <tr><th>volume from the triangles</th><td [class.hl]="flip()" [class.ok]="!flip()">{{ num(volume(), 3) }} m³</td></tr>
            <tr><th>every edge paired</th><td [class.hl]="!check().closed" [class.ok]="check().closed">{{ check().closed ? 'yes' : 'no' }}</td></tr>
          </tbody></table>
          <p class="small mt-2 mb-0">Triangle {{ flipIdx() }}: <span class="mono">({{ tri()[0] }}, {{ tri()[1] }}, {{ tri()[2] }})</span></p>
        </div>
      </div>
      <div class="w-msg" [class.err]="flip()" [class.info]="!flip()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .face { fill: rgba(59, 130, 246, 0.22); stroke: #3b82f6; stroke-width: 1.4; stroke-linejoin: round; }
    .face.back { fill: none; stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.7; }
    .face.flipped { fill: rgba(239, 68, 68, 0.45); stroke: #ef4444; stroke-width: 2; stroke-dasharray: none; opacity: 1; }
    .nrm { stroke: #10b981; stroke-width: 2; }
    .nrm.bad { stroke: #ef4444; }
    .tip { fill: #10b981; }
    .tip.bad { fill: #ef4444; }
    .vtx { fill: var(--text-main); }
  `]
})
export class MeshWidget {
  readonly num = num;
  readonly shapes = SHAPES;
  readonly cam = new Iso(38, 150, 135, 'se');

  shape = signal<Shape>('box');
  normals = signal(true);
  labels = signal(false);
  flip = signal(false);

  base = computed(() => SHAPES.find(s => s.k === this.shape())!);
  flipIdx = computed(() => this.base().flip);
  mesh = computed<Mesh>(() => {
    const b = this.base();
    if (!this.flip()) return b.mesh;
    return { v: b.mesh.v, f: b.mesh.f.map((t, i) => (i === b.flip ? [t[0], t[2], t[1]] : t) as [number, number, number]) };
  });
  tri = computed(() => this.mesh().f[this.flipIdx()]);
  check = computed(() => edgeCheck(this.mesh()));
  euler = computed(() => this.mesh().v.length - this.check().edges + this.mesh().f.length);
  flatCount = computed(() => flatVertexCount(this.base().mesh));
  area = computed(() => meshArea(this.mesh()));
  volume = computed(() => meshVolume(this.mesh()));

  faces = computed(() => {
    const m = this.mesh();
    return m.f.map((t, i) => {
      const n = triCross(m, t), c = triCentre(m, t), u = mul3(n, 1 / len3(n));
      const flipped = this.flip() && i === this.flipIdx();
      return { i, p: t.map(k => m.v[k]), c, tip: add3(c, mul3(u, 0.55)), front: dot3(n, VIEW_SE) > 1e-9, flipped, d: depthSe(c) };
    }).sort((a, b) => a.d - b.d);
  });

  message = computed(() => {
    const m = this.mesh();
    if (this.flip()) {
      return `Triangle ${this.flipIdx()} now lists its corners clockwise, so its normal points into the solid. A renderer that culls back faces hides it, every edge it shares is now used twice in the same direction, and the volume computed from the triangles is wrong.`;
    }
    return `${m.v.length} shared corners and ${m.f.length} triangles, each a triple of vertex numbers listed counter-clockwise seen from outside. The normal (b − a) × (c − a) then points out of the solid. Dashed faces point away from you.`;
  });
}
