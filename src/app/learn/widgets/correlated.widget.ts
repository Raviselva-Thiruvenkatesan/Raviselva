import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, PRODUCTS, money } from './sql-data';

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const avg6 = (v: number) => (Math.trunc(v * 1e6 + 1e-6) / 1e6).toFixed(6);
/** The outer query reads the products in category order, as the lesson’s ORDER BY shows them. */
const OUTER = [...PRODUCTS].sort((a, b) => a.CategoryId - b.CategoryId || a.ProductId - b.ProductId);

/** Step through a correlated subquery: for each outer product, the inner query runs again with that product’s CategoryId. */
@Component({
  selector: 'w-correlated',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One inner query per outer row</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn" (click)="go(-1)" [disabled]="i() === 0" aria-label="Previous product"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
        <span class="pos">Outer row {{ i() + 1 }} of {{ outer.length }}</span>
        <button type="button" class="w-btn" (click)="go(1)" [disabled]="i() === outer.length - 1" aria-label="Next product"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        <button type="button" class="w-btn small" (click)="i.set(outer.length - 1)">Run to the end</button>
        <label class="check"><input type="checkbox" [checked]="noAlias()" (change)="noAlias.set(!noAlias())" /> Forget the aliases</label>
      </div>

      <div class="cols">
        <div class="pane">
          <div class="ph">Outer: <span class="mono">p</span></div>
          @for (p of outer; track p.ProductId; let k = $index) {
            <button type="button" class="orow" [class.cur]="k === i()" [class.done]="k < i()" [class.keep]="k <= i() && keep(k)" (click)="i.set(k)">
              <span class="nm">{{ p.Name }}</span><span class="mono">cat {{ p.CategoryId }} · {{ m(p.Price) }}</span>
            </button>
          }
        </div>
        <div class="pane">
          <div class="ph">Inner query for this row</div>
          <pre class="sqlbox mono">{{ innerSql() }}</pre>
          <div class="chips">
            @for (q of inner(); track q.ProductId) { <span class="chip">{{ q.Name }} <small>{{ m(q.Price) }}</small></span> }
          </div>
          <div class="calc mono">AVG = {{ avgText() }}</div>
          <div class="w-msg" [class.ok]="keep(i())" [class.err]="!keep(i())">
            <span>{{ m(cur().Price) }} &gt; {{ avgText() }} is {{ keep(i()) ? 'true: kept' : 'false: not kept' }}</span>
          </div>
        </div>
      </div>

      <app-sql-grid [cols]="['Name', 'CategoryId', 'Price']" [rows]="rows()" label="Rows kept so far" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .pos { font-size: 0.82rem; min-width: 8.5em; text-align: center; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #ef4444; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 0.7rem; margin: 0.6rem 0 0.8rem; }
    @media (max-width: 620px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .orow { all: unset; box-sizing: border-box; display: flex; justify-content: space-between; gap: 8px; width: 100%; padding: 2px 8px; border-radius: 6px; font-size: 0.76rem; cursor: pointer; border: 1px solid transparent; }
    .orow .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .orow .mono { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
    .orow.done { opacity: 0.6; }
    .orow.keep { background: rgba(16, 185, 129, 0.16); opacity: 1; }
    .orow.cur { border-color: #f59e0b; opacity: 1; }
    .orow:focus-visible { outline: 2px solid var(--purple); }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0 0 0.5rem; white-space: pre; overflow-x: auto; }
    .chips .chip { font-size: 0.7rem; padding: 1px 6px; }
    .chip small { color: var(--text-muted); }
    .calc { font-size: 0.8rem; margin: 0.4rem 0; }
    .w-msg { margin-top: 0.5rem; }
  `]
})
export class CorrelatedWidget {
  readonly outer = OUTER;
  i = signal(0);
  noAlias = signal(false);

  cur = computed(() => OUTER[this.i()]);
  /** Without aliases, CategoryId = CategoryId compares the inner row with itself, so every product qualifies. */
  inner = computed(() => (this.noAlias() ? PRODUCTS : PRODUCTS.filter(q => q.CategoryId === this.cur().CategoryId)));
  private avgFor(k: number) { return this.noAlias() ? avg(PRODUCTS.map(q => q.Price)) : avg(PRODUCTS.filter(q => q.CategoryId === OUTER[k].CategoryId).map(q => q.Price)); }
  keep(k: number) { return OUTER[k].Price > this.avgFor(k) + 1e-9; }
  avgText = computed(() => avg6(this.avgFor(this.i())));

  innerSql = computed(() => this.noAlias()
    ? 'SELECT AVG(Price)\nFROM dbo.Products\nWHERE CategoryId = CategoryId  -- always true'
    : `SELECT AVG(p2.Price)\nFROM dbo.Products AS p2\nWHERE p2.CategoryId = ${this.cur().CategoryId}  -- p.CategoryId`);

  rows = computed<Cell[][]>(() => OUTER.filter((_, k) => k <= this.i() && this.keep(k)).map(p => [p.Name, p.CategoryId, money(p.Price)]));

  go(d: number) { this.i.update(v => Math.min(OUTER.length - 1, Math.max(0, v + d))); }
  m(v: number) { return money(v); }

  message = computed(() => {
    if (this.noAlias()) return 'Without aliases, both CategoryIds belong to the inner Products, so the test compares each row with itself and is always true. The subquery stops being correlated: every outer row gets the overall average 22.254166, and only the three dearest products pass.';
    const c = this.cur(), cat = CATEGORIES.find(x => x.CategoryId === c.CategoryId)!.Name;
    if (this.inner().length === 1) return `${c.Name} is the only ${cat} product, so it is compared with its own price, and a value is never greater than itself. Safety therefore contributes no row.`;
    return `For ${c.Name} the inner query sees only the ${this.inner().length} ${cat} products, because p2.CategoryId = p.CategoryId uses the outer row’s value (${c.CategoryId}). Step on: the next category gives a different average.`;
  });
}
