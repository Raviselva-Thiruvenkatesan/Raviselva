import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type V3 = [number, number, number];
type View = 'albedo' | 'normal' | 'depth' | 'lit';
const W = 240, H = 150;
const srgb = (l: number) => { const c = Math.min(1, Math.max(0, l)); return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const SPHERES: { c: V3; r: number; albedo: V3 }[] = [
  { c: [-2.6, 0.5, 1], r: 1, albedo: [0.8, 0.25, 0.2] }, { c: [0, 1.8, 0.9], r: 0.9, albedo: [0.85, 0.85, 0.85] },
  { c: [2.5, 0, 1.2], r: 1.2, albedo: [0.2, 0.4, 0.8] }, { c: [0.4, -1.6, 0.5], r: 0.5, albedo: [0.9, 0.75, 0.2] }
];
const EYE: V3 = [0, -9, 6], TARGET: V3 = [0, 0, 0.6];
const LIGHTS = Array.from({ length: 32 }, (_, i) => {
  const h = (k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };   // a fixed pseudo-random sequence
  return { p: [h(1) * 10 - 5, h(2) * 8 - 4, 0.4 + h(3) * 2] as V3, color: [0.3 + h(4), 0.3 + h(5), 0.3 + h(6)].map(v => v * 1.6) as V3 };
});

interface Texel { albedo: V3; normal: V3; depth: number; p: V3; hits: number }

/** A tiny ray-cast scene shown as its G-buffer (albedo, normal, depth) and lit from it with 1 to 32 point lights. */
@Component({
  selector: 'w-gbuffer-view',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside a G-buffer</h3></div>
      <div class="w-controls" role="group" aria-label="Image to show">
        @for (v of views; track v.id) { <button type="button" class="w-btn small" [class.on]="view() === v.id" [attr.aria-pressed]="view() === v.id" (click)="view.set(v.id)">{{ v.label }}</button> }
      </div>
      <label class="w-field"><span>Point lights: {{ lights() }}</span><input type="range" min="1" max="32" step="1" [value]="lights()" (input)="lights.set(+$any($event.target).value)" /></label>
      <canvas #c [width]="w" [height]="h" role="img" [attr.aria-label]="'G-buffer view: ' + view()"></canvas>
      <div class="stats">
        <span class="chip">{{ covered().toLocaleString('en-GB') }} pixels covered</span>
        <span class="chip">{{ fragments().toLocaleString('en-GB') }} fragments drawn (overdraw {{ (fragments() / covered()).toFixed(2) }})</span>
        <span class="chip">Forward: {{ (fragments() * lights()).toLocaleString('en-GB') }} light evaluations</span>
        <span class="chip ok">Deferred: {{ (covered() * lights()).toLocaleString('en-GB') }}</span>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; max-width: 320px; margin: 0.3rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    canvas { width: 100%; max-width: 480px; display: block; image-rendering: pixelated; border-radius: 8px; background: #0b0f17; }
    .stats { display: flex; flex-wrap: wrap; gap: 5px; margin: 0.5rem 0; }
    .stats .chip { font-size: 0.74rem; }
  `]
})
export class GbufferViewWidget implements AfterViewInit {
  @ViewChild('c') canvas!: ElementRef<HTMLCanvasElement>;
  readonly w = W; readonly h = H;
  readonly views: { id: View; label: string }[] = [{ id: 'albedo', label: 'Albedo' }, { id: 'normal', label: 'Normal' }, { id: 'depth', label: 'Depth' }, { id: 'lit', label: 'Lit result' }];
  view = signal<View>('lit');
  lights = signal(8);
  private ready = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() { effect(() => { if (this.ready()) this.draw(); }); }
  ngAfterViewInit() { if (this.browser) this.ready.set(true); }

  /** The geometry pass: one ray per pixel, nearest hit kept, every hit counted (forward would shade each one). */
  private gbuffer = computed<(Texel | null)[]>(() => {
    const f = norm(sub(TARGET, EYE)), r = norm(cross(f, [0, 0, 1])), u = cross(r, f), t = Math.tan(25 * Math.PI / 180), out: (Texel | null)[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const sx = ((x + 0.5) / W * 2 - 1) * t * W / H, sy = (1 - (y + 0.5) / H * 2) * t;
        const d = norm([f[0] + r[0] * sx + u[0] * sy, f[1] + r[1] * sx + u[1] * sy, f[2] + r[2] * sx + u[2] * sy]);
        let best: Texel | null = null, hits = 0;
        const consider = (dist: number, albedo: V3, normal: V3) => { hits++; if (!best || dist < best.depth) best = { albedo, normal, depth: dist, p: [EYE[0] + d[0] * dist, EYE[1] + d[1] * dist, EYE[2] + d[2] * dist], hits: 0 }; };
        if (d[2] < 0) { const dist = -EYE[2] / d[2], px = EYE[0] + d[0] * dist, py = EYE[1] + d[1] * dist; if (Math.abs(px) < 6 && Math.abs(py) < 5) consider(dist, [0.7, 0.7, 0.7], [0, 0, 1]); }
        for (const s of SPHERES) {
          const oc = sub(EYE, s.c), b = dot(oc, d), c = dot(oc, oc) - s.r * s.r, disc = b * b - c;
          if (disc > 0) { const dist = -b - Math.sqrt(disc); if (dist > 0) { const p: V3 = [EYE[0] + d[0] * dist, EYE[1] + d[1] * dist, EYE[2] + d[2] * dist]; consider(dist, s.albedo, norm(sub(p, s.c))); } }
        }
        if (best) (best as Texel).hits = hits;
        out.push(best);
      }
    return out;
  });

  covered = computed(() => this.gbuffer().filter(t => t).length);
  fragments = computed(() => this.gbuffer().reduce((n, t) => n + (t ? t.hits : 0), 0));

  private draw() {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(W, H), view = this.view(), lights = LIGHTS.slice(0, this.lights()), g = this.gbuffer();
    g.forEach((t, i) => {
      let c: V3 = [0.01, 0.012, 0.02];
      if (t) {
        if (view === 'albedo') c = t.albedo;
        else if (view === 'normal') c = t.normal.map(v => Math.pow(v * 0.5 + 0.5, 2.2)) as V3;               // shown as colour, like a G-buffer debugger
        else if (view === 'depth') { const v = Math.pow(Math.min(1, Math.max(0, (t.depth - 6) / 10)), 2.2); c = [v, v, v]; }
        else {
          c = t.albedo.map(a => a * 0.03) as V3;
          for (const l of lights) {
            const to = sub(l.p, t.p), dist = Math.hypot(...to), win = Math.max(0, 1 - (dist / 4) ** 4), k = Math.max(0, dot(t.normal, to) / dist) * win * win / (dist * dist + 1);
            c = [c[0] + t.albedo[0] * l.color[0] * k, c[1] + t.albedo[1] * l.color[1] * k, c[2] + t.albedo[2] * l.color[2] * k];
          }
        }
      }
      img.data.set([srgb(c[0]), srgb(c[1]), srgb(c[2]), 255], i * 4);
    });
    ctx.putImageData(img, 0, 0);
  }

  message = computed(() => {
    switch (this.view()) {
      case 'albedo': return 'Albedo: each surface’s own colour, with no light at all. 8-bit sRGB is enough.';
      case 'normal': return 'Normals, shown with x, y and z mapped to red, green and blue. The floor faces up (+Z), so it is blue-ish; each sphere shows every direction.';
      case 'depth': return 'Depth: distance from the camera, darker is nearer. With the pixel’s screen position it gives back the world position, so positions need not be stored.';
      default: return `Lit from the three images alone, with ${this.lights()} point light${this.lights() > 1 ? 's' : ''}. Forward shading would evaluate the lights for every one of the ${this.fragments().toLocaleString('en-GB')} fragments drawn, including hidden ones; deferred evaluates them once per covered pixel.`;
    }
  });
}
