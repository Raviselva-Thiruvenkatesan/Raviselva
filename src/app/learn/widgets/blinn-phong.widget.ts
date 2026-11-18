import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const SIZE = 200;
const ALBEDO = [0.8, 0.3, 0.2];
const srgb = (l: number) => { const c = Math.min(1, Math.max(0, l)); return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };

/** A sphere lit by one directional light: ambient, Lambert diffuse and Phong or Blinn-Phong specular, computed per pixel. */
@Component({
  selector: 'w-blinn-phong',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Ambient, diffuse, specular</h3></div>
      <div class="w-controls" role="group" aria-label="Specular model">
        <button type="button" class="w-btn small" [class.on]="blinn()" [attr.aria-pressed]="blinn()" (click)="blinn.set(true)">Blinn-Phong (half vector)</button>
        <button type="button" class="w-btn small" [class.on]="!blinn()" [attr.aria-pressed]="!blinn()" (click)="blinn.set(false)">Phong (reflected light)</button>
        @for (t of terms; track t.id) {
          <button type="button" class="w-btn small" [class.on]="show()[t.id]" [attr.aria-pressed]="show()[t.id]" (click)="toggle(t.id)">{{ t.label }}</button>
        }
      </div>
      <div class="cols">
        <canvas #c [width]="size" [height]="size" role="img" aria-label="Shaded sphere"></canvas>
        <div class="sliders">
          <label class="w-field"><span>Light around: {{ azimuth() }}°</span><input type="range" min="-180" max="180" step="5" [value]="azimuth()" (input)="azimuth.set(+$any($event.target).value)" /></label>
          <label class="w-field"><span>Light height: {{ elevation() }}°</span><input type="range" min="-30" max="90" step="5" [value]="elevation()" (input)="elevation.set(+$any($event.target).value)" /></label>
          <label class="w-field"><span>Shininess: {{ shininess() }}</span><input type="range" min="1" max="8" step="1" [value]="shinyStep()" (input)="shinyStep.set(+$any($event.target).value)" /></label>
          <label class="w-field"><span>Ambient: {{ ambient().toFixed(2) }}</span><input type="range" min="0" max="0.3" step="0.01" [value]="ambient()" (input)="ambient.set(+$any($event.target).value)" /></label>
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
    .sliders { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
  `]
})
export class BlinnPhongWidget implements AfterViewInit {
  @ViewChild('c') canvas!: ElementRef<HTMLCanvasElement>;
  readonly size = SIZE;
  readonly terms = [{ id: 'a', label: 'Ambient' }, { id: 'd', label: 'Diffuse' }, { id: 's', label: 'Specular' }];
  blinn = signal(true);
  azimuth = signal(-40);
  elevation = signal(35);
  shinyStep = signal(5);
  ambient = signal(0.05);
  show = signal<Record<string, boolean>>({ a: true, d: true, s: true });
  shininess = computed(() => Math.pow(2, this.shinyStep()));
  private ready = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() { effect(() => { if (this.ready()) this.draw(); }); }
  ngAfterViewInit() { if (this.browser) this.ready.set(true); }
  toggle(id: string) { this.show.update(s => ({ ...s, [id]: !s[id] })); }

  /** Towards the light: azimuth around the view axis, elevation towards the viewer. The eye looks along -z. */
  private light = computed(() => {
    const az = this.azimuth() * Math.PI / 180, el = this.elevation() * Math.PI / 180;
    return [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el) * 0.6, Math.sin(el) + 0.25].map((v, _, a) => v / Math.hypot(...a));
  });

  private draw() {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(SIZE, SIZE), l = this.light(), show = this.show(), shin = this.shininess(), amb = this.ambient(), blinn = this.blinn();
    const h = [l[0], l[1], l[2] + 1].map((v, _, a) => v / Math.hypot(...a));
    for (let py = 0; py < SIZE; py++)
      for (let px = 0; px < SIZE; px++) {
        const x = (px + 0.5) / SIZE * 2.2 - 1.1, y = 1.1 - (py + 0.5) / SIZE * 2.2, r2 = x * x + y * y, at = (py * SIZE + px) * 4;
        if (r2 > 1) { img.data.set([11, 15, 23, 255], at); continue; }
        const n = [x, y, Math.sqrt(1 - r2)];
        const nl = n[0] * l[0] + n[1] * l[1] + n[2] * l[2], diffuse = Math.max(nl, 0);
        let spec = 0;
        if (diffuse > 0) {
          if (blinn) spec = Math.pow(Math.max(n[0] * h[0] + n[1] * h[1] + n[2] * h[2], 0), shin);
          else { const rz = 2 * nl * n[2] - l[2]; spec = Math.pow(Math.max(rz, 0), shin / 4); }       // reflect(-l, n) · v, v = +z
        }
        const c = ALBEDO.map(a => (show['a'] ? a * amb : 0) + (show['d'] ? a * diffuse : 0) + (show['s'] ? 0.5 * spec : 0));
        img.data.set([srgb(c[0]), srgb(c[1]), srgb(c[2]), 255], at);
      }
    ctx.putImageData(img, 0, 0);
  }

  message = computed(() => {
    const spec = this.blinn()
      ? `The highlight sits where n points along h, halfway between the light and the eye; shininess ${this.shininess()} sets its size.`
      : 'Phong compares the eye with the reflected light direction (here with shininess / 4, which gives a similar size). Move the light low and to the side: Phong’s highlight is cut off sharply, Blinn’s stretches naturally.';
    return this.elevation() < 0
      ? 'The light is behind the sphere: almost everything you see is ambient. That flat, colourless dark side is what image-based lighting (lesson 4) improves.'
      : `${spec} The diffuse term falls with the cosine towards the edge where n·l = 0 (the terminator); beyond it only ambient remains.`;
  });
}
