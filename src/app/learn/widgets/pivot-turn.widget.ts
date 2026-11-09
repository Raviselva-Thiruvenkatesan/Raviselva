import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, ORDERS, ORDER_ITEMS, PRODUCTS, money } from './sql-data';

const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun'];
const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The PIVOT source from the lesson: one row per order line of an order that was not cancelled. */
const SRC = ORDER_ITEMS.flatMap(i => {
  const o = ORDERS.find(x => x.OrderId === i.OrderId)!;
  if (o.Status === 'Cancelled') return [];
  const p = PRODUCTS.find(x => x.ProductId === i.ProductId)!;
  return [{ OrderId: i.OrderId, Category: CATEGORIES.find(c => c.CategoryId === p.CategoryId)!.Name, Mon: NAMES[+o.OrderDate.slice(5, 7) - 1], Value: Math.round(i.Quantity * i.UnitPrice * 100) / 100 }];
}).sort((a, b) => a.Category.localeCompare(b.Category) || MONTHS.indexOf(a.Mon) - MONTHS.indexOf(b.Mon) || a.OrderId - b.OrderId);
type Src = (typeof SRC)[number];
type Agg = 'SUM' | 'COUNT' | 'MAX';

/** Long rows into a cross-tab: click a cell to see the source rows it was built from. */
@Component({
  selector: 'w-pivot-turn',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rows into columns</h3></div>
      <div class="w-controls" role="group" aria-label="Aggregate">
        @for (a of aggs; track a) {
          <button type="button" class="w-btn small mono" [class.on]="agg() === a" [attr.aria-pressed]="agg() === a" (click)="agg.set(a)">{{ a }}(Value)</button>
        }
      </div>
      <div class="w-controls">
        <label class="check"><input type="checkbox" [checked]="extra()" (change)="toggleExtra()" /> Leave OrderId in the source</label>
        <label class="check"><input type="checkbox" [checked]="zero()" (change)="zero.set(!zero())" /> Empty cells as 0 (conditional aggregation)</label>
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>

      <div class="grid-wrap" role="region" aria-label="Pivoted result" tabindex="0">
        <table class="pv">
          <thead><tr><th scope="col">Category</th>@if (extra()) { <th scope="col" class="num">OrderId</th> }@for (mn of months; track mn) { <th scope="col" class="num">{{ mn }}</th> }</tr></thead>
          <tbody>
            @for (r of pivot(); track r.key) {
              <tr>
                <th scope="row">{{ r.category }}</th>
                @if (extra()) { <td class="num muted">{{ r.orderId }}</td> }
                @for (c of r.cells; track $index; let k = $index) {
                  <td class="num"><button type="button" class="cell" [class.null]="c === null" [class.sel]="sel()?.key === r.key && sel()?.mon === months[k]" (click)="pick(r.key, months[k])" [attr.aria-label]="r.category + ' ' + months[k]">{{ c === null ? 'NULL' : c }}</button></td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="gap"></div>
      <app-sql-grid [cols]="['OrderId', 'Category', 'Mon', 'Value']" [rows]="srcRows()" [rowClass]="srcClass()" label="Source rows" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
    .sqlbox { font-size: 0.74rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .grid-wrap { overflow-x: auto; max-width: 100%; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-main); }
    .pv { border-collapse: collapse; width: 100%; font-size: 0.8rem; font-family: 'Cascadia Code', Consolas, monospace; }
    .pv th, .pv td { padding: 2px 6px; border-bottom: 1px solid var(--border-color); white-space: nowrap; text-align: left; }
    .pv thead th { color: var(--text-muted); background: var(--bg-secondary); }
    .pv tbody th { font-weight: 600; }
    .pv .num { text-align: right; }
    .pv .muted { color: var(--text-muted); }
    .pv tbody tr:last-child > * { border-bottom: 0; }
    .cell { all: unset; box-sizing: border-box; cursor: pointer; padding: 1px 6px; border-radius: 6px; min-width: 4.2em; text-align: right; }
    .cell:hover { background: rgba(139, 92, 246, 0.1); }
    .cell.null { color: var(--text-muted); font-style: italic; }
    .cell.sel { background: rgba(139, 92, 246, 0.22); outline: 1px solid #8b5cf6; }
    .cell:focus-visible { outline: 2px solid var(--purple); }
    .gap { height: 0.6rem; }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class PivotTurnWidget {
  readonly aggs: Agg[] = ['SUM', 'COUNT', 'MAX'];
  readonly months = MONTHS;
  agg = signal<Agg>('SUM');
  extra = signal(false);
  zero = signal(false);
  sel = signal<{ key: string; mon: string } | null>({ key: 'Building', mon: 'Feb' });

  private keyOf(s: Src) { return this.extra() ? `${s.Category}/${s.OrderId}` : s.Category; }

  sqlText = computed(() => {
    const a = `${this.agg()}(Value)`;
    if (this.zero()) {
      const fn = this.agg() === 'COUNT' ? (m: string) => `COUNT(CASE WHEN Mon = '${m}' THEN 1 END)` : (m: string) => `${this.agg()}(CASE WHEN Mon = '${m}' THEN Value ELSE 0 END)`;
      return [`SELECT Category${this.extra() ? ', OrderId' : ''},`, ...MONTHS.map((m, k) => `       ${fn(m)} AS ${m}${k < MONTHS.length - 1 ? ',' : ''}`),
        'FROM src', `GROUP BY Category${this.extra() ? ', OrderId' : ''};`].join('\n');
    }
    return [`SELECT Category${this.extra() ? ', OrderId' : ''}, [Feb], [Mar], [Apr], [May], [Jun]`,
      `FROM (SELECT Category, ${this.extra() ? 'OrderId, ' : ''}Mon, Value FROM src) AS s`,
      `PIVOT (${a} FOR Mon IN ([Feb], [Mar], [Apr], [May], [Jun])) AS pv;`].join('\n');
  });

  pivot = computed(() => {
    const keys = [...new Set(SRC.map(s => this.keyOf(s)))];
    return keys.map(key => {
      const mine = SRC.filter(s => this.keyOf(s) === key);
      return {
        key, category: mine[0].Category, orderId: mine[0].OrderId,
        cells: MONTHS.map(mn => this.cell(mine.filter(s => s.Mon === mn).map(s => s.Value)))
      };
    });
  });

  private cell(vs: number[]): Cell {
    const a = this.agg();
    if (a === 'COUNT') return vs.length;
    if (!vs.length) return this.zero() ? money(0) : null;
    return money(a === 'SUM' ? vs.reduce((x, y) => x + y, 0) : Math.max(...vs, this.zero() ? 0 : -Infinity));
  }

  private feeding = computed(() => {
    const s = this.sel();
    return s ? SRC.filter(r => this.keyOf(r) === s.key && r.Mon === s.mon) : [];
  });
  srcRows = computed<Cell[][]>(() => SRC.map(s => [s.OrderId, s.Category, s.Mon, money(s.Value)]));
  srcClass = computed(() => { const f = this.feeding(); return SRC.map(s => (f.includes(s) ? 'pick' : '')); });

  pick(key: string, mon: string) { this.sel.set({ key, mon }); }
  toggleExtra() {
    this.extra.set(!this.extra());
    const first = SRC.find(s => s.Category === 'Tools' && s.Mon === 'Mar')!;
    this.sel.set({ key: this.keyOf(first), mon: 'Mar' });
  }

  message = computed(() => {
    const f = this.feeding(), s = this.sel();
    if (this.extra()) return `OrderId is now a grouping column too, so PIVOT makes one row per category and order: ${this.pivot().length} rows instead of 5, each with a single filled cell. Nothing in the PIVOT clause changed. Only the source did.`;
    if (!s) return 'Click a cell to see which source rows it was built from.';
    const cat = s.key;
    if (!f.length) return this.agg() === 'COUNT' ? `No ${cat} rows in ${s.mon}, so COUNT gives 0.` : `No ${cat} rows in ${s.mon}, so the cell is ${this.zero() ? '0, from ELSE 0' : 'NULL: an aggregate over no rows. Tick “Empty cells as 0” for the conditional-aggregation version'}.`;
    const vals = f.map(x => money(x.Value)).join(', ');
    return `${cat} in ${s.mon}: ${f.length} source row${f.length === 1 ? '' : 's'} (${vals}), highlighted below. ${this.agg()} turns ${f.length === 1 ? 'it' : 'them'} into the one value in the cell. Category is the only other column, so there is one row per category.`;
  });
}
