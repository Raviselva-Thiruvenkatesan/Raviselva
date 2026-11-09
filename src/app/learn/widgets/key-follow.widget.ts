import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CUSTOMERS, Cell, ORDERS, ORDER_ITEMS, PRODUCTS, money } from './sql-data';

/** Pick an order and follow its foreign keys by hand: up to the customer, down to the order lines, across to the products. */
@Component({
  selector: 'w-key-follow',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Follow the keys</h3></div>
      <p class="w-hint">Pick an order. Each foreign key value is a pointer: look it up in the other table’s primary key to find the row it means.</p>
      <div class="w-controls" role="group" aria-label="Orders">
        @for (o of orders; track o.OrderId) {
          <button type="button" class="w-btn small mono" [class.on]="id() === o.OrderId" [attr.aria-pressed]="id() === o.OrderId" (click)="id.set(o.OrderId)">#{{ o.OrderId }}</button>
        }
      </div>

      <div class="hop"><span class="tbl">dbo.Orders</span> <span class="q mono">WHERE OrderId = {{ id() }}</span></div>
      <app-sql-grid [cols]="['OrderId', 'CustomerId', 'OrderDate', 'Status']" [rows]="orderRows()" label="The order" />

      <div class="arrow up"><i class="bi bi-arrow-down" aria-hidden="true"></i>
        <span>CustomerId <b class="mono">{{ order().CustomerId }}</b> is a foreign key to <b>Customers</b>: many orders → one customer</span>
      </div>
      <div class="hop"><span class="tbl">dbo.Customers</span> <span class="q mono">WHERE CustomerId = {{ order().CustomerId }}</span></div>
      <app-sql-grid [cols]="['CustomerId', 'FirstName', 'LastName', 'City']" [rows]="customerRows()" label="The customer of the order" />
      @if (others().length) {
        <div class="others">The same customer’s other orders:
          @for (x of others(); track x) { <button type="button" class="w-btn tiny mono" (click)="id.set(x)">#{{ x }}</button> }
        </div>
      } @else {
        <div class="others">This is the customer’s only order.</div>
      }

      <div class="arrow"><i class="bi bi-arrow-down" aria-hidden="true"></i>
        <span>OrderItems rows with OrderId <b class="mono">{{ id() }}</b> point back at this order: one order → many lines</span>
      </div>
      <div class="hop"><span class="tbl">dbo.OrderItems</span> <span class="q mono">WHERE OrderId = {{ id() }}</span></div>
      <app-sql-grid [cols]="['OrderId', 'ProductId', 'Quantity', 'UnitPrice']" [rows]="itemRows()" label="The order lines" />

      <div class="arrow"><i class="bi bi-arrow-down" aria-hidden="true"></i>
        <span>each ProductId is a foreign key to <b>Products</b></span>
      </div>
      <div class="hop"><span class="tbl">dbo.Products</span> <span class="q mono">WHERE ProductId IN ({{ productIds().join(', ') }})</span></div>
      <app-sql-grid [cols]="['ProductId', 'Name', 'CategoryId', 'Price']" [rows]="productRows()" label="The products on the order" />

      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .tiny { font-size: 0.74rem; padding: 2px 8px; }
    .hop { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; margin: 0.5rem 0 0.3rem; }
    .tbl { font-weight: 700; font-size: 0.86rem; }
    .q { font-size: 0.76rem; color: var(--text-muted); }
    .arrow { display: flex; gap: 0.5rem; align-items: center; font-size: 0.82rem; color: var(--text-muted); margin: 0.6rem 0 0 0.4rem; }
    .arrow i { color: #8b5cf6; font-size: 1.1rem; }
    .others { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem; display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
  `]
})
export class KeyFollowWidget {
  readonly orders = ORDERS;
  id = signal(7);

  order = computed(() => ORDERS.find(o => o.OrderId === this.id())!);
  customer = computed(() => CUSTOMERS.find(c => c.CustomerId === this.order().CustomerId)!);
  items = computed(() => ORDER_ITEMS.filter(i => i.OrderId === this.id()));
  productIds = computed(() => this.items().map(i => i.ProductId));
  others = computed(() => ORDERS.filter(o => o.CustomerId === this.order().CustomerId && o.OrderId !== this.id()).map(o => o.OrderId));

  orderRows = computed<Cell[][]>(() => { const o = this.order(); return [[o.OrderId, o.CustomerId, o.OrderDate, o.Status]]; });
  customerRows = computed<Cell[][]>(() => { const c = this.customer(); return [[c.CustomerId, c.FirstName, c.LastName, c.City]]; });
  itemRows = computed<Cell[][]>(() => this.items().map(i => [i.OrderId, i.ProductId, i.Quantity, money(i.UnitPrice)]));
  productRows = computed<Cell[][]>(() => this.productIds().map(id => {
    const p = PRODUCTS.find(x => x.ProductId === id)!;
    return [p.ProductId, p.Name, p.CategoryId, money(p.Price)];
  }));

  message = computed(() => {
    const c = this.customer(), n = this.items().length;
    const cheaper = this.items().filter(i => i.UnitPrice !== PRODUCTS.find(p => p.ProductId === i.ProductId)!.Price);
    const base = `Four lookups, each matching a foreign key to a primary key, turned order #${this.id()} into “${c.FirstName} ${c.LastName} from ${c.City} bought ${n} product${n === 1 ? '' : 's'}”. A JOIN does exactly these lookups for you, in one query.`;
    return cheaper.length
      ? `${base} Note the UnitPrice on product ${cheaper[0].ProductId}: the order line keeps the price actually paid, which can differ from today’s price in Products.`
      : base;
  });
}
