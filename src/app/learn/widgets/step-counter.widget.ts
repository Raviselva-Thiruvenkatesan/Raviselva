import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Snippet { id: string; label: string; code: string; line: number; big: string; run: (n: number) => number; why: string }

/** Each snippet's counter runs the real loops, so the numbers are exact, not formulas. */
const SNIPPETS: Snippet[] = [
  { id: 'one', label: 'One loop', big: 'O(n)', line: 2,
    code: 'for (int i = 0; i < n; i++)\n    steps++;',
    run: n => { let s = 0; for (let i = 0; i < n; i++) s++; return s; },
    why: 'The body runs once per item. Double n and the work doubles.' },
  { id: 'two', label: 'Two loops in a row', big: 'O(n)', line: 4,
    code: 'for (int i = 0; i < n; i++)\n    steps++;\nfor (int j = 0; j < n; j++)\n    steps++;',
    run: n => { let s = 0; for (let i = 0; i < n; i++) s++; for (let j = 0; j < n; j++) s++; return s; },
    why: '2n steps. Loops one after another ADD up, and Big-O drops the constant 2.' },
  { id: 'const', label: 'Inner loop of 3', big: 'O(n)', line: 3,
    code: 'for (int i = 0; i < n; i++)\n    for (int k = 0; k < 3; k++)\n        steps++;',
    run: n => { let s = 0; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) s++; return s; },
    why: 'The inner loop is a fixed 3 steps, not n. 3n is still O(n).' },
  { id: 'nested', label: 'Loop inside a loop', big: 'O(n²)', line: 3,
    code: 'for (int i = 0; i < n; i++)\n    for (int j = 0; j < n; j++)\n        steps++;',
    run: n => { let s = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s++; return s; },
    why: 'Nested loops MULTIPLY: n × n. Double n and the work goes up 4 times.' },
  { id: 'tri', label: 'Every pair once', big: 'O(n²)', line: 3,
    code: 'for (int i = 0; i < n; i++)\n    for (int j = i + 1; j < n; j++)\n        steps++;',
    run: n => { let s = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) s++; return s; },
    why: 'n(n−1)/2 steps: about half of n², but still O(n²). Clash-checking every pair of elements looks like this.' },
  { id: 'half', label: 'Halving loop', big: 'O(log n)', line: 2,
    code: 'for (int i = n; i > 1; i /= 2)\n    steps++;',
    run: n => { let s = 0; for (let i = n; i > 1; i = Math.floor(i / 2)) s++; return s; },
    why: 'i is cut in half each time, so it takes only log₂ n steps to reach 1. Double n and you add just ONE step.' },
  { id: 'nlog', label: 'Loop × halving loop', big: 'O(n log n)', line: 3,
    code: 'for (int i = 0; i < n; i++)\n    for (int j = n; j > 1; j /= 2)\n        steps++;',
    run: n => { let s = 0; for (let i = 0; i < n; i++) for (let j = n; j > 1; j = Math.floor(j / 2)) s++; return s; },
    why: 'n outer steps × log n inner steps. Slightly more than double when n doubles.' }
];

const SIZES = [8, 16, 100, 200, 1000, 2000];

/** Run small loop shapes for different n and compare the exact step counts. */
@Component({
  selector: 'w-step-counter',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Count the steps</h3></div>
      <p class="w-hint">Pick a loop shape. The counter really runs it for each <span class="mono">n</span>. Watch what happens when <span class="mono">n</span> doubles.</p>
      <div class="w-controls" role="group" aria-label="Loop shape">
        @for (s of snippets; track s.id) {
          <button type="button" class="w-btn" [class.on]="cur().id === s.id" (click)="id.set(s.id)" [attr.aria-pressed]="cur().id === s.id">{{ s.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <app-code [code]="cur().code" title="Steps.cs" [compact]="true" [copyable]="false" [active]="[cur().line]" />
        <div class="table-wrap">
          <table class="mono">
            <thead><tr><th scope="col">n</th><th scope="col">steps</th><th scope="col">vs half n</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.n) {
                <tr><td>{{ r.n.toLocaleString('en-US') }}</td><td><b>{{ r.steps.toLocaleString('en-US') }}</b></td><td>{{ r.ratio }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span><strong class="mono">{{ cur().big }}.</strong> {{ cur().why }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th, td { padding: 5px 8px; border-bottom: 1px solid var(--border-color); text-align: left; white-space: nowrap; }
    th { color: var(--text-muted); font-weight: 600; }
  `]
})
export class StepCounterWidget {
  readonly snippets = SNIPPETS;
  id = signal('nested');
  cur = computed(() => SNIPPETS.find(s => s.id === this.id())!);

  rows = computed(() => {
    const run = this.cur().run;
    const counts = SIZES.map(n => run(n));
    return SIZES.map((n, i) => {
      const half = SIZES.indexOf(n / 2);
      const ratio = half >= 0 && counts[half] > 0 ? `× ${(counts[i] / counts[half]).toFixed(2)}` : '';
      return { n, steps: counts[i], ratio };
    });
  });
}
