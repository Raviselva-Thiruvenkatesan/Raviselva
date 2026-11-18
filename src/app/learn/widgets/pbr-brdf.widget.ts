import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const SIZE = 200;
const srgb = (l: number) => { const c = Math.min(1, Math.max(0, l)); return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
const PRESETS = [
  { id: 'plastic', label: 'Red plastic', base: [0.7, 0.08, 0.06], metallic: 0 },
  { id: 'gold', label: 'Gold', base: [1, 0.71, 0.29], metallic: 1 },
  { id: 'paint', label: 'White paint', base: [0.85, 0.85, 0.85], metallic: 0 },
  { id: 'steel', label: 'Steel', base: [0.56, 0.57, 0.58], metallic: 1 }
];
const D = (nh: number, a: number) => { const d = nh * nh * (a * a - 1) + 1; return a * a / (Math.PI * d * d); };
const G1 = (nx: number, k: number) => nx / (nx * (1 - k) + k);

/** A sphere shaded with Cook-Torrance (GGX, Smith, Schlick), and the GGX distribution for the chosen roughness. */
@Component({
  selector: 'w-pbr-brdf',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Metallic and roughness</h3></div>
      <div class="w-controls" role="group" aria-label="Material">
        @for (p of presets; track p.id) { <button type="button" class="w-btn small" [class.on]="preset() === p.id" [attr.aria-pressed]="preset() === p.id" (click)="pick(p.id)">{{ p.label }}</button> }
      </div>
      <div class="cols">
        <canvas #c [width]="size" [height]="size" role="img" [attr.aria-label]="'Sphere, roughness ' + roughness()"></canvas>
        <div class="side">
          <label class="w-field"><span>Roughness: {{ roughness().toFixed(2) }}</span><input type="range" min="0.04" max="1" step="0.02" [value]="roughness()" (input)="roughness.set(+$any($event.target).value)" /></label>
          <label class="w-field"><span>Metallic: {{ metallic().toFixed(2) }}</span><input type="range" min="0" max="1" step="0.05" [value]="metallic()" (input)="metallic.set(+$any($event.target).value)" /></label>
          <svg viewBox="0 0 240 110" class="plot" role="img" aria-label="GGX distribution against the angle between n and h">
            <line x1="20" y1="95" x2="235" y2="95" class="ax" /><line x1="20" y1="8" x2="20" y2="95" class="ax" />
            <polyline [attr.points]="curve()" class="ggx" />
            <text x="22" y="106" class="t">0°</text><text x="228" y="106" class="t end">90°</text>
            <text x="24" y="16" class="t">D (GGX), peak {{ peak().toFixed(1) }}</text>
            <text x="235" y="86" class="t end">angle between n and h</text>
          </svg>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .cols { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin: 0.4rem 0; }
    canvas { width: 200px; height: 200px; border-radius: 10px; background: #0b0f17; }
    .side { flex: 1; min-width: 210px; display: flex; flex-direction: column; gap: 4px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .plot { width: 100%; max-width: 320px; }
    .ax { stroke: var(--border-color); }
    .ggx { fill: none; stroke: #8b5cf6; stroke-width: 2; }
    .t { font-size: 9px; fill: var(--text-muted); } .t.end { text-anchor: end; }
  `]
})
export class PbrBrdfWidget implements AfterViewInit {
  @ViewChild('c') canvas!: ElementRef<HTMLCanvasElement>;
  readonly size = SIZE;
  readonly presets = PRESETS;
  preset = signal('plastic');
  roughness = signal(0.35);
  metallic = signal(0);
  private ready = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() { effect(() => { if (this.ready()) this.draw(); }); }
  ngAfterViewInit() { if (this.browser) this.ready.set(true); }
  pick(id: string) { const p = PRESETS.find(x => x.id === id)!; this.preset.set(id); this.metallic.set(p.metallic); }

  private base = computed(() => PRESETS.find(p => p.id === this.preset())!.base);
  peak = computed(() => { const a = this.roughness() ** 2; return D(1, a); });
  curve = computed(() => {
    const a = this.roughness() ** 2, pk = this.peak(), pts: string[] = [];
    for (let i = 0; i <= 90; i++) { const nh = Math.cos(i * Math.PI / 180); pts.push(`${(20 + i * 215 / 90).toFixed(1)},${(95 - D(nh, a) / pk * 80).toFixed(1)}`); }
    return pts.join(' ');
  });

  private draw() {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(SIZE, SIZE), base = this.base(), m = this.metallic(), r = Math.max(0.04, this.roughness()), a = r * r, k = (r + 1) ** 2 / 8;
    const l = [-0.5, 0.55, 0.67].map((v, _, arr) => v / Math.hypot(...arr)), light = 3;
    const f0 = base.map(b => 0.04 * (1 - m) + b * m);
    for (let py = 0; py < SIZE; py++)
      for (let px = 0; px < SIZE; px++) {
        const x = (px + 0.5) / SIZE * 2.2 - 1.1, y = 1.1 - (py + 0.5) / SIZE * 2.2, r2 = x * x + y * y, at = (py * SIZE + px) * 4;
        if (r2 > 1) { img.data.set([11, 15, 23, 255], at); continue; }
        const n = [x, y, Math.sqrt(1 - r2)];                  // the eye looks along -z, so v = (0, 0, 1)
        const h = [l[0], l[1], l[2] + 1].map((q, _, arr) => q / Math.hypot(...arr));
        const nl = Math.max(n[0] * l[0] + n[1] * l[1] + n[2] * l[2], 0), nv = Math.max(n[2], 1e-4);
        const nh = Math.max(n[0] * h[0] + n[1] * h[1] + n[2] * h[2], 0), vh = Math.max(h[2], 0);
        const c = [0, 1, 2].map(i => {
          const F = f0[i] + (1 - f0[i]) * Math.pow(1 - vh, 5);
          const spec = D(nh, a) * G1(nl, k) * G1(nv, k) * F / (4 * nl * nv + 1e-4);
          const diff = (1 - F) * (1 - m) * base[i] / Math.PI;
          return (diff + spec) * light * nl + 0.03 * base[i];
        });
        img.data.set([srgb(c[0]), srgb(c[1]), srgb(c[2]), 255], at);
      }
    ctx.putImageData(img, 0, 0);
  }

  message = computed(() => {
    const r = this.roughness(), m = this.metallic();
    const kind = m > 0.5 ? 'A metal: no diffuse colour, and the reflection itself is tinted by the base colour.' : 'A dielectric: coloured diffuse light plus a white, untinted 4% reflection.';
    const hl = r < 0.2 ? 'The GGX peak is very tall and narrow: a small, intense highlight (it clips to white).' : r > 0.7 ? 'The distribution is wide and low: the highlight spreads over most of the lit side.' : 'Medium roughness: a soft highlight.';
    return `${kind} ${hl} The peak of D is ${this.peak().toFixed(1)}; the area under the curve (weighted by the cosine) stays the same, so wider means dimmer.`;
  });
}
