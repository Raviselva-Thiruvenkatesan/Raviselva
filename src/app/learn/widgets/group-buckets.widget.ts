import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, PRODUCTS, Product, money } from './sql-data';

interface Agg { id: string; sql: string; calc: (ps: Product[]) => number; fmt: (v: number) => string | number }
const AGGS: Agg[] = [
  { id: 'count', sql: 'COUNT(*)', calc: ps => ps.length, fmt: v => v },
  { id: 'sum', sql: 'SUM(Stock)', calc: ps => ps.reduce((s, p) => s + p.Stock, 0), fmt: v => v },
  { id: 'max', sql: 'MAX(Price)', calc: ps => Math.max(...ps.map(p => p.Price)), fmt: money },
  { id: 'avg', sql: 'AVG(Price)', calc: ps => ps.reduce((s, p) => s + p.Price, 0) / ps.length, fmt: v => (Math.trunc(v * 1e6 + 1e-6) / 1e6).toFixed(6) }
];
interface Having { id: string; sql: string; test: (ps: Product[]) => boolean }
const HAVINGS: Having[] = [
  { id: 'none', sql: '', test: () => true },
  { id: 'cnt', sql: 'COUNT(*) >= 2', test: ps => ps.length >= 2 },
  { id: 'stock', sql: 'SUM(Stock) >= 100', test: ps => ps.reduce((s, p) => s + p.Stock, 0) >= 100 }
];

