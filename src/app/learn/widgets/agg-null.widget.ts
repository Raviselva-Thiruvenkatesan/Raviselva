import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CUSTOMERS, Cell, PRODUCTS, money } from './sql-data';

interface Col { id: string; table: string; label: string; values: (string | number | null)[]; names: string[]; kind: 'text' | 'int' | 'money' }

const COLS: Col[] = [
  { id: 'City', table: 'Customers', label: 'City', values: CUSTOMERS.map(c => c.City), names: CUSTOMERS.map(c => c.FirstName), kind: 'text' },
  { id: 'Email', table: 'Customers', label: 'Email', values: CUSTOMERS.map(c => c.Email), names: CUSTOMERS.map(c => c.FirstName), kind: 'text' },
  { id: 'Phone', table: 'Customers', label: 'Phone', values: CUSTOMERS.map(c => c.Phone), names: CUSTOMERS.map(c => c.FirstName), kind: 'text' },
  { id: 'Stock', table: 'Products', label: 'Stock (int)', values: PRODUCTS.map(p => p.Stock), names: PRODUCTS.map(p => p.Name), kind: 'int' },
  { id: 'Price', table: 'Products', label: 'Price (decimal)', values: PRODUCTS.map(p => p.Price), names: PRODUCTS.map(p => p.Name), kind: 'money' }
];

/** SQL Server shows a decimal AVG with 6 decimal places, cut off rather than rounded. */
const avg6 = (v: number) => (Math.trunc(v * 1e6 + 1e-6) / 1e6).toFixed(6);

/** Pick a column and see what each aggregate makes of it, NULLs and all. */
@Component({
  selector: 'w-agg-null',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>What each aggregate counts</h3></div>
      <div class="w-controls" role="group" aria-label="Column">
        @for (c of cols; track c.id; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="ci() === i" [attr.aria-pressed]="ci() === i" (click)="ci.set(i)">{{ c.table }}.{{ c.label }}</button>
        }
      </div>
      <div class="vals" role="list" aria-label="Column values">
        @for (v of col().values; track $index; let i = $index) {
          <span class="val" role="listitem" [class.null]="v === null" [class.dup]="dup()[i]" [attr.title]="col().names[i]">
            <span class="who">{{ short(col().names[i]) }}</span>{{ v === null ? 'NULL' : show(v) }}
          </span>
        }
      </div>
      <div class="legend"><span class="sw null"></span> NULL: skipped by every aggregate except COUNT(*) <span class="sw dup"></span> repeated value: counted once by COUNT(DISTINCT)</div>
      <app-sql-grid [cols]="heads()" [rows]="[row()]" label="Aggregate results" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .vals { display: flex; flex-wrap: wrap; gap: 5px; margin: 0.6rem 0 0.4rem; }
    .val { display: inline-flex; flex-direction: column; border: 1px solid var(--border-color); border-radius: 8px; padding: 3px 8px; font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.74rem; background: var(--bg-main); }
    .val .who { font-family: inherit; font-size: 0.62rem; color: var(--text-muted); max-width: 9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .val.null { color: var(--text-muted); font-style: italic; border-style: dashed; background: rgba(148, 163, 184, 0.12); }
    .val.dup { background: rgba(245, 158, 11, 0.16); border-color: rgba(245, 158, 11, 0.5); }
    .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-size: 0.74rem; color: var(--text-muted); margin-bottom: 0.6rem; }
    .sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--border-color); margin-left: 0.5em; }
    .sw.null { border-style: dashed; background: rgba(148, 163, 184, 0.2); }
    .sw.dup { background: rgba(245, 158, 11, 0.3); }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class AggNullWidget {
  readonly cols = COLS;
  ci = signal(0);
  col = computed(() => COLS[this.ci()]);

  private known = computed(() => this.col().values.filter((v): v is string | number => v !== null));
  private distinct = computed(() => new Set(this.known().map(v => (typeof v === 'string' ? v.toLowerCase() : v))));
  /** Values that occur more than once (case-insensitively, as SQL Server compares them). */
  dup = computed(() => this.col().values.map(v => v !== null && this.known().filter(k => String(k).toLowerCase() === String(v).toLowerCase()).length > 1));

  heads = computed(() => {
    const id = this.col().id;
    const h = ['COUNT(*)', `COUNT(${id})`, `COUNT(DISTINCT ${id})`, `MIN(${id})`, `MAX(${id})`];
    return this.col().kind === 'text' ? h : [...h, `SUM(${id})`, `AVG(${id})`];
  });

  row = computed<Cell[]>(() => {
    const c = this.col(), k = this.known();
    const sorted = [...k].sort((a, b) => (typeof a === 'number' ? a - (b as number) : String(a).localeCompare(String(b))));
    const r: Cell[] = [c.values.length, k.length, this.distinct().size, this.show(sorted[0]), this.show(sorted[sorted.length - 1])];
    if (c.kind === 'text') return r;
    const sum = (k as number[]).reduce((s, v) => s + v, 0);
    return [...r, this.show(sum), c.kind === 'int' ? Math.trunc(sum / k.length) : avg6(sum / k.length)];
  });

  show(v: string | number): string | number { return this.col().kind === 'money' && typeof v === 'number' ? money(v) : v; }
  short(n: string) { return n.split(' ')[0]; }

  message = computed(() => {
    const c = this.col(), n = c.values.length, k = this.known().length, d = this.distinct().size;
    switch (c.kind) {
      case 'text': return `${n} rows, ${n - k} of them NULL. COUNT(*) counts rows (${n}), COUNT(${c.id}) counts values (${k}) and COUNT(DISTINCT ${c.id}) counts different values (${d}). MIN and MAX compare text alphabetically and ignore the NULLs.`;
      case 'int': return 'No NULLs here, so every COUNT agrees except DISTINCT (two products have 0 in stock). The total is 1422 over 12 products, which is 118.5, but AVG of an int column returns an int: 118. Convert first: AVG(CAST(Stock AS decimal(9,2))).';
      default: return 'Price is decimal, so AVG keeps the fraction: 267.05 ÷ 12 = 22.254166 (shown to 6 places, cut off rather than rounded). Two products cost 6.80, so COUNT(DISTINCT Price) is 11.';
    }
  });
}
