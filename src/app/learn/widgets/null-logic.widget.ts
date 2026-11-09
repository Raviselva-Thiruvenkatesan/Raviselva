import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CUSTOMERS, Cell, Customer } from './sql-data';

type TV = 'TRUE' | 'FALSE' | 'UNKNOWN';
interface Pred { sql: string; eval: (c: Customer) => TV; note: string }

const tv = (b: boolean): TV => (b ? 'TRUE' : 'FALSE');
const eq = (a: string | null, b: string | null): TV => (a === null || b === null ? 'UNKNOWN' : tv(a === b));
const not = (v: TV): TV => (v === 'UNKNOWN' ? 'UNKNOWN' : v === 'TRUE' ? 'FALSE' : 'TRUE');
const and = (a: TV, b: TV): TV => (a === 'FALSE' || b === 'FALSE' ? 'FALSE' : a === 'TRUE' && b === 'TRUE' ? 'TRUE' : 'UNKNOWN');
const or = (a: TV, b: TV): TV => (a === 'TRUE' || b === 'TRUE' ? 'TRUE' : a === 'FALSE' && b === 'FALSE' ? 'FALSE' : 'UNKNOWN');

const PREDS: Pred[] = [
  { sql: "City = N'Leeds'", eval: c => eq(c.City, 'Leeds'), note: 'Ella’s city is NULL. Is an unknown city equal to Leeds? Unknown, so her row is not returned.' },
  { sql: "City <> N'Leeds'", eval: c => not(eq(c.City, 'Leeds')), note: 'Ella is missing here too. She is in neither “Leeds” nor “not Leeds”: the two queries together return 7 rows, not 8.' },
  { sql: 'City = NULL', eval: () => 'UNKNOWN', note: 'Comparing anything with NULL using = gives UNKNOWN, even NULL = NULL. This query never returns a row.' },
  { sql: 'City IS NULL', eval: c => tv(c.City === null), note: 'IS NULL is the right test. It is always TRUE or FALSE, never UNKNOWN.' },
  { sql: 'Phone IS NULL OR Email IS NULL', eval: c => tv(c.Phone === null || c.Email === null), note: 'Customers we cannot reach both ways: anyone missing a phone number or an email address.' },
  { sql: "City NOT IN (N'Leeds', N'York')", eval: c => and(not(eq(c.City, 'Leeds')), not(eq(c.City, 'York'))), note: 'Works as expected for known cities, and Ella (NULL) is still left out.' },
  { sql: "City NOT IN (N'Leeds', NULL)", eval: c => and(not(eq(c.City, 'Leeds')), not(eq(c.City, null))), note: 'The trap: NOT IN means City <> Leeds AND City <> NULL. The second part is always UNKNOWN, so no row can be TRUE. One NULL in the list empties the result.' },
  { sql: "ISNULL(City, N'Unknown') <> N'Leeds'", eval: c => tv((c.City ?? 'Unknown') !== 'Leeds'), note: 'ISNULL swaps NULL for a real value first, so the comparison is TRUE or FALSE again and Ella is included.' }
];

const VALUES: TV[] = ['TRUE', 'FALSE', 'UNKNOWN'];

