import { Component, computed, input, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, CUSTOMERS, Cell, ORDERS, PRODUCTS } from './sql-data';

type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
type Filter = 'none' | 'on' | 'where';
interface Item { id: number; label: string; tag: string; data: Record<string, Cell> }
interface Row { l: Item | null; r: Item | null }

const ROW_H = 24;
const VOUCHER = { ProductId: 13, Name: 'Gift voucher', CategoryId: null as number | null, Stock: 100 };

/** Two tables side by side with a line for every pair the ON condition matches, and the rows the join returns. */
@Component({
  selector: 'w-join-lab',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>{{ outer() ? 'Outer joins: who keeps their rows?' : 'INNER JOIN: a line for every match' }}</h3></div>
      @if (outer()) {
        <div class="w-controls" role="group" aria-label="Join type">
          @for (t of types; track t) {
            <button type="button" class="w-btn mono" [class.on]="type() === t" [attr.aria-pressed]="type() === t" (click)="type.set(t)">{{ t }} JOIN</button>
          }
        </div>
        <div class="w-controls" role="group" aria-label="Stock filter">
          <span class="w-label">p.Stock &gt; 0</span>
          @for (f of filters; track f.id) {
            <button type="button" class="w-btn small" [class.on]="filter() === f.id" [attr.aria-pressed]="filter() === f.id" (click)="filter.set(f.id)">{{ f.label }}</button>
          }
          <label class="check"><input type="checkbox" [checked]="voucher()" (change)="voucher.set(!voucher())" /> Add a product with no category</label>
        </div>
      } @else {
        <div class="w-controls" role="group" aria-label="ON condition">
          @for (c of conds; track $index; let i = $index) {
            <button type="button" class="w-btn small mono" [class.on]="cond() === i" [attr.aria-pressed]="cond() === i" (click)="cond.set(i)">ON {{ c }}</button>
          }
        </div>
      }
      <app-code [code]="sql()" title="Join.sql" [compact]="true" [copyable]="false" />

      <div class="jl" role="group" aria-label="Rows of both tables and the pairs the ON condition matches">
        <div class="col">
          <div class="hd">{{ outer() ? 'Categories c' : 'Customers c' }}</div>
          @for (l of left(); track l.id) {
            <button type="button" [class]="'item ' + lState().get(l.id)" [class.focus]="focus() === l.id"
                    (click)="focus.set(focus() === l.id ? null : l.id)" [attr.aria-pressed]="focus() === l.id">
              <span class="pill"><b class="mono">{{ l.id }}</b> {{ l.label }}</span>
            </button>
          }
        </div>
        <svg class="links" [attr.viewBox]="'0 0 44 ' + height()" [attr.height]="height()" width="44" aria-hidden="true">
          @for (p of lines(); track $index) {
            <line x1="0" [attr.y1]="p.y1" x2="44" [attr.y2]="p.y2" [class]="p.cls" />
          }
        </svg>
        <div class="col">
          <div class="hd">{{ outer() ? 'Products p' : 'Orders o' }}</div>
          @for (r of right(); track r.id) {
            <div [class]="'item ' + rState().get(r.id)" [class.focus]="focusRight().has(r.id)">
              <span class="pill" [attr.title]="r.label"><b class="mono">{{ r.id }}</b> <span class="tag mono">{{ r.tag }}</span> {{ r.label }}</span>
            </div>
          }
        </div>
      </div>
      <div class="legend">
        <span><i class="sw m"></i>matched</span>@if (outer()) {<span><i class="sw n"></i>kept, other side NULL</span>}<span><i class="sw d"></i>not in the result</span>
      </div>

      <app-sql-grid [cols]="cols()" [rows]="gridRows()" [rowClass]="gridClass()" label="Rows returned by the join" />
      <div class="w-msg" [class.info]="!warn()" [class.err]="warn()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.84rem; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
    .jl { display: grid; grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1.3fr); margin: 0.8rem 0 0.4rem; }
    .col { min-width: 0; }
    .hd { height: 26px; font-size: 0.76rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; }
    .links { margin-top: 26px; overflow: visible; }
    .item { all: unset; box-sizing: border-box; display: block; width: 100%; height: 24px; padding: 2px 0; }
    button.item { cursor: pointer; }
    button.item:focus-visible .pill { outline: 2px solid var(--purple); }
    .pill { display: block; height: 20px; line-height: 18px; font-size: 0.74rem; padding: 0 6px; border-radius: 6px; border: 1px solid var(--border-color);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: var(--bg-main); }
    .pill b { font-weight: 700; }
    .tag { color: var(--text-muted); font-size: 0.68rem; margin-left: 0.35em; }
    .item.m .pill { border-color: rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.12); }
    .item.n .pill { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.14); }
    .item.d .pill { opacity: 0.45; text-decoration: line-through; text-decoration-color: rgba(239, 68, 68, 0.7); }
    .item.focus .pill { box-shadow: 0 0 0 2px #8b5cf6; }
    line { stroke-width: 1.6; }
    line.live { stroke: #10b981; }
    line.cut { stroke: #ef4444; stroke-dasharray: 3 3; }
    line.dim { opacity: 0.15; }
    .legend { display: flex; flex-wrap: wrap; gap: 0.9rem; font-size: 0.74rem; color: var(--text-muted); margin-bottom: 0.7rem; }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1px solid var(--border-color); }
    .sw.m { background: rgba(16, 185, 129, 0.35); }
    .sw.n { background: rgba(245, 158, 11, 0.4); }
    .sw.d { background: transparent; opacity: 0.6; }
  `]
})
export class JoinLabWidget {
  /** false: Customers ⋈ Orders with a right and a wrong ON condition. true: Categories and Products with every join type. */
  outer = input(false);

  readonly types: JoinType[] = ['INNER', 'LEFT', 'RIGHT', 'FULL'];
  readonly filters: { id: Filter; label: string }[] = [{ id: 'none', label: 'not used' }, { id: 'on', label: 'in ON' }, { id: 'where', label: 'in WHERE' }];
  readonly conds = ['o.CustomerId = c.CustomerId', 'o.OrderId = c.CustomerId'];

  type = signal<JoinType>('LEFT');
  filter = signal<Filter>('none');
  voucher = signal(false);
  cond = signal(0);
  focus = signal<number | null>(null);

  left = computed<Item[]>(() => this.outer()
    ? CATEGORIES.map(c => ({ id: c.CategoryId, label: c.Name, tag: '', data: { CategoryId: c.CategoryId, Name: c.Name } }))
    : CUSTOMERS.map(c => ({ id: c.CustomerId, label: c.FirstName, tag: '', data: { CustomerId: c.CustomerId, FirstName: c.FirstName } })));

  right = computed<Item[]>(() => {
    if (!this.outer()) return ORDERS.map(o => ({ id: o.OrderId, label: '', tag: `cust ${o.CustomerId}`, data: { OrderId: o.OrderId, CustomerId: o.CustomerId } }));
    const ps = [...PRODUCTS.map(p => ({ ProductId: p.ProductId, Name: p.Name, CategoryId: p.CategoryId as number | null, Stock: p.Stock })), ...(this.voucher() ? [VOUCHER] : [])];
    return ps.map(p => ({ id: p.ProductId, label: p.Name, tag: `cat ${p.CategoryId ?? 'NULL'} · stock ${p.Stock}`, data: { ProductId: p.ProductId, Name: p.Name, CategoryId: p.CategoryId, Stock: p.Stock } }));
  });

  private effType = computed<JoinType>(() => (this.outer() ? this.type() : 'INNER'));
  private inStock = (r: Item) => (r.data['Stock'] as number) > 0;

  private on(l: Item, r: Item): boolean {
    if (!this.outer()) return this.cond() === 0 ? r.data['CustomerId'] === l.id : r.id === l.id;
    return r.data['CategoryId'] === l.id && (this.filter() !== 'on' || this.inStock(r));
  }

  /** Every (left, right) pair the ON condition accepts. */
  pairs = computed(() => {
    const out: { l: Item; r: Item }[] = [];
    for (const l of this.left()) for (const r of this.right()) if (this.on(l, r)) out.push({ l, r });
    return out;
  });

  /** Rows before WHERE: matched pairs, plus NULL-extended rows for the preserved side(s). */
  joined = computed<Row[]>(() => {
    const t = this.effType(), pairs = this.pairs(), rows: Row[] = [];
    for (const l of this.left()) {
      const mine = pairs.filter(p => p.l === l);
      if (mine.length) mine.forEach(p => rows.push(p));
      else if (t === 'LEFT' || t === 'FULL') rows.push({ l, r: null });
    }
    if (t === 'RIGHT' || t === 'FULL') for (const r of this.right()) if (!pairs.some(p => p.r === r)) rows.push({ l: null, r });
    if (t === 'RIGHT') rows.sort((a, b) => this.right().indexOf(a.r!) - this.right().indexOf(b.r!));
    return rows;
  });

  /** WHERE p.Stock > 0 runs after the join: NULL > 0 is unknown, so NULL-extended product columns fail it. */
  result = computed<Row[]>(() => (this.outer() && this.filter() === 'where' ? this.joined().filter(r => r.r !== null && this.inStock(r.r)) : this.joined()));
  lostNulls = computed(() => this.joined().filter(r => r.r === null).length - this.result().filter(r => r.r === null).length);

  lState = computed(() => new Map(this.left().map(l => {
    const rows = this.result().filter(r => r.l === l);
    return [l.id, rows.some(r => r.r) ? 'm' : rows.length ? 'n' : 'd'] as [number, string];
  })));
  rState = computed(() => new Map(this.right().map(x => {
    const rows = this.result().filter(r => r.r === x);
    return [x.id, rows.some(r => r.l) ? 'm' : rows.length ? 'n' : 'd'] as [number, string];
  })));
  focusRight = computed(() => new Set(this.pairs().filter(p => p.l.id === this.focus()).map(p => p.r.id)));

  height = computed(() => Math.max(this.left().length, this.right().length) * ROW_H);
  lines = computed(() => this.pairs().map(p => {
    const kept = this.result().some(r => r.l === p.l && r.r === p.r);
    const dim = this.focus() !== null && this.focus() !== p.l.id;
    return {
      y1: this.left().indexOf(p.l) * ROW_H + ROW_H / 2,
      y2: this.right().indexOf(p.r) * ROW_H + ROW_H / 2,
      cls: (kept ? 'live' : 'cut') + (dim ? ' dim' : '')
    };
  }));

  cols = computed(() => (this.outer() ? ['CategoryId', 'Category', 'ProductId', 'Product', 'Stock'] : ['CustomerId', 'FirstName', 'OrderId', 'CustomerId']));
  gridRows = computed<Cell[][]>(() => this.result().map(({ l, r }) => this.outer()
    ? [l?.id ?? null, l?.label ?? null, r?.id ?? null, r?.label ?? null, (r?.data['Stock'] as number) ?? null]
    : [l!.id, l!.label, r!.id, r!.data['CustomerId']]));
  gridClass = computed(() => this.result().map(({ l, r }) => {
    if (!this.outer()) return this.cond() === 1 && r!.data['CustomerId'] !== l!.id ? 'tie' : '';
    return l && r ? '' : 'tie';
  }));

  sql = computed(() => {
    if (!this.outer()) return `SELECT c.CustomerId, c.FirstName, o.OrderId, o.CustomerId\nFROM dbo.Customers AS c\nINNER JOIN dbo.Orders AS o\n    ON ${this.conds[this.cond()]};`;
    const f = this.filter();
    return `SELECT c.CategoryId, c.Name AS Category,\n       p.ProductId, p.Name AS Product, p.Stock\nFROM dbo.Categories AS c\n${this.type()} JOIN dbo.Products AS p\n    ON p.CategoryId = c.CategoryId${f === 'on' ? '\n   AND p.Stock > 0' : ''}${f === 'where' ? '\nWHERE p.Stock > 0' : ''};`;
  });

  warn = computed(() => (!this.outer() ? this.cond() === 1 : this.filter() === 'where' && this.lostNulls() > 0));

  message = computed(() => {
    const n = this.result().length;
    if (!this.outer()) {
      if (this.cond() === 1) return `${n} rows and no error, but they only look right. Order 3 belongs to customer 1, yet it is paired with Chloe because 3 = 3. SQL Server only checks that the ON condition is true, not that it means anything. Where the two CustomerId columns differ (amber) the pairing is wrong, and the other rows are right only by coincidence.`;
      return `${n} rows: every order found its customer. Ella (5) and Grace (7) have no orders, so an INNER JOIN leaves them out. Asha, Ben, Dev and Farid appear twice, once per order: the “one” side is repeated for each match on the “many” side. Click a customer to see their lines.`;
    }
    const t = this.type(), f = this.filter(), v = this.voucher();
    const parts: string[] = [`${n} rows.`];
    if (t === 'INNER') parts.push(`Only matching pairs survive: Plumbing has no products${v ? ' and the gift voucher has no category, so both disappear' : ', so it disappears'}.`);
    if (t === 'LEFT') parts.push(`LEFT JOIN keeps every category (it is on the left); where no product matches, the product columns are NULL (amber).${v ? ' The gift voucher matches no category and is on the right, so it is dropped.' : ''}`);
    if (t === 'RIGHT') parts.push(`RIGHT JOIN keeps every product (it is on the right)${v ? ', and the gift voucher gets NULL category columns' : ''}. Plumbing is dropped. RIGHT JOIN is LEFT JOIN with the tables swapped; most people write LEFT JOIN and put the table they must keep first.`);
    if (t === 'FULL') parts.push(`FULL JOIN keeps both sides: categories without products${v ? ' and products without a category' : ''} appear with NULLs on the other side.${v ? '' : ' Tick the box to add a product with no category.'}`);
    if (f === 'on') parts.push(t === 'INNER' ? 'With an INNER JOIN, the test gives the same rows in ON or in WHERE.' : 'The stock test is part of ON, so it only decides which products match. No category is lost: Safety’s only product is out of stock, so Safety is now kept with NULLs.');
    if (f === 'where') {
      if (this.lostNulls() > 0) parts.push(`WHERE runs after the join and keeps only rows where p.Stock > 0 is true. ${this.lostNulls() === 1 ? 'The NULL-extended row' : `The ${this.lostNulls()} NULL-extended rows`} failed it (NULL > 0 is unknown), so this ${t} JOIN now returns what an INNER JOIN would. Move the test into ON.`);
      else parts.push(t === 'INNER' ? 'With an INNER JOIN, the test gives the same rows in ON or in WHERE.' : 'WHERE runs after the join and removes the out-of-stock products.');
    }
    return parts.join(' ');
  });
}
