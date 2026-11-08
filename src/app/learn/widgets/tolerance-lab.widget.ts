import { Component, computed, signal } from '@angular/core';

type Tab = 'gap' | 'equal';

interface Case { label: string; expr: string; a: () => number; b: number; same: boolean; unit: string }

const CASES: Case[] = [
  { label: '0.1 added ten times', expr: 'sum of 0.1 × 10  vs  1.0', a: () => { let s = 0; for (let i = 0; i < 10; i++) s += 0.1; return s; }, b: 1, same: true, unit: '' },
  { label: '0.1 + 0.2', expr: '0.1 + 0.2  vs  0.3', a: () => 0.1 + 0.2, b: 0.3, same: true, unit: '' },
  { label: 'Rotated point', expr: '10 · cos(90°)  vs  0', a: () => 10 * Math.cos(Math.PI / 2), b: 0, same: true, unit: 'm' },
  { label: 'mm → ft → mm', expr: '(1000 mm → ft → mm)  vs  1000', a: () => (1000 / 304.8) * 304.8, b: 1000, same: true, unit: 'mm' },
  { label: 'Two real points 0.5 mm apart', expr: '1000.0 mm  vs  1000.5 mm', a: () => 1000, b: 1000.5, same: false, unit: 'mm' }
];

const TOLS: { label: string; v: number }[] = [
  { label: '== (exact)', v: 0 }, { label: '1e-12', v: 1e-12 }, { label: '1e-9', v: 1e-9 }, { label: '1e-6', v: 1e-6 }, { label: '1 (too big)', v: 1 }
];

/** Distances from the origin, in millimetres, for the precision slider. */
const DISTANCES = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000];
const DIST_LABEL = ['1 mm', '1 cm', '10 cm', '1 m', '10 m', '100 m', '1 km', '10 km', '100 km', '1000 km'];

/** Spacing between neighbouring floating-point values near x (mantissa bits: 23 for float, 52 for double). */
const gap = (x: number, bits: number) => 2 ** (Math.floor(Math.log2(x)) - bits);

