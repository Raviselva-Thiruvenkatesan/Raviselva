import { Component, computed, signal } from '@angular/core';

type V3 = [number, number, number];
const W = 800, H = 600, NEAR = 0.1, FAR = 100;
const EYE: V3 = [0, -8, 5], TARGET: V3 = [0, 0, 0], UP: V3 = [0, 0, 1];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
// The view basis of Matrix4x4.CreateLookAt: z points from the target to the eye, the camera looks down -z
const Z = norm(sub(EYE, TARGET)), X = norm(cross(UP, Z)), Y = cross(Z, X);
const SLAB: V3[] = [[-2, -2, 0], [2, -2, 0], [2, 2, 0], [-2, 2, 0]];

interface Stage { name: string; value: string; note: string }

/** Follow one world point through view, clip, NDC and pixel space, with Vulkan's or OpenGL's projection. */
@Component({
  selector: 'w-mvp-pipeline',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One point, all the way to a pixel</h3></div>
      <div class="sliders">
        @for (a of axes; track a.i) {
          <label class="w-field"><span>Point {{ a.name }} = {{ point()[a.i].toFixed(1) }} m</span>
            <input type="range" min="-3" max="3" step="0.1" [value]="point()[a.i]" (input)="setAxis(a.i, $any($event.target).value)" /></label>
        }
        <label class="w-field"><span>Vertical field of view {{ fov() }}°</span>
          <input type="range" min="20" max="100" step="1" [value]="fov()" (input)="fov.set(+$any($event.target).value)" /></label>
      </div>
      <div class="w-controls" role="group" aria-label="Projection">
        <button type="button" class="w-btn small" [class.on]="vulkan()" [attr.aria-pressed]="vulkan()" (click)="vulkan.set(true)">Vulkan projection</button>
        <button type="button" class="w-btn small" [class.on]="!vulkan()" [attr.aria-pressed]="!vulkan()" (click)="vulkan.set(false)">An OpenGL matrix, used in Vulkan</button>
      </div>
      <div class="cols">
        <div class="tw"><table class="wtable mono">
          <thead><tr><th scope="col">Space</th><th scope="col">Coordinates</th><th scope="col"></th></tr></thead>
          <tbody>@for (s of stages(); track s.name) { <tr><td>{{ s.name }}</td><td>{{ s.value }}</td><td class="note">{{ s.note }}</td></tr> }</tbody>
        </table></div>
        <svg viewBox="0 0 800 600" class="screen" role="img" [attr.aria-label]="'Window: the point at pixel ' + pixelText()">
          <rect x="0" y="0" width="800" height="600" class="bg" />
          <polygon [attr.points]="slabPoints()" class="slab" />
          <line x1="400" y1="0" x2="400" y2="600" class="axis" /><line x1="0" y1="300" x2="800" y2="300" class="axis" />
          @if (onScreen()) { <circle [attr.cx]="px()[0]" [attr.cy]="px()[1]" r="14" class="dot" /> }
          <text x="12" y="40" class="lbl">(0, 0)</text><text x="788" y="588" class="lbl end">(800, 600)</text>
        </svg>
      </div>
      <div class="w-msg" [class.ok]="ok()" [class.err]="!ok()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 4px 12px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 10px; align-items: start; margin: 0.4rem 0; }
    @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
    .tw { overflow-x: auto; }
    .wtable { font-size: 0.72rem; }
    .wtable td, .wtable th { padding: 3px 5px; }
    .note { color: var(--text-muted); font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 0.7rem; }
    .screen { width: 100%; display: block; border-radius: 8px; border: 1.5px solid var(--border-color); }
    .bg { fill: #111827; }
    .slab { fill: rgba(139, 92, 246, 0.35); stroke: #8b5cf6; stroke-width: 3; }
    .axis { stroke: rgba(255, 255, 255, 0.15); stroke-width: 2; stroke-dasharray: 10 8; }
    .dot { fill: #f59e0b; stroke: #fff; stroke-width: 4; }
    .lbl { fill: rgba(255, 255, 255, 0.55); font-size: 30px; font-family: monospace; }
    .lbl.end { text-anchor: end; }
  `]
})
export class MvpPipelineWidget {
  readonly axes = [{ i: 0, name: 'x' }, { i: 1, name: 'y' }, { i: 2, name: 'z' }];
  point = signal<V3>([1, -1, 0.5]);
  fov = signal(60);
  vulkan = signal(true);

  setAxis(i: number, v: string) { const p = [...this.point()] as V3; p[i] = +v; this.point.set(p); }

  /** World point -> clip coordinates, as the C# Camera class (or an OpenGL-style matrix) computes them. */
  private clip(p: V3): [number, number, number, number] {
    const d = sub(p, EYE), v: V3 = [dot(d, X), dot(d, Y), dot(d, Z)];
    const f = 1 / Math.tan(this.fov() * Math.PI / 360), aspect = W / H;
    if (this.vulkan()) return [f / aspect * v[0], -f * v[1], v[2] * FAR / (NEAR - FAR) + NEAR * FAR / (NEAR - FAR), -v[2]];
    return [f / aspect * v[0], f * v[1], v[2] * (FAR + NEAR) / (NEAR - FAR) + 2 * FAR * NEAR / (NEAR - FAR), -v[2]];
  }
  private toPixel(c: number[]): V3 { return [(c[0] / c[3] + 1) / 2 * W, (c[1] / c[3] + 1) / 2 * H, c[2] / c[3]]; }

  view = computed(() => { const d = sub(this.point(), EYE); return [dot(d, X), dot(d, Y), dot(d, Z)] as V3; });
  clipPos = computed(() => this.clip(this.point()));
  px = computed(() => this.toPixel(this.clipPos()));
  onScreen = computed(() => { const [x, y] = this.px(); return x >= 0 && x <= W && y >= 0 && y <= H; });
  depthOk = computed(() => this.px()[2] >= 0 && this.px()[2] <= 1);
  ok = computed(() => this.vulkan() && this.onScreen() && this.depthOk());
  slabPoints = computed(() => SLAB.map(p => { const q = this.toPixel(this.clip(p)); return `${q[0].toFixed(1)},${q[1].toFixed(1)}`; }).join(' '));
  pixelText = computed(() => `(${this.px()[0].toFixed(0)}, ${this.px()[1].toFixed(0)})`);

  stages = computed<Stage[]>(() => {
    const f = (n: number) => n.toFixed(2), p = this.point(), v = this.view(), c = this.clipPos(), q = this.px();
    return [
      { name: 'World', value: `(${f(p[0])}, ${f(p[1])}, ${f(p[2])})`, note: 'model = identity' },
      { name: 'View', value: `(${f(v[0])}, ${f(v[1])}, ${f(v[2])})`, note: 'camera at origin, looking down −z' },
      { name: 'Clip', value: `(${f(c[0])}, ${f(c[1])}, ${f(c[2])}, ${f(c[3])})`, note: 'w = distance in front of the camera' },
      { name: 'NDC', value: `(${f(c[0] / c[3])}, ${f(c[1] / c[3])}, ${(c[2] / c[3]).toFixed(4)})`, note: 'after dividing by w' },
      { name: 'Pixel', value: `${this.pixelText()}, depth ${q[2].toFixed(4)}`, note: 'viewport 800 × 600' }
    ];
  });

  message = computed(() => {
    const [, y, depth] = this.px();
    if (!this.vulkan()) {
      const flipped = `The OpenGL matrix keeps y up, but Vulkan’s NDC y points down, so the point lands at y = ${y.toFixed(0)}: the image is upside down.`;
      return depth < 0 ? `${flipped} Its depth ${depth.toFixed(3)} is also below 0: Vulkan clips it away, because its depth range is 0 to 1.` :
        `${flipped} Its depth uses OpenGL’s −1 to 1 range, so everything nearer than about ${(2 * NEAR * FAR / (FAR + NEAR)).toFixed(2)} m would be clipped.`;
    }
    if (!this.onScreen()) return 'The point is outside the field of view: its NDC x or y is beyond ±1, so the GPU clips it.';
    return `Depth ${depth.toFixed(4)}: although the point is only ${this.clipPos()[3].toFixed(1)} m away and the far plane is at 100 m, its depth is close to 1. Perspective depth is not linear (next lesson).`;
  });
}
