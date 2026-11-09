import { Component, computed, signal } from '@angular/core';
import { BT_ROOT, BT_RUNS } from './perf-data';

/** dbo.Sales after CREATE UNIQUE CLUSTERED INDEX CX_Sales (SaleId), as SQL Server 2022 built it (see perf-data.ts). */
const RUNS = BT_RUNS;
const ROOT = BT_ROOT;
const ROWS = 100000;
const HEAP_PAGES = 1786;

const FIRST: number[] = (() => {
  const f = [1];
  for (const [gap, n] of RUNS) for (let i = 0; i < n; i++) f.push(f[f.length - 1] + gap);
  return f;
})();
const LEAVES = FIRST.length;
const lastKey = (leaf: number) => (leaf + 1 < LEAVES ? FIRST[leaf + 1] - 1 : ROWS);
const fmt = (n: number) => n.toLocaleString('en-GB');

/** Find one SaleId in the heap or down the B-tree, and count the pages read. */
@Component({
  selector: 'w-btree-pages',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Finding one sale</h3></div>
      <div class="w-controls">
        <label class="w-field">SaleId
          <input type="number" min="1" [max]="rows" [value]="id()" (input)="setId($any($event.target).value)" />
        </label>
        <button type="button" class="w-btn" (click)="random()"><i class="bi bi-shuffle" aria-hidden="true"></i> Random</button>
        <span class="sp"></span>
        <div role="group" aria-label="Table layout" class="seg">
          <button type="button" class="w-btn" [class.on]="!tree()" [attr.aria-pressed]="!tree()" (click)="tree.set(false)">Heap</button>
          <button type="button" class="w-btn" [class.on]="tree()" [attr.aria-pressed]="tree()" (click)="tree.set(true)">Clustered index</button>
        </div>
      </div>

      @if (tree()) {
        <div class="lvl-label">Level 2: root page (1 page, {{ root.length }} entries)</div>
        <div class="root" role="list">
          @for (r of root; track $index; let k = $index) {
            <span role="listitem" class="entry mono" [class.hit]="k === mid()">{{ fmt(r) }}</span>
          }
        </div>
        <div class="arrow" aria-hidden="true">↓ the last entry ≤ {{ fmt(id()) }}</div>
        <div class="lvl-label">Level 1: intermediate pages ({{ root.length }} pages, one entry per leaf page)</div>
        <div class="mids" role="list">
          @for (r of root; track $index; let k = $index) {
            <div role="listitem" class="page mid" [class.hit]="k === mid()">
              <b>Page {{ k + 1 }}</b>
              <span class="mono">{{ fmt(r) }}–{{ fmt(midLast(k)) }}</span>
              <span class="muted">{{ midCount(k) }} leaf pages</span>
            </div>
          }
        </div>
        <div class="arrow" aria-hidden="true">↓ entry {{ leaf() - root0() + 1 }} of {{ midCount(mid()) }} on page {{ mid() + 1 }}</div>
        <div class="lvl-label">Level 0: leaf pages ({{ fmt(leafCount) }} pages holding the rows)</div>
        <div class="leaves" role="list">
          @for (l of nearLeaves(); track l) {
            <div role="listitem" class="page leaf" [class.hit]="l === leaf()" [class.edge]="l !== leaf()">
              <b>Leaf {{ fmt(l + 1) }}</b>
              <span class="mono">{{ fmt(first[l]) }}–{{ fmt(lastKeyOf(l)) }}</span>
              <span class="muted">{{ lastKeyOf(l) - first[l] + 1 }} rows</span>
            </div>
            @if (l !== nearLeaves()[nearLeaves().length - 1]) { <span class="chain" aria-hidden="true">⇄</span> }
          }
        </div>
        <div class="reads"><span class="big">3</span> logical reads: the root, intermediate page {{ mid() + 1 }}, and leaf page {{ fmt(leaf() + 1) }}.</div>
      } @else {
        <div class="lvl-label">A heap: {{ fmt(heapPages) }} pages, rows in no particular order</div>
        <div class="heap" aria-hidden="true">
          @for (b of heapBlocks; track b) { <span class="hb" [class.hit]="b === heapHit()"></span> }
        </div>
        <div class="reads"><span class="big">{{ fmt(heapPages) }}</span> logical reads: every page. Even when SaleId {{ fmt(id()) }} turns up on an early page, SQL Server keeps reading, because another row with the same value could be on any page.</div>
      }
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .sp { flex: 1; }
    .seg { display: inline-flex; gap: 6px; }
    .w-field input { width: 8.5em; }
    .lvl-label { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin: 0.6rem 0 0.3rem; }
    .root { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-main); }
    .entry { font-size: 0.74rem; padding: 2px 7px; border-radius: 6px; background: var(--bg-secondary); }
    .entry.hit { background: #8b5cf6; color: #fff; font-weight: 700; }
    .arrow { font-size: 0.74rem; color: #8b5cf6; margin: 0.25rem 0 0 0.4rem; font-weight: 600; }
    .mids { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 8.6rem), 1fr)); gap: 5px; }
    .page { display: flex; flex-direction: column; gap: 1px; font-size: 0.72rem; padding: 5px 7px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); min-width: 0; }
    .page b { font-size: 0.74rem; }
    .page .mono { overflow-wrap: anywhere; }
    .page.hit { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.12); box-shadow: 0 0 0 1px #8b5cf6 inset; }
    .muted { color: var(--text-muted); }
    .leaves { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .leaf { flex: 1 1 7.5rem; }
    .leaf.edge { opacity: 0.6; }
    .chain { color: var(--text-muted); font-size: 0.8rem; }
    .reads { margin: 0.6rem 0; font-size: 0.86rem; }
    .big { font-size: 1.3rem; font-weight: 800; color: #8b5cf6; margin-right: 4px; }
    .heap { display: grid; grid-template-columns: repeat(auto-fill, minmax(9px, 1fr)); gap: 2px; padding: 6px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-main); }
    .hb { height: 9px; border-radius: 2px; background: rgba(239, 68, 68, 0.45); }
    .hb.hit { background: #8b5cf6; }
  `]
})
export class BtreePagesWidget {
  readonly rows = ROWS;
  readonly root = ROOT.map(i => FIRST[i]);
  readonly first = FIRST;
  readonly leafCount = LEAVES;
  readonly heapPages = HEAP_PAGES;
  /** The heap drawn as 200 blocks of about 9 pages each, all of them read. */
  readonly heapBlocks = Array.from({ length: 200 }, (_, i) => i);
  readonly fmt = fmt;

  id = signal(4321);
  tree = signal(true);

  leaf = computed(() => {
    const id = this.id();
    let lo = 0, hi = LEAVES - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (FIRST[m] <= id) lo = m; else hi = m - 1; }
    return lo;
  });
  mid = computed(() => { let k = 0; while (k + 1 < ROOT.length && ROOT[k + 1] <= this.leaf()) k++; return k; });
  root0 = computed(() => ROOT[this.mid()]);
  nearLeaves = computed(() => { const l = this.leaf(); return [l - 1, l, l + 1].filter(x => x >= 0 && x < LEAVES); });
  heapHit = computed(() => Math.min(199, Math.floor((this.id() - 1) / ROWS * 200)));

  midCount(k: number) { return (k + 1 < ROOT.length ? ROOT[k + 1] : LEAVES) - ROOT[k]; }
  midLast(k: number) { return k + 1 < ROOT.length ? FIRST[ROOT[k + 1]] - 1 : ROWS; }
  lastKeyOf(l: number) { return lastKey(l); }

  message = computed(() => this.tree()
    ? `Each page on the way down is sorted, so SQL Server knows which entry to follow without reading the others. Finding any of the ${fmt(ROWS)} rows costs the same 3 reads, one per level. Neighbouring leaf pages are linked (⇄), which is how range queries read on.`
    : 'A heap has no order and no tree, so there is nothing to follow. This is a full table scan: the cost grows with the size of the table, not with the number of rows you want.');

  setId(v: string) { const n = Math.round(Number(v)); if (n >= 1 && n <= ROWS) this.id.set(n); }
  random() { this.id.set(1 + Math.floor(Math.random() * ROWS)); }
}