/** Products sorted into category buckets: WHERE removes rows, GROUP BY makes buckets, HAVING removes whole buckets. */
@Component({
  selector: 'w-group-buckets',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rows into groups</h3></div>
      <div class="w-controls" role="group" aria-label="WHERE">
        <span class="lab">WHERE</span>
        <button type="button" class="w-btn small" [class.on]="!where()" [attr.aria-pressed]="!where()" (click)="where.set(false)">none</button>
        <button type="button" class="w-btn small mono" [class.on]="where()" [attr.aria-pressed]="where()" (click)="where.set(true)">Stock &gt; 0</button>
      </div>
      <div class="w-controls" role="group" aria-label="Aggregate">
        <span class="lab">SELECT</span>
        @for (a of aggs; track a.id; let i = $index) {
          <button type="button" class="w-btn small mono" [class.on]="ai() === i" [attr.aria-pressed]="ai() === i" (click)="ai.set(i)">{{ a.sql }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="HAVING">
        <span class="lab">HAVING</span>
        @for (h of havings; track h.id; let i = $index) {
          <button type="button" class="w-btn small mono" [class.on]="hi() === i" [attr.aria-pressed]="hi() === i" (click)="hi.set(i)">{{ h.sql || 'none' }}</button>
        }
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>

      <div class="flow" aria-hidden="true">
        <span><b>12</b> rows</span><i class="bi bi-arrow-right"></i>
        <span>WHERE <b>{{ kept() }}</b> rows</span><i class="bi bi-arrow-right"></i>
        <span>GROUP BY <b>{{ groups().length }}</b> groups</span><i class="bi bi-arrow-right"></i>
        <span>HAVING <b>{{ result().length }}</b> groups</span>
      </div>

      <div class="buckets">
        @for (g of buckets(); track g.id) {
          <div class="bucket" [class.gone]="!g.exists" [class.cut]="g.exists && !g.pass">
            <div class="bh"><span class="bn">{{ g.id }} {{ g.name }}</span>
              <span class="bv mono">{{ g.exists ? agg().sql + ' = ' + g.value : 'no rows: no group' }}</span></div>
            @for (p of g.rows; track p.ProductId) {
              <span class="chip" [class.bad]="where() && p.Stock === 0" [attr.title]="p.Name">{{ p.Name }} <small>{{ cell(p) }}</small></span>
            }
            @if (g.exists && !g.pass) { <div class="why">removed by HAVING</div> }
          </div>
        }
      </div>

      <app-sql-grid [cols]="['CategoryId', agg().sql]" [rows]="result()" label="Result" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lab { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); min-width: 4.4em; font-family: 'Cascadia Code', Consolas, monospace; }
    .sqlbox { font-size: 0.78rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 0.78rem; margin-bottom: 0.6rem; color: var(--text-muted); }
    .flow b { color: var(--text-main); }
    .buckets { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0.5rem; margin-bottom: 0.8rem; }
    .bucket { border: 1px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.05); border-radius: 10px; padding: 6px; display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; }
    .bucket.cut { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.05); }
    .bucket.cut .chip, .bucket.cut .bv { opacity: 0.55; }
    .bucket.gone { border-style: dashed; border-color: var(--border-color); background: none; }
    .bh { width: 100%; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 8px; font-size: 0.76rem; }
    .bn { font-weight: 700; }
    .bv { color: #8b5cf6; font-size: 0.72rem; }
    .bucket .chip { font-size: 0.68rem; padding: 1px 6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bucket .chip.bad { text-decoration: line-through; opacity: 0.6; }
    .chip small { color: var(--text-muted); }
    .why { width: 100%; font-size: 0.7rem; color: #ef4444; font-weight: 700; }
  `]
})
export class GroupBucketsWidget {
  readonly aggs = AGGS;
  readonly havings = HAVINGS;
  where = signal(false);
  ai = signal(0);
  hi = signal(0);

  agg = computed(() => AGGS[this.ai()]);
  having = computed(() => HAVINGS[this.hi()]);
  sqlText = computed(() => ['SELECT CategoryId, ' + this.agg().sql, 'FROM dbo.Products', ...(this.where() ? ['WHERE Stock > 0'] : []),
    'GROUP BY CategoryId', ...(this.having().sql ? ['HAVING ' + this.having().sql] : [])].join('\n') + ';');
  kept = computed(() => PRODUCTS.filter(p => !this.where() || p.Stock > 0).length);

  /** One bucket per category that has products; rows removed by WHERE stay visible but struck out. */
  buckets = computed(() => CATEGORIES.filter(c => PRODUCTS.some(p => p.CategoryId === c.CategoryId)).map(c => {
    const rows = PRODUCTS.filter(p => p.CategoryId === c.CategoryId);
    const live = rows.filter(p => !this.where() || p.Stock > 0);
    const exists = live.length > 0;
    return { id: c.CategoryId, name: c.Name, rows, exists, pass: exists && this.having().test(live), value: exists ? this.agg().fmt(this.agg().calc(live)) : '' };
  }));
  groups = computed(() => this.buckets().filter(b => b.exists));
  result = computed<Cell[][]>(() => this.buckets().filter(b => b.pass).map(b => [b.id, b.value]));

  cell(p: Product) {
    switch (this.agg().id) { case 'sum': return p.Stock; case 'count': return this.where() ? `stock ${p.Stock}` : ''; default: return money(p.Price); }
  }

  message = computed(() => {
    const w = this.where(), h = this.having().id;
    if (w && h === 'cnt') return 'WHERE ran first and removed Wall plugs and Safety goggles (no stock). Safety then had no rows, so it never became a group, and Fixings was left with one product, so HAVING COUNT(*) >= 2 removed it. Same HAVING, different answer: the order of the clauses matters.';
    if (w) return 'WHERE runs before grouping and removes single rows (struck out). Safety lost its only product, so there is no Safety group at all: a group exists only if at least one row falls into it.';
    if (h === 'cnt') return 'HAVING runs after grouping and removes whole groups. Safety has one product, so its group is dropped. Try WHERE Stock > 0 as well and see Fixings go too.';
    if (h === 'stock') return 'HAVING can test any aggregate, whether or not it is in the SELECT list. Safety (0) and Paint (55) hold fewer than 100 units in total.';
    return 'GROUP BY puts the 12 products into 6 buckets, one per CategoryId (Plumbing has no products, so no bucket). The aggregate then runs once per bucket, giving one result row each.';
  });
}
