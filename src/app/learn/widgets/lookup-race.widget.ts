import { Component, computed, signal } from '@angular/core';

type Target = 'first' | 'middle' | 'last' | 'missing';
interface Lane { name: string; code: string; steps: number; note: string }

const SIZES = [10, 100, 1_000, 10_000, 100_000, 1_000_000];

/** Count the loop iterations of a real binary search over 0..n-1 looking for `key`. */
function binarySteps(n: number, key: number): number {
  let lo = 0, hi = n - 1, steps = 0;
  while (lo <= hi) {
    steps++;
    const mid = lo + ((hi - lo) >> 1);
    if (mid === key) break;
    if (mid < key) lo = mid + 1; else hi = mid - 1;
  }
  return steps;
}

/** The same lookup done three ways: scan a list, binary-search a sorted array, ask a Dictionary. */
@Component({
  selector: 'w-lookup-race',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Same question, three data structures</h3></div>
      <p class="w-hint">A model has <strong>{{ fmt(n()) }}</strong> beams. Find beam <span class="mono">{{ id() }}</span>. Count how many beams each approach has to look at.</p>

      <div class="w-controls" role="group" aria-label="Number of beams">
        <span class="w-label m-0">Beams</span>
        @for (s of sizes; track s) {
          <button type="button" class="w-btn" [class.on]="n() === s" (click)="n.set(s)" [attr.aria-pressed]="n() === s">{{ fmt(s) }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Which beam to find">
        <span class="w-label m-0">Find</span>
        @for (t of targets; track t.id) {
          <button type="button" class="w-btn" [class.on]="target() === t.id" (click)="target.set(t.id)" [attr.aria-pressed]="target() === t.id">{{ t.label }}</button>
        }
      </div>

      <div class="lanes">
        @for (l of lanes(); track l.name) {
          <div class="lane">
            <div class="top"><strong>{{ l.name }}</strong><span class="mono small">{{ l.code }}</span></div>
            <div class="bar-bg"><span class="bar" [style.width.%]="width(l.steps)"></span></div>
            <div class="small"><b class="mono">{{ fmt(l.steps) }}</b> {{ l.steps === 1 ? 'check' : 'checks' }} · <span class="text-muted">{{ l.note }}</span></div>
          </div>
        }
      </div>
      <p class="small text-muted mt-1 mb-0">Bars use a log scale so that 1 and 1,000,000 both fit. The real gap is much bigger than it looks.</p>

      <div class="w-msg info" aria-live="polite"><i class="bi bi-lightbulb" aria-hidden="true"></i>
        <span>Done 10,000 times (say, once per clash check), the list needs <b>{{ fmt(lanes()[0].steps * 10000) }}</b> checks, the sorted array <b>{{ fmt(lanes()[1].steps * 10000) }}</b>, the Dictionary about <b>10,000</b>. Same data, same answer: only the <em>structure</em> changed.</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .lanes { display: grid; gap: 10px; }
    .lane { padding: 8px 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .top { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; margin-bottom: 6px; font-size: 0.9rem; }
    .bar-bg { height: 12px; border-radius: 6px; background: rgba(139, 92, 246, 0.08); overflow: hidden; margin-bottom: 4px; }
    .bar { display: block; height: 100%; min-width: 4px; border-radius: 6px; background: var(--gradient-primary); transition: width 0.35s; }
  `]
})
export class LookupRaceWidget {
  readonly sizes = SIZES;
  readonly targets: { id: Target; label: string }[] = [
    { id: 'first', label: 'the first beam' }, { id: 'middle', label: 'a middle beam' },
    { id: 'last', label: 'the last beam' }, { id: 'missing', label: 'a beam that isn’t there' }
  ];
  n = signal(1_000);
  target = signal<Target>('last');

  /** Position of the wanted beam in the data (n means "not present"). */
  private pos = computed(() => {
    const n = this.n();
    switch (this.target()) {
      case 'first': return 0;
      case 'middle': return Math.floor(n / 2);
      case 'last': return n - 1;
      default: return n;
    }
  });

  id = computed(() => (this.target() === 'missing' ? 'B-999999999' : `B-${this.pos() + 1}`));

  lanes = computed<Lane[]>(() => {
    const n = this.n(), p = this.pos();
    const linear = p >= n ? n : p + 1;
    return [
      { name: 'List, checked one by one', code: 'beams.Find(b => b.Id == id)', steps: linear, note: p >= n ? 'had to check every beam to be sure' : 'stops when it finds the beam' },
      { name: 'Sorted array, binary search', code: 'Array.BinarySearch(ids, id)', steps: binarySteps(n, p), note: 'halves the search range every check' },
      { name: 'Dictionary (hash table)', code: 'byId.TryGetValue(id, out var b)', steps: 1, note: 'jumps straight to the right slot' }
    ];
  });

  /** Bar length on a log scale so 1 and 1,000,000 both stay visible. */
  width(steps: number) {
    return Math.max(1.5, (100 * Math.log10(steps + 1)) / Math.log10(this.n() + 1));
  }

  fmt(x: number) { return x.toLocaleString('en-US'); }
}
