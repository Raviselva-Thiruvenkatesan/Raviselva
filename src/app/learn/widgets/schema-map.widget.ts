import { Component, computed, signal } from '@angular/core';

interface Col { name: string; type: string; key?: string }
interface Table { id: string; x: number; y: number; cols: Col[]; purpose: string; rules: string[] }

/** The shop schema built in the capstone lesson (same columns and constraints as its CREATE TABLE statements). */
const TABLES: Table[] = [
  { id: 'Customers', x: 10, y: 10, purpose: 'One row per customer.',
    cols: [{ name: 'CustomerId', type: 'int IDENTITY', key: 'PK' }, { name: 'FirstName', type: 'nvarchar(40)' }, { name: 'LastName', type: 'nvarchar(40)' }, { name: 'Email', type: 'nvarchar(100)', key: 'UQ' }],
    rules: ['UQ_Customers_Email: no two customers share an email (requirement 1).'] },
  { id: 'Addresses', x: 10, y: 170, purpose: 'Delivery addresses; a customer can have several.',
    cols: [{ name: 'AddressId', type: 'int IDENTITY', key: 'PK' }, { name: 'CustomerId', type: 'int', key: 'FK' }, { name: 'Line1', type: 'nvarchar(100)' }, { name: 'City', type: 'nvarchar(40)' }, { name: 'Postcode', type: 'varchar(10)' }, { name: 'IsDefault', type: 'bit' }],
    rules: ['FK_Addresses_Customers: every address belongs to a real customer.', 'UX_Addresses_OneDefault: a filtered unique index on CustomerId WHERE IsDefault = 1, so at most one default address each (requirement 1).', 'UQ_Addresses_Customer (AddressId, CustomerId): the target for the orders’ two-column foreign key.'] },
  { id: 'Orders', x: 205, y: 95, purpose: 'One row per order: who, where to, when, and its status.',
    cols: [{ name: 'OrderId', type: 'int IDENTITY', key: 'PK' }, { name: 'CustomerId', type: 'int', key: 'FK' }, { name: 'AddressId', type: 'int', key: 'FK' }, { name: 'OrderedAt', type: 'datetime2(0)' }, { name: 'Status', type: 'varchar(10)' }],
    rules: ['FK_Orders_CustomerAddress (AddressId, CustomerId) → Addresses: the address must be this customer’s (requirement 2).', 'CK_Orders_Status: Placed, Shipped or Cancelled only (requirement 6).', 'DF_Orders_OrderedAt: the current UTC time unless given.', 'IX_Orders_Customer (CustomerId, OrderedAt DESC) INCLUDE (Status): a customer’s recent orders.'] },
  { id: 'OrderLines', x: 400, y: 10, purpose: 'The products in each order, with the price paid.',
    cols: [{ name: 'OrderId', type: 'int', key: 'PK FK' }, { name: 'ProductId', type: 'int', key: 'PK FK' }, { name: 'Quantity', type: 'int' }, { name: 'UnitPrice', type: 'decimal(10,2)' }],
    rules: ['PK (OrderId, ProductId): a product appears once per order.', 'UnitPrice is copied from Products when the order is placed, so later price changes do not alter old orders (requirement 3).', 'CK_OrderLines_Quantity: Quantity > 0.', 'IX_OrderLines_Product: finds orders for a product, and makes deleting a product cheap to check.'] },
  { id: 'Products', x: 400, y: 140, purpose: 'The catalogue: what is sold and its current price.',
    cols: [{ name: 'ProductId', type: 'int IDENTITY', key: 'PK' }, { name: 'Sku', type: 'varchar(20)', key: 'UQ' }, { name: 'Name', type: 'nvarchar(60)' }, { name: 'Price', type: 'decimal(10,2)' }, { name: 'ValidFrom', type: 'datetime2 (hidden)' }, { name: 'ValidTo', type: 'datetime2 (hidden)' }],
    rules: ['System-versioned: every old price is kept in ProductsHistory, so FOR SYSTEM_TIME AS OF answers “what did it cost then?” (requirement 4).', 'CK_Products_Price: Price >= 0.'] },
  { id: 'ProductsHistory', x: 400, y: 268, purpose: 'Old versions of Products rows, written by SQL Server itself.',
    cols: [{ name: '(same columns)', type: '' }],
    rules: ['Cannot be changed while versioning is on.', 'Stock is not in Products, so a sale does not add a history row here.'] },
  { id: 'Stock', x: 205, y: 250, purpose: 'How many of each product are on hand. Changes with every order.',
    cols: [{ name: 'ProductId', type: 'int', key: 'PK FK' }, { name: 'OnHand', type: 'int' }],
    rules: ['CK_Stock_OnHand: never below zero (requirement 5).', 'PlaceOrder checks and subtracts in one UPDATE … WHERE OnHand >= Quantity, so two orders cannot both take the last item.', 'Kept apart from Products so that Products’ history only records price and name changes.'] }
];
const W = 150, ROW = 13, HEAD = 20;
const h = (t: Table) => HEAD + t.cols.length * ROW + 6;

