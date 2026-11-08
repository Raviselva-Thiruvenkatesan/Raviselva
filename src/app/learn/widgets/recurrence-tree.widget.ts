import { Component, computed, signal } from '@angular/core';

interface Preset { id: string; label: string; a: number; b: number; d: number; what: string }
const PRESETS: Preset[] = [
  { id: 'bs', label: 'Binary search', a: 1, b: 2, d: 0, what: 'look at one half, constant work to choose it' },
  { id: 'ms', label: 'Merge sort', a: 2, b: 2, d: 1, what: 'sort both halves, then merge in linear time' },
  { id: 'ka', label: 'Karatsuba multiply', a: 3, b: 2, d: 1, what: 'three half-size multiplications, linear work to combine' },
  { id: 'nm', label: 'Naive split multiply', a: 4, b: 2, d: 1, what: 'four half-size multiplications, linear work to combine' },
  { id: 'sel', label: 'Quickselect (good pivots)', a: 1, b: 2, d: 1, what: 'one half-size problem, linear work to partition' }
];
const N = 64;

/** The recursion tree of T(n) = a·T(n/b) + n^d, level by level, and what the master theorem says. */
@Component({
  selector: 'w-recurrence-tree',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where does the work go?</h3></div>
      <p class="w-hint">A divide-and-conquer algorithm splits a problem of size n into <b>a</b> pieces of size n / <b>b</b> and does n<sup>d</sup> work to split and combine. Each bar is one level of the recursion, for n = {{ n }}.</p>
      <div class="w-controls" role="group" aria-label="Algorithm">
        @for (p of presets; track p.id) { <button type="button" class="w-btn" [class.on]="sel() === p.id" (click)="sel.set(p.id)" [attr.aria-pressed]="sel() === p.id">{{ p.label }}</button> }
      </div>
      <div class="mono small mb-2">T(n) = {{ p().a === 1 ? '' : p().a }}T(n/{{ p().b }}) + {{ p().d === 0 ? '1' : p().d === 1 ? 'n' : 'n^' + p().d }} &nbsp;·&nbsp; {{ p().what }}</div>

      <div class="levels">
        @for (l of levels(); track l.k) {
          <div class="lv">
            <span class="k mono">level {{ l.k }}</span>
            <span class="meta mono">{{ fmt(l.count) }} × size {{ l.size }}</span>
            <span class="bg"><span class="fill" [style.width.%]="l.pct"></span></span>
            <span class="w mono">{{ fmt(l.work) }}</span>
          </div>
        }
      </div>
      <div class="small mt-1">Total work <b>{{ fmt(total()) }}</b> (n = {{ n }}, so n log₂ n = {{ n * 6 }}, n² = {{ n * n }})</div>
      <div class="w-msg info mt-2" aria-live="polite"><span>{{ verdict() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .levels { display: grid; gap: 4px; }
    .lv { display: grid; grid-template-columns: 3.6rem 6.6rem minmax(0, 1fr) 3rem; gap: 6px; align-items: center; font-size: 0.78rem; }
    .k { color: var(--text-muted); }
    .meta { font-size: 0.72rem; }
    .bg { height: 14px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color); overflow: hidden; }
    .fill { display: block; height: 100%; background: linear-gradient(90deg, #8b5cf6, #06b6d4); transition: width 0.3s; }
    .w { text-align: right; font-weight: 700; }
  `]
})
export class RecurrenceTreeWidget {
  readonly presets = PRESETS;
  readonly n = N;
  sel = signal('ms');
  p = computed(() => PRESETS.find(x => x.id === this.sel())!);

  levels = computed(() => {
    const { a, b, d } = this.p();
    const out: { k: number; count: number; size: number; work: number; pct: number }[] = [];
    for (let k = 0, size = N; size >= 1; k++, size = size / b) {
      const count = a ** k;
      out.push({ k, count, size, work: count * size ** d, pct: 0 });
    }
    const max = Math.max(...out.map(l => l.work));
    for (const l of out) l.pct = Math.max(1, (l.work / max) * 100);
    return out;
  });
  total = computed(() => this.levels().reduce((s, l) => s + l.work, 0));

  verdict = computed(() => {
    const { a, b, d } = this.p();
    const crit = Math.log(a) / Math.log(b);           // log_b a
    if (Math.abs(crit - d) < 1e-9) return `Every level does the same amount of work (log_b a = ${crit.toFixed(2)} = d), and there are log n levels: ${d === 0 ? 'O(log n)' : d === 1 ? 'O(n log n)' : `O(n^${d} log n)`}.`;
    if (crit < d) return `The work shrinks level by level (log_b a = ${crit.toFixed(2)} < d = ${d}), so the top level dominates: O(n${d === 1 ? '' : '^' + d}). Most of the work is the first split.`;
    return `The work grows level by level (log_b a = ${crit.toFixed(2)} > d = ${d}), so the many tiny problems at the bottom dominate: O(n^${crit.toFixed(2)})${a === 4 && b === 2 ? ' = O(n²), no better than the schoolbook method' : a === 3 ? ', better than O(n²)' : ''}.`;
  });

  fmt(v: number) { return v.toLocaleString('en-US', { maximumFractionDigits: 0 }); }
}
