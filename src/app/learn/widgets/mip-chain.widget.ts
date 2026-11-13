import { Component, computed, signal } from '@angular/core';

const SIZES: [number, number][] = [[256, 256], [1024, 512], [1000, 600], [4096, 4096]];

/** A texture's mip chain, its memory, and which level the sampler reads for a given size on screen. */
@Component({
  selector: 'w-mip-chain',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which mip level?</h3></div>
      <div class="w-controls" role="group" aria-label="Texture size">
        <span class="lbl">Texture</span>
        @for (s of sizes; track $index) { <button type="button" class="w-btn small mono" [class.on]="size() === s" [attr.aria-pressed]="size() === s" (click)="size.set(s)">{{ s[0] }} × {{ s[1] }}</button> }
      </div>
      <label class="w-field"><span>Drawn on screen {{ screen() }} pixels wide: {{ ratio().toFixed(2) }} texels per pixel</span>
        <input type="range" min="0" max="100" step="1" [value]="slider()" (input)="slider.set(+$any($event.target).value)" /></label>
      <div class="chain" role="list">
        @for (l of levels(); track l.i) {
          <div class="lvl" role="listitem" [class.pick]="l.weight > 0">
            <span class="mono n">Level {{ l.i }}</span>
            <div class="track"><div class="bar" [style.width.%]="l.pct"></div></div>
            <span class="mono sz">{{ l.w }} × {{ l.h }}</span>
            <span class="mono wt">{{ l.weight > 0 ? (l.weight * 100).toFixed(0) + '%' : '' }}</span>
          </div>
        }
      </div>
      <p class="w-hint">Bars show each level’s width. Memory at 4 bytes per texel: level 0 {{ mib(base()) }}, whole chain {{ mib(total()) }} (+{{ ((total() / base() - 1) * 100).toFixed(1) }}%).</p>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .lbl { font-size: 0.8rem; font-weight: 700; align-self: center; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; margin: 0.3rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .chain { display: flex; flex-direction: column; gap: 3px; margin: 0.4rem 0; }
    .lvl { display: grid; grid-template-columns: 4.2rem 1fr 6.4rem 2.6rem; gap: 6px; align-items: center; font-size: 0.74rem; padding: 1px 4px; border-radius: 6px; }
    .lvl.pick { background: rgba(16, 185, 129, 0.15); outline: 1.5px solid #10b981; }
    .track { height: 9px; background: var(--bg-main); border-radius: 5px; border: 1px solid var(--border-color); overflow: hidden; }
    .bar { height: 100%; background: #8b5cf6; min-width: 2px; }
    .sz { text-align: right; } .wt { text-align: right; font-weight: 700; color: #10b981; }
    @media (max-width: 420px) { .lvl { grid-template-columns: 3.8rem 1fr 5.6rem 2.4rem; font-size: 0.7rem; } }
  `]
})
export class MipChainWidget {
  readonly sizes = SIZES;
  size = signal<[number, number]>(SIZES[0]);
  slider = signal(55);

  /** Screen width in pixels, on a logarithmic slider from 1 pixel to twice the texture width. */
  screen = computed(() => Math.max(1, Math.round(Math.pow(2 * this.size()[0], this.slider() / 100))));
  ratio = computed(() => this.size()[0] / this.screen());
  lod = computed(() => Math.max(0, Math.log2(this.ratio())));
  count = computed(() => Math.floor(Math.log2(Math.max(...this.size()))) + 1);
  levels = computed(() => {
    const [w0, h0] = this.size(), n = this.count(), lod = Math.min(this.lod(), n - 1);
    const lo = Math.floor(lod), f = lod - lo;
    const out = [];
    let w = w0, h = h0;
    for (let i = 0; i < n; i++) {
      const weight = i === lo ? 1 - f : i === lo + 1 ? f : 0;
      out.push({ i, w, h, pct: w / w0 * 100, weight: weight > 0.005 ? weight : 0 });
      w = Math.max(1, Math.floor(w / 2)); h = Math.max(1, Math.floor(h / 2));
    }
    return out;
  });
  base = computed(() => this.size()[0] * this.size()[1] * 4);
  total = computed(() => this.levels().reduce((s, l) => s + l.w * l.h * 4, 0));
  mib(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MiB` : `${(bytes / 1024).toFixed(0)} KiB`; }

  message = computed(() => {
    const r = this.ratio(), lod = this.lod(), picked = this.levels().filter(l => l.weight > 0);
    if (r <= 1) return `Magnified: each texel covers ${(1 / r).toFixed(1)} pixels, so LOD is 0 and the sampler reads level 0 with the magnification filter.`;
    const which = picked.length === 2 ? `blends level ${picked[0].i} (${(picked[0].weight * 100).toFixed(0)}%) and level ${picked[1].i}` : `reads level ${picked[0].i}`;
    return `Minified: ${r.toFixed(2)} texels per pixel gives LOD log₂ ${r.toFixed(2)} = ${lod.toFixed(2)}, so a trilinear sampler ${which}. Without mipmaps it would read level 0 and skip ${Math.max(0, r - 1).toFixed(1)} texels between neighbouring pixels.`;
  });
}
