import { Component, computed, signal } from '@angular/core';

type Mode = 'd24' | 'd32' | 'reversed';
const NEARS = [0.01, 0.05, 0.1, 0.5, 1, 5];
const FAR = 1000;
const DISTANCES = [1, 10, 50, 100, 500, 999];

/** The gap between a float32 and the next one up: the smallest step a D32Sfloat value can take there. */
function floatStep(x: number): number {
  if (x <= 0) return 1.4e-45;
  const e = Math.floor(Math.log2(x));
  return Math.pow(2, Math.max(e, -126) - 23);
}

/** Where depth precision goes: depth against distance for a near plane you choose, and the smallest distance step per format. */
@Component({
  selector: 'w-depth-precision',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where does depth precision go?</h3></div>
      <div class="w-controls" role="group" aria-label="Near plane">
        <span class="lbl">Near plane</span>
        @for (n of nears; track n) { <button type="button" class="w-btn small mono" [class.on]="near() === n" [attr.aria-pressed]="near() === n" (click)="near.set(n)">{{ n }} m</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Depth format">
        <span class="lbl">Format</span>
        @for (m of modes; track m.id) { <button type="button" class="w-btn small" [class.on]="mode() === m.id" [attr.aria-pressed]="mode() === m.id" (click)="mode.set(m.id)">{{ m.label }}</button> }
      </div>
      <svg viewBox="0 0 420 170" class="plot" role="img" [attr.aria-label]="'Depth against distance, near plane ' + near() + ' m, far plane 1000 m'">
        <rect x="40" y="10" width="370" height="130" class="frame" />
        @for (t of yTicks; track t) { <line x1="40" [attr.y1]="140 - t * 130" x2="410" [attr.y2]="140 - t * 130" class="grid" /><text x="34" [attr.y]="144 - t * 130" class="tick end">{{ t }}</text> }
        @for (t of xTicks(); track t.d) { <line [attr.x1]="t.x" y1="10" [attr.x2]="t.x" y2="140" class="grid" /><text [attr.x]="t.x" y="154" class="tick mid">{{ t.d }}</text> }
        <polyline [attr.points]="curve()" class="curve" />
        <text x="225" y="167" class="tick mid">distance (m, logarithmic)</text>
      </svg>
      <div class="tw"><table class="wtable mono">
        <thead><tr><th scope="col">Distance</th><th scope="col">Stored depth</th><th scope="col">Smallest step there</th></tr></thead>
        <tbody>@for (r of rows(); track r.d) { <tr [class.bad]="r.step > 0.01"><td>{{ r.d }} m</td><td>{{ r.depth }}</td><td>{{ r.stepText }}</td></tr> }</tbody>
      </table></div>
      <div class="w-msg" [class.ok]="ok()" [class.err]="!ok()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .lbl { font-size: 0.8rem; font-weight: 700; align-self: center; min-width: 4.6rem; }
    .plot { width: 100%; max-width: 520px; display: block; margin: 0.4rem 0; }
    .frame { fill: none; stroke: var(--border-color); }
    .grid { stroke: var(--border-color); stroke-width: 0.5; }
    .tick { font-size: 9px; fill: var(--text-muted); font-family: monospace; }
    .tick.end { text-anchor: end; } .tick.mid { text-anchor: middle; }
    .curve { fill: none; stroke: #8b5cf6; stroke-width: 2.2; }
    .tw { overflow-x: auto; }
    .wtable { font-size: 0.74rem; }
    tr.bad td { color: #dc2626; font-weight: 700; }
  `]
})
export class DepthPrecisionWidget {
  readonly nears = NEARS;
  readonly modes: { id: Mode; label: string }[] = [
    { id: 'd24', label: 'D24 (24-bit integer)' }, { id: 'd32', label: 'D32 float' }, { id: 'reversed', label: 'D32 float, reversed Z' }
  ];
  readonly yTicks = [0, 0.5, 1];
  near = signal(0.1);
  mode = signal<Mode>('d32');

  /** Normal depth: 0 at the near plane, 1 at the far plane. Reversed: 1 - that. */
  depth(z: number) { const n = this.near(); const d = FAR / (FAR - n) * (1 - n / z); return this.mode() === 'reversed' ? 1 - d : d; }
  /** Distance difference that changes the stored depth by one step. */
  step(z: number) {
    const n = this.near(), slope = FAR * n / ((FAR - n) * z * z);       // |d depth / d distance|
    const d = this.depth(z);
    const s = this.mode() === 'd24' ? 1 / 16777216 : floatStep(d);
    return s / slope;
  }
  private xOf(z: number) { const n = this.near(); return 40 + Math.log(z / n) / Math.log(FAR / n) * 370; }
  xTicks = computed(() => [this.near(), 1, 10, 100, 1000].filter((d, i, a) => d >= this.near() && a.indexOf(d) === i).map(d => ({ d, x: this.xOf(d) })));
  curve = computed(() => {
    const n = this.near(), pts: string[] = [];
    for (let i = 0; i <= 120; i++) { const z = n * Math.pow(FAR / n, i / 120); pts.push(`${this.xOf(z).toFixed(1)},${(140 - this.depth(z) * 130).toFixed(1)}`); }
    return pts.join(' ');
  });
  rows = computed(() => DISTANCES.filter(d => d > this.near()).map(d => {
    const step = this.step(d);
    return { d, step, depth: this.depth(d).toFixed(7), stepText: step < 0.001 ? `${(step * 1000).toFixed(4)} mm` : step < 1 ? `${(step * 1000).toFixed(1)} mm` : `${step.toFixed(2)} m` };
  }));
  ok = computed(() => this.step(500) < 0.005);
  message = computed(() => {
    const at500 = this.step(500), half = this.near() * 2 * FAR / (FAR + this.near());
    const mm = at500 < 1 ? `${(at500 * 1000).toFixed(at500 < 0.001 ? 3 : 1)} mm` : `${at500.toFixed(1)} m`;
    if (this.mode() === 'reversed') return `Reversed Z: at 500 m the depth can change in steps of ${mm}. Distant depths sit near 0, where floats are densest, which cancels most of the perspective squeeze.`;
    return `Half of the whole depth range is used before ${half.toFixed(2)} m. At 500 m the smallest step is ${mm}: surfaces closer together than that z-fight.` +
      (this.mode() === 'd32' ? ' Above depth 0.5 a float has the same 2⁻²⁴ steps as a 24-bit integer, so D32 alone gains nothing far away: try reversed Z.'
        : this.near() < 0.5 ? ' Try moving the near plane out.' : '');
  });
}
