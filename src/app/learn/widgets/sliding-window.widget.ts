import { Component, computed, signal } from '@angular/core';

type Mode = 'fixed' | 'grow';
interface Frame { l: number; r: number; sum: number; best: number; bestL: number; bestR: number; ops: number; say: string; act: 'add' | 'drop' | 'slide' | 'none' }

const LOADS = [4, 2, 7, 1, 8, 3, 5, 6, 2, 9];

/** Fixed size k: build the first window, then slide (add the new day, drop the oldest). */
function fixedTrace(k: number): Frame[] {
  const a = LOADS, f: Frame[] = [];
  let sum = 0, ops = 0;
  for (let i = 0; i < k; i++) {
    sum += a[i]; ops++;
    f.push({ l: 0, r: i, sum, best: i === k - 1 ? sum : 0, bestL: 0, bestR: i === k - 1 ? k - 1 : -1, ops, act: 'add', say: i < k - 1 ? `Build the first window: add day ${i} (${a[i]}). Sum = ${sum}.` : `First window (days 0–${k - 1}) complete. Sum = ${sum}. Best so far.` });
  }
  let best = sum, bl = 0;
  for (let r = k; r < a.length; r++) {
    sum += a[r] - a[r - k]; ops += 2;
    const better = sum > best;
    if (better) { best = sum; bl = r - k + 1; }
    f.push({ l: r - k + 1, r, sum, best, bestL: bl, bestR: bl + k - 1, ops, act: 'slide', say: `Slide: + day ${r} (${a[r]}), − day ${r - k} (${a[r - k]}). Sum = ${sum}${better ? '. New best!' : `. Best is still ${best}.`}` });
  }
  const brute = k * (a.length - k + 1);
  f.push({ l: bl, r: bl + k - 1, sum: best, best, bestL: bl, bestR: bl + k - 1, ops, act: 'none', say: `Busiest ${k} days: days ${bl}–${bl + k - 1}, total ${best}. ${ops} additions/subtractions in total; re-adding every window from scratch would take ${brute}.` });
  return f;
}

/** Variable size: grow on the right; while the sum is over the limit, shrink from the left. */
function growTrace(limit: number): Frame[] {
  const a = LOADS, f: Frame[] = [];
  let l = 0, sum = 0, ops = 0, best = 0, bl = 0, br = -1;
  for (let r = 0; r < a.length; r++) {
    sum += a[r]; ops++;
    f.push({ l, r, sum, best, bestL: bl, bestR: br, ops, act: 'add', say: `Grow: add day ${r} (${a[r]}). Sum = ${sum}${sum > limit ? ` > ${limit}: too much.` : ` ≤ ${limit}: fine.`}` });
    while (sum > limit) {
      sum -= a[l]; ops++;
      l++;
      f.push({ l, r, sum, best, bestL: bl, bestR: br, ops, act: 'drop', say: `Shrink: drop day ${l - 1} (${a[l - 1]}). Sum = ${sum}${sum > limit ? `, still over ${limit}.` : '.'}` });
    }
    if (r - l + 1 > best) {
      best = r - l + 1; bl = l; br = r;
      f[f.length - 1] = { ...f[f.length - 1], best, bestL: bl, bestR: br, say: f[f.length - 1].say + ` Window of ${best} day${best > 1 ? 's' : ''} is the new longest.` };
    }
  }
  f.push({ l: bl, r: br, sum: a.slice(bl, br + 1).reduce((s, x) => s + x, 0), best, bestL: bl, bestR: br, ops, act: 'none', say: `Longest stretch within ${limit}: ${best} days (days ${bl}–${br}). Each day entered the window once and left at most once: ${ops} steps, O(n).` });
  return f;
}

/** A window over the array that slides instead of being recomputed. */
@Component({
  selector: 'w-sliding-window',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A sliding window</h3></div>
      <p class="w-hint">Steel delivered per day (tonnes). The window is a run of consecutive days. When it moves, update the sum with what enters and what leaves. Never re-add the whole window.</p>
      <div class="w-controls" role="group" aria-label="Window type">
        <button type="button" class="w-btn" [class.on]="mode() === 'fixed'" (click)="setMode('fixed')" [attr.aria-pressed]="mode() === 'fixed'">Fixed size: busiest k days</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'grow'" (click)="setMode('grow')" [attr.aria-pressed]="mode() === 'grow'">Variable size: longest run within a limit</button>
      </div>
      <div class="w-controls" role="group" [attr.aria-label]="mode() === 'fixed' ? 'Window size' : 'Limit'">
        @if (mode() === 'fixed') {
          <span class="w-label m-0">k</span>
          @for (x of ks; track x) { <button type="button" class="w-btn" [class.on]="k() === x" (click)="setK(x)" [attr.aria-pressed]="k() === x">{{ x }}</button> }
        } @else {
          <span class="w-label m-0">Limit (t)</span>
          @for (x of limits; track x) { <button type="button" class="w-btn" [class.on]="limit() === x" (click)="setLimit(x)" [attr.aria-pressed]="limit() === x">{{ x }}</button> }
        }
      </div>

      <div class="cells mono">
        @for (v of loads; track $index; let i = $index) {
          <div class="cell">
            <span class="c" [class.win]="i >= f().l && i <= f().r" [class.enter]="i === f().r && f().act !== 'none' && f().act !== 'drop'" [class.left]="(f().act === 'drop' || f().act === 'slide') && i === f().l - 1">{{ v }}</span>
            <small>{{ i }}</small>
            <span class="best" [class.on]="i >= f().bestL && i <= f().bestR"></span>
          </div>
        }
      </div>
      <p class="small text-muted mt-1 mb-0">Purple = current window · green underline = best window so far</p>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small">Window sum <b>{{ f().sum }}</b> · {{ mode() === 'fixed' ? 'Best sum' : 'Longest' }} <b>{{ f().best }}</b> · Steps <b>{{ f().ops }}</b></span>
      </div>
      <div class="w-msg" [class.ok]="atEnd()" [class.info]="!atEnd()" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; }
    .cell { display: flex; flex-direction: column; align-items: center; min-width: 0; }
    .c { width: 100%; text-align: center; padding: 5px 0; border-radius: 7px; border: 1.5px solid var(--border-color); background: var(--bg-main); font-weight: 700; transition: all 0.2s; }
    .c.win { border-color: rgba(139, 92, 246, 0.7); background: rgba(139, 92, 246, 0.22); }
    .c.enter { border-color: #f59e0b; }
    .c.left { border-style: dashed; border-color: #ef4444; opacity: 0.6; }
    .cell small { font-size: 0.62rem; color: var(--text-muted); }
    .best { display: block; width: 100%; height: 4px; border-radius: 2px; margin-top: 2px; }
    .best.on { background: #10b981; }
  `]
})
export class SlidingWindowWidget {
  readonly loads = LOADS;
  readonly ks = [3, 4, 5];
  readonly limits = [12, 15];
  mode = signal<Mode>('fixed');
  k = signal(3);
  limit = signal(12);
  idx = signal(0);
  frames = computed(() => (this.mode() === 'fixed' ? fixedTrace(this.k()) : growTrace(this.limit())));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);

  setMode(m: Mode) { this.mode.set(m); this.idx.set(0); }
  setK(x: number) { this.k.set(x); this.idx.set(0); }
  setLimit(x: number) { this.limit.set(x); this.idx.set(0); }
}
