import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

type Algo = 'bubble' | 'selection' | 'insertion';
type Input = 'random' | 'nearly' | 'reversed';
interface Frame { a: number[]; hl: number[]; sorted: number[]; say: string; comps: number; moves: number; key?: number }

const INPUTS: Record<Input, number[]> = {
  random: [5, 2, 8, 1, 9, 3, 7, 4],
  nearly: [1, 2, 4, 3, 5, 6, 8, 7],
  reversed: [9, 8, 7, 5, 4, 3, 2, 1]
};

function bubble(src: number[]): Frame[] {
  const a = [...src], n = a.length, out: Frame[] = [];
  let comps = 0, moves = 0;
  const done = new Set<number>();
  out.push({ a: [...a], hl: [], sorted: [], comps, moves, say: 'Bubble sort: compare neighbours and swap them if they are in the wrong order. The biggest value bubbles to the end each pass.' });
  for (let pass = 0; pass < n - 1; pass++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - pass; j++) {
      comps++;
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]]; moves++; swapped = true;
        out.push({ a: [...a], hl: [j, j + 1], sorted: [...done], comps, moves, say: `${a[j + 1]} > ${a[j]}: swap.` });
      } else {
        out.push({ a: [...a], hl: [j, j + 1], sorted: [...done], comps, moves, say: `${a[j]} ≤ ${a[j + 1]}: already in order.` });
      }
    }
    done.add(n - 1 - pass);
    if (!swapped) {
      for (let k = 0; k < n; k++) done.add(k);
      out.push({ a: [...a], hl: [], sorted: [...done], comps, moves, say: `No swaps in this pass, so the array is sorted. Stop early. ${comps} comparisons, ${moves} swaps.` });
      return out;
    }
    out.push({ a: [...a], hl: [], sorted: [...done], comps, moves, say: `End of pass ${pass + 1}: ${a[n - 1 - pass]} is in its final place.` });
  }
  done.add(0);
  out.push({ a: [...a], hl: [], sorted: [...done], comps, moves, say: `Sorted. ${comps} comparisons, ${moves} swaps.` });
  return out;
}

function selection(src: number[]): Frame[] {
  const a = [...src], n = a.length, out: Frame[] = [];
  let comps = 0, moves = 0;
  const done: number[] = [];
  out.push({ a: [...a], hl: [], sorted: [], comps, moves, say: 'Selection sort: find the smallest value in the unsorted part and swap it to the front of that part.' });
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      comps++;
      if (a[j] < a[min]) min = j;
      out.push({ a: [...a], hl: [j], key: min, sorted: [...done], comps, moves, say: `Smallest so far: ${a[min]} (index ${min}).` });
    }
    if (min !== i) { [a[i], a[min]] = [a[min], a[i]]; moves++; }
    done.push(i);
    out.push({ a: [...a], hl: [i, min], sorted: [...done], comps, moves, say: min !== i ? `Swap ${a[i]} into position ${i}.` : `${a[i]} is already in position ${i}.` });
  }
  done.push(n - 1);
  out.push({ a: [...a], hl: [], sorted: [...done], comps, moves, say: `Sorted. ${comps} comparisons (always n(n−1)/2), only ${moves} swaps.` });
  return out;
}

function insertion(src: number[]): Frame[] {
  const a = [...src], n = a.length, out: Frame[] = [];
  let comps = 0, moves = 0;
  out.push({ a: [...a], hl: [], sorted: [0], comps, moves, say: 'Insertion sort: the left part is sorted. Take the next value and slide it left into its place, like sorting cards in your hand.' });
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      comps++;
      if (a[j] <= key) {
        out.push({ a: [...a], hl: [j], key: j + 1, sorted: range(i), comps, moves, say: `${a[j]} ≤ ${key}: stop. ${key} goes at index ${j + 1}.` });
        break;
      }
      a[j + 1] = a[j]; a[j] = key; moves++;
      out.push({ a: [...a], hl: [j + 1], key: j, sorted: range(i), comps, moves, say: `${a[j + 1]} > ${key}: shift ${a[j + 1]} right.` });
      j--;
    }
    out.push({ a: [...a], hl: [], sorted: range(i + 1), comps, moves, say: `The first ${i + 1} values are sorted.` });
  }
  out.push({ a: [...a], hl: [], sorted: range(n), comps, moves, say: `Sorted. ${comps} comparisons, ${moves} shifts.` });
  return out;
}

