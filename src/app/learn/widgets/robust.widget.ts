import { Component, computed, signal } from '@angular/core';

type Mode = 'naive' | 'eps' | 'exact';
const N = 40, CELL = 6, H = 2 ** -53;
const MODES: { k: Mode; label: string }[] = [
  { k: 'naive', label: 'Plain doubles' },
  { k: 'eps', label: 'With a tolerance' },
  { k: 'exact', label: 'Exact predicate' }
];

// q and r are on a line of slope 0.7 that passes 20 grid steps above p0 = (0.5, 0.5).
const QX = 17.3, QY = 0.5 + 0.7 * 16.8 + 20 * H, RX = 30.1, RY = 0.5 + 0.7 * 29.6 + 20 * H;

/** The plain double orientation test, pivoted at p. */
function orientDouble(px: number, py: number) {
  return (QX - px) * (RY - py) - (QY - py) * (RX - px);
}

/** Every coordinate here times 2⁶⁰ is a whole number, so BigInt evaluates the same formula with no rounding. */
const big = (x: number) => BigInt(x * 2 ** 60);
function orientExact(px: number, py: number) {
  const d = (big(QX) - big(px)) * (big(RY) - big(py)) - (big(QY) - big(py)) * (big(RX) - big(px));
  return d > 0n ? 1 : d < 0n ? -1 : 0;
}

/** Where the true line crosses column i, in grid steps above p0 (worked out exactly, then divided once). */
function lineRow(i: number) {
  const P5 = big(0.5), step = 128n;           // one grid step, 2⁻⁵³, is 2⁷ = 128 in units of 2⁻⁶⁰
  const num = (big(QY) - P5) * (big(RX) - big(QX)) + (big(RY) - big(QY)) * (P5 + BigInt(i * 128) - big(QX));
  return Number(num) / Number((big(RX) - big(QX)) * step);
}

/**
 * The orientation test on a grid of points 2⁻⁵³ apart (about 10⁻¹⁶ m), right next to the line through q and r.
 * Each cell is one point p = (0.5 + i·2⁻⁵³, 0.5 + j·2⁻⁵³), coloured by the sign of orient(p, q, r).
 */
@Component({
  selector: 'w-robust',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Left, right or on the line?</h3></div>
      <div class="w-controls" role="group" aria-label="How to compute the sign">
        @for (m of modes; track m.k) {
          <button type="button" class="w-btn" [class.on]="mode() === m.k" [attr.aria-pressed]="mode() === m.k" (click)="mode.set(m.k)">{{ m.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <svg [attr.viewBox]="'0 0 ' + (N * CELL + 2) + ' ' + (N * CELL + 2)" class="view" role="img" [attr.aria-label]="message()">
          @for (c of cells(); track c.k) {
            <rect [attr.x]="1 + c.i * CELL" [attr.y]="1 + (N - 1 - c.j) * CELL" [attr.width]="CELL" [attr.height]="CELL" [class]="'c ' + c.cls" />
          }
          <line [attr.x1]="truth[0]" [attr.y1]="truth[1]" [attr.x2]="truth[2]" [attr.y2]="truth[3]" class="truth" />
        </svg>
        <div>
          @if (mode() === 'eps') {
            <label class="w-field mb-2">tolerance ε = 10^{{ logEps() }}
              <input type="range" min="-15" max="-12" step="1" [value]="logEps()" (input)="logEps.set(+$any($event.target).value)" />
            </label>
          }
          <div class="legend mb-2">
            <span><i class="sw left"></i>left of the line</span>
            <span><i class="sw right"></i>right of the line</span>
            <span><i class="sw on"></i>{{ mode() === 'eps' ? 'too close to call' : 'exactly on it' }}</span>
            <span><i class="sw bad"></i>wrong sign</span>
          </div>
          <table class="wtable mono"><tbody>
            <tr><th>points tested</th><td>{{ N * N }}</td></tr>
            <tr><th>right answer</th><td class="ok">{{ stats().ok }}</td></tr>
            <tr><th>{{ mode() === 'eps' ? '“maybe”' : 'said “on the line” wrongly' }}</th><td>{{ stats().zero }}</td></tr>
            <tr><th>wrong side</th><td [class.hl]="stats().wrong > 0">{{ stats().wrong }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="stats().wrong > 0" [class.ok]="stats().wrong === 0" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 300px; display: block; margin: 0 auto; border: 1px solid var(--border-color); border-radius: 6px; }
    .c { stroke: none; }
    .c.left { fill: rgba(59, 130, 246, 0.55); }
    .c.right { fill: rgba(16, 185, 129, 0.5); }
    .c.on { fill: rgba(148, 163, 184, 0.35); }
    .c.bad { fill: #ef4444; }
    .truth { stroke: var(--text-main); stroke-width: 1.2; stroke-dasharray: 4 3; }
    .legend { display: grid; gap: 4px; font-size: 0.8rem; }
    .sw { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; vertical-align: -2px; }
    .sw.left { background: rgba(59, 130, 246, 0.55); }
    .sw.right { background: rgba(16, 185, 129, 0.5); }
    .sw.on { background: rgba(148, 163, 184, 0.35); }
    .sw.bad { background: #ef4444; }
  `]
})
export class RobustWidget {
  readonly N = N;
  readonly CELL = CELL;
  readonly modes = MODES;

  mode = signal<Mode>('naive');
  logEps = signal(-14);

  /** The true line, from the left edge to the right edge of the grid. */
  readonly truth = [0, N].map(i => [1 + i * CELL, 1 + (N - 0.5 - lineRow(i - 0.5)) * CELL]).flat();

  /** Each point’s computed sign, and its true sign (from the exact test). */
  cells = computed(() => {
    const mode = this.mode(), eps = 10 ** this.logEps(), out: { k: number; i: number; j: number; cls: string; got: number; truth: number }[] = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const px = 0.5 + i * H, py = 0.5 + j * H, truth = orientExact(px, py);
        let got: number;
        if (mode === 'exact') got = truth;
        else {
          const d = orientDouble(px, py);
          got = mode === 'eps' && Math.abs(d) < eps ? 0 : Math.sign(d);
        }
        const wrong = got !== 0 && got !== truth;
        const cls = wrong ? 'bad' : got > 0 ? 'left' : got < 0 ? 'right' : 'on';
        out.push({ k: j * N + i, i, j, cls, got, truth });
      }
    }
    return out;
  });

  stats = computed(() => {
    let ok = 0, zero = 0, wrong = 0;
    for (const c of this.cells()) {
      if (c.got === c.truth) ok++;
      else if (c.got === 0) zero++;
      else wrong++;
    }
    return { ok, zero, wrong };
  });

  message = computed(() => {
    const s = this.stats(), all = N * N;
    if (this.mode() === 'naive') return `The dashed line is the true line through q and r: points above it are on the left, points below on the right. Plain doubles put ${s.wrong} of ${all} points on the wrong side and call ${s.zero} more exactly collinear. The picture is bands of noise, not a clean edge.`;
    if (this.mode() === 'eps') return s.wrong
      ? `Any result smaller than ε counts as “maybe”, but the rounding errors here are about 6 × 10⁻¹⁴, bigger than ε, so ${s.wrong} points still land confidently on the wrong side. Raise ε one step.`
      : `Now every one of the ${all} points is “too close to call”. Near the line the errors are as big as the true values, so no ε separates right from wrong: it can only turn wrong answers into “don’t know”.`;
    return `The exact predicate computes the same formula without rounding, so every point lands on the correct side of the true line. Robust kernels run the fast double test first and only fall back to exact arithmetic when the double result is too small to trust.`;

  });
}
