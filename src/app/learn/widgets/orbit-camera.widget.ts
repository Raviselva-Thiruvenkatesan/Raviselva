import { Component, computed, signal } from '@angular/core';

type V3 = [number, number, number];
const W = 400, H = 260, MIN: V3 = [-10, -5, 0], MAX: V3 = [10, 5, 6];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const CENTRE: V3 = [(MIN[0] + MAX[0]) / 2, (MIN[1] + MAX[1]) / 2, (MIN[2] + MAX[2]) / 2];
const RADIUS = Math.hypot(MAX[0] - MIN[0], MAX[1] - MIN[1], MAX[2] - MIN[2]) / 2;
// The building's six faces: outward normal and four corners
const FACES: { n: V3; c: V3[] }[] = (() => {
  const [x0, y0, z0] = MIN, [x1, y1, z1] = MAX;
  return [
    { n: [1, 0, 0], c: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
    { n: [-1, 0, 0], c: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { n: [0, 1, 0], c: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]] },
    { n: [0, -1, 0], c: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { n: [0, 0, 1], c: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, 0, -1], c: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]] }
  ] as { n: V3; c: V3[] }[];
})();
const toSrgb = (l: number) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));

/** The lesson's OrbitCamera on a 20 x 10 x 6 m building: drag to orbit, wheel to zoom, buttons for presets and zoom-to-fit. */
@Component({
  selector: 'w-orbit-camera',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Orbit, zoom and fit</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn small" (click)="fit()"><i class="bi bi-arrows-fullscreen" aria-hidden="true"></i> Zoom to fit</button>
        <button type="button" class="w-btn small" (click)="preset(0, 0)">Front</button>
        <button type="button" class="w-btn small" (click)="preset(0, 89)">Top</button>
        <button type="button" class="w-btn small" (click)="preset(-45, 35)">Isometric</button>
        <button type="button" class="w-btn small" [class.on]="!clamp()" [attr.aria-pressed]="!clamp()" (click)="clamp.set(!clamp())">Allow pitch ±90°</button>
      </div>
      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="view" role="img" [attr.aria-label]="'Building seen from yaw ' + yaw().toFixed(0) + ', pitch ' + pitch().toFixed(0)"
           (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up($event)" (pointercancel)="up($event)" (wheel)="wheel($event)">
        <rect x="0" y="0" [attr.width]="w" [attr.height]="h" class="bg" />
        @if (broken()) {
          <text [attr.x]="w / 2" [attr.y]="h / 2" class="nan">LookAt: NaN</text>
        } @else {
          @for (f of faces(); track f.key) { <polygon [attr.points]="f.points" [attr.fill]="f.fill" class="face" /> }
          <circle [attr.cx]="target2d()[0]" [attr.cy]="target2d()[1]" r="3" class="tgt" />
        }
      </svg>
      <div class="sliders">
        <label class="w-field"><span>Yaw {{ yaw().toFixed(0) }}°</span>
          <input type="range" min="-180" max="180" step="1" [value]="yaw()" (input)="yaw.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Pitch {{ pitch().toFixed(0) }}°</span>
          <input type="range" [attr.min]="clamp() ? -89 : -90" [attr.max]="clamp() ? 89 : 90" step="1" [value]="pitch()" (input)="pitch.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Distance {{ distance().toFixed(1) }} m</span>
          <input type="range" min="8" max="120" step="0.5" [value]="distance()" (input)="distance.set(+$any($event.target).value)" /></label>
      </div>
      <p class="w-hint mono">eye ({{ eye()[0].toFixed(1) }}, {{ eye()[1].toFixed(1) }}, {{ eye()[2].toFixed(1) }}) · near {{ planes()[0].toFixed(2) }} m · far {{ planes()[1].toFixed(1) }} m</p>
      <div class="w-msg" [class.info]="!broken()" [class.err]="broken()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .view { width: 100%; max-width: 520px; display: block; margin: 0.4rem 0; border-radius: 8px; border: 1.5px solid var(--border-color); touch-action: none; cursor: grab; }
    .bg { fill: #111827; }
    .face { stroke: #111827; stroke-width: 1; stroke-linejoin: round; }
    .tgt { fill: #f59e0b; stroke: #fff; stroke-width: 1; }
    .nan { fill: #ef4444; font: 700 20px monospace; text-anchor: middle; }
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 4px 12px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
  `]
})
export class OrbitCameraWidget {
  readonly w = W; readonly h = H;
  readonly fovY = 45;
  yaw = signal(-30);
  pitch = signal(25);
  distance = signal(40);
  clamp = signal(true);
  private drag: { x: number; y: number } | null = null;

  eye = computed<V3>(() => {
    const y = this.yaw() * Math.PI / 180, p = this.pitch() * Math.PI / 180, d = this.distance();
    return [CENTRE[0] + Math.sin(y) * Math.cos(p) * d, CENTRE[1] - Math.cos(y) * Math.cos(p) * d, CENTRE[2] + Math.sin(p) * d];
  });
  /** At pitch ±90° the view direction is parallel to the up vector: CreateLookAt's cross product is zero. */
  broken = computed(() => Math.abs(this.pitch()) >= 90);
  planes = computed(() => {
    const toCentre = this.distance(), far = toCentre + RADIUS;
    return [Math.max(far / 10000, toCentre - RADIUS), far];
  });

  private basis = computed(() => {
    const z = norm(sub(this.eye(), CENTRE)), x = norm(cross([0, 0, 1], z)), y = cross(z, x);
    return { x, y, z };
  });
  private project(p: V3): [number, number, number] {
    const { x, y, z } = this.basis(), d = sub(p, this.eye());
    const v: V3 = [dot(d, x), dot(d, y), dot(d, z)];
    const f = 1 / Math.tan(this.fovY * Math.PI / 360), depth = -v[2];
    return [W / 2 + f * v[0] / depth * H / 2, H / 2 - f * v[1] / depth * H / 2, depth];
  }
  target2d = computed(() => this.project(CENTRE));

  faces = computed(() => {
    const eye = this.eye();
    return FACES
      .filter(f => dot(f.n, sub(eye, f.c[0])) > 0)                                // back faces are hidden
      .map((f, i) => {
        const pts = f.c.map(c => this.project(c));
        const shade = (k: number) => toSrgb(f.n[k] * 0.5 + 0.5);                 // the lesson's normal colours
        return {
          key: f.n.join(), depth: pts.reduce((s, p) => s + p[2], 0) / 4,
          points: pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '),
          fill: `rgb(${shade(0)}, ${shade(1)}, ${shade(2)})`
        };
      })
      .sort((a, b) => b.depth - a.depth);                                          // far first (painter's order)
  });

  private setPitch(p: number) { const lim = this.clamp() ? 89 : 90; this.pitch.set(Math.max(-lim, Math.min(lim, p))); }
  fit() {
    const halfY = this.fovY * Math.PI / 360, halfX = Math.atan(Math.tan(halfY) * W / H);
    this.distance.set(Math.round(RADIUS / Math.sin(Math.min(halfX, halfY)) * 2) / 2);
  }
  preset(yaw: number, pitch: number) { this.yaw.set(yaw); this.setPitch(pitch); this.fit(); }

  down(e: PointerEvent) { this.drag = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture?.(e.pointerId); }
  move(e: PointerEvent) {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
    this.drag = { x: e.clientX, y: e.clientY };
    let yaw = this.yaw() - dx * 0.5;
    yaw = ((yaw + 180) % 360 + 360) % 360 - 180;
    this.yaw.set(yaw);
    this.setPitch(this.pitch() + dy * 0.5);
  }
  up(e: PointerEvent) { this.drag = null; (e.target as Element).releasePointerCapture?.(e.pointerId); }
  wheel(e: WheelEvent) {
    e.preventDefault();
    const notches = -Math.sign(e.deltaY);
    this.distance.set(Math.min(120, Math.max(8, this.distance() * Math.pow(0.9, notches))));
  }

  message = computed(() => {
    if (this.broken()) return 'Pitch ±90°: the camera looks straight along the up vector, the cross product inside CreateLookAt is zero, and the view matrix fills with NaN. That is why the camera clamps the pitch to ±89°.';
    const [near, far] = this.planes();
    return `Drag the view to orbit and use the wheel to zoom. Near and far hug the building’s bounding sphere (radius ${RADIUS.toFixed(1)} m), so far/near is ${(far / near).toFixed(0)}, which keeps depth precise.`;
  });
}
