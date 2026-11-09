import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, PRODUCTS, Product, likeToRegex, money } from './sql-data';

interface Cond { label: string; sql: string; test: (p: Product) => boolean }

/** Turn conditions on and off, join them with AND or OR, and watch which rows survive the WHERE. */
@Component({
  selector: 'w-where-lab',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Filter BuildMart’s products</h3></div>
      <div class="conds">
        <label class="cond"><input type="checkbox" [checked]="useCat()" (change)="useCat.set(!useCat())" />
          <span class="mono">CategoryId =</span>
          <select class="w-field" [value]="cat()" (change)="cat.set(+$any($event.target).value)" aria-label="Category id">
            @for (c of categories; track c.CategoryId) { <option [value]="c.CategoryId">{{ c.CategoryId }} ({{ c.Name }})</option> }
          </select>
        </label>
        <label class="cond"><input type="checkbox" [checked]="usePrice()" (change)="usePrice.set(!usePrice())" />
          <span class="mono">Price &lt;= {{ money(price()) }}</span>
          <input type="range" min="0" max="90" step="0.5" [value]="price()" (input)="price.set(+$any($event.target).value)" aria-label="Highest price" />
        </label>
        <label class="cond"><input type="checkbox" [checked]="useStock()" (change)="useStock.set(!useStock())" />
          <span class="mono">Stock &gt; 0</span>
        </label>
        <label class="cond"><input type="checkbox" [checked]="useLike()" (change)="useLike.set(!useLike())" />
          <span class="mono">Name LIKE N'</span><input class="w-field mono pat" [value]="pattern()" (input)="pattern.set($any($event.target).value)" aria-label="LIKE pattern" /><span class="mono">'</span>
        </label>
      </div>
      <div class="w-controls" role="group" aria-label="Join conditions with">
        <span class="w-label join">Join with</span>
        <button type="button" class="w-btn mono" [class.on]="op() === 'AND'" [attr.aria-pressed]="op() === 'AND'" (click)="op.set('AND')">AND</button>
        <button type="button" class="w-btn mono" [class.on]="op() === 'OR'" [attr.aria-pressed]="op() === 'OR'" (click)="op.set('OR')">OR</button>
      </div>
      <app-code [code]="sql()" title="Query.sql" [compact]="true" [copyable]="false" />
      <div class="spacer"></div>
      <app-sql-grid [cols]="headers()" [rows]="rows()" [rowClass]="classes()" label="Products, with the rows the WHERE keeps highlighted" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .conds { display: grid; gap: 6px; margin-bottom: 0.8rem; }
    .cond { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 0.86rem; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-main); }
    .cond input[type='checkbox'] { accent-color: var(--purple); }
    .cond input[type='range'] { accent-color: var(--purple); flex: 1; min-width: 120px; }
    .cond select { padding: 3px 6px; }
    .pat { width: 9rem; padding: 3px 8px; }
    .join { margin: 0; }
    .spacer { height: 0.75rem; }
  `]
})
export class WhereLabWidget {
  readonly categories = CATEGORIES.slice(0, 6);
  readonly money = money;
  useCat = signal(false);
  cat = signal(1);
  usePrice = signal(true);
  price = signal(12);
  useStock = signal(true);
  useLike = signal(false);
  pattern = signal('%paint%');
  op = signal<'AND' | 'OR'>('AND');

  conds = computed<Cond[]>(() => {
    const list: Cond[] = [];
    if (this.useCat()) { const c = this.cat(); list.push({ label: `Cat=${c}`, sql: `CategoryId = ${c}`, test: p => p.CategoryId === c }); }
    if (this.usePrice()) { const v = this.price(); list.push({ label: `≤${money(v)}`, sql: `Price <= ${money(v)}`, test: p => p.Price <= v }); }
    if (this.useStock()) list.push({ label: 'Stock>0', sql: 'Stock > 0', test: p => p.Stock > 0 });
    if (this.useLike()) { const pat = this.pattern(), re = likeToRegex(pat); list.push({ label: 'LIKE', sql: `Name LIKE N'${pat.replace(/'/g, "''")}'`, test: p => re.test(p.Name) }); }
    return list;
  });

  keep = computed(() => PRODUCTS.map(p => {
    const r = this.conds().map(c => c.test(p));
    if (!r.length) return true;
    return this.op() === 'AND' ? r.every(Boolean) : r.some(Boolean);
  }));

  sql = computed(() => {
    const c = this.conds();
    const base = 'SELECT ProductId, Name, CategoryId, Price, Stock\nFROM dbo.Products';
    if (!c.length) return base + ';';
    return `${base}\nWHERE ${c.map(x => x.sql).join(`\n  ${this.op()} `)};`;
  });

  headers = computed(() => ['ProductId', 'Name', 'CategoryId', 'Price', 'Stock', ...this.conds().map(c => c.label)]);
  rows = computed<Cell[][]>(() => PRODUCTS.map(p => [p.ProductId, p.Name, p.CategoryId, money(p.Price), p.Stock, ...this.conds().map(c => (c.test(p) ? '✓' : '✗'))]));
  classes = computed(() => this.keep().map(k => (k ? 'on' : 'off')));

  message = computed(() => {
    const n = this.keep().filter(Boolean).length, c = this.conds().length;
    if (!c) return 'No WHERE clause, so all 12 rows come back.';
    if (c === 1) return `${n} of 12 rows pass the condition. SQL Server tests it once per row and keeps the rows where it is true.`;
    return this.op() === 'AND'
      ? `AND keeps a row only when every condition is true (all ✓): ${n} of 12 rows. Adding conditions with AND can only shrink the result.`
      : `OR keeps a row when at least one condition is true (any ✓): ${n} of 12 rows. Adding conditions with OR can only grow the result.`;
  });
}