function range(k: number) { return Array.from({ length: k }, (_, i) => i); }

/** Bubble, selection and insertion sort on bars, with comparison and move counters. */
@Component({
  selector: 'w-sort-stepper',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Three simple sorts</h3></div>
      <p class="w-hint">Pick an algorithm and an input, then step or play. Watch the counters: try every algorithm on the nearly sorted input.
        <br><span class="key amber"></span> compared <span class="key red"></span> current minimum / value being inserted <span class="key green"></span> sorted part</p>
      <div class="w-controls" role="group" aria-label="Algorithm">
        @for (x of algos; track x.id) { <button type="button" class="w-btn" [class.on]="algo() === x.id" (click)="setAlgo(x.id)" [attr.aria-pressed]="algo() === x.id">{{ x.label }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Input">
        <span class="w-label m-0">Input</span>
        @for (x of inputs; track x.id) { <button type="button" class="w-btn" [class.on]="input() === x.id" (click)="setInput(x.id)" [attr.aria-pressed]="input() === x.id">{{ x.label }}</button> }
      </div>

      <div class="bars" aria-hidden="true">
        @for (v of f().a; track $index; let i = $index) {
          <div class="bar-col">
            <div class="bar" [style.height.%]="v * 10 + 8" [class.hl]="f().hl.includes(i)" [class.key]="f().key === i" [class.sorted]="f().sorted.includes(i)"></div>
            <span class="mono">{{ v }}</span>
          </div>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="play()" [disabled]="atEnd()"><i class="bi bi-play-fill" aria-hidden="true"></i> Play</button>
        <button type="button" class="w-btn" (click)="restart()">Restart</button>
        <span class="small">Comparisons <b>{{ f().comps }}</b> · {{ algo() === 'insertion' ? 'Shifts' : 'Swaps' }} <b>{{ f().moves }}</b></span>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .bars { display: flex; align-items: flex-end; gap: 6px; height: 150px; padding: 8px; border-radius: 12px; background: var(--bg-main); border: 1px solid var(--border-color); }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; min-width: 0; }
    .bar-col span { font-size: 0.75rem; margin-top: 3px; }
    .bar { width: 100%; max-width: 44px; border-radius: 6px 6px 2px 2px; background: rgba(139, 92, 246, 0.45); transition: height 0.25s, background 0.2s; }
    .bar.sorted { background: rgba(16, 185, 129, 0.6); }
    .bar.hl { background: #f59e0b; }
    .bar.key { background: #ef4444; }
    .w-hint .key { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin: 0 3px 0 8px; vertical-align: middle; }
    .w-hint .key:first-of-type { margin-left: 0; }
    .key.amber { background: #f59e0b; } .key.red { background: #ef4444; } .key.green { background: rgba(16, 185, 129, 0.6); }
  `]
})
export class SortStepperWidget {
  readonly algos: { id: Algo; label: string }[] = [{ id: 'bubble', label: 'Bubble' }, { id: 'selection', label: 'Selection' }, { id: 'insertion', label: 'Insertion' }];
  readonly inputs: { id: Input; label: string }[] = [{ id: 'random', label: 'Random' }, { id: 'nearly', label: 'Nearly sorted' }, { id: 'reversed', label: 'Reversed' }];
  algo = signal<Algo>('bubble');
  input = signal<Input>('random');
  idx = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  frames = computed(() => {
    const src = INPUTS[this.input()];
    return this.algo() === 'bubble' ? bubble(src) : this.algo() === 'selection' ? selection(src) : insertion(src);
  });
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);

  setAlgo(a: Algo) { this.algo.set(a); this.restart(); }
  setInput(i: Input) { this.input.set(i); this.restart(); }
  restart() { clearTimeout(this.timer); this.idx.set(0); }
  step() { this.idx.update(i => Math.min(i + 1, this.frames().length - 1)); }
  play() {
    clearTimeout(this.timer);
    const tick = () => { this.step(); if (!this.atEnd()) this.timer = setTimeout(tick, 320); };
    tick();
  }
}
