import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, CUSTOMERS, Cell, PRODUCTS, money } from './sql-data';

type Level = 'server' | 'database' | 'schema' | 'table';
interface TableInfo { name: string; cols: string[]; types: string[]; rows: Cell[][]; total: number; about: string }

const TABLES: TableInfo[] = [
  { name: 'Categories', cols: ['CategoryId', 'Name'], types: ['int', 'nvarchar(40)'], total: CATEGORIES.length,
    rows: CATEGORIES.slice(0, 3).map(c => [c.CategoryId, c.Name]), about: 'One row per kind of product: Tools, Timber, Paint…' },
  { name: 'Products', cols: ['ProductId', 'Name', 'CategoryId', 'Price', 'Stock', 'Unit', 'AddedOn'],
    types: ['int', 'nvarchar(60)', 'int', 'decimal(10,2)', 'int', 'nvarchar(10)', 'date'], total: PRODUCTS.length,
    rows: PRODUCTS.slice(0, 3).map(p => [p.ProductId, p.Name, p.CategoryId, money(p.Price), p.Stock, p.Unit, p.AddedOn]),
    about: 'One row per thing the shop sells. CategoryId points at a row in Categories.' },
  { name: 'Customers', cols: ['CustomerId', 'FirstName', 'LastName', 'City', 'Email', 'Phone', 'JoinedOn'],
    types: ['int', 'nvarchar(40)', 'nvarchar(40)', 'nvarchar(40)', 'nvarchar(100)', 'varchar(20)', 'date'], total: CUSTOMERS.length,
    rows: CUSTOMERS.slice(0, 3).map(c => [c.CustomerId, c.FirstName, c.LastName, c.City, c.Email, c.Phone, c.JoinedOn]),
    about: 'One row per customer. Some cells are NULL: the value is not known.' },
  { name: 'Orders', cols: ['OrderId', 'CustomerId', 'OrderDate', 'Status'], types: ['int', 'int', 'date', 'varchar(10)'], total: 10,
    rows: [[1, 1, '2024-02-03', 'Shipped'], [2, 2, '2024-02-10', 'Shipped'], [3, 1, '2024-03-01', 'Shipped']],
    about: 'One row per order. CustomerId says who placed it.' },
  { name: 'OrderItems', cols: ['OrderId', 'ProductId', 'Quantity', 'UnitPrice'], types: ['int', 'int', 'int', 'decimal(10,2)'], total: 18,
    rows: [[1, 1, 1, '18.50'], [1, 3, 2, '9.75'], [2, 4, 10, '7.20']],
    about: 'One row per line on an order: which product, how many, at what price.' }
];

const LEVELS: { id: Level; label: string; icon: string; text: string }[] = [
  { id: 'server', label: 'Server (instance)', icon: 'bi-hdd-rack', text: 'A running copy of SQL Server, such as localhost or DESKTOP-PC\\SQLEXPRESS. One instance holds many databases and listens for connections from SSMS and from applications.' },
  { id: 'database', label: 'Database', icon: 'bi-database', text: 'A self-contained set of tables and other objects, stored in its own data file (.mdf) and log file (.ldf). Backups, restores and permissions usually work per database. BuildMart is one database.' },
  { id: 'schema', label: 'Schema', icon: 'bi-folder2', text: 'A named folder inside a database that groups objects. Everything in BuildMart lives in the default schema dbo (database owner). Big systems use schemas such as Sales and Stock.' },
  { id: 'table', label: 'Table', icon: 'bi-table', text: 'Where the data actually lives: named columns, each with a data type, and any number of rows. Pick a table below to see its columns and first rows.' }
];

