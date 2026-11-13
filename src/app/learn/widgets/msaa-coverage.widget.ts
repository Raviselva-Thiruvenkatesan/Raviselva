import { Component, computed, signal } from '@angular/core';

const COLS = 10, ROWS = 6, CELL = 40;
const CX = COLS / 2, CY = ROWS / 2 + 0.17;           // a point on the edge, slightly off the pixel corners
// Vulkan's standard sample positions within a pixel (0..1), for each sample count
const PATTERNS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.75, 0.75], [0.25, 0.25]],
  4: [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]],
  8: [[0.5625, 0.3125], [0.4375, 0.6875], [0.8125, 0.5625], [0.3125, 0.1875], [0.1875, 0.8125], [0.0625, 0.4375], [0.6875, 0.9375], [0.9375, 0.0625]]
};
const toSrgb = (l: number) => Math.round(255 * (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));

/** A white shape's edge over a grid of pixels: coverage per sample and the resolved shade per pixel. */
@Component({
  selector: 'w-msaa-coverage',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Samples along an edge</h3></div>
      <div class="w-controls" role="group" aria-label="Samples per pixel">
        <span class="lbl">Samples</span>
        @for (n of counts; track n) { <button type="button" class="w-btn small mono" [class.on]="samples() === n" [attr.aria-pressed]="samples() === n" (click)="samples.set(n)">{{ n }}×</button> }
      </div>
      <label class="w-field"><span>Edge angle {{ angle() }}°</span>
        <input type="range" min="5" max="85" step="1" [value]="angle()" (input)="angle.set(+$any($event.target).value)" /></label>
      <svg [attr.viewBox]="'0 0 ' + cols * cell + ' ' + rows * cell" class="grid" role="img" [attr.aria-label]="edgePixels() + ' edge pixels with ' + samples() + ' samples'">
        @for (p of pixels(); track p.id) {
          <rect [attr.x]="p.x * cell" [attr.y]="p.y * cell" [attr.width]="cell" [attr.height]="cell" [attr.fill]="p.fill" class="px" />
        }
        <line [attr.x1]="edge().x1" [attr.y1]="edge().y1" [attr.x2]="edge().x2" [attr.y2]="edge().y2" class="shape" />
        @for (p of pixels(); track p.id) {
          @for (s of p.samples; track $index) { <circle [attr.cx]="(p.x + s.x) * cell" [attr.cy]="(p.y + s.y) * cell" r="3.2" [class.in]="s.in" class="smp" /> }
        }
      </svg>
      <p class="w-hint">Dots are sample points: filled when inside the white shape. Each pixel shows the resolved colour, the average of its samples in linear light, stored as sRGB.</p>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .lbl { font-size: 0.8rem; font-weight: 700; align-self: center; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; margin: 0.3rem 0; max-width: 360px; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .grid { width: 100%; max-width: 520px; display: block; margin: 0.4rem 0; border-radius: 6px; }
    .px { stroke: #4b5563; stroke-width: 0.6; }
    .shape { stroke: #f59e0b; stroke-width: 1.6; stroke-dasharray: 5 3; }
    .smp { fill: #111827; stroke: #f59e0b; stroke-width: 1.2; }
    .smp.in { fill: #f59e0b; }
  `]
})
export class MsaaCoverageWidget {
  readonly counts = [1, 2, 4, 8];
  readonly cols = COLS; readonly rows = ROWS; readonly cell = CELL;
  samples = signal(4);
  angle = signal(30);

  /** The edge passes near the grid's centre; the white shape is everything below it. */
  private inside(x: number, y: number) {
    const a = this.angle() * Math.PI / 180;
    return Math.cos(a) * (y - CY) - Math.sin(a) * (x - CX) > 0;
  }

  pixels = computed(() => {
    const pattern = PATTERNS[this.samples()], out = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const samples = pattern.map(([sx, sy]) => ({ x: sx, y: sy, in: this.inside(x + sx, y + sy) }));
        const coverage = samples.filter(s => s.in).length / samples.length;
        const v = toSrgb(coverage);
        out.push({ id: y * COLS + x, x, y, samples, coverage, fill: `rgb(${v}, ${v}, ${v})` });
      }
    return out;
  });

  /** The edge as a line across the grid, in SVG units. */
  edge = computed(() => {
    const a = this.angle() * Math.PI / 180, d = 12;              // long enough to cross the grid
    return { x1: (CX - Math.cos(a) * d) * CELL, y1: (CY - Math.sin(a) * d) * CELL, x2: (CX + Math.cos(a) * d) * CELL, y2: (CY + Math.sin(a) * d) * CELL };
  });

  edgePixels = computed(() => this.pixels().filter(p => p.coverage > 0 && p.coverage < 1).length);
  shades = computed(() => new Set(this.pixels().map(p => p.coverage)).size);

  message = computed(() => {
    const n = this.samples();
    if (n === 1) return 'One sample at each pixel centre: a pixel is either fully white or fully black, so the edge becomes a staircase.';
    return `${n} samples per pixel: ${this.edgePixels()} pixels are partly covered and get in-between shades (${this.shades()} different values here, at most ${n + 1}). The fragment shader still ran once per pixel; only coverage was tested ${n} times.`;
  });
}
