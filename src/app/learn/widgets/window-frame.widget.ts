import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, ORDERS, ORDER_ITEMS, money } from './sql-data';

/** The lesson’s order totals: cancelled orders left out, in date order. */
const T = ORDERS.filter(o => o.Status !== 'Cancelled').map(o => ({
  id: o.OrderId, date: o.OrderDate, mon: +o.OrderDate.slice(5, 7),
  total: Math.round(ORDER_ITEMS.filter(i => i.OrderId === o.OrderId).reduce((s, i) => s + i.Quantity * i.UnitPrice, 0) * 100) / 100
}));
const avg6 = (v: number) => (Math.trunc(v * 1e6 + 1e-6) / 1e6).toFixed(6);

interface Frame { id: string; label: string; sql: string; pick: (i: number) => number[] }
const range = (a: number, b: number) => Array.from({ length: Math.max(0, Math.min(b, T.length - 1) - Math.max(a, 0) + 1) }, (_, k) => Math.max(a, 0) + k);
const FRAMES: Frame[] = [
  { id: 'run', label: 'Running', sql: 'ORDER BY OrderDate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', pick: i => range(0, i) },
  { id: 'mov', label: 'Moving 3', sql: 'ORDER BY OrderDate ROWS BETWEEN 2 PRECEDING AND CURRENT ROW', pick: i => range(i - 2, i) },
  { id: 'ctr', label: 'Centred', sql: 'ORDER BY OrderDate ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING', pick: i => range(i - 1, i + 1) },
  { id: 'all', label: 'Whole set', sql: '', pick: () => range(0, T.length - 1) },
  { id: 'rng', label: 'Default RANGE, by month', sql: 'ORDER BY MONTH(OrderDate)', pick: i => T.map((t, k) => (t.mon <= T[i].mon ? k : -1)).filter(k => k >= 0) }
];
type Fn = 'SUM' | 'AVG' | 'COUNT';

