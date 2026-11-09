import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, PRODUCTS, money } from './sql-data';

type Kind = 'CROSS' | 'OUTER';

/** APPLY step by step: the inner TOP (n) query runs once per category, with that category’s id. */
@Component({
  selector: 'w-apply-runner',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One inner query per category</h3></div>
      <div class="w-controls" role="group" aria-label="APPLY kind">
        @for (k of kinds; track k) {
          <button type="button" class="w-btn small mono" [class.on]="kind() === k" [attr.aria-pressed]="kind() === k" (click)="kind.set(k)">{{ k }} APPLY</button>
        }
        <span class="lab">TOP</span>
        @for (k of [1, 2, 3]; track k) {
          <button type="button" class="w-btn small" [class.on]="n() === k" [attr.aria-pressed]="n() === k" (click)="n.set(k)">{{ k }}</button>
        }
        <button type="button" class="w-btn small mono" [class.on]="!desc()" [attr.aria-pressed]="!desc()" (click)="desc.set(!desc())">Price {{ desc() ? 'DESC' : 'ASC' }}</button>
      </div>

      <div class="cols">
        <div class="pane">
          <div class="ph">Outer: <span class="mono">dbo.Categories AS c</span></div>
          @for (c of cats; track c.CategoryId) {
            <button type="button" class="orow" [class.cur]="sel() === c.CategoryId" [class.none]="!inner(c.CategoryId).length" (click)="sel.set(c.CategoryId)">
              <span>{{ c.CategoryId }} {{ c.Name }}</span><span class="mono cnt">{{ inner(c.CategoryId).length }} row{{ inner(c.CategoryId).length === 1 ? '' : 's' }}</span>
            </button>
          }
        </div>
        <div class="pane">
          <div class="ph">Inner query for {{ selName() }}</div>
          <pre class="sqlbox mono">{{ innerSql() }}</pre>
          <app-sql-grid [cols]="['Name', 'Price']" [rows]="innerRows()" label="Inner result" />
          <div class="w-msg" [class.ok]="innerRows().length > 0" [class.err]="!innerRows().length && kind() === 'CROSS'" [class.info]="!innerRows().length && kind() === 'OUTER'">
            <span>{{ verdict() }}</span>
          </div>
        </div>
      </div>

      <app-sql-grid [cols]="['Category', 'Name', 'Price']" [rows]="rows()" [rowClass]="rowClass()" label="Result" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lab { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); font-family: 'Cascadia Code', Consolas, monospace; margin-left: 0.4rem; }
    .cols { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 0.7rem; margin: 0.6rem 0 0.8rem; }
    @media (max-width: 620px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .orow { all: unset; box-sizing: border-box; display: flex; justify-content: space-between; gap: 8px; width: 100%; padding: 3px 8px; border-radius: 6px; font-size: 0.78rem; cursor: pointer; border: 1px solid transparent; }
    .orow .cnt { font-size: 0.7rem; color: var(--text-muted); }
    .orow.none .cnt { color: #ef4444; }
    .orow.cur { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .orow:focus-visible { outline: 2px solid var(--purple); }
    .sqlbox { font-size: 0.74rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0 0 0.5rem; white-space: pre; overflow-x: auto; }
    .w-msg { margin-top: 0.5rem; }
  `]
})
export class ApplyRunnerWidget {
  readonly kinds: Kind[] = ['CROSS', 'OUTER'];
  readonly cats = CATEGORIES;
  kind = signal<Kind>('CROSS');
  n = signal(2);
  desc = signal(true);
  sel = signal(1);

  inner(id: number) {
    const d = this.desc() ? -1 : 1;
    return PRODUCTS.filter(p => p.CategoryId === id).sort((a, b) => d * (a.Price - b.Price) || a.ProductId - b.ProductId).slice(0, this.n());
  }

  selName = computed(() => CATEGORIES.find(c => c.CategoryId === this.sel())!.Name);
  innerSql = computed(() => `SELECT TOP (${this.n()}) p.Name, p.Price\nFROM dbo.Products AS p\nWHERE p.CategoryId = ${this.sel()}  -- c.CategoryId\nORDER BY p.Price${this.desc() ? ' DESC' : ''}`);
  innerRows = computed<Cell[][]>(() => this.inner(this.sel()).map(p => [p.Name, money(p.Price)]));

  private out = computed(() => CATEGORIES.flatMap(c => {
    const ps = this.inner(c.CategoryId);
    if (!ps.length) return this.kind() === 'OUTER' ? [{ cat: c, row: [c.Name, null, null] as Cell[] }] : [];
    return ps.map(p => ({ cat: c, row: [c.Name, p.Name, money(p.Price)] as Cell[] }));
  }));
  rows = computed(() => this.out().map(o => o.row));
  rowClass = computed(() => this.out().map(o => (o.cat.CategoryId === this.sel() ? 'pick' : '')));

  verdict = computed(() => {
    const k = this.innerRows().length, name = this.selName();
    if (k) return `${k} row${k === 1 ? '' : 's'}: each is joined to the ${name} row and added to the result (purple below).`;
    return this.kind() === 'CROSS' ? `No rows, so CROSS APPLY drops ${name} from the result, like an inner join.` : `No rows, so OUTER APPLY keeps ${name} with NULLs, like a left join.`;
  });

  message = computed(() => {
    const total = this.rows().length;
    const short = CATEGORIES.filter(c => { const k = this.inner(c.CategoryId).length; return k > 0 && k < this.n(); }).map(c => c.Name);
    return `${this.kind()} APPLY ran the inner query ${CATEGORIES.length} times, once per category, and returned ${total} rows.` +
      (short.length ? ` ${short.join(' and ')} ha${short.length === 1 ? 's' : 've'} fewer than ${this.n()} products, so ${short.length === 1 ? 'it gets' : 'they get'} fewer rows.` : '') +
      (this.kind() === 'CROSS' ? ' Plumbing has no products and is missing. Try OUTER APPLY.' : ' Plumbing has no products but stays, with NULLs.');
  });
}
