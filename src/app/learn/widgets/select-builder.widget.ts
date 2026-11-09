import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, Product, money } from './sql-data';

type Col = 'ProductId' | 'Name' | 'CategoryId' | 'Price' | 'Stock' | 'Unit' | 'AddedOn';
const COLS: Col[] = ['ProductId', 'Name', 'CategoryId', 'Price', 'Stock', 'Unit', 'AddedOn'];

function cell(p: Product, c: Col): Cell {
  return c === 'Price' ? money(p.Price) : p[c];
}

/** Pick columns, rename one, add a calculated column: the SELECT list decides the shape of the result. */
@Component({
  selector: 'w-select-builder',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Build a SELECT list</h3></div>
      <div class="w-label">Columns</div>
      <div class="w-controls" role="group" aria-label="Columns">
        <button type="button" class="w-btn mono" [class.on]="star()" [attr.aria-pressed]="star()" (click)="star.set(!star())">*</button>
        @for (c of cols; track c) {
          <button type="button" class="w-btn mono" [class.on]="!star() && picked().includes(c)" [attr.aria-pressed]="!star() && picked().includes(c)" [disabled]="star()" (click)="toggle(c)">{{ c }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Extras">
        <label class="check"><input type="checkbox" [checked]="alias()" [disabled]="star() || !picked().includes('Name')" (change)="alias.set(!alias())" /> Name <span class="mono">AS Product</span></label>
        <label class="check"><input type="checkbox" [checked]="calc()" (change)="calc.set(!calc())" /> <span class="mono">Price * Stock AS StockValue</span></label>
      </div>
      <app-code [code]="sql()" title="Query.sql" [compact]="true" [copyable]="false" />
      <div class="spacer"></div>
      <app-sql-grid [cols]="headers()" [rows]="rows()" label="Result of the SELECT" />
      <div class="w-msg" [class.info]="!error()" [class.err]="!!error()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.86rem; cursor: pointer; }
    .check input { accent-color: var(--purple); }
    .spacer { height: 0.75rem; }
  `]
})
export class SelectBuilderWidget {
  readonly cols = COLS;
  star = signal(false);
  picked = signal<Col[]>(['Name', 'Price']);
  alias = signal(false);
  calc = signal(false);

  shown = computed<Col[]>(() => (this.star() ? COLS : this.picked()));
  error = computed(() => this.shown().length === 0 && !this.calc());

  sql = computed(() => {
    const items: string[] = this.star() ? ['*'] : this.shown().map(c => (c === 'Name' && this.alias() ? 'Name AS Product' : c));
    if (this.calc()) items.push('Price * Stock AS StockValue');
    const list = items.length ? items.join(', ') : '';
    return `SELECT ${list}\nFROM dbo.Products;`;
  });

  headers = computed(() => {
    const h = this.shown().map(c => (c === 'Name' && this.alias() && !this.star() ? 'Product' : c));
    return this.calc() ? [...h, 'StockValue'] : h;
  });

  rows = computed<Cell[][]>(() => this.error() ? [] : PRODUCTS.map(p => {
    const r = this.shown().map(c => cell(p, c));
    return this.calc() ? [...r, money(p.Price * p.Stock)] : r;
  }));

  message = computed(() => {
    if (this.error()) return "Msg 156, Level 15: Incorrect syntax near the keyword 'FROM'. A SELECT needs at least one column or expression.";
    const n = this.headers().length;
    if (this.star()) return `SELECT * returns all ${COLS.length} columns${this.calc() ? ' plus StockValue' : ''}. Handy for a quick look; in real code list the columns you need, so the query does not change shape when someone adds a column.`;
    if (this.calc()) return `StockValue is not stored anywhere: SQL Server works out Price * Stock for each of the 12 rows as it returns them. The result has ${n} columns.`;
    if (this.alias()) return 'AS Product renames the column in the result only. The table still calls it Name.';
    return `Same 12 rows every time; the SELECT list only decides which ${n === 1 ? 'column' : n + ' columns'} you see, in the order you list them.`;
  });

  toggle(c: Col) {
    const cur = this.picked();
    this.picked.set(cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]);
  }
}