/** Pick a frame and a current row, and see which rows the window function reads for it. */
@Component({
  selector: 'w-window-frame',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which rows does the frame see?</h3></div>
      <div class="w-controls" role="group" aria-label="Frame">
        @for (f of frames; track f.id; let k = $index) {
          <button type="button" class="w-btn small" [class.on]="fi() === k" [attr.aria-pressed]="fi() === k" (click)="fi.set(k)">{{ f.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Function">
        @for (f of fns; track f) {
          <button type="button" class="w-btn small mono" [class.on]="fn() === f" [attr.aria-pressed]="fn() === f" (click)="fn.set(f)">{{ f }}</button>
        }
        <span class="pos">Current row:</span>
        <button type="button" class="w-btn" (click)="go(-1)" [disabled]="cur() === 0" aria-label="Previous row"><i class="bi bi-chevron-up" aria-hidden="true"></i></button>
        <button type="button" class="w-btn" (click)="go(1)" [disabled]="cur() === last" aria-label="Next row"><i class="bi bi-chevron-down" aria-hidden="true"></i></button>
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>

      <div class="rows" role="group" aria-label="Orders: click one to make it the current row">
        @for (t of orders; track t.id; let k = $index) {
          <button type="button" class="orow" [class.cur]="k === cur()" [class.in]="frame().includes(k)" [attr.aria-pressed]="k === cur()" (click)="cur.set(k)">
            <span class="mono">#{{ t.id }}</span><span class="mono d">{{ t.date }}</span><span class="mono v">{{ m(t.total) }}</span>
            <span class="bar" [style.width.%]="t.total / max * 100"></span>
          </button>
        }
      </div>
      <div class="calc mono">{{ calcText() }}</div>

      <app-sql-grid [cols]="['OrderId', 'OrderDate', 'Total', fn() + ' OVER (…)']" [rows]="rows()" [rowClass]="rowClass()" label="Result" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .pos { font-size: 0.8rem; margin-left: 0.4rem; color: var(--text-muted); }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .rows { display: flex; flex-direction: column; gap: 3px; margin-bottom: 0.5rem; }
    .orow { all: unset; box-sizing: border-box; position: relative; display: grid; grid-template-columns: 3.2em 7.5em 1fr; gap: 8px; padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.76rem; cursor: pointer; overflow: hidden; }
    .orow > span { position: relative; z-index: 1; }
    .orow .d { color: var(--text-muted); }
    .orow .v { text-align: right; }
    .orow .bar { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(139, 92, 246, 0.08); z-index: 0; }
    .orow.in { border-color: rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.1); }
    .orow.in .bar { background: rgba(16, 185, 129, 0.22); }
    .orow.cur { outline: 2px solid #f59e0b; outline-offset: -1px; }
    .orow:focus-visible { outline: 2px solid var(--purple); }
    .calc { font-size: 0.78rem; margin: 0 0 0.7rem; overflow-wrap: anywhere; }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class WindowFrameWidget {
  readonly frames = FRAMES;
  readonly fns: Fn[] = ['SUM', 'AVG', 'COUNT'];
  readonly orders = T;
  readonly last = T.length - 1;
  readonly max = Math.max(...T.map(t => t.total));
  fi = signal(0);
  fn = signal<Fn>('SUM');
  cur = signal(3);

  f = computed(() => FRAMES[this.fi()]);
  frame = computed(() => this.f().pick(this.cur()));
  sqlText = computed(() => `${this.fn()}(${this.fn() === 'COUNT' ? '*' : 'Total'}) OVER (${this.f().sql})`);

  private value(ks: number[]): string | number {
    const xs = ks.map(k => T[k].total), s = xs.reduce((a, b) => a + b, 0);
    switch (this.fn()) { case 'COUNT': return xs.length; case 'AVG': return avg6(s / xs.length); default: return money(s); }
  }
  rows = computed<Cell[][]>(() => T.map((t, k) => [t.id, t.date, money(t.total), this.value(this.f().pick(k))]));
  rowClass = computed(() => T.map((_, k) => (k === this.cur() ? 'tie' : this.frame().includes(k) ? 'on' : '')));

  calcText = computed(() => {
    const ks = this.frame(), v = this.value(ks);
    if (this.fn() === 'COUNT') return `COUNT = ${ks.length} row${ks.length === 1 ? '' : 's'} in the frame`;
    const parts = ks.map(k => money(T[k].total));
    const shown = parts.length > 5 ? [...parts.slice(0, 2), '…', ...parts.slice(-2)] : parts;
    return this.fn() === 'SUM' ? `${shown.join(' + ')} = ${v}` : `(${shown.join(' + ')}) / ${ks.length} = ${v}`;
  });

  go(d: number) { this.cur.update(v => Math.min(this.last, Math.max(0, v + d))); }
  m(v: number) { return money(v); }

  message = computed(() => {
    const id = this.f().id, i = this.cur(), n = this.frame().length;
    if (id === 'run') return `Row ${i + 1} sees every row from the first up to itself (${n} row${n === 1 ? '' : 's'}). Step down and the frame grows by one each time: a running total.`;
    if (id === 'mov') return i < 2 ? `Row ${i + 1} has only ${i} row${i === 1 ? '' : 's'} before it, so the frame holds ${n}. AVG divides by ${n}, not 3: the moving average warms up over the first rows.` : 'The frame slides: the current row and the two before it. Each step drops the oldest row and adds the new one.';
    if (id === 'ctr') return i === 0 || i === this.last ? 'At the edge there is no row on one side, so the frame holds only 2 rows.' : 'One row either side of the current one: a centred window, handy for smoothing.';
    if (id === 'all') return 'No ORDER BY in OVER: every row sees the whole set, so the value is the same on every row. With PARTITION BY it would be the whole group.';
    const mon = T[i].mon, same = T.filter(t => t.mon === mon).length;
    return same > 1 ? `ORDER BY month with no frame means RANGE … CURRENT ROW: ${same === 2 ? 'both' : `all ${same}`} orders of month ${mon} count as “the current row”, so they get the same value. That is the jump you saw in the lesson.` : `Order #${T[i].id} is alone in month ${mon}, so RANGE and ROWS agree here. Pick an order that shares its month.`;
  });
}