/** Server → database → schema → table, with a peek inside each BuildMart table. */
@Component({
  selector: 'w-db-anatomy',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where your data lives</h3></div>
      <div class="w-grid two">
        <div class="nest" role="group" aria-label="Levels of SQL Server">
          <button type="button" class="box lv0" [class.on]="level() === 'server'" [attr.aria-pressed]="level() === 'server'" (click)="level.set('server')">
            <span class="cap"><i class="bi bi-hdd-rack" aria-hidden="true"></i> Server: localhost</span>
          </button>
          <div class="inner l1">
            <button type="button" class="box lv1" [class.on]="level() === 'database'" [attr.aria-pressed]="level() === 'database'" (click)="level.set('database')">
              <span class="cap"><i class="bi bi-database" aria-hidden="true"></i> Database: BuildMart</span>
            </button>
            <div class="sib"><span><i class="bi bi-database" aria-hidden="true"></i> master</span><span><i class="bi bi-database" aria-hidden="true"></i> tempdb</span></div>
            <div class="inner l2">
              <button type="button" class="box lv2" [class.on]="level() === 'schema'" [attr.aria-pressed]="level() === 'schema'" (click)="level.set('schema')">
                <span class="cap"><i class="bi bi-folder2" aria-hidden="true"></i> Schema: dbo</span>
              </button>
              <div class="tables">
                @for (t of tables; track t.name; let i = $index) {
                  <button type="button" class="tbl" [class.on]="level() === 'table' && pick() === i" [attr.aria-pressed]="level() === 'table' && pick() === i" (click)="choose(i)">
                    <i class="bi bi-table" aria-hidden="true"></i> {{ t.name }}
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="w-label">{{ info().label }}</div>
          <p class="about">{{ info().text }}</p>
          <div class="w-label">Three-part name, on server <span class="mono srv" [class.hl]="level() === 'server'">localhost</span></div>
          <p class="mono name"><span [class.hl]="level() === 'database'">BuildMart</span>.<span [class.hl]="level() === 'schema'">dbo</span>.<span [class.hl]="level() === 'table'">{{ table().name }}</span></p>
        </div>
      </div>
      @if (level() === 'table') {
        <div class="peek">
          <div class="w-label">dbo.{{ table().name }}: {{ table().about }}</div>
          <div class="types">
            @for (c of table().cols; track c; let i = $index) { <span class="chip"><b>{{ c }}</b> {{ table().types[i] }}</span> }
          </div>
          <app-sql-grid [cols]="table().cols" [rows]="table().rows" [label]="'First rows of ' + table().name" />
          <p class="more">Showing 3 of {{ table().total }} rows.</p>
        </div>
      }
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .nest { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 14px; border: 1.5px solid rgba(59, 130, 246, 0.45); background: rgba(59, 130, 246, 0.05); }
    .inner { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 12px; }
    .l1 { border: 1.5px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.05); }
    .l2 { border: 1.5px solid rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.05); }
    .box, .tbl { font: inherit; text-align: left; cursor: pointer; border-radius: 9px; border: 1px solid transparent; background: transparent; color: var(--text-main); padding: 4px 8px; font-weight: 700; font-size: 0.86rem; }
    .box:hover, .tbl:hover, .box:focus-visible, .tbl:focus-visible { border-color: var(--purple); }
    .box.on, .tbl.on { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; }
    .sib { display: flex; gap: 10px; font-size: 0.78rem; color: var(--text-muted); padding: 0 8px; }
    .tables { display: flex; flex-wrap: wrap; gap: 6px; }
    .tbl { border-color: var(--border-color); background: var(--bg-main); font-weight: 600; }
    .about { font-size: 0.9rem; margin: 0 0 0.6rem; }
    .name { font-size: 0.9rem; overflow-wrap: anywhere; }
    .srv { text-transform: none; letter-spacing: 0; font-size: 0.8rem; }
    .srv.hl { color: var(--text-main); }
    .name .hl, .srv.hl { background: rgba(245, 158, 11, 0.3); border-radius: 4px; padding: 0 2px; font-weight: 800; }
    .peek { margin-top: 0.9rem; }
    .types { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.5rem; }
    .chip { font-size: 0.74rem; font-weight: 500; }
    .chip b { font-weight: 800; }
    .more { font-size: 0.78rem; color: var(--text-muted); margin: 0.3rem 0 0; }
  `]
})
export class DbAnatomyWidget {
  readonly tables = TABLES;
  level = signal<Level>('table');
  pick = signal(1);

  table = computed(() => TABLES[this.pick()]);
  info = computed(() => LEVELS.find(l => l.id === this.level())!);
  message = computed(() => {
    switch (this.level()) {
      case 'server': return 'You connect to a server first. In SSMS that is the “Connect to Server” box; in C# it is the Server= part of the connection string.';
      case 'database': return 'USE BuildMart; makes BuildMart the current database, so later queries do not have to name it.';
      case 'schema': return 'Write dbo.Products rather than just Products: it is clearer, and SQL Server finds the table without searching other schemas.';
      default: return `dbo.${this.table().name} has ${this.table().cols.length} columns and ${this.table().total} rows. Every row has the same columns; each column holds one type of value.`;
    }
  });

  choose(i: number) { this.pick.set(i); this.level.set('table'); }
}