/** Evaluate predicates on rows that contain NULLs: TRUE, FALSE or UNKNOWN, and only TRUE keeps a row. */
@Component({
  selector: 'w-null-logic',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>TRUE, FALSE and UNKNOWN</h3></div>
      <div class="w-controls" role="group" aria-label="View">
        <button type="button" class="w-btn" [class.on]="view() === 'rows'" [attr.aria-pressed]="view() === 'rows'" (click)="view.set('rows')">WHERE on customers</button>
        <button type="button" class="w-btn" [class.on]="view() === 'truth'" [attr.aria-pressed]="view() === 'truth'" (click)="view.set('truth')">Truth tables</button>
      </div>
      @if (view() === 'rows') {
        <div class="w-label mono sqlh">SELECT FirstName, City, Email, Phone FROM dbo.Customers WHERE …</div>
        <div class="w-controls" role="group" aria-label="Condition">
          @for (p of preds; track p.sql; let i = $index) {
            <button type="button" class="w-btn mono small" [class.on]="pi() === i" [attr.aria-pressed]="pi() === i" (click)="pi.set(i)">{{ p.sql }}</button>
          }
        </div>
        <app-sql-grid [cols]="['FirstName', 'City', 'Email', 'Phone', 'Condition is']" [rows]="rows()" [rowClass]="classes()" label="Customers and the value of the condition for each" />
        <div class="w-msg" [class.ok]="kept() > 0" [class.err]="kept() === 0" aria-live="polite"><span><b>{{ kept() }} of 8 rows returned.</b> {{ pred().note }}</span></div>
      } @else {
        <div class="w-controls" role="group" aria-label="Operator">
          @for (o of ops; track o) {
            <button type="button" class="w-btn mono" [class.on]="op() === o" [attr.aria-pressed]="op() === o" (click)="op.set(o)">{{ o }}</button>
          }
        </div>
        <div class="tscroll">
          @if (op() === 'NOT') {
            <table class="wtable mono tt"><tbody>
              <tr><th>a</th><th>NOT a</th></tr>
              @for (a of values; track a) { <tr><td [class]="a">{{ a }}</td><td [class]="notOf(a)">{{ notOf(a) }}</td></tr> }
            </tbody></table>
          } @else {
            <table class="wtable mono tt"><tbody>
              <tr><th>a {{ op() }} b</th>@for (b of values; track b) { <th>b = {{ b }}</th> }</tr>
              @for (a of values; track a) {
                <tr><th>a = {{ a }}</th>@for (b of values; track b) { <td [class]="combine(a, b)">{{ combine(a, b) }}</td> }</tr>
              }
            </tbody></table>
          }
        </div>
        <div class="w-msg info" aria-live="polite"><span>{{ truthNote() }}</span></div>
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; font-weight: 600; }
    .sqlh { text-transform: none; letter-spacing: 0; font-size: 0.78rem; }
    .tt td, .tt th { padding: 6px 10px; }
    .tt td.TRUE { background: rgba(16, 185, 129, 0.2); font-weight: 700; }
    .tt td.FALSE { background: rgba(239, 68, 68, 0.12); }
    .tt td.UNKNOWN { background: rgba(245, 158, 11, 0.2); font-style: italic; }
  `]
})
export class NullLogicWidget {
  readonly preds = PREDS;
  readonly values = VALUES;
  readonly ops = ['AND', 'OR', 'NOT'] as const;
  view = signal<'rows' | 'truth'>('rows');
  pi = signal(1);
  op = signal<'AND' | 'OR' | 'NOT'>('AND');

  pred = computed(() => PREDS[this.pi()]);
  results = computed(() => CUSTOMERS.map(c => this.pred().eval(c)));
  rows = computed<Cell[][]>(() => CUSTOMERS.map((c, i) => [c.FirstName, c.City, c.Email, c.Phone, this.results()[i]]));
  classes = computed(() => this.results().map(r => (r === 'TRUE' ? 'on' : 'off')));
  kept = computed(() => this.results().filter(r => r === 'TRUE').length);

  combine(a: TV, b: TV): TV { return this.op() === 'AND' ? and(a, b) : or(a, b); }
  notOf(a: TV): TV { return not(a); }
  truthNote = computed(() => {
    switch (this.op()) {
      case 'AND': return 'FALSE AND anything is FALSE: one false part settles it. Otherwise any UNKNOWN makes the whole thing UNKNOWN.';
      case 'OR': return 'TRUE OR anything is TRUE: one true part settles it. Otherwise any UNKNOWN makes the whole thing UNKNOWN.';
      default: return 'NOT UNKNOWN is still UNKNOWN. That is why NOT cannot rescue rows whose test involves a NULL.';
    }
  });
}
