import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, Product, money } from './sql-data';

type Key = 'Price' | 'Name' | 'Stock' | 'Unit' | 'AddedOn';
type Mode = 'all' | 'top' | 'page';
const KEYS: Key[] = ['Price', 'Name', 'Stock', 'Unit', 'AddedOn'];
const PAGE = 4;

const show = (p: Product, k: Key): Cell => (k === 'Price' ? money(p.Price) : p[k]);
function cmp(a: Product, b: Product, k: Key): number {
  const x = a[k], y = b[k];
  return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { sensitivity: 'base' });
}

/** ORDER BY, TOP (WITH TIES), OFFSET…FETCH and DISTINCT on the products table. */
@Component({
  selector: 'w-sort-page',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Sort, take the top, page through</h3></div>
      <div class="w-controls">
        <label class="w-field">ORDER BY
          <select [value]="key()" (change)="setKey($any($event.target).value)">
            @for (k of keys; track k) { <option [value]="k">{{ k }}</option> }
          </select>
        </label>
        <label class="w-field">direction
          <select [value]="dir()" (change)="dir.set($any($event.target).value)"><option value="ASC">ASC</option><option value="DESC">DESC</option></select>
        </label>
        <label class="w-field">then by
          <select [value]="tie()" [disabled]="distinct()" (change)="tie.set($any($event.target).value)"><option value="">(nothing)</option><option value="ProductId">ProductId</option></select>
        </label>
        <label class="check"><input type="checkbox" [checked]="distinct()" (change)="distinct.set(!distinct())" /> <span class="mono">DISTINCT</span></label>
      </div>
      <div class="w-controls" role="group" aria-label="How many rows">
        <button type="button" class="w-btn" [class.on]="mode() === 'all'" [attr.aria-pressed]="mode() === 'all'" (click)="mode.set('all')">All rows</button>
        <button type="button" class="w-btn mono" [class.on]="mode() === 'top'" [attr.aria-pressed]="mode() === 'top'" (click)="mode.set('top')">TOP</button>
        <button type="button" class="w-btn mono" [class.on]="mode() === 'page'" [attr.aria-pressed]="mode() === 'page'" (click)="mode.set('page')">OFFSET … FETCH</button>
        @if (mode() === 'top') {
          <label class="w-field inline">n = {{ n() }}<input type="range" min="1" max="10" [value]="n()" (input)="n.set(+$any($event.target).value)" /></label>
          <label class="check"><input type="checkbox" [checked]="ties()" (change)="ties.set(!ties())" /> <span class="mono">WITH TIES</span></label>
        }
        @if (mode() === 'page') {
          @for (p of pages(); track p) {
            <button type="button" class="w-btn" [class.on]="page() === p" [attr.aria-pressed]="page() === p" (click)="page.set(p)">page {{ p }}</button>
          }
        }
      </div>
      <app-code [code]="sql()" title="Query.sql" [compact]="true" [copyable]="false" />
      <div class="spacer"></div>
      <div class="w-label">The sorted rows; the ones the query returns are green</div>
      <app-sql-grid [cols]="cols()" [rows]="rows()" [rowClass]="classes()" label="Sorted products, returned rows highlighted" />
      <div class="w-msg" [class.info]="!warn()" [class.err]="warn()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.86rem; cursor: pointer; align-self: flex-end; padding-bottom: 6px; }
    .check input { accent-color: var(--purple); }
    .inline { min-width: 140px; }
    .inline input { accent-color: var(--purple); }
    .spacer { height: 0.75rem; }
  `]
})
export class SortPageWidget {
  readonly keys = KEYS;
  key = signal<Key>('Price');
  dir = signal<'ASC' | 'DESC'>('ASC');
  tie = signal<'' | 'ProductId'>('');
  distinct = signal(false);
  mode = signal<Mode>('top');
  n = signal(3);
  ties = signal(false);
  page = signal(1);

  /** Rows after DISTINCT (if any), sorted. Ties without a tie-breaker keep table order, which SQL Server does not promise. */
  sorted = computed<Product[]>(() => {
    const k = this.key(), s = this.dir() === 'ASC' ? 1 : -1;
    let list = [...PRODUCTS];
    if (this.distinct()) list = list.filter((p, i) => list.findIndex(q => cmp(p, q, k) === 0) === i);
    return list.sort((a, b) => s * cmp(a, b, k) || (this.tie() && !this.distinct() ? a.ProductId - b.ProductId : 0));
  });
  pages = computed(() => Array.from({ length: Math.ceil(this.sorted().length / PAGE) }, (_, i) => i + 1));

  range = computed<[number, number]>(() => {
    const len = this.sorted().length;
    if (this.mode() === 'all') return [0, len];
    if (this.mode() === 'page') { const p = Math.min(this.page(), this.pages().length); return [(p - 1) * PAGE, Math.min(p * PAGE, len)]; }
    let end = Math.min(this.n(), len);
    if (this.ties()) { const last = this.sorted()[end - 1]; while (end < len && cmp(this.sorted()[end], last, this.key()) === 0) end++; }
    return [0, end];
  });

  /** Rows whose sort key is shared with a row on the other side of a cut: their order, so the cut, is not guaranteed. */
  shaky = computed(() => {
    const [a, b] = this.range(), s = this.sorted(), k = this.key();
    if (this.tie() || this.distinct() || this.mode() === 'all') return new Set<number>();
    const out = new Set<number>();
    for (const cut of [a, b]) {
      if (cut <= 0 || cut >= s.length || cmp(s[cut - 1], s[cut], k) !== 0) continue;
      s.forEach((p, i) => { if (cmp(p, s[cut], k) === 0) out.add(i); });
    }
    return out;
  });
  warn = computed(() => this.shaky().size > 0);

  cols = computed(() => (this.distinct() ? [this.key()] : ['ProductId', 'Name', 'Price', 'Stock', 'Unit', 'AddedOn']));
  rows = computed<Cell[][]>(() => this.sorted().map(p => (this.distinct() ? [show(p, this.key())] : [p.ProductId, p.Name, money(p.Price), p.Stock, p.Unit, p.AddedOn])));
  classes = computed(() => {
    const [a, b] = this.range();
    return this.sorted().map((_, i) => (this.shaky().has(i) ? 'tie' : i >= a && i < b ? 'on' : 'off'));
  });

  sql = computed(() => {
    const k = this.key(), order = `ORDER BY ${k}${this.dir() === 'DESC' ? ' DESC' : ''}${this.tie() && !this.distinct() ? ', ProductId' : ''}`;
    const list = this.distinct() ? `DISTINCT ${k}` : 'ProductId, Name, Price, Stock, Unit, AddedOn';
    if (this.mode() === 'top') return `SELECT TOP (${this.n()})${this.ties() ? ' WITH TIES' : ''} ${list}\nFROM dbo.Products\n${order};`;
    if (this.mode() === 'page') { const p = Math.min(this.page(), this.pages().length); return `SELECT ${list}\nFROM dbo.Products\n${order}\nOFFSET ${(p - 1) * PAGE} ROWS FETCH NEXT ${PAGE} ROWS ONLY;`; }
    return `SELECT ${list}\nFROM dbo.Products\n${order};`;
  });

  message = computed(() => {
    const [a, b] = this.range(), got = b - a;
    if (this.warn()) {
      const v = show(this.sorted()[[...this.shaky()][0]], this.key());
      return `Amber rows share ${this.key()} = ${v}, and the cut falls between them. With no tie-breaker SQL Server may put them in either order, so which one you get can change from run to run${this.mode() === 'page' ? ', and paging can show a row twice or skip it' : ''}. Add “then by ProductId”${this.mode() === 'top' ? ' or WITH TIES' : ''}.`;
    }
    if (this.distinct()) return `DISTINCT removes duplicate rows from the result: ${PRODUCTS.length} products have ${this.sorted().length} different values of ${this.key()}.`;
    if (this.mode() === 'top' && this.ties() && got > this.n()) return `TOP (${this.n()}) WITH TIES returned ${got} rows: it keeps going while the next row has the same ${this.key()} as the last one.`;
    if (this.mode() === 'page') return `Page ${Math.min(this.page(), this.pages().length)}: skip ${a} rows, return the next ${got}. Paging only makes sense when ORDER BY gives every row a fixed position.`;
    if (this.mode() === 'top') return `TOP (${this.n()}) returns the first ${got} rows of the sorted result. Without ORDER BY, “first” would mean whatever order SQL Server happens to read the rows in.`;
    return `All ${got} rows, sorted by ${this.key()} ${this.dir() === 'ASC' ? 'from smallest to largest' : 'from largest to smallest'}. ORDER BY is the only thing that guarantees the order of a result.`;
  });

  setKey(k: Key) { this.key.set(k); this.page.set(1); }
}
