import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type V3 = [number, number, number];
type Mode = 'exact' | 0 | 1 | 2;
const SIZE = 180;
const srgb = (l: number) => { const c = Math.min(1, Math.max(0, l)); return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** The lesson's Sky.Radiance: depends only on the height of the direction. */
function sky(z: number, sunlit: boolean): V3 {
  const zenith: V3 = [0.15, 0.35, 0.9], horizon: V3 = [0.8, 0.85, 0.9], ground: V3 = sunlit ? [0.6, 0.45, 0.25] : [0.25, 0.2, 0.15];
  return z >= 0 ? lerp(horizon, zenith, Math.sqrt(z)) : lerp([0.4, 0.425, 0.45], ground, Math.min(1, -z * 4));
}
const BASIS = (d: V3) => [0.282095, 0.488603 * d[1], 0.488603 * d[2], 0.488603 * d[0], 1.092548 * d[0] * d[1], 1.092548 * d[1] * d[2], 0.315392 * (3 * d[2] * d[2] - 1), 1.092548 * d[0] * d[2], 0.546274 * (d[0] * d[0] - d[1] * d[1])];
const BAND = [Math.PI, 2 * Math.PI / 3, 2 * Math.PI / 3, 2 * Math.PI / 3, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
const BAND_OF = [0, 1, 1, 1, 2, 2, 2, 2, 2];
const N = 3000;
const DIRS: V3[] = Array.from({ length: N }, (_, i) => { const z = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - z * z), p = i * Math.PI * (3 - Math.sqrt(5)); return [r * Math.cos(p), r * Math.sin(p), z]; });

/** Irradiance on a sphere from a sky: exact, or reconstructed from SH bands 0, 0-1 or 0-2. */
@Component({
  selector: 'w-sh-irradiance',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Nine numbers for a whole sky</h3></div>
      <div class="w-controls" role="group" aria-label="Irradiance from">
        @for (m of modes; track m.label) { <button type="button" class="w-btn small" [class.on]="mode() === m.id" [attr.aria-pressed]="mode() === m.id" (click)="mode.set(m.id)">{{ m.label }}</button> }
        <button type="button" class="w-btn small" [class.on]="sunlit()" [attr.aria-pressed]="sunlit()" (click)="sunlit.set(!sunlit())">Sunlit sand instead of dark ground</button>
      </div>
      <div class="cols">
        <figure><canvas #s [width]="size" [height]="size" role="img" aria-label="Lit white sphere"></canvas><figcaption>A white sphere, lit only by the sky</figcaption></figure>
        <figure><canvas #p width="180" height="90" role="img" aria-label="The sky, from straight up to straight down"></canvas><figcaption>The environment, from straight up (top) to straight down</figcaption></figure>
      </div>
      <div class="tscroll"><table class="wtable mono">
        <thead><tr><th scope="col">Normal</th><th scope="col">Exact</th><th scope="col">SH ({{ modeLabel() }})</th><th scope="col">Error</th></tr></thead>
        <tbody>@for (r of rows(); track r.name) { <tr><td>{{ r.name }}</td><td>{{ r.exact }}</td><td>{{ r.approx }}</td><td>{{ r.error }}</td></tr> }</tbody>
      </table></div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .cols { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; margin: 0.4rem 0; }
    figure { margin: 0; display: flex; flex-direction: column; gap: 4px; }
    figcaption { font-size: 0.74rem; color: var(--text-muted); max-width: 200px; }
    canvas { border-radius: 10px; background: #0b0f17; }
    .wtable { font-size: 0.74rem; }
  `]
})
export class ShIrradianceWidget implements AfterViewInit {
  @ViewChild('s') sphere!: ElementRef<HTMLCanvasElement>;
  @ViewChild('p') pano!: ElementRef<HTMLCanvasElement>;
  readonly size = SIZE;
  readonly modes: { id: Mode; label: string }[] = [{ id: 'exact', label: 'Exact' }, { id: 0, label: 'Band 0 (1 number)' }, { id: 1, label: 'Bands 0-1 (4)' }, { id: 2, label: 'Bands 0-2 (9)' }];
  mode = signal<Mode>(2);
  sunlit = signal(false);
  private ready = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() { effect(() => { if (this.ready()) this.draw(); }); }
  ngAfterViewInit() { if (this.browser) this.ready.set(true); }

  private sh = computed(() => {
    const out = Array.from({ length: 9 }, () => [0, 0, 0] as V3), w = 4 * Math.PI / N, sun = this.sunlit();
    for (const d of DIRS) { const c = sky(d[2], sun), y = BASIS(d); for (let k = 0; k < 9; k++) for (let ch = 0; ch < 3; ch++) out[k][ch] += c[ch] * y[k] * w; }
    return out;
  });
  /** Exact irradiance / pi as a function of the normal's height (the sky is the same all around). */
  private exactTable = computed(() => {
    const sun = this.sunlit(), w = 4 * Math.PI / N;
    return Array.from({ length: 65 }, (_, i) => {
      const nz = i / 32 - 1, n: V3 = [Math.sqrt(1 - nz * nz), 0, nz], e: V3 = [0, 0, 0];
      for (const d of DIRS) { const c = Math.max(0, n[0] * d[0] + n[2] * d[2]); if (c > 0) { const r = sky(d[2], sun); for (let ch = 0; ch < 3; ch++) e[ch] += r[ch] * c * w; } }
      return e.map(v => v / Math.PI) as V3;
    });
  });
  private irradiance(n: V3, mode: Mode): V3 {
    if (mode === 'exact') { const t = (n[2] + 1) * 32, i = Math.min(63, Math.floor(t)), f = t - i, tab = this.exactTable(); return lerp(tab[i], tab[i + 1], f); }
    const y = BASIS(n), sh = this.sh(), e: V3 = [0, 0, 0];
    for (let k = 0; k < 9; k++) if (BAND_OF[k] <= mode) for (let ch = 0; ch < 3; ch++) e[ch] += sh[k][ch] * y[k] * BAND[k];
    return e.map(v => v / Math.PI) as V3;
  }

  private draw() {
    const ctx = this.sphere.nativeElement.getContext('2d'), pctx = this.pano.nativeElement.getContext('2d');
    if (!ctx || !pctx) return;
    const img = ctx.createImageData(SIZE, SIZE), mode = this.mode();
    for (let py = 0; py < SIZE; py++)
      for (let px = 0; px < SIZE; px++) {
        const x = (px + 0.5) / SIZE * 2.2 - 1.1, y = 1.1 - (py + 0.5) / SIZE * 2.2, r2 = x * x + y * y, at = (py * SIZE + px) * 4;
        if (r2 > 1) { img.data.set([11, 15, 23, 255], at); continue; }
        const n: V3 = [x, -Math.sqrt(1 - r2), y];                        // seen from the side: screen up is world up (+Z)
        const c = this.irradiance(n, mode).map(v => v * 0.8);
        img.data.set([srgb(c[0]), srgb(c[1]), srgb(c[2]), 255], at);
      }
    ctx.putImageData(img, 0, 0);
    const pano = pctx.createImageData(180, 90), sun = this.sunlit();
    for (let py = 0; py < 90; py++) { const c = sky(Math.cos(py / 89 * Math.PI), sun); for (let px = 0; px < 180; px++) pano.data.set([srgb(c[0]), srgb(c[1]), srgb(c[2]), 255], (py * 180 + px) * 4); }
    pctx.putImageData(pano, 0, 0);
  }

  modeLabel = computed(() => this.mode() === 'exact' ? 'same' : `bands 0-${this.mode()}`);
  rows = computed(() => {
    const mode = this.mode() === 'exact' ? 2 : this.mode();
    return ([['up', [0, 0, 1]], ['horizontal', [1, 0, 0]], ['down', [0, 0, -1]]] as [string, V3][]).map(([name, n]) => {
      const exact = this.irradiance(n, 'exact'), approx = this.irradiance(n, mode as Mode), f = (v: V3) => v.map(x => x.toFixed(3)).join(' ');
      return { name, exact: f(exact), approx: f(approx), error: `${((approx[1] - exact[1]) / exact[1] * 100).toFixed(1)} %` };
    });
  });

  message = computed(() => {
    switch (this.mode()) {
      case 'exact': return 'The exact irradiance, integrated over 3,000 sky directions per normal. It is smooth: the cosine-weighted average over a hemisphere wipes out every sharp detail of the sky.';
      case 0: return 'Band 0 is a single average colour: the same light from every side, like the constant ambient term of lesson 1.';
      case 1: return 'Bands 0 and 1 add one direction: brighter on the side the light comes from. Up versus down is already right.';
      default: return 'Nine coefficients per channel: within a few per cent of the exact irradiance everywhere. Diffuse environment light in 108 bytes.';
    }
  });
}
