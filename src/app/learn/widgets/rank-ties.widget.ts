import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, Product, money } from './sql-data';

/** NTILE(n) for position i (0-based) of m rows: the first m % n groups get one row more. */
function ntile(i: number, m: number, n: number): number {
  const base = Math.floor(m / n), extra = m % n, big = extra * (base + 1);
  return i < big ? Math.floor(i / (base + 1)) + 1 : extra + Math.floor((i - big) / base) + 1;
}

/** ROW_NUMBER, RANK, DENSE_RANK and NTILE side by side over the products, with or without PARTITION BY. */
@Component({
  selector: 'w-rank-ties',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Four ways to number rows</h3></div>
      <div class="w-controls" role="group" aria-label="Window">
        <button type="button" class="w-btn small" [class.on]="!part()" [attr.aria-pressed]="!part()" (click)="part.set(false)">Whole table</button>
        <button type="button" class="w-btn small mono" [class.on]="part()" [attr.aria-pressed]="part()" (click)="part.set(true)">PARTITION BY CategoryId</button>
      </div>
      <div class="w-controls" role="group" aria-label="Options">
        <button type="button" class="w-btn small mono" [class.on]="desc()" [attr.aria-pressed]="desc()" (click)="desc.set(!desc())">Price {{ desc() ? 'DESC' : 'ASC' }}</button>
        <label class="check"><input type="checkbox" [checked]="tiebreak()" (change)="tiebreak.set(!tiebreak())" /> Tiebreaker <span class="mono">, ProductId</span> for ROW_NUMBER</label>
        <span class="lab">NTILE</span>
        @for (k of [2, 3, 4, 5]; track k) {
          <button type="button" class="w-btn small" [class.on]="n() === k" [attr.aria-pressed]="n() === k" (click)="n.set(k)">{{ k }}</button>
        }
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>
      <app-sql-grid [cols]="['CategoryId', 'Name', 'Price', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE(' + n() + ')']" [rows]="rows()" [rowClass]="rowClass()" label="Numbered products" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lab { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); font-family: 'Cascadia Code', Consolas, monospace; margin-left: 0.4rem; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class RankTiesWidget {
  part = signal(false);
  desc = signal(true);
  tiebreak = signal(true);
  n = signal(4);

  private over = computed(() => `OVER (${this.part() ? 'PARTITION BY CategoryId ' : ''}ORDER BY Price${this.desc() ? ' DESC' : ''}`);
  sqlText = computed(() => {
    const o = this.over();
    return [`SELECT CategoryId, Name, Price,`,
      `  ROW_NUMBER() ${o}${this.tiebreak() ? ', ProductId' : ''}),`,
      `  RANK()       ${o}),`,
      `  DENSE_RANK() ${o}),`,
      `  NTILE(${this.n()})     ${o}, ProductId)`,
      `FROM dbo.Products;`].join('\n');
  });

  private sorted = computed(() => {
    const d = this.desc() ? -1 : 1, part = this.part();
    return [...PRODUCTS].sort((a, b) => (part ? a.CategoryId - b.CategoryId : 0) || d * (a.Price - b.Price) || a.ProductId - b.ProductId);
  });

  /** One output row per product, numbered inside its partition. */
  private numbered = computed(() => {
    const rows = this.sorted(), part = this.part();
    const groups = new Map<number, Product[]>();
    for (const p of rows) { const k = part ? p.CategoryId : 0; groups.set(k, [...(groups.get(k) ?? []), p]); }
    return rows.map(p => {
      const g = groups.get(part ? p.CategoryId : 0)!, i = g.indexOf(p);
      const better = g.filter(q => (this.desc() ? q.Price > p.Price : q.Price < p.Price));
      const ties = g.filter(q => q.Price === p.Price);
      const first = g.indexOf(ties[0]) + 1, last = first + ties.length - 1;
      return {
        p, tied: ties.length > 1,
        rowNum: ties.length > 1 && !this.tiebreak() ? `${first} or ${last}` : i + 1,
        rank: better.length + 1,
        dense: new Set(better.map(q => q.Price)).size + 1,
        tile: ntile(i, g.length, this.n())
      };
    });
  });

  rows = computed<Cell[][]>(() => this.numbered().map(r => [r.p.CategoryId, r.p.Name, money(r.p.Price), r.rowNum, r.rank, r.dense, r.tile]));
  rowClass = computed(() => this.numbered().map(r => (r.tied ? 'tie' : '')));

  message = computed(() => {
    if (this.part()) return 'Each category is numbered on its own, starting again at 1. The two 6.80 products are in different categories (Timber and Safety), so inside each partition there are no ties and all three numbering functions agree. NTILE also deals each category into its own bands.';
    const tie = this.numbered().find(r => r.tied)!;
    if (!this.tiebreak()) return `The highlighted products tie on 6.80. Without a tiebreaker, ROW_NUMBER gives them ${tie.rowNum} in no guaranteed order: two runs can differ. RANK gives both ${tie.rank}, DENSE_RANK gives both ${tie.dense}.`;
    return `The highlighted products tie on 6.80. ROW_NUMBER still gives them different numbers (ProductId decides), RANK gives both ${tie.rank} and skips the next number, DENSE_RANK gives both ${tie.dense} with no gap. NTILE(${this.n()}) deals the 12 rows into ${this.n()} bands${12 % this.n() ? `; the first ${12 % this.n()} get one row more` : ' of equal size'}.`;
  });
}
