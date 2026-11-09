import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { CUSTOMERS, Cell, Customer } from './sql-data';

interface Cond { id: string; on: string; label: string; test: (a: Customer, b: Customer) => boolean }
const CONDS: Cond[] = [
  { id: 'cross', on: '', label: 'CROSS JOIN', test: () => true },
  { id: 'city', on: 'c2.City = c1.City', label: 'same city', test: (a, b) => a.City !== null && a.City === b.City },
  { id: 'ne', on: 'c2.City = c1.City\n   AND c2.CustomerId <> c1.CustomerId', label: '+ not yourself', test: (a, b) => a.City !== null && a.City === b.City && a.CustomerId !== b.CustomerId },
  { id: 'lt', on: 'c2.City = c1.City\n   AND c2.CustomerId > c1.CustomerId', label: '+ each pair once', test: (a, b) => a.City !== null && a.City === b.City && a.CustomerId < b.CustomerId }
];

/** Customers joined to themselves: the CROSS JOIN is every cell of the 8 × 8 grid, and each ON condition keeps fewer cells. */
@Component({
  selector: 'w-pair-matrix',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A self join is a filtered CROSS JOIN</h3></div>
      <div class="w-controls" role="group" aria-label="Join condition">
        @for (c of conds; track c.id; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="ci() === i" [attr.aria-pressed]="ci() === i" (click)="ci.set(i)">{{ c.label }}</button>
        }
      </div>
      <app-code [code]="sql()" title="SelfJoin.sql" [compact]="true" [copyable]="false" />
      <div class="gap"></div>
      <div class="tscroll">
        <table class="pm" aria-label="Every pairing of customer c1 (rows) with customer c2 (columns)">
          <tbody>
            <tr><th class="corner">c1 ↓ c2 →</th>@for (b of people; track b.CustomerId) { <th class="colh">{{ b.FirstName }}<span class="city">{{ b.City ?? 'NULL' }}</span></th> }</tr>
            @for (a of people; track a.CustomerId; let i = $index) {
              <tr>
                <th class="rowh">{{ a.FirstName }} <span class="city">{{ a.City ?? 'NULL' }}</span></th>
                @for (b of people; track b.CustomerId; let j = $index) {
                  <td [class.keep]="kept()[i][j]" [class.self]="i === j" [class.sel]="sel()[0] === i && sel()[1] === j">
                    <button type="button" (click)="sel.set([i, j])" [attr.aria-label]="a.FirstName + ' with ' + b.FirstName + (kept()[i][j] ? ': kept' : ': not kept')">{{ kept()[i][j] ? '●' : '' }}</button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="count"><b>{{ count() }}</b> of 64 pairs kept</div>
      <div class="w-msg info" aria-live="polite"><span>{{ cellNote() }}</span></div>
      @if (count() <= 16) {
        <app-sql-grid [cols]="['Customer', 'SameCityAs', 'City']" [rows]="rows()" label="Rows returned" />
      }
      <div class="w-msg" [class.info]="cond().id !== 'cross'" [class.err]="cond().id === 'cross'"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .gap { height: 0.7rem; }
    .pm { border-collapse: collapse; font-size: 0.72rem; margin: 0 auto; }
    .pm th { font-weight: 700; padding: 2px 4px; white-space: nowrap; }
    .pm .city { display: block; font-weight: 400; color: var(--text-muted); font-size: 0.64rem; }
    .pm .rowh { text-align: right; }
    .pm .rowh .city { display: inline; }
    .pm .corner { font-size: 0.64rem; color: var(--text-muted); font-weight: 400; }
    .pm td { width: 28px; height: 26px; padding: 0; border: 1px solid var(--border-color); text-align: center; }
    .pm td button { all: unset; display: block; width: 100%; height: 100%; cursor: pointer; color: #059669; font-size: 0.8rem; }
    .pm td button:focus-visible { outline: 2px solid var(--purple); }
    .pm td.self { background: rgba(148, 163, 184, 0.14); }
    .pm td.keep { background: rgba(16, 185, 129, 0.22); }
    .pm td.sel { outline: 2px solid #f59e0b; outline-offset: -2px; }
    .count { font-size: 0.84rem; margin: 0.5rem 0; text-align: center; }
    app-sql-grid { display: block; margin: 0.7rem 0; }
  `]
})
export class PairMatrixWidget {
  readonly conds = CONDS;
  readonly people = CUSTOMERS;
  ci = signal(1);
  sel = signal<[number, number]>([0, 2]);

  cond = computed(() => CONDS[this.ci()]);
  kept = computed(() => CUSTOMERS.map(a => CUSTOMERS.map(b => this.cond().test(a, b))));
  count = computed(() => this.kept().flat().filter(Boolean).length);
  rows = computed<Cell[][]>(() => {
    const out: Cell[][] = [];
    CUSTOMERS.forEach((a, i) => CUSTOMERS.forEach((b, j) => { if (this.kept()[i][j]) out.push([a.FirstName, b.FirstName, a.City]); }));
    return out;
  });

  sql = computed(() => {
    const c = this.cond();
    const sel = 'SELECT c1.FirstName AS Customer, c2.FirstName AS SameCityAs, c1.City\nFROM dbo.Customers AS c1\n';
    return c.id === 'cross' ? `${sel}CROSS JOIN dbo.Customers AS c2;` : `${sel}JOIN dbo.Customers AS c2\n    ON ${c.on};`;
  });

  cellNote = computed(() => {
    const [i, j] = this.sel(), a = CUSTOMERS[i], b = CUSTOMERS[j], keep = this.kept()[i][j], id = this.cond().id;
    const pair = `${a.FirstName} (${a.CustomerId}, ${a.City ?? 'NULL'}) with ${b.FirstName} (${b.CustomerId}, ${b.City ?? 'NULL'})`;
    if (id === 'cross') return `${pair}: kept. A CROSS JOIN has no condition at all.`;
    if (a.City === null || b.City === null) return `${pair}: not kept. NULL = anything is unknown, not true, so a customer with no city matches nobody, not even themself.`;
    if (a.City !== b.City) return `${pair}: not kept, the cities differ.`;
    if (i === j) return keep ? `${pair}: kept. Everyone lives in the same city as themself.` : `${pair}: not kept. A row paired with itself is dropped by the CustomerId test.`;
    if (!keep) return `${pair}: not kept. Same city, but c2.CustomerId > c1.CustomerId is false, so this is the mirror image of a pair that is kept.`;
    return `${pair}: kept, same city.`;
  });

  message = computed(() => {
    switch (this.cond().id) {
      case 'cross': return 'A CROSS JOIN pairs every row with every row: 8 × 8 = 64 rows. On two tables of 10,000 rows that is 100 million rows, so a forgotten join condition can bring a server to its knees.';
      case 'city': return 'Same city keeps the diagonal: every customer is paired with themself. Ella has no city, and NULL = NULL is not true, so her row and column stay empty.';
      case 'ne': return 'Dropping the diagonal leaves 8 rows, but each pair is there twice: Asha–Chloe and Chloe–Asha. The grid is symmetrical across the diagonal.';
      default: return 'Asking for c2.CustomerId > c1.CustomerId keeps only the cells above the diagonal: each pair of neighbours once. This is the standard way to list pairs from one table.';
    }
  });
}
