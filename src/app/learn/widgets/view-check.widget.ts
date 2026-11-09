import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, money } from './sql-data';

const LIMIT = 10;
const PRICES = [5.0, 9.99, 10.5, 15.0];

/** UPDATE through dbo.CheapProducts (Price < 10.00), with and without WITH CHECK OPTION. */
@Component({
  selector: 'w-view-check',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Updating through a view</h3></div>
      <div class="w-controls">
        <label class="w-field">Product
          <select (change)="pick($any($event.target).value)" aria-label="Product to update">
            @for (p of products; track p.ProductId) { <option [value]="p.ProductId" [selected]="p.ProductId === pid()">{{ p.ProductId }}. {{ p.Name }} ({{ m(p.Price) }})</option> }
          </select>
        </label>
      </div>
      <div class="w-controls" role="group" aria-label="New price">
        <span class="lab">New price</span>
        @for (v of prices; track v) {
          <button type="button" class="w-btn small mono" [class.on]="price() === v" [attr.aria-pressed]="price() === v" (click)="price.set(v)">{{ m(v) }}</button>
        }
        <label class="check"><input type="checkbox" [checked]="check()" (change)="check.set(!check())" /> WITH CHECK OPTION</label>
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>

      <div class="w-msg" [class.ok]="outcome() === 'stays'" [class.err]="outcome() === 'error'" [class.info]="outcome() === 'none' || outcome() === 'leaves'">
        <span class="mono">{{ status() }}</span>
      </div>
      <div class="cols">
        <div class="pane">
          <div class="ph">dbo.CheapProducts after</div>
          <app-sql-grid [cols]="['ProductId', 'Name', 'Price']" [rows]="viewRows()" [rowClass]="viewClass()" label="View after the update" />
        </div>
        <div class="pane">
          <div class="ph">The row in dbo.Products</div>
          <app-sql-grid [cols]="['ProductId', 'Name', 'Price']" [rows]="baseRow()" [rowClass]="baseClass()" label="Base table row" />
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lab { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; margin-left: 0.4rem; }
    .check input { accent-color: #8b5cf6; }
    .w-field select { max-width: 100%; }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0; white-space: pre; overflow-x: auto; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 0.7rem; margin-top: 0.7rem; }
    @media (max-width: 620px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
  `]
})
export class ViewCheckWidget {
  readonly products = PRODUCTS;
  readonly prices = PRICES;
  pid = signal(4);
  price = signal(10.5);
  check = signal(false);

  private p = computed(() => PRODUCTS.find(x => x.ProductId === this.pid())!);
  private inView = computed(() => this.p().Price < LIMIT);
  outcome = computed<'none' | 'stays' | 'leaves' | 'error'>(() => {
    if (!this.inView()) return 'none';
    if (this.price() < LIMIT) return 'stays';
    return this.check() ? 'error' : 'leaves';
  });
  private newPrice = computed(() => (this.outcome() === 'none' || this.outcome() === 'error' ? this.p().Price : this.price()));

  sqlText = computed(() => `CREATE OR ALTER VIEW dbo.CheapProducts AS\nSELECT ProductId, Name, Price, Stock\nFROM dbo.Products\nWHERE Price < 10.00${this.check() ? '\nWITH CHECK OPTION' : ''};\nGO\nUPDATE dbo.CheapProducts\nSET Price = ${this.m(this.price())}\nWHERE ProductId = ${this.pid()};`);

  status = computed(() => {
    switch (this.outcome()) {
      case 'none': return '(0 rows affected)';
      case 'error': return 'Msg 550, Level 16: The attempted insert or update failed because the target view … specifies WITH CHECK OPTION … The statement has been terminated.';
      default: return '(1 row affected)';
    }
  });

  /** The view after the update; a row that left the view is shown struck through. */
  private viewList = computed(() => PRODUCTS.map(x => ({ x, price: x.ProductId === this.pid() ? this.newPrice() : x.Price }))
    .filter(r => r.x.Price < LIMIT || r.price < LIMIT).sort((a, b) => b.price - a.price || a.x.ProductId - b.x.ProductId));
  viewRows = computed<Cell[][]>(() => this.viewList().map(r => [r.x.ProductId, r.x.Name, money(r.price)]));
  viewClass = computed(() => this.viewList().map(r => (r.price >= LIMIT ? 'off' : r.x.ProductId === this.pid() && this.outcome() === 'stays' ? 'on' : '')));
  baseRow = computed<Cell[][]>(() => [[this.pid(), this.p().Name, money(this.newPrice())]]);
  baseClass = computed(() => [this.outcome() === 'stays' || this.outcome() === 'leaves' ? 'on' : '']);

  message = computed(() => {
    const p = this.p(), n = p.Name;
    switch (this.outcome()) {
      case 'none': return `${n} costs ${this.m(p.Price)}, so it is not in the view. An UPDATE through a view can only reach the rows the view shows: nothing changed, and there is no error.`;
      case 'stays': return `${n} is in the view and ${this.m(this.price())} is still under 10.00, so the update is allowed and the row stays in the view${this.check() ? ', even with CHECK OPTION' : ''}.`;
      case 'leaves': return `The update worked, and ${n} has now left the view that changed it (struck through). Tick WITH CHECK OPTION to stop changes like this.`;
      default: return `With CHECK OPTION, SQL Server rejects a change that would move ${n} out of the view. The price stays ${this.m(p.Price)}. Pick a price under 10.00 and it goes through.`;
    }
  });

  pick(v: string) { this.pid.set(+v); }
  m(v: number) { return money(v); }
}
