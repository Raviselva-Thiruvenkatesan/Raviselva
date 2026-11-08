import { Component, computed, signal } from '@angular/core';

type Tab = 'size' | 'spot';
interface Problem { text: string; answer: string; clue: string }

const SIZES = [10, 20, 100, 1_000, 10_000, 100_000, 1_000_000, 1_000_000_000];
const BUDGET = 1e8;   // roughly what a simple loop does in one second

const CLASSES: { name: string; ops: (n: number) => number }[] = [
  { name: 'O(log n)', ops: n => Math.log2(n) },
  { name: 'O(n)', ops: n => n },
  { name: 'O(n log n)', ops: n => n * Math.log2(n) },
  { name: 'O(n²)', ops: n => n * n },
  { name: 'O(n³)', ops: n => n ** 3 },
  { name: 'O(2ⁿ)', ops: n => 2 ** n },
  { name: 'O(n!)', ops: n => { let f = 1; for (let i = 2; i <= n && f < 1e300; i++) f *= i; return f; } }
];

const TECHNIQUES = ['Sliding window', 'Binary search', 'BFS', 'Dynamic programming', 'Hash set / map', 'Heap', 'Topological sort', 'Backtracking', 'Union-find', 'Prefix sums'];

const PROBLEMS: Problem[] = [
  { text: 'Daily rainfall (all positive) for 100,000 days. Find the longest run of consecutive days whose total stays at most 50 mm.', answer: 'Sliding window', clue: '“Consecutive” + “longest run” + positive values: grow the right end, shrink the left end when the total is too big. O(n).' },
  { text: 'A sorted list of 1,000,000 beam lengths. Find the first beam that is at least 7.5 m long.', answer: 'Binary search', clue: '“Sorted” + “first that satisfies”: a lower-bound binary search. O(log n).' },
  { text: 'Roads between depots all take the same time. Find the fewest roads from the depot to the site.', answer: 'BFS', clue: 'Shortest path where every edge costs the same: breadth-first search. With different costs it would be Dijkstra.' },
  { text: 'How many ways can a 2 × 80 wall be covered with 1 × 2 panels?', answer: 'Dynamic programming', clue: '“How many ways” with overlapping sub-problems: ways(n) = ways(n − 1) + ways(n − 2). Brute force would list about 10¹⁶ tilings.' },
  { text: 'A list of 100,000 delivery IDs. Does any ID appear twice?', answer: 'Hash set / map', clue: '“Seen before?”: put each ID in a hash set as you go. O(n) instead of comparing every pair, O(n²).' },
  { text: 'Loads arrive one by one in a live stream. At any moment, report the 10 heaviest seen so far.', answer: 'Heap', clue: '“Top k” in a stream: keep a min-heap of size k and drop its smallest when a heavier load arrives. O(log k) per load.' },
  { text: 'Order the build tasks so that every task comes after all the tasks it depends on.', answer: 'Topological sort', clue: '“Depends on” = a directed graph without cycles; “an order” = topological sort (Kahn’s algorithm). O(V + E).' },
  { text: 'Place 8 tower cranes on an 8 × 8 grid so that no two can reach each other. List every layout.', answer: 'Backtracking', clue: '“List every” arrangement that satisfies constraints: place, check, undo. Pruning makes it fast enough.' },
  { text: 'Sensors are wired together by a stream of “connect A and B” events. After each event: are X and Y on the same network?', answer: 'Union-find', clue: 'Groups that only ever merge, with “same group?” questions: union-find with path compression, almost O(1) each.' },
  { text: 'Daily spend for 5 years, never changed. Answer 100,000 questions “total spend from day l to day r”.', answer: 'Prefix sums', clue: 'Many range-sum queries on fixed data: prefix sums make each one O(1). If the data changed, a Fenwick or segment tree would be needed.' }
];

