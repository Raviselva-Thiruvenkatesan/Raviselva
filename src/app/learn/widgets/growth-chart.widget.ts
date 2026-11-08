import { Component, computed, signal } from '@angular/core';

interface Curve { id: string; label: string; color: string; f: (n: number) => number; log10: (n: number) => number; example: string }

const CURVES: Curve[] = [
  { id: '1', label: 'O(1)', color: '#10b981', f: () => 1, log10: () => 0, example: 'array[i], Dictionary lookup' },
  { id: 'log', label: 'O(log n)', color: '#06b6d4', f: n => Math.log2(n), log10: n => Math.log10(Math.log2(n)), example: 'binary search' },
  { id: 'n', label: 'O(n)', color: '#8b5cf6', f: n => n, log10: n => Math.log10(n), example: 'one loop over the data' },
  { id: 'nlogn', label: 'O(n log n)', color: '#f59e0b', f: n => n * Math.log2(n), log10: n => Math.log10(n) + Math.log10(Math.log2(n)), example: 'good sorting (merge sort)' },
  { id: 'n2', label: 'O(n²)', color: '#ef4444', f: n => n * n, log10: n => 2 * Math.log10(n), example: 'a loop inside a loop' },
  { id: '2n', label: 'O(2ⁿ)', color: '#be185d', f: n => 2 ** n, log10: n => n * Math.log10(2), example: 'trying every subset' }
];

const W = 340, H = 210, PAD = 30;
/** Simple operations per second on a typical laptop core (order of magnitude). */
const OPS_PER_SEC = 1e8;