/** How floating-point precision depends on magnitude, and why coordinates need a tolerance. */
@Component({
  selector: 'w-tolerance-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Precision and tolerance</h3></div>
      <div class="w-controls" role="group" aria-label="Tab">
        <button type="button" class="w-btn" [class.on]="tab() === 'gap'" (click)="tab.set('gap')" [attr.aria-pressed]="tab() === 'gap'">Precision vs distance</button>
        <button type="button" class="w-btn" [class.on]="tab() === 'equal'" (click)="tab.set('equal')" [attr.aria-pressed]="tab() === 'equal'">Equal or not?</button>
      </div>

      @if (tab() === 'gap') {
        <p class="w-hint">A coordinate stored in millimetres. How far apart are the neighbouring values a <code>float</code> and a <code>double</code> can hold at this distance from the origin?</p>
        <label class="w-field d-flex mb-3">Distance from the origin: <b>{{ distLabel() }}</b>
          <input type="range" min="0" [max]="dists.length - 1" step="1" [value]="di()" (input)="di.set(+$any($event.target).value)" />
        </label>
        <div class="w-label">One millimetre at this distance, with every value a float can store marked</div>
        <svg viewBox="0 0 340 46" class="ruler" role="img" [attr.aria-label]="'Float spacing ' + fmtLen(floatGap())">
          <rect x="10" y="12" width="320" height="18" rx="4" class="bar" />
          @if (ticks().length) {
            @for (t of ticks(); track $index) { <line [attr.x1]="10 + t * 320" y1="8" [attr.x2]="10 + t * 320" y2="34" class="tick" /> }
          } @else if (floatGap() < 1) {
            <rect x="10" y="12" width="320" height="18" rx="4" class="dense" />
          }
          <text x="10" y="44" class="rl">x</text>
          <text x="330" y="44" class="rl" text-anchor="end">x + 1 mm</text>
        </svg>
        <div class="tscroll mt-2">
          <table class="wtable"><tbody>
            <tr><th>Type</th><th>Gap between values</th><th>0.1 mm detail?</th></tr>
            <tr><td class="mono">float</td><td>{{ fmtLen(floatGap()) }}</td><td [class.ok]="floatGap() <= 0.1" [class.hl]="floatGap() > 0.1">{{ floatGap() <= 0.1 ? 'yes' : 'no' }}</td></tr>
            <tr><td class="mono">double</td><td>{{ fmtLen(doubleGap()) }}</td><td [class.ok]="doubleGap() <= 0.1" [class.hl]="doubleGap() > 0.1">{{ doubleGap() <= 0.1 ? 'yes' : 'no' }}</td></tr>
          </tbody></table>
        </div>
        <div class="w-msg" [class.ok]="floatGap() <= 0.1" [class.err]="floatGap() > 0.1" aria-live="polite"><span>{{ gapMessage() }}</span></div>
      } @else {
        <p class="w-hint">Pick a comparison and a tolerance. The test is <code>Math.Abs(a - b) &lt;= tol</code>; “exact” is plain <code>==</code>.</p>
        <div class="w-controls" role="group" aria-label="Comparison">
          @for (c of cases; track c.label; let i = $index) {
            <button type="button" class="w-btn" [class.on]="ci() === i" (click)="ci.set(i)" [attr.aria-pressed]="ci() === i">{{ c.label }}</button>
          }
        </div>
        <div class="w-controls" role="group" aria-label="Tolerance">
          <span class="w-label m-0">Tolerance</span>
          @for (t of tols; track t.label; let i = $index) {
            <button type="button" class="w-btn" [class.on]="ti() === i" (click)="ti.set(i)" [attr.aria-pressed]="ti() === i">{{ t.label }}</button>
          }
        </div>
        <div class="tscroll">
          <table class="wtable mono"><tbody>
            <tr><th>Comparison</th><td>{{ cs().expr }}</td></tr>
            <tr><th>a (as C# prints it)</th><td>{{ show(a()) }}</td></tr>
            <tr><th>b</th><td>{{ show(cs().b) }}</td></tr>
            <tr><th>|a − b|</th><td>{{ show(diff()) }}</td></tr>
            <tr><th>Treated as</th><td [class.ok]="correct()" [class.hl]="!correct()">{{ equal() ? 'the same' : 'different' }}</td></tr>
          </tbody></table>
        </div>
        <div class="w-msg" [class.ok]="correct()" [class.err]="!correct()" aria-live="polite"><span>{{ equalMessage() }}</span></div>
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .ruler { width: 100%; max-width: 460px; display: block; margin: 0 auto; }
    .bar { fill: var(--bg-main); stroke: var(--border-color); }
    .dense { fill: rgba(16, 185, 129, 0.35); stroke: #10b981; }
    .tick { stroke: #ef4444; stroke-width: 2; }
    .rl { font-size: 10px; fill: var(--text-muted); }
    .wtable th { text-align: left; white-space: nowrap; }
    .wtable td { text-align: left; word-break: break-all; }
    .w-field input { width: 100%; }
  `]
})
export class ToleranceLabWidget {
  readonly dists = DISTANCES;
  readonly cases = CASES;
  readonly tols = TOLS;
  tab = signal<Tab>('gap');
  di = signal(7);
  ci = signal(0);
  ti = signal(0);

  distLabel = computed(() => DIST_LABEL[this.di()]);
  floatGap = computed(() => gap(DISTANCES[this.di()], 23));
  doubleGap = computed(() => gap(DISTANCES[this.di()], 52));
  /** Positions (0..1) of float values inside one millimetre, when there are few enough to draw. */
  ticks = computed(() => {
    const g = this.floatGap();
    if (g < 1 / 40) return [];
    const out: number[] = [];
    for (let v = 0; v <= 1 + 1e-12; v += g) out.push(Math.min(v, 1));
    return out;
  });
  gapMessage = computed(() => {
    const f = this.floatGap(), d = DISTANCES[this.di()];
    const lost = Math.fround(d + 0.3) === Math.fround(d);
    if (f <= 0.1) return `At ${this.distLabel()} even a float is fine: it can step in ${this.fmtLen(f)}. A double steps in ${this.fmtLen(this.doubleGap())}.`;
    return `At ${this.distLabel()} a float can only step in ${this.fmtLen(f)}${lost ? `, so x + 0.3 mm == x: the detail vanishes` : ''}. A double still steps in ${this.fmtLen(this.doubleGap())}. This is why geometry should use double and stay near the origin.`;
  });

  cs = computed(() => CASES[this.ci()]);
  a = computed(() => this.cs().a());
  diff = computed(() => Math.abs(this.a() - this.cs().b));
  equal = computed(() => { const t = TOLS[this.ti()].v; return t === 0 ? this.a() === this.cs().b : this.diff() <= t; });
  correct = computed(() => this.equal() === this.cs().same);
  equalMessage = computed(() => {
    const c = this.cs(), t = TOLS[this.ti()];
    if (this.correct()) {
      if (!c.same) return `Correct: ${this.show(this.diff())} ${c.unit} is a real difference and this tolerance keeps the points apart.`;
      return t.v === 0 ? 'Correct this time: these two happen to be bit-for-bit equal. Do not count on it for computed values.' : `Correct: the rounding error (${this.show(this.diff())}) is inside the tolerance, so the values count as the same.`;
    }
    return c.same
      ? `Wrong: mathematically these are equal, but ${t.v === 0 ? '== demands every bit to match' : 'the tolerance is smaller than the rounding error'}. Walls that should join will not.`
      : `Wrong: these are genuinely different points, but a tolerance of ${t.label.split(' ')[0]} ${c.unit} merges them. A tolerance must stay far below the smallest real detail.`;
  });

  /** Shortest round-trip form, which is also what .NET prints for a double. */
  show(v: number) { return String(v).replace('e-', 'E-').replace('e+', 'E+'); }
  fmtLen(mm: number) {
    if (mm >= 1000) return `${+(mm / 1000).toPrecision(3)} m`;
    if (mm >= 1) return `${+mm.toPrecision(3)} mm`;
    if (mm >= 1e-3) return `${+(mm * 1000).toPrecision(3)} µm`;
    return `${+(mm * 1e6).toPrecision(3)} nm`;
  }
}
