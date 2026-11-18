import { Component, computed, signal } from '@angular/core';

type Op = 'clamp' | 'reinhard' | 'aces';
const VALUES = [0.125, 0.25, 0.5, 1, 2, 4, 8, 16];
const srgb = (l: number) => { const c = Math.min(1, Math.max(0, l)); return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
const APPLY: Record<Op, (x: number) => number> = {
  clamp: x => Math.min(1, Math.max(0, x)),
  reinhard: x => x / (1 + x),
  aces: x => Math.min(1, Math.max(0, x * (2.51 * x + 0.03) / (x * (2.43 * x + 0.59) + 0.14)))
};
const X0 = 34, X1 = 410, Y0 = 170, Y1 = 12, LOG_MIN = -4, LOG_MAX = 6;   // x axis: log2 of the value, -4 (1/16) to 6 (64)

/** Tone-mapping curves on a logarithmic axis, with the lesson's brightness chart mapped through the chosen one. */
@Component({
  selector: 'w-tone-curves',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From HDR to the screen</h3></div>
      <div class="w-controls" role="group" aria-label="Operator">
        @for (o of ops; track o.id) { <button type="button" class="w-btn small" [class.on]="op() === o.id" [attr.aria-pressed]="op() === o.id" (click)="op.set(o.id)"><span class="sw" [style.background]="o.color"></span>{{ o.label }}</button> }
      </div>
      <label class="w-field"><span>Exposure: {{ exposure() < 1 ? '1/' + (1 / exposure()) : exposure() }} ({{ stops() > 0 ? '+' : '' }}{{ stops() }} stops)</span>
        <input type="range" min="-4" max="3" step="1" [value]="stops()" (input)="stops.set(+$any($event.target).value)" /></label>
      <svg viewBox="0 0 420 196" class="plot" role="img" aria-label="Tone-mapping curves">
        @for (t of ticks; track t.v) { <line [attr.x1]="t.x" [attr.y1]="Y1" [attr.x2]="t.x" [attr.y2]="Y0" class="grid" /><text [attr.x]="t.x" [attr.y]="Y0 + 12" class="tick">{{ t.v }}</text> }
        <line [attr.x1]="X0" [attr.y1]="Y1" [attr.x2]="X1" [attr.y2]="Y1" class="grid" /><text [attr.x]="X0 - 4" [attr.y]="Y1 + 4" class="tick end">1</text><text [attr.x]="X0 - 4" [attr.y]="Y0" class="tick end">0</text>
        @for (o of ops; track o.id) { <polyline [attr.points]="curve(o.id)" [attr.stroke]="o.color" class="curve" [class.on]="o.id === op()" /> }
        @for (v of values; track v) { <circle [attr.cx]="xOf(v)" [attr.cy]="yOf(mapped(v))" r="3.5" class="dot" /> }
        <text [attr.x]="(X0 + X1) / 2" y="194" class="tick">scene value (logarithmic)</text>
      </svg>
      <div class="chart">
        @for (v of values; track v) { <div class="patch" [style.background]="swatch(v)"><span>{{ v }}</span></div> }
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; max-width: 320px; margin: 0.3rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .plot { width: 100%; max-width: 520px; display: block; }
    .grid { stroke: var(--border-color); stroke-width: 0.6; }
    .tick { font-size: 9px; fill: var(--text-muted); text-anchor: middle; } .tick.end { text-anchor: end; }
    .curve { fill: none; stroke-width: 1.4; opacity: 0.45; } .curve.on { stroke-width: 2.6; opacity: 1; }
    .dot { fill: #f59e0b; stroke: #fff; stroke-width: 1; }
    .chart { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; margin: 0.5rem 0; max-width: 520px; }
    .patch { height: 38px; border-radius: 6px; display: flex; align-items: flex-end; justify-content: center; }
    .patch span { font-size: 0.66rem; font-weight: 700; color: #f59e0b; text-shadow: 0 0 3px #000; }
  `]
})
export class ToneCurvesWidget {
  readonly X0 = X0; readonly X1 = X1; readonly Y0 = Y0; readonly Y1 = Y1;
  readonly values = VALUES;
  readonly ops: { id: Op; label: string; color: string }[] = [{ id: 'clamp', label: 'Clamp', color: '#ef4444' }, { id: 'reinhard', label: 'Reinhard', color: '#0891b2' }, { id: 'aces', label: 'ACES', color: '#8b5cf6' }];
  readonly ticks = [-4, -2, 0, 2, 4, 6].map(e => ({ v: e < 0 ? `1/${2 ** -e}` : String(2 ** e), x: X0 + (e - LOG_MIN) / (LOG_MAX - LOG_MIN) * (X1 - X0) }));
  op = signal<Op>('aces');
  stops = signal(0);
  exposure = computed(() => Math.pow(2, this.stops()));

  xOf(v: number) { return X0 + (Math.log2(v) - LOG_MIN) / (LOG_MAX - LOG_MIN) * (X1 - X0); }
  yOf(m: number) { return Y0 - m * (Y0 - Y1); }
  mapped(v: number, op: Op = this.op()) { return APPLY[op](v * this.exposure()); }
  curve(op: Op) {
    const pts: string[] = [];
    for (let i = 0; i <= 100; i++) { const v = Math.pow(2, LOG_MIN + i / 100 * (LOG_MAX - LOG_MIN)); pts.push(`${this.xOf(v).toFixed(1)},${this.yOf(this.mapped(v, op)).toFixed(1)}`); }
    return pts.join(' ');
  }
  swatch(v: number) { const s = srgb(this.mapped(v)); return `rgb(${s}, ${s}, ${s})`; }

  distinct = computed(() => new Set(VALUES.map(v => srgb(this.mapped(v)))).size);
  message = computed(() => {
    const d = this.distinct(), clipped = VALUES.filter(v => srgb(this.mapped(v)) === 255).length;
    const base = `${d} of 8 patches can be told apart${clipped ? `; ${clipped} clip to pure white` : ''}.`;
    switch (this.op()) {
      case 'clamp': return `${base} Clamping keeps the darks exact and throws away everything above 1.`;
      case 'reinhard': return `${base} Reinhard never reaches 1, so nothing clips, but every value is squeezed and the image looks flat.`;
      default: return `${base} ACES lifts contrast in the midtones and rolls the highlights off gently, like film. Change the exposure to slide the chart along the curve.`;
    }
  });
}
