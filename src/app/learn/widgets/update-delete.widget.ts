import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, PRODUCTS, Product, money } from './sql-data';

type Op = 'rise' | 'restock' | 'unit' | 'delete';
const OPS: { id: Op; label: string }[] = [
  { id: 'rise', label: 'Raise prices 10%' },
  { id: 'restock', label: 'Restock empty shelves' },
  { id: 'unit', label: 'Rename a unit' },
  { id: 'delete', label: 'Delete products' }
];

/** decimal(10,2) assignment rounds half away from zero; work in whole pence to avoid float drift. */
const rise = (p: number) => Math.round((Math.round(p * 100) * 110) / 100) / 100;

/** UPDATE and DELETE on the products table: preview the rows with SELECT, run, and see what a missing WHERE does. */
@Component({
  selector: 'w-update-delete',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>UPDATE and DELETE, safely</h3></div>
      <div class="w-controls" role="group" aria-label="Change">
        @for (o of ops; track o.id) {
          <button type="button" class="w-btn" [class.on]="op() === o.id" [attr.aria-pressed]="op() === o.id" (click)="choose(o.id)">{{ o.label }}</button>
        }
      </div>
      <div class="w-controls">
        @if (op() === 'rise') {
          <label class="w-field">Category
            <select [value]="cat()" (change)="cat.set(+$any($event.target).value); ran.set(false)">
              @for (c of categories; track c.CategoryId) { <option [value]="c.CategoryId">{{ c.CategoryId }} ({{ c.Name }})</option> }
            </select>
          </label>
        }
        <label class="check"><input type="checkbox" [checked]="!where()" (change)="where.set(!where()); ran.set(false)" /> Forget the WHERE clause</label>
      </div>
      <app-code [code]="ran() ? sql() : preview()" [title]="ran() ? 'Change.sql' : 'Preview.sql'" [compact]="true" [copyable]="false" />
      <div class="w-controls step">
        <button type="button" class="w-btn" [class.on]="!ran()" [attr.aria-pressed]="!ran()" (click)="ran.set(false)"><i class="bi bi-eye" aria-hidden="true"></i> 1. Preview with SELECT</button>
        <button type="button" class="w-btn primary" (click)="ran.set(true)"><i class="bi bi-play-fill" aria-hidden="true"></i> 2. Run the {{ op() === 'delete' ? 'DELETE' : 'UPDATE' }}</button>
      </div>
      @if (ran() && fkError()) {
        <div class="res bad" role="status"><i class="bi bi-x-octagon" aria-hidden="true"></i><span class="mono">{{ fkError() }}</span></div>
      } @else {
        <app-sql-grid [cols]="cols" [rows]="rows()" [rowClass]="classes()" [label]="ran() ? 'Products after the change' : 'Rows the WHERE clause matches'" />
      }
      <div class="w-msg" [class.info]="!danger()" [class.err]="danger()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.86rem; cursor: pointer; }
    .check input { accent-color: #ef4444; }
    .step { margin-top: 0.75rem; }
    .res { border-radius: 12px; padding: 0.8rem 1rem; display: flex; gap: 0.6rem; align-items: flex-start; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); font-size: 0.82rem; }
    .res i { color: #ef4444; font-size: 1.1rem; }
    .res .mono { overflow-wrap: anywhere; }
  `]
})
export class UpdateDeleteWidget {
  readonly ops = OPS;
  readonly categories = CATEGORIES.slice(0, 6);
  readonly cols = ['ProductId', 'Name', 'CategoryId', 'Price', 'Stock', 'Unit'];
  op = signal<Op>('rise');
  cat = signal(1);
  where = signal(true);
  ran = signal(false);

  condition = computed(() => {
    switch (this.op()) {
      case 'rise': return `CategoryId = ${this.cat()}`;
      case 'unit': return 'Unit = N\'box\'';
      default: return 'Stock = 0';
    }
  });
  test = computed<(p: Product) => boolean>(() => {
    if (!this.where()) return () => true;
    switch (this.op()) {
      case 'rise': { const c = this.cat(); return p => p.CategoryId === c; }
      case 'unit': return p => p.Unit === 'box';
      default: return p => p.Stock === 0;
    }
  });
  hits = computed(() => PRODUCTS.filter(p => this.test()(p)).length);
  whereLine = computed(() => (this.where() ? `\nWHERE ${this.condition()}` : ''));

  preview = computed(() => `SELECT ProductId, Name, CategoryId, Price, Stock, Unit\nFROM dbo.Products${this.whereLine()};`);
  sql = computed(() => {
    switch (this.op()) {
      case 'rise': return `UPDATE dbo.Products\nSET Price = Price * 1.10${this.whereLine()};`;
      case 'restock': return `UPDATE dbo.Products\nSET Stock = Stock + 50${this.whereLine()};`;
      case 'unit': return `UPDATE dbo.Products\nSET Unit = N'pack'${this.whereLine()};`;
      default: return `DELETE FROM dbo.Products${this.whereLine()};`;
    }
  });

  /** Every product appears on at least one order, so deleting any of them breaks the OrderItems foreign key. */
  fkError = computed(() => (this.op() === 'delete'
    ? 'Msg 547, Level 16: The DELETE statement conflicted with the REFERENCE constraint "FK__OrderItem__Produ__4222D4EF". The conflict occurred in database "BuildMart", table "dbo.OrderItems", column \'ProductId\'.'
    : ''));

  after = computed<Product[]>(() => PRODUCTS.map(p => {
    if (!this.test()(p)) return p;
    switch (this.op()) {
      case 'rise': return { ...p, Price: rise(p.Price) };
      case 'restock': return { ...p, Stock: p.Stock + 50 };
      case 'unit': return { ...p, Unit: 'pack' };
      default: return p;
    }
  }));
  rows = computed<Cell[][]>(() => {
    const list = this.ran() ? this.after() : PRODUCTS.filter(p => this.test()(p));
    return list.map(p => [p.ProductId, p.Name, p.CategoryId, money(p.Price), p.Stock, p.Unit]);
  });
  classes = computed(() => (this.ran() ? PRODUCTS.map(p => (this.test()(p) ? (this.where() ? 'on' : 'tie') : '')) : []));
  danger = computed(() => !this.where() || (this.ran() && !!this.fkError()));

  message = computed(() => {
    const n = this.hits();
    if (!this.ran()) {
      return this.where()
        ? `Step 1: the SELECT shows the ${n} ${n === 1 ? 'row' : 'rows'} the change will touch. Same FROM and WHERE, so what you see is exactly what will change.`
        : `No WHERE: the preview shows all 12 products. If that is not what you meant, now is the moment to notice.`;
    }
    if (this.fkError()) {
      return this.where()
        ? 'Nothing was deleted. Wall plugs and safety goggles appear on old orders, and the foreign key from OrderItems refuses to leave those order lines pointing at nothing. The whole statement fails, not just those rows.'
        : 'Saved by the foreign key: every product appears on some order, so the DELETE is refused and nothing is removed. Without that constraint, all 12 products would be gone.';
    }
    if (!this.where()) return `(12 rows affected). Every product changed, not just the ones you meant. In SSMS there is no undo; only a transaction you have not committed yet, or a backup, can bring the old values back.`;
    const extra = this.op() === 'rise' ? ' Prices are rounded to 2 decimal places as they are stored, so 9.75 becomes 10.73.' : '';
    return `(${n} ${n === 1 ? 'row' : 'rows'} affected). Only the rows the WHERE matched were changed; the rest are untouched.${extra}`;
  });

  choose(o: Op) { this.op.set(o); this.ran.set(false); }
}
