import { Component, computed, signal } from '@angular/core';

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Presets, each defined by its slope (rise / run). */
const PRESETS = [
  { label: '2% fall', slope: 0.02 },
  { label: '1:12 ramp', slope: 1 / 12 },
  { label: '6 in 12 roof', slope: 0.5 },
  { label: '30° roof', slope: Math.tan(rad(30)) },
  { label: '100% (45°)', slope: 1 }
];

/** One slope, shown as an angle, a ratio, a percentage and a roof pitch, with rise and rafter for a given run. */
@Component({
  selector: 'w-roof-pitch',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One slope, four ways to write it</h3></div>
      <p class="w-hint">Set the run and the angle, or pick a preset. The triangle is drawn to scale.</p>
      <div class="w-controls" role="group" aria-label="Presets">
        @for (pr of presets; track pr.label) { <button type="button" class="w-btn" [class.on]="isPreset(pr.slope)" (click)="setSlope(pr.slope)">{{ pr.label }}</button> }
      </div>
      <div class="w-grid two">
        <div>
          <svg viewBox="0 0 340 200" class="tri" role="img" [attr.aria-label]="'Slope of ' + angle().toFixed(1) + ' degrees'">
            <polygon [attr.points]="points()" class="shape" />
            <path [attr.d]="angleArc()" class="arc" />
            <rect [attr.x]="geo().x1 - 10" [attr.y]="geo().y0 - 10" width="10" height="10" class="sq" />
            <text [attr.x]="(geo().x0 + geo().x1) / 2" [attr.y]="geo().y0 + 16" text-anchor="middle" class="lab">run {{ run().toFixed(2) }} m</text>
            <text [attr.x]="geo().x1 + 6" [attr.y]="(geo().y0 + geo().y1) / 2 + 4" class="lab">rise {{ rise().toFixed(2) }} m</text>
            <text [attr.x]="(geo().x0 + geo().x1) / 2 - 8" [attr.y]="(geo().y0 + geo().y1) / 2 - 8" text-anchor="end" class="lab rf">rafter {{ rafter().toFixed(2) }} m</text>
            <text [attr.x]="geo().x0 + 38" [attr.y]="geo().y0 - 6" class="lab th">θ</text>
          </svg>
          <label class="w-field d-flex mt-2">Run {{ run().toFixed(1) }} m
            <input type="range" min="1" max="8" step="0.5" [value]="run()" (input)="run.set(+$any($event.target).value)" />
          </label>
          <label class="w-field d-flex mt-2">Angle θ = {{ angle().toFixed(2) }}°
            <input type="range" min="0.5" max="60" step="0.5" [value]="angle()" (input)="angle.set(+$any($event.target).value)" />
          </label>
        </div>
        <div>
          <table class="wtable"><tbody>
            <tr><th>Angle</th><td class="mono">{{ angle().toFixed(2) }}°</td></tr>
            <tr><th>Percentage</th><td class="mono">{{ pct().toFixed(2) }}%</td></tr>
            <tr><th>Ratio</th><td class="mono">1 : {{ ratio() }}</td></tr>
            <tr><th>Roof pitch</th><td class="mono">{{ (slope() * 12).toFixed(2) }} in 12</td></tr>
            <tr><th>Rise over the run</th><td class="mono">{{ rise().toFixed(3) }} m</td></tr>
            <tr><th>Sloping length</th><td class="mono">{{ rafter().toFixed(3) }} m</td></tr>
          </tbody></table>
          <div class="small mt-2 mono formula">
            rise = run · tan θ<br />
            rafter = run / cos θ = √(run² + rise²)<br />
            % = rise / run · 100
          </div>
        </div>
      </div>
      <div class="w-msg" [class.ok]="slope() <= 1 / 12 + 1e-9" [class.info]="slope() > 1 / 12 + 1e-9" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tri { width: 100%; max-width: 440px; display: block; margin: 0 auto; }
    .shape { fill: rgba(139, 92, 246, 0.15); stroke: #8b5cf6; stroke-width: 2; stroke-linejoin: round; }
    .arc { fill: none; stroke: #f59e0b; stroke-width: 2; }
    .sq { fill: none; stroke: var(--text-muted); stroke-width: 1; }
    .lab { font-size: 11px; font-weight: 700; fill: var(--text-main); paint-order: stroke; stroke: var(--bg-secondary); stroke-width: 4px; }
    .lab.rf { fill: #7c3aed; }
    .lab.th { fill: #d97706; font-size: 13px; }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; }
    .formula { color: var(--text-muted); line-height: 1.7; }
    .w-field input { width: 100%; }
  `]
})
export class RoofPitchWidget {
  readonly presets = PRESETS;
  run = signal(4);
  angle = signal(30);

  slope = computed(() => Math.tan(rad(this.angle())));
  rise = computed(() => this.run() * this.slope());
  rafter = computed(() => this.run() / Math.cos(rad(this.angle())));
  pct = computed(() => this.slope() * 100);
  ratio = computed(() => { const n = 1 / this.slope(); return n >= 10 ? n.toFixed(1) : n.toFixed(2); });

  /** Fit the triangle in the drawing: scale so that both the run and the rise fit. */
  geo = computed(() => {
    const k = Math.min(250 / this.run(), 150 / Math.max(this.rise(), 1e-9));
    const x0 = 30, y0 = 180, x1 = x0 + this.run() * k, y1 = y0 - this.rise() * k;
    return { x0, y0, x1, y1 };
  });
  points = computed(() => { const g = this.geo(); return `${g.x0},${g.y0} ${g.x1},${g.y0} ${g.x1},${g.y1}`; });
  angleArc = computed(() => {
    const g = this.geo(), r = 30, a = rad(this.angle());
    return `M${g.x0 + r},${g.y0} A${r},${r} 0 0 0 ${(g.x0 + r * Math.cos(a)).toFixed(1)},${(g.y0 - r * Math.sin(a)).toFixed(1)}`;
  });

  message = computed(() => {
    const s = this.slope(), a = this.angle();
    const mm = (s * 1000).toFixed(0);
    if (s <= 1 / 12 + 1e-9) return `Gentle: ${mm} mm of rise per metre. As a ramp this is within 1:12 (8.33%, 4.76°), the steepest many accessibility codes allow.`;
    if (Math.abs(s - 1) < 1e-9) return 'Rise equals run: 100% is 45°, not 90°. A vertical face would be an infinite percentage.';
    if (a < 15) return `Too steep for an accessible ramp (steeper than 1:12), but this is a typical low roof or a car-park ramp: ${mm} mm of rise per metre.`;
    return `A ${a.toFixed(1)}° slope rises ${mm} mm per metre. Note how the percentage (${this.pct().toFixed(1)}%) grows much faster than the angle as the slope gets steeper.`;
  });

  setSlope(s: number) { this.angle.set(+deg(Math.atan(s)).toFixed(4)); }
  isPreset(s: number) { return Math.abs(this.angle() - +deg(Math.atan(s)).toFixed(4)) < 1e-9; }
}
