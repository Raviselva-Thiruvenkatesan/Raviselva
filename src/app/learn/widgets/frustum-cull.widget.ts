import { Component, computed, signal } from '@angular/core';

type V2 = [number, number];
const N = 21, SPACING = 2, HALF = 0.15, LONG = 0.85, SIZE = 300, WORLD = (N - 1) * SPACING + 6;   // a 21 × 21 grid of wall pieces
const NEAR = 0.5;
const rot = (v: V2, a: number): V2 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];

/** A top view of a column grid and a camera's frustum (as four planes, seen from above), with the box and sphere tests. */
@Component({
  selector: 'w-frustum-cull',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which elements survive culling?</h3></div>
      <div class="sliders">
        <label class="w-field"><span>Camera direction: {{ yaw() }}°</span><input type="range" min="0" max="359" step="1" [value]="yaw()" (input)="yaw.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Field of view: {{ fov() }}°</span><input type="range" min="20" max="120" step="1" [value]="fov()" (input)="fov.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Far plane: {{ far() }} m</span><input type="range" min="5" max="34" step="1" [value]="far()" (input)="far.set(+$any($event.target).value)" /></label>
      </div>
      <div class="w-controls"><button type="button" class="w-btn small" [class.on]="sphere()" [attr.aria-pressed]="sphere()" (click)="sphere.set(!sphere())">Use the sphere test</button></div>
      <svg [attr.viewBox]="'0 0 ' + SIZE + ' ' + SIZE" class="view" role="img" [attr.aria-label]="message()">
        <polygon [attr.points]="frustumPoints()" class="frustum" />
        @for (c of columns(); track c.id) {
          <rect [attr.x]="px(c.x - c.hx)" [attr.y]="py(c.y + c.hy)" [attr.width]="c.hx * 2 * k" [attr.height]="c.hy * 2 * k" [attr.class]="'col ' + c.state" />
        }
        <circle [attr.cx]="px(0)" [attr.cy]="py(0)" r="4" class="eye" />
      </svg>
      <div class="legend"><span class="chip"><i class="sw vis"></i>visible ({{ counts().visible }})</span><span class="chip"><i class="sw extra"></i>passes the test but invisible ({{ counts().extra }})</span><span class="chip"><i class="sw culled"></i>culled ({{ counts().culled }})</span></div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 4px 14px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .view { width: 100%; max-width: 380px; display: block; margin: 0.4rem 0; background: #0b0f17; border-radius: 10px; }
    .frustum { fill: rgba(139, 92, 246, 0.16); stroke: #8b5cf6; stroke-width: 1; }
    .col.visible { fill: #22c55e; } .col.extra { fill: #f59e0b; } .col.culled { fill: #334155; }
    .eye { fill: #facc15; }
    .legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 0.3rem 0; }
    .legend .chip { font-size: 0.74rem; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
    .sw.vis { background: #22c55e; } .sw.extra { background: #f59e0b; } .sw.culled { background: #334155; }
  `]
})
export class FrustumCullWidget {
  readonly SIZE = SIZE;
  readonly k = SIZE / WORLD;
  yaw = signal(35);
  fov = signal(60);
  far = signal(18);
  sphere = signal(false);

  px(x: number) { return SIZE / 2 + x * this.k; }
  py(y: number) { return SIZE / 2 - y * this.k; }

  /** Inward planes as [normal, offset]: inside when dot(n, p) + d >= 0. The camera sits at the origin. */
  private planes = computed(() => {
    const dir: V2 = rot([1, 0], this.yaw() * Math.PI / 180), h = this.fov() * Math.PI / 360;
    const left = rot(rot(dir, h), -Math.PI / 2), right = rot(rot(dir, -h), Math.PI / 2);
    return [
      { n: left, d: 0 }, { n: right, d: 0 },
      { n: dir, d: -NEAR }, { n: [-dir[0], -dir[1]] as V2, d: this.far() }
    ];
  });
  frustumPoints = computed(() => {
    const dir: V2 = rot([1, 0], this.yaw() * Math.PI / 180), h = this.fov() * Math.PI / 360, f = this.far() / Math.cos(h), nr = NEAR / Math.cos(h);
    const pts = [rot(dir, h).map(v => v * nr), rot(dir, h).map(v => v * f), rot(dir, -h).map(v => v * f), rot(dir, -h).map(v => v * nr)];
    return pts.map(p => `${this.px(p[0]).toFixed(1)},${this.py(p[1]).toFixed(1)}`).join(' ');
  });

  /** Wall pieces 1.7 m × 0.3 m, turned alternately along x and y: long, thin boxes, as many BIM elements are. */
  columns = computed(() => {
    const planes = this.planes(), useSphere = this.sphere(), out: { id: number; x: number; y: number; hx: number; hy: number; state: string }[] = [];
    const off = (N - 1) / 2 * SPACING;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = i * SPACING - off + SPACING / 2, y = j * SPACING - off + SPACING / 2;   // offset so the camera stands between pieces
        const [hx, hy] = (i + j) % 2 ? [LONG, HALF] : [HALF, LONG], r = Math.hypot(hx, hy);
        const passes = planes.every(p => useSphere
          ? dot(p.n, [x, y]) + p.d >= -r
          : dot(p.n, [x + (p.n[0] >= 0 ? hx : -hx), y + (p.n[1] >= 0 ? hy : -hy)]) + p.d >= 0);
        let visible = false;                                                 // exact: any point of the piece inside all planes
        for (let a = -1; a <= 1 && !visible; a += 1 / 16)
          for (let b = -1; b <= 1 && !visible; b += 1 / 16)
            visible = planes.every(p => dot(p.n, [x + a * hx, y + b * hy]) + p.d >= 0);
        out.push({ id: i * N + j, x, y, hx, hy, state: !passes ? 'culled' : visible ? 'visible' : 'extra' });
      }
    return out;
  });
  counts = computed(() => {
    const c = this.columns();
    return { visible: c.filter(x => x.state === 'visible').length, extra: c.filter(x => x.state === 'extra').length, culled: c.filter(x => x.state === 'culled').length };
  });
  message = computed(() => {
    const c = this.counts(), drawn = c.visible + c.extra;
    const base = `${drawn} of ${N * N} pieces are drawn, ${c.culled} skipped.`;
    if (this.sphere()) return `${base} Spheres are cheaper to test but looser: ${c.extra} invisible pieces pass. A long, thin piece’s sphere reaches far beyond it, so pieces beside the frustum touch a plane with their sphere.`;
    return c.extra > 0
      ? `${base} ${c.extra} pass although none of their area is inside: near a corner of the frustum, a box can be outside the shape while inside every plane taken alone. Harmless: the GPU clips them.`
      : `${base} The box test is conservative: it never drops a visible piece.`;
  });
}
