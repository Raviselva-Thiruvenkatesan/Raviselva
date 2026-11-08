import { Component, computed, signal } from '@angular/core';

interface Method { name: string; ns: (n: number) => number; bytes: (n: number) => number }
interface Scenario { id: string; label: string; methods: Method[]; lesson: string }

/**
 * Cost models (rough, for teaching): shaped like real BenchmarkDotNet results on a modern desktop CPU.
 * What matters is how each method scales with N, not the exact nanoseconds.
 */
const SCENARIOS: Scenario[] = [
  { id: 'concat', label: 'Join N short strings', lesson: 'Each += copies the whole string so far, so the work grows with N². Ten times more parts costs about a hundred times more.',
    methods: [
      { name: 's += part', ns: n => 2 * n * (n + 1) + 15 * n, bytes: n => 8 * n * (n + 1) + 30 * n },
      { name: 'StringBuilder', ns: n => 14 * n + 60, bytes: n => 48 * n + 100 },
      { name: 'string.Join', ns: n => 9 * n + 40, bytes: n => 16 * n + 40 }
    ] },
  { id: 'lookup', label: '1,000 lookups in N IDs', lesson: 'List.Contains checks items one by one (O(N)); HashSet jumps straight to the right bucket (O(1)). For small N the difference hardly matters.',
    methods: [
      { name: 'List<int>.Contains', ns: n => 1000 * (n / 2) * 0.15 + 2000, bytes: () => 0 },
      { name: 'HashSet<int>.Contains', ns: () => 1000 * 6, bytes: () => 0 }
    ] },
  { id: 'linq', label: 'Count positives in int[N]', lesson: 'LINQ adds a small cost per item (a delegate call) and a few bytes for the iterator. Usually fine; worth replacing only in a proven hot path.',
    methods: [
      { name: 'Where(x => x > 0).Count()', ns: n => 1.6 * n + 30, bytes: () => 72 },
      { name: 'foreach loop', ns: n => 0.5 * n + 2, bytes: () => 0 }
    ] },
  { id: 'boxing', label: 'Add N ints to a collection', lesson: 'ArrayList stores object, so every int is boxed into a 24-byte heap object. List<int> stores the ints directly; giving it a capacity avoids regrowing.',
    methods: [
      { name: 'ArrayList.Add', ns: n => 11 * n + 50, bytes: n => 40 * n + 60 },
      { name: 'List<int>.Add', ns: n => 2.2 * n + 40, bytes: n => 8 * n + 60 },
      { name: 'new List<int>(N).Add', ns: n => 1.4 * n + 30, bytes: n => 4 * n + 56 }
    ] }
];

/** A BenchmarkDotNet-style results table for common choices, with N you can change. */
@Component({
  selector: 'w-benchmark-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Benchmark results</h3></div>
      <div class="w-controls" role="group" aria-label="Scenario">
        @for (s of scenarios; track s.id) {
          <button type="button" class="w-btn" [class.on]="sc().id === s.id" (click)="id.set(s.id)" [attr.aria-pressed]="sc().id === s.id">{{ s.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="N">
        <span class="small text-muted">N =</span>
        @for (v of sizes; track v) {
          <button type="button" class="w-btn mono" [class.on]="n() === v" (click)="n.set(v)" [attr.aria-pressed]="n() === v">{{ v.toLocaleString('en-US') }}</button>
        }
      </div>
      <div class="tbl" role="table" aria-label="Benchmark results">
        <div class="tr th" role="row"><span role="columnheader">Method</span><span role="columnheader">Mean</span><span role="columnheader">Ratio</span><span role="columnheader">Allocated</span></div>
        @for (r of rows(); track r.name) {
          <div class="tr" role="row">
            <span class="mono name" role="cell">{{ r.name }}</span>
            <span class="mono" role="cell">{{ r.mean }}<span class="bar" [style.width.%]="r.bar"></span></span>
            <span class="mono" role="cell" [class.w-ok]="r.ratio < 1" [class.w-err]="r.ratio > 1">{{ r.ratioText }}</span>
            <span class="mono" role="cell">{{ r.alloc }}</span>
          </div>
        }
      </div>
      <div class="w-msg info"><i class="bi bi-speedometer2" aria-hidden="true"></i><span>{{ sc().lesson }}</span></div>
      <p class="small text-muted mt-2 mb-0">Modelled numbers to show the shape of real results. Always benchmark on your own machine and data.</p>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tbl { display: grid; gap: 2px; font-size: 0.8rem; overflow-x: auto; }
    .tr { display: grid; grid-template-columns: minmax(150px, 1.6fr) minmax(90px, 1fr) 60px 80px; gap: 8px; padding: 5px 8px; border-radius: 8px; background: var(--bg-main); align-items: center; min-width: 420px; }
    .th { background: transparent; font-weight: 700; color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .name { word-break: break-word; }
    .bar { display: block; height: 4px; border-radius: 2px; margin-top: 3px; background: var(--gradient-primary); min-width: 2px; transition: width 0.3s; }
  `]
})
export class BenchmarkLabWidget {
  readonly scenarios = SCENARIOS;
  readonly sizes = [100, 1_000, 10_000, 100_000];
  id = signal('concat');
  n = signal(1_000);

  sc = computed(() => SCENARIOS.find(s => s.id === this.id())!);

  rows = computed(() => {
    const n = this.n();
    const ms = this.sc().methods.map(m => ({ name: m.name, ns: m.ns(n), bytes: m.bytes(n) }));
    const base = ms[0].ns;
    const max = Math.max(...ms.map(m => m.ns));
    return ms.map(m => {
      const ratio = m.ns / base;
      return {
        name: m.name,
        mean: this.time(m.ns),
        ratio,
        ratioText: ratio >= 10 ? ratio.toFixed(0) : ratio >= 0.01 ? ratio.toFixed(2) : '<0.01',
        alloc: this.size(m.bytes),
        bar: (m.ns / max) * 100
      };
    });
  });

  private time(ns: number) {
    if (ns < 1_000) return ns.toFixed(1) + ' ns';
    if (ns < 1_000_000) return (ns / 1_000).toFixed(1) + ' μs';
    if (ns < 1_000_000_000) return (ns / 1_000_000).toFixed(1) + ' ms';
    return (ns / 1_000_000_000).toFixed(2) + ' s';
  }

  private size(b: number) {
    if (b === 0) return '-';
    if (b < 1024) return Math.round(b) + ' B';
    if (b < 1024 ** 2) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 ** 3) return (b / 1024 ** 2).toFixed(1) + ' MB';
    return (b / 1024 ** 3).toFixed(2) + ' GB';
  }
}
