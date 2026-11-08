import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

type Pivot = 'last' | 'middle';
type Input = 'random' | 'sorted';
interface Frame { a: number[]; lo: number; hi: number; pivot: number; i: number; j: number; fixed: number[]; say: string; comps: number; depth: number; maxDepth: number }

const INPUTS: Record<Input, number[]> = {
  random: [7, 2, 9, 4, 10, 1, 6, 3, 8, 5],
  sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
};

function trace(src: number[], pivotRule: Pivot): Frame[] {
  const a = [...src], out: Frame[] = [];
  const fixed = new Set<number>();
  let comps = 0, maxDepth = 0;
  const push = (f: Omit<Frame, 'a' | 'fixed' | 'comps' | 'maxDepth'>) =>
    out.push({ ...f, a: [...a], fixed: [...fixed], comps, maxDepth });

  push({ lo: 0, hi: a.length - 1, pivot: -1, i: -1, j: -1, depth: 0, say: 'Quick sort: pick a pivot, move smaller values to its left and bigger ones to its right, then sort each side the same way.' });

  const sort = (lo: number, hi: number, depth: number) => {
    if (lo > hi) return;
    if (lo === hi) { fixed.add(lo); return; }
    maxDepth = Math.max(maxDepth, depth);   // count only levels that really partition
    if (pivotRule === 'middle') {
      const mid = lo + Math.floor((hi - lo) / 2);
      [a[mid], a[hi]] = [a[hi], a[mid]];
    }
    const p = a[hi];
    let i = lo;
    push({ lo, hi, pivot: hi, i, j: -1, depth, say: `Partition index ${lo}..${hi} (depth ${depth}). Pivot = ${p}${pivotRule === 'middle' ? ' (the middle value, moved to the end)' : ' (the last value)'}.` });
    for (let j = lo; j < hi; j++) {
      comps++;
      if (a[j] < p) {
        [a[i], a[j]] = [a[j], a[i]];
        i++;
        // highlight the value that just joined the "smaller" zone; the boundary is now after it
        push({ lo, hi, pivot: hi, i, j: i - 1, depth, say: `${a[i - 1]} < ${p}: swap it into the "smaller" zone at index ${i - 1}.` });
      } else {
        push({ lo, hi, pivot: hi, i, j, depth, say: `${a[j]} ≥ ${p}: leave it in the "bigger" zone.` });
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    fixed.add(i);
    push({ lo, hi, pivot: i, i, j: -1, depth, say: `Put the pivot ${p} at index ${i}: everything left of it is smaller, everything right is bigger. ${p} is in its final place.` });
    sort(lo, i - 1, depth + 1);
    sort(i + 1, hi, depth + 1);
  };
  sort(0, a.length - 1, 1);
  for (let k = 0; k < a.length; k++) fixed.add(k);
  push({ lo: 0, hi: -1, pivot: -1, i: -1, j: -1, depth: 0, say: `Sorted with ${comps} comparisons. Deepest recursion: ${maxDepth} levels.` });
  return out;
}

/** Quick sort with Lomuto partitioning; compare pivot choices on random and already sorted input. */
@Component({
  selector: 'w-quick-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Partitioning around a pivot</h3></div>
      <p class="w-hint">Red is the pivot. The amber bar is being checked. Values left of the dashed line are smaller than the pivot. Green bars are in their final place.</p>
      <div class="w-controls" role="group" aria-label="Input">
        <span class="w-label m-0">Input</span>
        <button type="button" class="w-btn" [class.on]="input() === 'random'" (click)="setInput('random')">Random</button>
        <button type="button" class="w-btn" [class.on]="input() === 'sorted'" (click)="setInput('sorted')">Already sorted</button>
        <span class="w-label m-0 ms-2">Pivot</span>
        <button type="button" class="w-btn" [class.on]="pivot() === 'last'" (click)="setPivot('last')">last item</button>
        <button type="button" class="w-btn" [class.on]="pivot() === 'middle'" (click)="setPivot('middle')">middle item</button>
      </div>

      <div class="bars" aria-hidden="true">
        @for (v of f().a; track $index; let k = $index) {
          <div class="bar-col" [class.dim]="!inRange(k)">
            <div class="bar" [style.height.%]="v * 9 + 6" [class.pivot]="k === f().pivot" [class.cur]="k === f().j" [class.fixed]="f().fixed.includes(k) && k !== f().pivot"
                 [class.small]="inRange(k) && k < f().i && k !== f().pivot"></div>
            <span class="mono">{{ v }}</span>
            <span class="edge" [class.on]="k === f().i && f().j >= 0"></span>
          </div>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="play()" [disabled]="atEnd()"><i class="bi bi-play-fill" aria-hidden="true"></i> Play</button>
        <button type="button" class="w-btn" (click)="restart()">Restart</button>
        <span class="small">Comparisons <b>{{ f().comps }}</b> · Deepest level <b>{{ f().maxDepth }}</b></span>
      </div>
      <div class="w-msg" [class.err]="atEnd() && f().maxDepth >= 9" [class.info]="!(atEnd() && f().maxDepth >= 9)" aria-live="polite">
        <span>{{ f().say }}@if (atEnd() && f().maxDepth >= 9) { The pivot was always the largest value, so each partition only removed one item: the worst case, O(n²).}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .bars { display: flex; align-items: flex-end; gap: 5px; height: 150px; padding: 8px 8px 4px; border-radius: 12px; background: var(--bg-main); border: 1px solid var(--border-color); }
    .bar-col { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; min-width: 0; transition: opacity 0.2s; }
    .bar-col.dim { opacity: 0.35; }
    .bar-col > span.mono { font-size: 0.72rem; margin-top: 2px; }
    .bar { width: 100%; max-width: 40px; border-radius: 6px 6px 2px 2px; background: rgba(139, 92, 246, 0.45); transition: height 0.25s, background 0.2s; }
    .bar.small { background: rgba(6, 182, 212, 0.6); }
    .bar.fixed { background: rgba(16, 185, 129, 0.65); }
    .bar.cur { background: #f59e0b; }
    .bar.pivot { background: #ef4444; }
    .edge { position: absolute; left: -3.5px; top: 0; bottom: 18px; border-left: 2px dashed transparent; }
    .edge.on { border-left-color: #0891b2; }
  `]
})
export class QuickVizWidget {
  input = signal<Input>('random');
  pivot = signal<Pivot>('last');
  idx = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  frames = computed(() => trace(INPUTS[this.input()], this.pivot()));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);

  inRange(k: number) { const f = this.f(); return f.hi < 0 || (k >= f.lo && k <= f.hi); }
  setInput(i: Input) { this.input.set(i); this.restart(); }
  setPivot(p: Pivot) { this.pivot.set(p); this.restart(); }
  restart() { clearTimeout(this.timer); this.idx.set(0); }
  step() { this.idx.update(i => Math.min(i + 1, this.frames().length - 1)); }
  play() {
    clearTimeout(this.timer);
    const tick = () => { this.step(); if (!this.atEnd()) this.timer = setTimeout(tick, 300); };
    tick();
  }
}
