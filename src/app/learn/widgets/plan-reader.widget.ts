import { Component, computed, signal } from '@angular/core';
import { PLANS, PlanNode } from './perf-data';

const QUERIES: { id: string; label: string }[] = [
  { id: 'lookup', label: 'Seek + lookups' },
  { id: 'loops', label: 'Nested Loops' },
  { id: 'merge', label: 'Merge Join' },
  { id: 'hash', label: 'Hash Match' },
  { id: 'sort', label: 'Top N Sort' },
  { id: 'stale', label: 'Stale statistics' }
];

const EXPLAIN: Record<string, string> = {
  'Clustered Index Scan': 'Reads every leaf page of the clustered index: the whole table. Any WHERE is checked row by row.',
  'Clustered Index Seek': 'Goes down the clustered index’s tree to the rows it needs.',
  'Index Seek': 'Goes down a nonclustered index to a key or a range.',
  'Index Scan': 'Reads every leaf page of a nonclustered index. Cheaper than a table scan because the index is narrower.',
  'Key Lookup': 'Fetches the columns the nonclustered index does not have, from the clustered index, once per row. Look at its number of executions.',
  'Nested Loops': 'For each row from its first (upper) input, runs its second input once. Cheap when the first input is small.',
  'Merge Join': 'Reads two inputs that are both sorted on the join key and matches them in one pass.',
  'Hash Match': 'Builds a hash table from one input (here the smaller), then probes it with the other. Also used to group rows.',
  'Stream Aggregate': 'Groups or totals rows that arrive in order, keeping one group at a time.',
  'Sort': 'Sorts its whole input before returning a row. Needs memory; may spill to tempdb.',
  'Top': 'Passes on the first N rows and stops asking for more.',
  'Compute Scalar': 'Works out an expression, such as converting COUNT’s result. Almost free.',
  'Parallelism': 'Moves rows between threads of a parallel plan.'
};

const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('en-GB');

interface Line { n: PlanNode; depth: number }

/** Actual execution plans captured from SQL Server: operator tree, estimated and actual rows, cost. */
@Component({
  selector: 'w-plan-reader',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Reading an actual plan</h3></div>
      <div class="w-controls" role="group" aria-label="Query">
        @for (q of queries; track q.id) {
          <button type="button" class="w-btn small" [class.on]="qid() === q.id" [attr.aria-pressed]="qid() === q.id" (click)="pick(q.id)">{{ q.label }}</button>
        }
      </div>
      <pre class="sqlbox mono">{{ plan().sql }}</pre>
      <div class="ph">Operators (the most indented run first; rows flow up)</div>
      <div class="tree" role="list">
        @for (l of lines(); track l.n.id) {
          <button type="button" role="listitem" class="op" [style.margin-left.rem]="l.depth * 1.1" [class.sel]="sel() === l.n.id" [class.gap]="gap(l.n)" (click)="sel.set(l.n.id)">
            <span class="name">{{ title(l.n) }}</span>
            @if (l.n.obj) { <span class="obj mono">{{ l.n.obj }}</span> }
            <span class="nums mono">est {{ fmt(l.n.est * l.n.estExec) }} · actual {{ l.n.execs ? fmt(l.n.rows) : '—' }}@if (l.n.execs > 1) { · {{ l.n.execs.toLocaleString('en-GB') }} executions }</span>
            <span class="cost">{{ l.n.pct }}%</span>
          </button>
        }
      </div>
      <div class="detail">
        <b>{{ title(cur()) }}</b>
        <span>{{ explain(cur()) }}</span>
        <span class="muted">Estimated rows {{ fmt(cur().est * cur().estExec) }}, actual rows {{ cur().execs ? fmt(cur().rows) : 'not counted (it only works out expressions as rows pass through)' }}@if (cur().execs > 1) {, over {{ cur().execs.toLocaleString('en-GB') }} executions}. Cost {{ cur().pct }}% of the plan.@if (cur().seek) { Uses a seek predicate.}@if (cur().pred) { Checks a predicate on each row it reads.}</span>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .sqlbox { font-size: 0.74rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .tree { display: flex; flex-direction: column; gap: 4px; }
    .op { all: unset; box-sizing: border-box; cursor: pointer; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1px 10px; padding: 5px 9px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); font-size: 0.8rem; min-width: 0; }
    .op:hover { border-color: #8b5cf6; }
    .op:focus-visible { outline: 2px solid var(--purple); }
    .op.sel { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
    .op.gap .nums { color: #dc2626; font-weight: 700; }
    .name { font-weight: 700; grid-column: 1; }
    .obj { grid-column: 1; font-size: 0.7rem; color: var(--text-muted); overflow-wrap: anywhere; }
    .nums { grid-column: 1; font-size: 0.7rem; }
    .cost { grid-column: 2; grid-row: 1 / span 3; align-self: center; font-weight: 800; font-size: 0.82rem; min-width: 3em; text-align: right; }
    .detail { display: flex; flex-direction: column; gap: 3px; margin: 0.7rem 0; padding: 8px 10px; border-radius: 10px; border: 1px dashed var(--border-color); font-size: 0.82rem; }
    .muted { color: var(--text-muted); font-size: 0.76rem; }
  `]
})
export class PlanReaderWidget {
  readonly queries = QUERIES;
  readonly fmt = fmt;
  qid = signal('lookup');
  sel = signal(0);
  plan = computed(() => PLANS[this.qid()]);

  lines = computed<Line[]>(() => {
    const out: Line[] = [];
    const walk = (n: PlanNode, depth: number) => { out.push({ n, depth }); n.kids.forEach(k => walk(k, depth + 1)); };
    walk(this.plan().root, 0);
    return out;
  });
  cur = computed(() => this.lines().find(l => l.n.id === this.sel())?.n ?? this.plan().root);

  title(n: PlanNode) { return n.op === n.logical || !n.logical ? n.op : `${n.op} (${n.logical})`; }
  explain(n: PlanNode) { return EXPLAIN[n.op] ?? ''; }
  /** Estimated and actual rows ten times or more apart. */
  gap(n: PlanNode) { if (!n.execs) return false; const e = Math.max(1, n.est * n.estExec), a = Math.max(1, n.rows); return a / e >= 10 || e / a >= 10; }

  note = computed(() => {
    const id = this.qid();
    if (id === 'stale') return 'Look at the red numbers: the statistics end at 2024-12-31, so for 2025-01-15 the optimizer guessed about 91 rows, an average day. It chose a seek with lookups, and the lookup ran 5,000 times.';
    const gaps = this.lines().filter(l => this.gap(l.n));
    return gaps.length
      ? 'Estimates and actual rows differ a lot on the red operators. Here that is harmless, but it is the first thing to look for in a slow plan.'
      : 'Estimated and actual rows are close on every operator (within a factor of ten), so the optimizer chose the plan for about the right amount of data. Click an operator for details.';
  });

  pick(id: string) { this.qid.set(id); this.sel.set(0); }
}
