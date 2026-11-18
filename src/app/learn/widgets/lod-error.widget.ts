import { Component, computed, signal } from '@angular/core';

const LEVELS = [48, 16, 6], RADIUS = 0.2, H = 600, FOV = 45;
const error = (sides: number) => RADIUS * (1 - Math.cos(Math.PI / sides));
const ppm = (d: number) => H / 2 / (d * Math.tan(FOV * Math.PI / 360));

/** A round column at a chosen distance: its levels' errors in pixels, the level chosen, and the shape drawn large. */
@Component({
  selector: 'w-lod-error',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Choosing a level from pixels</h3></div>
      <div class="sliders">
        <label class="w-field"><span>Distance: {{ distance().toFixed(1) }} m ({{ pixels().toFixed(0) }} px per metre)</span>
          <input type="range" min="0" max="100" step="1" [value]="slider()" (input)="slider.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Tolerance: {{ tolerance() }} pixel</span>
          <input type="range" min="0.25" max="2" step="0.25" [value]="tolerance()" (input)="tolerance.set(+$any($event.target).value)" /></label>
      </div>
      <div class="cols">
        <svg viewBox="-110 -110 220 220" class="shape" role="img" [attr.aria-label]="'Cross-section with ' + chosenSides() + ' sides'">
          <circle r="100" class="circle" />
          <polygon [attr.points]="polygon()" class="poly" />
          <text y="4" class="big">{{ diameterPx().toFixed(1) }} px wide on screen</text>
        </svg>
        <div class="tscroll"><table class="wtable mono">
          <thead><tr><th scope="col">Sides</th><th scope="col">Triangles</th><th scope="col">Error</th><th scope="col">On screen</th></tr></thead>
          <tbody>@for (r of rows(); track r.sides) { <tr [class.pick]="r.chosen"><td>{{ r.sides }}</td><td>{{ r.sides * 4 }}</td><td>{{ r.mm }} mm</td><td>{{ r.px }} px</td></tr> }</tbody>
        </table></div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 4px 14px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .cols { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin: 0.5rem 0; }
    .shape { width: 180px; height: 180px; background: #0b0f17; border-radius: 10px; }
    .circle { fill: none; stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 4 3; }
    .poly { fill: rgba(139, 92, 246, 0.35); stroke: #8b5cf6; stroke-width: 1.5; }
    .big { font-size: 13px; fill: #e2e8f0; text-anchor: middle; font-weight: 700; }
    .wtable { font-size: 0.76rem; }
    tr.pick td { background: rgba(34, 197, 94, 0.18); font-weight: 700; }
  `]
})
export class LodErrorWidget {
  slider = signal(40);
  tolerance = signal(1);
  /** The slider is logarithmic: 0.5 m to 100 m. */
  distance = computed(() => 0.5 * Math.pow(200, this.slider() / 100));
  pixels = computed(() => ppm(this.distance()));
  diameterPx = computed(() => 2 * RADIUS * this.pixels());
  chosen = computed(() => {
    let level = 0;
    LEVELS.forEach((s, i) => { if (i > 0 && error(s) * this.pixels() <= this.tolerance()) level = i; });
    return level;
  });
  chosenSides = computed(() => LEVELS[this.chosen()]);
  rows = computed(() => LEVELS.map((sides, i) => ({ sides, mm: (error(sides) * 1000).toFixed(2), px: (error(sides) * this.pixels()).toFixed(2), chosen: i === this.chosen() })));
  polygon = computed(() => {
    const n = this.chosenSides();
    return Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * i / n; return `${(100 * Math.cos(a)).toFixed(2)},${(100 * Math.sin(a)).toFixed(2)}`; }).join(' ');
  });
  message = computed(() => {
    const s = this.chosenSides(), e = error(s) * this.pixels();
    return `At ${this.distance().toFixed(1)} m the column is ${this.diameterPx().toFixed(1)} pixels wide. The coarsest level within ${this.tolerance()} pixel is ${s} sides (${s * 4} triangles): it strays from the true circle by ${e.toFixed(2)} pixels, too little to see. The drawing is enlarged to the same size at every distance; on screen, the error is what the table says.`;
  });
}
