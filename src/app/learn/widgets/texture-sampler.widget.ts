import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type Filter = 'nearest' | 'linear';
type Address = 'repeat' | 'mirror' | 'clamp';
const N = 4, SIZE = 192;
// A 4 x 4 texture: a brick-like pattern in sRGB bytes
const TEXELS: [number, number, number][] = [
  [178, 74, 52], [178, 74, 52], [230, 220, 200], [178, 74, 52],
  [230, 220, 200], [230, 220, 200], [230, 220, 200], [230, 220, 200],
  [178, 74, 52], [230, 220, 200], [178, 74, 52], [178, 74, 52],
  [230, 220, 200], [230, 220, 200], [230, 220, 200], [230, 220, 200]
];
const toLinear = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = (l: number) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));
const LINEAR = TEXELS.map(t => t.map(toLinear));

/** Sample a 4 x 4 texture the way a Vulkan sampler does: filter, address mode and UV range, in linear light. */
@Component({
  selector: 'w-texture-sampler',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A sampler at work</h3></div>
      <div class="w-controls" role="group" aria-label="Filter">
        <span class="lbl">Filter</span>
        @for (f of filters; track f) { <button type="button" class="w-btn small" [class.on]="filter() === f" [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">{{ f }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Address mode">
        <span class="lbl">Address</span>
        @for (a of addresses; track a.id) { <button type="button" class="w-btn small" [class.on]="address() === a.id" [attr.aria-pressed]="address() === a.id" (click)="address.set(a.id)">{{ a.label }}</button> }
      </div>
      <label class="w-field"><span>UVs across the square: 0 to {{ uvMax() }}</span>
        <input type="range" min="0.5" max="3" step="0.25" [value]="uvMax()" (input)="uvMax.set(+$any($event.target).value)" /></label>
      <div class="pics">
        <figure><canvas #out [width]="size" [height]="size" role="img" [attr.aria-label]="'Sampled result, ' + filter() + ' filter, ' + address()"></canvas><figcaption>On screen: {{ size }} × {{ size }} pixels</figcaption></figure>
        <figure><canvas #src width="4" height="4" class="texture" role="img" aria-label="The 4 by 4 texture"></canvas><figcaption>The texture: 4 × 4 texels</figcaption></figure>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .lbl { font-size: 0.8rem; font-weight: 700; align-self: center; min-width: 4rem; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; margin: 0.3rem 0; max-width: 360px; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .pics { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; margin: 0.4rem 0; }
    figure { margin: 0; display: flex; flex-direction: column; gap: 4px; }
    figcaption { font-size: 0.74rem; color: var(--text-muted); }
    canvas { width: 192px; height: 192px; border-radius: 6px; border: 1.5px solid var(--border-color); image-rendering: pixelated; }
    canvas.texture { width: 96px; height: 96px; }
  `]
})
export class TextureSamplerWidget implements AfterViewInit {
  @ViewChild('out') out!: ElementRef<HTMLCanvasElement>;
  @ViewChild('src') src!: ElementRef<HTMLCanvasElement>;
  readonly size = SIZE;
  readonly filters: Filter[] = ['nearest', 'linear'];
  readonly addresses: { id: Address; label: string }[] = [{ id: 'repeat', label: 'Repeat' }, { id: 'mirror', label: 'MirroredRepeat' }, { id: 'clamp', label: 'ClampToEdge' }];
  filter = signal<Filter>('nearest');
  address = signal<Address>('repeat');
  uvMax = signal(1);
  private ready = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() { effect(() => { if (this.ready()) this.draw(this.filter(), this.address(), this.uvMax()); }); }

  ngAfterViewInit() {
    if (!this.browser) return;                  // no canvas while prerendering
    const ctx = this.src.nativeElement.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(N, N);
      TEXELS.forEach((t, i) => { img.data.set([...t, 255], i * 4); });
      ctx.putImageData(img, 0, 0);
    }
    this.ready.set(true);
  }

  /** Texel index for an integer coordinate under the address mode. */
  private wrap(i: number, a: Address) {
    if (a === 'clamp') return Math.min(N - 1, Math.max(0, i));
    if (a === 'repeat') return ((i % N) + N) % N;
    const period = 2 * N, m = ((i % period) + period) % period;
    return m < N ? m : period - 1 - m;
  }
  private texel(x: number, y: number, a: Address) { return LINEAR[this.wrap(y, a) * N + this.wrap(x, a)]; }

  private sample(u: number, v: number, f: Filter, a: Address): number[] {
    const x = u * N - 0.5, y = v * N - 0.5;                              // texel centres sit at .5
    if (f === 'nearest') return this.texel(Math.floor(x + 0.5), Math.floor(y + 0.5), a);
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const c00 = this.texel(x0, y0, a), c10 = this.texel(x0 + 1, y0, a), c01 = this.texel(x0, y0 + 1, a), c11 = this.texel(x0 + 1, y0 + 1, a);
    return [0, 1, 2].map(k => (c00[k] * (1 - fx) + c10[k] * fx) * (1 - fy) + (c01[k] * (1 - fx) + c11[k] * fx) * fy);
  }

  private draw(f: Filter, a: Address, uvMax: number) {
    const ctx = this.out?.nativeElement.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(SIZE, SIZE);
    for (let py = 0; py < SIZE; py++)
      for (let px = 0; px < SIZE; px++) {
        const c = this.sample((px + 0.5) / SIZE * uvMax, (py + 0.5) / SIZE * uvMax, f, a);
        img.data.set([toSrgb(c[0]), toSrgb(c[1]), toSrgb(c[2]), 255], (py * SIZE + px) * 4);
      }
    ctx.putImageData(img, 0, 0);
  }

  message = computed(() => {
    const per = (SIZE / (N * this.uvMax())).toFixed(0);
    const f = this.filter() === 'nearest'
      ? `Nearest: each pixel copies one texel, so each texel is a sharp ${per} × ${per}-pixel block.`
      : 'Linear: each pixel blends the four nearest texels by distance, in linear light, so the blocks melt into gradients.';
    if (this.uvMax() <= 1) return f + ' The UVs stay within 0 to 1, so the address mode makes no difference yet: drag the UV range above 1.';
    const a = this.address() === 'repeat' ? 'Repeat tiles the texture: only the fractional part of the UV counts.'
      : this.address() === 'mirror' ? 'MirroredRepeat flips every other tile, so the edges always match.'
      : 'ClampToEdge reads the edge texels for every UV above 1, smearing them out.';
    return `${f} ${a}`;
  });
}
