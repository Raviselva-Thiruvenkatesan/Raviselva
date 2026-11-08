import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

const DATA = [2, 4, 4, 4, 7, 7, 9, 12, 12, 12, 12, 15];
type Mode = 'lower' | 'upper';
interface Frame { lo: number; hi: number; mid: number; say: string; done?: boolean }

function trace(a: number[], x: number, mode: Mode): Frame[] {
  const cond = (v: number) => (mode === 'lower' ? v >= x : v > x);
  const sign = mode === 'lower' ? '≥' : '>';
  let lo = 0, hi = a.length;
  const out: Frame[] = [{ lo, hi, mid: -1, say: `Find the FIRST index where a[i] ${sign} ${x}. The answer is somewhere in [lo, hi) = [0, ${hi}).` }];
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (cond(a[mid])) {
      out.push({ lo, hi, mid, say: `a[${mid}] = ${a[mid]} ${sign} ${x} is true. The first true is at ${mid} or earlier: hi = ${mid}.` });
      hi = mid;
    } else {
      out.push({ lo, hi, mid, say: `a[${mid}] = ${a[mid]} ${sign} ${x} is false. The first true must be after ${mid}: lo = ${mid + 1}.` });
      lo = mid + 1;
    }
  }
  out.push({ lo, hi, mid: -1, done: true, say: lo === a.length
    ? `lo = hi = ${lo} = Length: no element is ${sign} ${x}.`
    : `lo = hi = ${lo}: the first index where a[i] ${sign} ${x}.` });
  return out;
}

/** Lower and upper bound on a sorted array with duplicates, seen as "find the first true". */
@Component({
  selector: 'w-bounds-finder',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>First true: lower and upper bound</h3></div>
      <p class="w-hint">The row of F/T is the question asked at each index. In a sorted array it is always all F, then all T. Binary search finds where T starts.</p>
      <div class="w-controls" role="group" aria-label="Value">
        <span class="w-label m-0">x</span>
        @for (v of values; track v) { <button type="button" class="w-btn mono" [class.on]="x() === v" (click)="setX(v)">{{ v }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Question">
        <button type="button" class="w-btn" [class.on]="mode() === 'lower'" (click)="setMode('lower')">lower bound: first a[i] ≥ x</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'upper'" (click)="setMode('upper')">upper bound: first a[i] &gt; x</button>
      </div>

      <div class="cells" aria-hidden="true">
        @for (v of data; track $index; let i = $index) {
          <div class="cell" [class.out]="i < f().lo || i >= f().hi" [class.mid]="i === f().mid" [class.ans]="f().done && i === f().lo">
            <span class="v mono">{{ v }}</span>
            <span class="i mono">{{ i }}</span>
            <span class="p mono" [class.t]="pred(v)">{{ pred(v) ? 'T' : 'F' }}</span>
          </div>
        }
        <div class="cell end" [class.ans]="f().done && f().lo === data.length"><span class="v mono">end</span><span class="i mono">{{ data.length }}</span><span class="p"></span></div>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="!!f().done">Step</button>
        <button type="button" class="w-btn" (click)="run()" [disabled]="!!f().done">Run</button>
        <span class="small">lower = <b class="mono">{{ lower() }}</b>, upper = <b class="mono">{{ upper() }}</b> → {{ x() }} appears <b>{{ upper() - lower() }}</b> {{ upper() - lower() === 1 ? 'time' : 'times' }}</span>
      </div>
      <div class="w-msg" [class.ok]="f().done" [class.info]="!f().done" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px; }
    @media (min-width: 700px) { .cells { grid-template-columns: repeat(13, minmax(0, 1fr)); } }
    .cell { display: flex; flex-direction: column; align-items: center; border: 1.5px solid rgba(139, 92, 246, 0.45); border-radius: 7px; padding: 3px 0; background: var(--bg-main); transition: all 0.25s; min-width: 0; }
    .cell.end { border-style: dashed; }
    .cell .v { font-weight: 700; font-size: 0.88rem; }
    .cell.end .v { font-size: 0.68rem; font-weight: 600; color: var(--text-muted); }
    .cell .i { font-size: 0.6rem; color: var(--text-muted); }
    .cell .p { font-size: 0.68rem; font-weight: 700; color: #dc2626; min-height: 1em; }
    .cell .p.t { color: #059669; }
    .cell.out { opacity: 0.3; }
    .cell.mid { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); opacity: 1; }
    .cell.ans { border-color: #10b981; background: rgba(16, 185, 129, 0.25); opacity: 1; }
  `]
})
export class BoundsFinderWidget {
  readonly data = DATA;
  readonly values = [4, 12, 7, 10, 1, 20];
  x = signal(12);
  mode = signal<Mode>('lower');
  frames = signal(trace(DATA, 12, 'lower'));
  idx = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  f = computed(() => this.frames()[this.idx()]);
  lower = computed(() => DATA.findIndex(v => v >= this.x()) < 0 ? DATA.length : DATA.findIndex(v => v >= this.x()));
  upper = computed(() => DATA.findIndex(v => v > this.x()) < 0 ? DATA.length : DATA.findIndex(v => v > this.x()));

  pred(v: number) { return this.mode() === 'lower' ? v >= this.x() : v > this.x(); }
  setX(v: number) { this.x.set(v); this.reset(); }
  setMode(m: Mode) { this.mode.set(m); this.reset(); }
  step() { this.idx.update(i => Math.min(i + 1, this.frames().length - 1)); }
  run() {
    clearTimeout(this.timer);
    const tick = () => { this.step(); if (!this.f().done) this.timer = setTimeout(tick, 650); };
    tick();
  }
  private reset() { clearTimeout(this.timer); this.frames.set(trace(DATA, this.x(), this.mode())); this.idx.set(0); }
}