/** FKs: child → parent, with the label shown on the line. */
const LINKS: { from: string; to: string; label: string; dashed?: boolean }[] = [
  { from: 'Addresses', to: 'Customers', label: 'CustomerId' },
  { from: 'Orders', to: 'Customers', label: 'CustomerId' },
  { from: 'Orders', to: 'Addresses', label: '(AddressId, CustomerId)' },
  { from: 'OrderLines', to: 'Orders', label: 'OrderId' },
  { from: 'OrderLines', to: 'Products', label: 'ProductId' },
  { from: 'Stock', to: 'Products', label: 'ProductId' },
  { from: 'Products', to: 'ProductsHistory', label: 'old versions', dashed: true }
];

/** Click a table of the capstone’s shop schema to see its columns, keys and the rules it enforces. */
@Component({
  selector: 'w-schema-map',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The shop schema</h3></div>
      <div class="w-controls" role="group" aria-label="Table">
        @for (t of tables; track t.id) {
          <button type="button" class="w-btn small" [class.on]="sel() === t.id" [attr.aria-pressed]="sel() === t.id" (click)="sel.set(t.id)">{{ t.id }}</button>
        }
      </div>
      <svg class="map" viewBox="0 0 560 320" role="img" aria-label="Tables of the shop schema and the foreign keys between them">
        @for (l of links(); track l.label + l.from) {
          <line [attr.x1]="l.x1" [attr.y1]="l.y1" [attr.x2]="l.x2" [attr.y2]="l.y2" class="lnk" [class.on]="l.on" [class.dash]="l.dashed" />
        }
        @for (t of tables; track t.id) {
          <g class="tbl" [class.on]="sel() === t.id" [class.rel]="related().has(t.id)" (click)="sel.set(t.id)">
            <rect [attr.x]="t.x" [attr.y]="t.y" [attr.width]="W" [attr.height]="h(t)" rx="7" />
            <text [attr.x]="t.x + 8" [attr.y]="t.y + 14" class="tn">shop.{{ t.id }}</text>
            @for (c of t.cols; track c.name; let i = $index) {
              <text [attr.x]="t.x + 8" [attr.y]="t.y + HEAD + 10 + i * ROW" class="cn">{{ c.name }}</text>
              @if (c.key) { <text [attr.x]="t.x + W - 8" [attr.y]="t.y + HEAD + 10 + i * ROW" class="ck" text-anchor="end">{{ c.key }}</text> }
            }
          </g>
        }
      </svg>
      <div class="detail">
        <b>shop.{{ cur().id }}</b> <span class="muted">{{ cur().purpose }}</span>
        <div class="table-wrap">
          <table class="wtable">
            <thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Key</th></tr></thead>
            <tbody>@for (c of cur().cols; track c.name) { <tr><td class="mono">{{ c.name }}</td><td class="mono">{{ c.type }}</td><td>{{ c.key ?? '' }}</td></tr> }</tbody>
          </table>
        </div>
        <ul>@for (r of cur().rules; track r) { <li>{{ r }}</li> }</ul>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .map { width: 100%; display: block; margin: 0.4rem 0; }
    .tbl { cursor: pointer; }
    .tbl rect { fill: var(--bg-main); stroke: var(--border-color); stroke-width: 1.5; }
    .tbl.rel rect { stroke: rgba(139, 92, 246, 0.6); }
    .tbl.on rect { fill: rgba(139, 92, 246, 0.14); stroke: #8b5cf6; stroke-width: 2.5; }
    .tn { font-size: 10.5px; font-weight: 800; fill: var(--text-main); }
    .cn { font-size: 9.5px; fill: var(--text-main); }
    .ck { font-size: 8.5px; font-weight: 800; fill: #7c3aed; }
    .lnk { stroke: var(--border-color); stroke-width: 2; }
    .lnk.on { stroke: #8b5cf6; stroke-width: 3; }
    .lnk.dash { stroke-dasharray: 5 4; }
    .detail { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
    .detail ul { margin: 0.2rem 0 0; padding-left: 1.2rem; }
    .muted { color: var(--text-muted); }
    .table-wrap { overflow-x: auto; }
    .wtable td { text-align: left; }
  `]
})
export class SchemaMapWidget {
  readonly tables = TABLES;
  readonly W = W; readonly ROW = ROW; readonly HEAD = HEAD;
  readonly h = h;
  sel = signal('Orders');
  cur = computed(() => TABLES.find(t => t.id === this.sel())!);
  related = computed(() => new Set(LINKS.filter(l => l.from === this.sel() || l.to === this.sel()).flatMap(l => [l.from, l.to])));

  /** Lines between the nearest sides of two boxes. */
  links = computed(() => LINKS.map(l => {
    const a = TABLES.find(t => t.id === l.from)!, b = TABLES.find(t => t.id === l.to)!;
    const ac = { x: a.x + W / 2, y: a.y + h(a) / 2 }, bc = { x: b.x + W / 2, y: b.y + h(b) / 2 };
    const side = (t: Table, c: { x: number; y: number }, o: { x: number; y: number }) => {
      const dx = o.x - c.x, dy = o.y - c.y;
      return Math.abs(dx) * h(t) > Math.abs(dy) * W
        ? { x: c.x + Math.sign(dx) * W / 2, y: c.y }
        : { x: c.x, y: c.y + Math.sign(dy) * h(t) / 2 };
    };
    const p = side(a, ac, bc), q = side(b, bc, ac);
    return { ...l, x1: p.x, y1: p.y, x2: q.x, y2: q.y, on: l.from === this.sel() || l.to === this.sel() };
  }));
}
