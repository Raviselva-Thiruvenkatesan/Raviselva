import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { CATEGORIES, Cell, PRODUCTS } from './sql-data';

type Mode = 'EXISTS' | 'NOT EXISTS' | 'NOT IN';
const MODES: Mode[] = ['EXISTS', 'NOT EXISTS', 'NOT IN'];
interface Row { ProductId: number; Name: string; CategoryId: number | null }
const BASE: Row[] = PRODUCTS.map(p => ({ ProductId: p.ProductId, Name: p.Name, CategoryId: p.CategoryId }));
const VOUCHER: Row = { ProductId: 13, Name: 'Gift voucher', CategoryId: null };

/** Test each category against Products with EXISTS, NOT EXISTS or NOT IN, and watch one NULL break NOT IN. */
@Component({
  selector: 'w-exists-probe',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Is there a matching product?</h3></div>
      <div class="w-controls" role="group" aria-label="Test">
        @for (o of modes; track o) {
          <button type="button" class="w-btn small mono" [class.on]="mode() === o" [attr.aria-pressed]="mode() === o" (click)="mode.set(o)">{{ o }}</button>
        }
        <label class="check"><input type="checkbox" [checked]="voucher()" (change)="voucher.set(!voucher())" /> Add a gift voucher with CategoryId NULL</label>
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>

      <div class="cats" role="group" aria-label="Category to inspect">
        @for (c of verdicts(); track c.id) {
          <button type="button" class="cat" [class.keep]="c.keep" [class.sel]="sel() === c.id" [attr.aria-pressed]="sel() === c.id" (click)="sel.set(c.id)">
            <span class="cn">{{ c.id }} {{ c.name }}</span><span class="cv">{{ c.label }}</span>
          </button>
        }
      </div>

      <div class="probe">
        @if (mode() === 'NOT IN') {
          <div class="ph">{{ selName() }}: {{ sel() }} NOT IN (list)</div>
          <div class="chips">
            @for (v of list(); track $index) {
              <span class="chip" [class.ok]="v === sel()" [class.bad]="v === null">{{ sel() }} &lt;&gt; {{ v === null ? 'NULL' : v }} → {{ v === null ? 'unknown' : (v === sel() ? 'false' : 'true') }}</span>
            }
          </div>
        } @else {
          <div class="ph">{{ selName() }}: scanning Products for CategoryId = {{ sel() }}</div>
          <div class="chips">
            @for (p of scan().rows; track p.ProductId; let k = $index) {
              <span class="chip" [class.ok]="k === scan().hit" [class.wait]="scan().hit >= 0 && k > scan().hit">{{ p.ProductId }} <small>cat {{ p.CategoryId ?? 'NULL' }}</small></span>
            }
          </div>
        }
        <div class="w-msg" [class.ok]="selKeep()" [class.err]="!selKeep()"><span>{{ probeText() }}</span></div>
      </div>

      <app-sql-grid [cols]="['Name']" [rows]="result()" label="Categories returned" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #ef4444; }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.4rem; margin-bottom: 0.6rem; }
    .cat { all: unset; box-sizing: border-box; display: flex; flex-direction: column; gap: 1px; padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; font-size: 0.78rem; }
    .cat .cv { font-size: 0.68rem; color: var(--text-muted); }
    .cat.keep { background: rgba(16, 185, 129, 0.14); border-color: rgba(16, 185, 129, 0.5); }
    .cat.sel { outline: 2px solid #f59e0b; outline-offset: -1px; }
    .cat:focus-visible { outline: 2px solid var(--purple); }
    .cn { font-weight: 700; }
    .probe { border: 1px dashed var(--border-color); border-radius: 10px; padding: 8px; margin-bottom: 0.8rem; }
    .ph { font-size: 0.76rem; font-weight: 700; margin-bottom: 0.4rem; }
    .probe .chip { font-size: 0.7rem; padding: 1px 6px; font-family: 'Cascadia Code', Consolas, monospace; }
    .chip small { color: var(--text-muted); }
    .w-msg { margin-top: 0.5rem; }
  `]
})
export class ExistsProbeWidget {
  readonly modes = MODES;
  mode = signal<Mode>('EXISTS');
  voucher = signal(false);
  sel = signal(3);

  products = computed(() => (this.voucher() ? [...BASE, VOUCHER] : BASE));
  list = computed(() => this.products().map(p => p.CategoryId));

  sqlText = computed(() => {
    const head = 'SELECT c.Name\nFROM dbo.Categories AS c\nWHERE ';
    return this.mode() === 'NOT IN'
      ? head + 'c.CategoryId NOT IN (SELECT p.CategoryId FROM dbo.Products AS p);'
      : head + `${this.mode()} (\n    SELECT 1 FROM dbo.Products AS p\n    WHERE p.CategoryId = c.CategoryId\n);`;
  });

  /** NOT IN is true only if every comparison is true; one NULL makes it unknown for every value not in the list. */
  private test(id: number): { keep: boolean; label: string } {
    const found = this.products().some(p => p.CategoryId === id);
    switch (this.mode()) {
      case 'EXISTS': return { keep: found, label: found ? 'a match: true' : 'no match: false' };
      case 'NOT EXISTS': return { keep: !found, label: found ? 'a match: false' : 'no match: true' };
      default:
        if (found) return { keep: false, label: 'in the list: false' };
        return this.list().includes(null) ? { keep: false, label: 'NULL in list: unknown' } : { keep: true, label: 'not in list: true' };
    }
  }

  verdicts = computed(() => CATEGORIES.map(c => ({ id: c.CategoryId, name: c.Name, ...this.test(c.CategoryId) })));
  result = computed<Cell[][]>(() => this.verdicts().filter(v => v.keep).map(v => [v.name]));
  selName = computed(() => CATEGORIES.find(c => c.CategoryId === this.sel())!.Name);
  selKeep = computed(() => this.verdicts().find(v => v.id === this.sel())!.keep);

  /** EXISTS can stop at the first matching row; with no match, every row is checked. */
  scan = computed(() => {
    const ps = this.products(), hit = ps.findIndex(p => p.CategoryId === this.sel());
    return { rows: ps, hit };
  });

  probeText = computed(() => {
    const keep = this.selKeep(), name = this.selName();
    if (this.mode() === 'NOT IN') {
      if (this.list().includes(this.sel())) return `${this.sel()} <> ${this.sel()} is false, so NOT IN is false: ${name} is not returned.`;
      if (this.list().includes(null)) return `Every number differs from ${this.sel()}, but ${this.sel()} <> NULL is unknown, and true AND unknown is unknown. ${name} is not returned.`;
      return `Every comparison is true, so NOT IN is true: ${name} is returned.`;
    }
    const s = this.scan();
    const found = s.hit >= 0 ? `Found a match at product ${s.rows[s.hit].ProductId} after checking ${s.hit + 1} row${s.hit ? 's' : ''}, and can stop there.` : `Checked all ${s.rows.length} rows and found no match.`;
    return `${found} ${this.mode()} is ${keep ? 'true' : 'false'}: ${name} is ${keep ? '' : 'not '}returned.`;
  });

  message = computed(() => {
    const m = this.mode(), v = this.voucher();
    if (m === 'NOT IN' && v) return 'The voucher put a NULL in the list, and NOT IN now returns nothing at all, not even Plumbing. Switch to NOT EXISTS: it still finds Plumbing, because a NULL CategoryId simply matches no category.';
    if (m === 'NOT IN') return 'With no NULLs in the list, NOT IN and NOT EXISTS agree: only Plumbing has no products. Now tick the gift voucher.';
    if (m === 'NOT EXISTS') return v ? 'NOT EXISTS ignores the voucher: its NULL CategoryId equals no category, so it is never a match. Plumbing is still returned.' : 'NOT EXISTS keeps the categories where the scan finds nothing. Only Plumbing (7) has no products.';
    return 'EXISTS keeps every category with at least one product. Each category is returned once, however many products match, and the scan can stop at the first match.';
  });
}
