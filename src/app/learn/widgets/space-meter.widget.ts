import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Algo {
  id: string; label: string; big: string; code: string;
  /** Extra variables (not counting the input) for a given n. */
  vars: (n: number) => string[];
  /** Extra array cells allocated. */
  cells: (n: number) => number;
  /** Stack frames alive at the deepest point. */
  frames: (n: number) => number;
  why: string;
}

const ALGOS: Algo[] = [
  { id: 'sum', label: 'Sum with a loop', big: 'O(1)', vars: () => ['total', 'i'], cells: () => 0, frames: () => 1,
    code: 'int Sum(int[] a)\n{\n    int total = 0;\n    for (int i = 0; i < a.Length; i++)\n        total += a[i];\n    return total;\n}',
    why: 'Two variables, whatever the size of the array. The input itself is not counted as extra space.' },
  { id: 'rev-in', label: 'Reverse in place', big: 'O(1)', vars: () => ['i', 'j', 'tmp'], cells: () => 0, frames: () => 1,
    code: 'void Reverse(int[] a)\n{\n    for (int i = 0, j = a.Length - 1; i < j; i++, j--)\n        (a[i], a[j]) = (a[j], a[i]);\n}',
    why: 'Swaps inside the same array, so only i, j and a temporary are needed. Fast and memory-friendly, but it changes the caller’s array.' },
  { id: 'rev-copy', label: 'Reverse into a copy', big: 'O(n)', vars: () => ['result', 'i'], cells: n => n, frames: () => 1,
    code: 'int[] Reversed(int[] a)\n{\n    var result = new int[a.Length];\n    for (int i = 0; i < a.Length; i++)\n        result[i] = a[a.Length - 1 - i];\n    return result;\n}',
    why: 'A new array of n cells: memory grows with the input. In exchange the original array is left untouched.' },
  { id: 'rec', label: 'Recursive sum', big: 'O(n)', vars: () => [], cells: () => 0, frames: n => n + 1,
    code: 'int Sum(int[] a, int i = 0)\n{\n    if (i == a.Length) return 0;\n    return a[i] + Sum(a, i + 1);\n}',
    why: 'No arrays, but every call waits for the next one, so n + 1 stack frames are alive at the deepest point. Hidden memory: with a big n this ends in StackOverflowException.' },
  { id: 'table', label: 'Table of all pairs', big: 'O(n²)', vars: () => ['seen', 'i', 'j'], cells: n => n * n, frames: () => 1,
    code: 'bool[,] PairTable(int[] a)\n{\n    var seen = new bool[a.Length, a.Length];\n    for (int i = 0; i < a.Length; i++)\n        for (int j = 0; j < a.Length; j++)\n            seen[i, j] = a[i] == a[j];\n    return seen;\n}',
    why: 'n × n cells. 10,000 elements already need 100 million booleans (about 100 MB).' }
];

/** Compare the extra memory different algorithms need as the input grows. */
@Component({
  selector: 'w-space-meter',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>How much extra memory?</h3></div>
      <p class="w-hint">Pick an algorithm and grow the input. Grey cells are the input; coloured cells are the <strong>extra</strong> memory the algorithm needs.</p>
      <div class="w-controls" role="group" aria-label="Algorithm">
        @for (a of algos; track a.id) {
          <button type="button" class="w-btn" [class.on]="cur().id === a.id" (click)="id.set(a.id)" [attr.aria-pressed]="cur().id === a.id">{{ a.label }}</button>
        }
      </div>
      <label class="w-field mb-2">n = {{ n() }}
        <input type="range" min="1" max="10" [value]="n()" (input)="n.set(+$any($event.target).value)" aria-label="Input size n">
      </label>

      <div class="w-grid two">
        <app-code [code]="cur().code" title="Space.cs" [compact]="true" [copyable]="false" />
        <div>
          <div class="w-label">Input (not counted)</div>
          <div class="cells">@for (c of range(n()); track c) { <span class="cell in"></span> }</div>

          <div class="w-label mt-2">Extra variables</div>
          <div class="cells">
            @for (v of cur().vars(n()); track v) { <span class="var mono">{{ v }}</span> }
            @if (!cur().vars(n()).length) { <span class="small text-muted">none</span> }
          </div>

          <div class="w-label mt-2">Extra array cells: {{ cur().cells(n()) }}</div>
          <div class="cells grid" [style.grid-template-columns]="'repeat(' + cols() + ', 14px)'">
            @for (c of range(cur().cells(n())); track c) { <span class="cell extra"></span> }
          </div>

          <div class="w-label mt-2">Stack frames at the deepest point: {{ cur().frames(n()) }}</div>
          <div class="stack">@for (f of range(cur().frames(n())); track f) { <span class="frame mono">{{ cur().id === 'rec' ? 'Sum(i=' + f + ')' : 'the one call' }}</span> }</div>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span><strong class="mono">Extra space {{ cur().big }}.</strong> {{ cur().why }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: flex; flex-wrap: wrap; gap: 3px; min-height: 16px; }
    .cells.grid { display: grid; gap: 3px; }
    .cell { width: 14px; height: 14px; border-radius: 3px; }
    .cell.in { background: rgba(148, 163, 184, 0.45); }
    .cell.extra { background: var(--purple); opacity: 0.8; }
    .var { font-size: 0.72rem; padding: 1px 7px; border-radius: 6px; background: rgba(6, 182, 212, 0.15); border: 1px solid rgba(6, 182, 212, 0.45); }
    .stack { display: flex; flex-direction: column-reverse; gap: 2px; align-items: flex-start; }
    .frame { font-size: 0.7rem; padding: 1px 8px; border-radius: 5px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.5); }
  `]
})
export class SpaceMeterWidget {
  readonly algos = ALGOS;
  id = signal('sum');
  n = signal(5);
  cur = computed(() => ALGOS.find(a => a.id === this.id())!);
  /** Draw an n×n table as a square, a plain array as one row. */
  cols = computed(() => (this.cur().id === 'table' ? this.n() : Math.max(1, Math.min(this.cur().cells(this.n()), 10))));

  range(k: number) { return Array.from({ length: k }, (_, i) => i); }
}