/** Two habits for solving problems: let the input size pick the complexity, and let the wording pick the pattern. */
@Component({
  selector: 'w-pattern-picker',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From problem to technique</h3></div>
      <div class="w-controls" role="group" aria-label="Tab">
        <button type="button" class="w-btn" [class.on]="tab() === 'size'" (click)="tab.set('size')" [attr.aria-pressed]="tab() === 'size'">Input size → complexity</button>
        <button type="button" class="w-btn" [class.on]="tab() === 'spot'" (click)="tab.set('spot')" [attr.aria-pressed]="tab() === 'spot'">Spot the pattern</button>
      </div>

      @if (tab() === 'size') {
        <p class="w-hint">The limits tell you the intended complexity. A computer does roughly 10⁸ simple steps per second. Pick the largest n the problem allows:</p>
        <div class="w-controls" role="group" aria-label="Input size">
          <span class="w-label m-0">n ≤</span>
          @for (s of sizes; track s; let i = $index) { <button type="button" class="w-btn" [class.on]="si() === i" (click)="si.set(i)" [attr.aria-pressed]="si() === i">{{ fmtN(s) }}</button> }
        </div>
        <div class="tscroll">
          <table class="wtable"><tbody>
            <tr><th>Complexity</th><th>Steps for n = {{ fmtN(n()) }}</th><th>Time at 10⁸/s</th><th></th></tr>
            @for (r of rows(); track r.name) {
              <tr><td class="mono">{{ r.name }}</td><td>{{ r.steps }}</td><td>{{ r.time }}</td><td [class.ok]="r.fits"><span [class.bad]="!r.fits">{{ r.fits ? 'fits' : 'too slow' }}</span></td></tr>
            }
          </tbody></table>
        </div>
        <div class="w-msg mt-2 info" aria-live="polite"><span>{{ sizeMessage() }}</span></div>
      } @else {
        <p class="w-hint">Read the problem and pick the technique its wording points to. Problem {{ pi() + 1 }} of {{ problems.length }} · score {{ score() }}</p>
        <div class="problem">{{ p().text }}</div>
        <div class="w-controls mt-2" role="group" aria-label="Techniques">
          @for (t of techniques; track t) {
            <button type="button" class="w-btn" [class.on]="picked() === t" [class.right]="picked() && t === p().answer" [class.wrong]="picked() === t && t !== p().answer" (click)="pick(t)" [disabled]="!!picked()">{{ t }}</button>
          }
        </div>
        @if (picked()) {
          <div class="w-msg" [class.ok]="picked() === p().answer" [class.err]="picked() !== p().answer" aria-live="polite"><span>{{ picked() === p().answer ? 'Right. ' : 'Not quite: it is ' + p().answer + '. ' }}{{ p().clue }}</span></div>
          <div class="w-controls mt-2">
            @if (pi() < problems.length - 1) { <button type="button" class="w-btn primary" (click)="next()">Next problem</button> }
            @else { <span class="small">Finished: <b>{{ score() }} of {{ problems.length }}</b>.&nbsp;</span><button type="button" class="w-btn primary" (click)="restart()">Start again</button> }
          </div>
        }
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .problem { padding: 0.8rem 1rem; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); font-weight: 600; }
    .w-btn.right { border-color: #10b981; background: rgba(16, 185, 129, 0.25); opacity: 1; }
    .w-btn.wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.2); opacity: 1; }
    span.bad { color: #ef4444; font-weight: 700; }
    td.ok { font-weight: 700; color: #059669; }
  `]
})
export class PatternPickerWidget {
  readonly sizes = SIZES;
  readonly techniques = TECHNIQUES;
  readonly problems = PROBLEMS;
  tab = signal<Tab>('size');
  si = signal(5);
  pi = signal(0);
  picked = signal<string | null>(null);
  score = signal(0);

  n = computed(() => SIZES[this.si()]);
  p = computed(() => PROBLEMS[this.pi()]);
  rows = computed(() => CLASSES.map(c => {
    const ops = c.ops(this.n());
    return { name: c.name, steps: this.fmtOps(ops), time: this.fmtTime(ops / BUDGET), fits: ops <= BUDGET };
  }));
  sizeMessage = computed(() => {
    const fits = this.rows().filter(r => r.fits).map(r => r.name);
    const best = fits[fits.length - 1];
    return `For n = ${this.fmtN(this.n())}, anything up to ${best} fits in about a second. ${this.hint(this.n())}`;
  });

  hint(n: number) {
    if (n <= 10) return 'Tiny inputs invite trying every ordering: permutations or backtracking.';
    if (n <= 20) return 'About 20 elements: trying every subset (2ⁿ ≈ a million) is fine. Think bitmasks or backtracking.';
    if (n <= 100) return 'Even n³ (a million steps) is fine: three nested loops, Floyd-Warshall, interval DP.';
    if (n <= 10000) return 'Aim for n²: nested loops over pairs, two-dimensional DP tables. n³ is already too slow.';
    if (n <= 1_000_000) return 'You need n log n or better: sorting, heaps, balanced trees, binary search, or a linear scan with a hash map.';
    return 'n is too large even to read every element in time: the answer needs a formula, binary search on the answer, or fast exponentiation, O(log n).';
  }
  fmtN(n: number) { return n >= 1e9 ? '10⁹' : n >= 1e6 ? '10⁶' : n.toLocaleString('en-US'); }
  fmtOps(v: number) {
    if (!isFinite(v) || v > 1e300) return 'astronomical';
    if (v < 1e6) return Math.round(v).toLocaleString('en-US');
    const e = Math.floor(Math.log10(v));
    return `${(v / 10 ** e).toFixed(1)} × 10${[...String(e)].map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('')}`;
  }
  fmtTime(s: number) {
    if (!isFinite(s) || s > 1e290) return 'never';
    if (s < 1e-3) return '< 1 ms';
    if (s < 1) return `${Math.round(s * 1000)} ms`;
    if (s < 120) return `${s.toFixed(1)} s`;
    if (s < 7200) return `${Math.round(s / 60)} min`;
    if (s < 172800) return `${Math.round(s / 3600)} hours`;
    if (s < 3.2e8) return `${Math.round(s / 86400).toLocaleString('en-US')} days`;
    const y = s / 3.15e7;
    return y < 1e6 ? `${Math.round(y).toLocaleString('en-US')} years` : `${this.fmtOps(y)} years`;
  }

  pick(t: string) { this.picked.set(t); if (t === this.p().answer) this.score.update(s => s + 1); }
  next() { this.pi.update(i => i + 1); this.picked.set(null); }
  restart() { this.pi.set(0); this.picked.set(null); this.score.set(0); }
}