/** Plot the common growth rates and show how long each takes for a chosen input size. */
@Component({
  selector: 'w-growth-chart',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>How fast does the work grow?</h3></div>
      <p class="w-hint">Turn curves on and off. Drag <span class="mono">n</span> to make the input bigger and watch which curves leave the chart.</p>

      <div class="w-controls" role="group" aria-label="Curves">
        @for (c of curves; track c.id) {
          <button type="button" class="w-btn" [class.on]="shown().has(c.id)" (click)="toggle(c.id)" [attr.aria-pressed]="shown().has(c.id)">
            <span class="dot" [style.background]="c.color" aria-hidden="true"></span>{{ c.label }}</button>
        }
      </div>

      <div class="w-grid two">
        <div>
          <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="'Growth curves for n from 1 to ' + xMax()">
            <line [attr.x1]="PAD" [attr.y1]="H - PAD" [attr.x2]="W - 6" [attr.y2]="H - PAD" class="axis" />
            <line [attr.x1]="PAD" [attr.y1]="6" [attr.x2]="PAD" [attr.y2]="H - PAD" class="axis" />
            <text [attr.x]="W - 6" [attr.y]="H - 10" text-anchor="end" class="lbl">n = {{ xMax() }}</text>
            <text [attr.x]="PAD - 4" y="14" text-anchor="end" class="lbl">{{ yMax() }}</text>
            <text [attr.x]="PAD - 4" [attr.y]="H - PAD" text-anchor="end" class="lbl">0</text>
            <text [attr.x]="(W + PAD) / 2" [attr.y]="H - 10" text-anchor="middle" class="lbl">input size n →</text>
            @for (p of paths(); track p.id) {
              <path [attr.d]="p.d" [attr.stroke]="p.color" fill="none" stroke-width="2.5" stroke-linecap="round" />
            }
          </svg>
          <label class="w-field mt-1 d-flex">n on the chart: {{ xMax() }}
            <input type="range" min="8" max="64" step="1" [value]="xMax()" (input)="xMax.set(+$any($event.target).value)" aria-label="Largest n on the chart">
          </label>
        </div>

        <div>
          <div class="w-controls mb-2" role="group" aria-label="Input size for the table">
            <span class="w-label m-0">Input size</span>
            @for (s of sizes; track s.n) {
              <button type="button" class="w-btn" [class.on]="size() === s.n" (click)="size.set(s.n)" [attr.aria-pressed]="size() === s.n">{{ s.label }}</button>
            }
          </div>
          <div class="table-wrap">
            <table class="mono">
              <thead><tr><th scope="col">Growth</th><th scope="col">Steps</th><th scope="col">Time*</th></tr></thead>
              <tbody>
                @for (r of rows(); track r.label) {
                  <tr [class.slow]="r.slow"><td><span class="dot" [style.background]="r.color" aria-hidden="true"></span>{{ r.label }}</td><td>{{ r.steps }}</td><td>{{ r.time }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <p class="small text-muted mt-1 mb-0">*At about 100 million simple steps per second.</p>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><i class="bi bi-lightbulb" aria-hidden="true"></i><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    svg { width: 100%; height: auto; display: block; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; }
    .axis { stroke: var(--text-muted); stroke-width: 1; opacity: 0.6; }
    .lbl { font-size: 10px; fill: var(--text-muted); }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 4px; vertical-align: middle; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { padding: 4px 6px; border-bottom: 1px solid var(--border-color); text-align: left; white-space: nowrap; }
    td:last-child { white-space: normal; min-width: 7.5em; }
    tr.slow td { color: #dc2626; }
  `]
})
export class GrowthChartWidget {
  readonly curves = CURVES;
  readonly W = W; readonly H = H; readonly PAD = PAD;
  readonly sizes = [
    { n: 10, label: '10' }, { n: 1_000, label: '1 thousand' }, { n: 1_000_000, label: '1 million' }, { n: 1_000_000_000, label: '1 billion' }
  ];
  shown = signal(new Set(['1', 'log', 'n', 'nlogn', 'n2', '2n']));
  xMax = signal(20);
  size = signal(1_000_000);

  /** The y axis is 3n, so O(n) stays visible and O(n²) / O(2ⁿ) shoot off the top. */
  yMax = computed(() => this.xMax() * 3);

  toggle(id: string) {
    this.shown.update(s => { const c = new Set(s); if (c.has(id)) c.delete(id); else c.add(id); return c; });
  }

  paths = computed(() => {
    const xm = this.xMax(), ym = this.yMax();
    const sx = (n: number) => PAD + ((n - 1) / (xm - 1)) * (W - PAD - 8);
    const sy = (v: number) => H - PAD - (Math.min(v, ym * 1.05) / ym) * (H - PAD - 8);
    return CURVES.filter(c => this.shown().has(c.id)).map(c => {
      const pts: string[] = [];
      for (let i = 0; i <= 120; i++) {
        const n = 1 + (i / 120) * (xm - 1);
        const v = c.f(n);
        pts.push(`${sx(n).toFixed(1)},${sy(v).toFixed(1)}`);
        if (v > ym * 1.05) break; // left the chart
      }
      return { id: c.id, color: c.color, d: 'M' + pts.join(' L') };
    });
  });

  rows = computed(() => {
    const n = this.size();
    return CURVES.map(c => {
      const lg = c.log10(n);
      return { label: c.label, color: c.color, steps: this.steps(lg), time: this.time(lg - Math.log10(OPS_PER_SEC)), slow: lg - Math.log10(OPS_PER_SEC) > 0 };
    });
  });

  message = computed(() => {
    const n = this.size();
    if (n <= 10) return 'For tiny inputs every algorithm is instant, even O(2ⁿ). Big-O matters when the data grows.';
    if (n <= 1_000) return 'At a thousand items O(n²) is still fine (a million steps), but O(2ⁿ) already needs more time than the universe has existed.';
    return 'At this size the shape of the curve decides everything: O(n log n) finishes in a blink while O(n²) takes hours or years. Faster hardware cannot fix a bad growth rate.';
  });

  /** Format 10^lg as a readable count. */
  private steps(lg: number) {
    if (lg < 15) return Math.round(10 ** lg).toLocaleString('en-US');
    return `10^${Math.round(lg)}`;
  }

  /** Format 10^lg seconds. */
  private time(lg: number) {
    const s = 10 ** Math.min(lg, 300);
    if (lg > 17.6) return 'longer than the universe has existed';
    if (s < 1e-6) return '< 1 µs';
    if (s < 1e-3) return `${(s * 1e6).toFixed(0)} µs`;
    if (s < 1) return `${(s * 1e3).toFixed(0)} ms`;
    if (s < 60) return `${s.toFixed(1)} s`;
    if (s < 3600) return `${(s / 60).toFixed(0)} min`;
    if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
    if (s < 3.15e7) return `${(s / 86400).toFixed(0)} days`;
    return `${(s / 3.15e7).toLocaleString('en-US', { maximumFractionDigits: 0 })} years`;
  }
}
