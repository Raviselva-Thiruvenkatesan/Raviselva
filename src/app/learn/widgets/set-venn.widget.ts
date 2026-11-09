import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, ORDERS, ORDER_ITEMS, PRODUCTS } from './sql-data';

type Op = 'UNION' | 'UNION ALL' | 'INTERSECT' | 'EXCEPT';
const OPS: Op[] = ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'];

/** Product IDs on the order lines of orders placed in [from, to). One row per order line, as the query returns them. */
const ordered = (from: string, to: string) => ORDER_ITEMS
  .filter(i => { const d = ORDERS.find(o => o.OrderId === i.OrderId)!.OrderDate; return d >= from && d < to; })
  .map(i => i.ProductId);
const Q1 = ordered('2024-01-01', '2024-04-01');
const Q2 = ordered('2024-04-01', '2024-07-01');
const name = (id: number) => PRODUCTS.find(p => p.ProductId === id)!.Name;
let uid = 0;

/** Two queries’ results as overlapping sets: pick an operator and see which regions it returns. */
@Component({
  selector: 'w-set-venn',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Combining two results</h3></div>
      <p class="w-hint">Query A: products ordered in {{ swapped() ? 'April–June' : 'January–March' }}. Query B: products ordered in {{ swapped() ? 'January–March' : 'April–June' }}.</p>
      <div class="w-controls" role="group" aria-label="Set operator">
        @for (o of ops; track o) {
          <button type="button" class="w-btn mono" [class.on]="op() === o" [attr.aria-pressed]="op() === o" (click)="op.set(o)">{{ o }}</button>
        }
        <button type="button" class="w-btn small" (click)="swapped.set(!swapped())"><i class="bi bi-arrow-left-right" aria-hidden="true"></i> Swap A and B</button>
      </div>
      <pre class="sqlbox mono"><span class="cm">-- A: products ordered {{ swapped() ? 'Apr–Jun' : 'Jan–Mar' }}</span>
SELECT p.ProductId, p.Name FROM …
<b>{{ op() }}</b>
<span class="cm">-- B: products ordered {{ swapped() ? 'Jan–Mar' : 'Apr–Jun' }}</span>
SELECT p.ProductId, p.Name FROM …
ORDER BY ProductId;</pre>

      <svg viewBox="0 0 320 150" class="venn" role="img" [attr.aria-label]="op() + ' returns ' + rows().length + ' rows'">
        <defs>
          <clipPath [attr.id]="id + 'cb'"><circle cx="190" cy="75" r="62" /></clipPath>
          <mask [attr.id]="id + 'ma'"><rect width="320" height="150" fill="#000" /><circle cx="130" cy="75" r="62" fill="#fff" /><circle cx="190" cy="75" r="62" fill="#000" /></mask>
          <mask [attr.id]="id + 'mb'"><rect width="320" height="150" fill="#000" /><circle cx="190" cy="75" r="62" fill="#fff" /><circle cx="130" cy="75" r="62" fill="#000" /></mask>
        </defs>
        @if (show().a) { <rect width="320" height="150" class="fill" [attr.mask]="'url(#' + id + 'ma)'" /> }
        @if (show().b) { <rect width="320" height="150" class="fill" [attr.mask]="'url(#' + id + 'mb)'" /> }
        @if (show().both) { <circle cx="130" cy="75" r="62" class="fill" [class.dbl]="op() === 'UNION ALL'" [attr.clip-path]="'url(#' + id + 'cb)'" /> }
        <circle cx="130" cy="75" r="62" class="ring" />
        <circle cx="190" cy="75" r="62" class="ring" />
        <text x="95" y="80" class="n">{{ onlyA().length }}</text>
        <text x="160" y="80" class="n">{{ both().length }}{{ op() === 'UNION ALL' ? ' ×2' : '' }}</text>
        <text x="225" y="80" class="n">{{ onlyB().length }}</text>
        <text x="80" y="20" class="lab">A</text>
        <text x="240" y="20" class="lab">B</text>
      </svg>

      <div class="regions">
        <div class="reg" [class.in]="show().a"><div class="rh">Only in A</div>@for (p of onlyA(); track p) { <span class="chip">{{ p }} {{ nm(p) }}</span> }</div>
        <div class="reg" [class.in]="show().both"><div class="rh">In both{{ op() === 'UNION ALL' ? ' (twice)' : '' }}</div>@for (p of both(); track p) { <span class="chip">{{ p }} {{ nm(p) }}</span> }</div>
        <div class="reg" [class.in]="show().b"><div class="rh">Only in B</div>@for (p of onlyB(); track p) { <span class="chip">{{ p }} {{ nm(p) }}</span> }</div>
      </div>

      <app-sql-grid [cols]="['ProductId', 'Name']" [rows]="rows()" [rowClass]="rowClass()" label="Combined result" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .sqlbox { font-size: 0.78rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0 0 0.6rem; white-space: pre; overflow-x: auto; }
    .sqlbox b { color: #c792ea; }
    .sqlbox .cm { color: #64748b; }
    .venn { width: 100%; max-width: 360px; display: block; margin: 0 auto 0.4rem; }
    .fill { fill: rgba(139, 92, 246, 0.35); }
    .fill.dbl { fill: rgba(139, 92, 246, 0.6); }
    .ring { fill: none; stroke: #8b5cf6; stroke-width: 2; }
    .n { font-size: 15px; font-weight: 700; fill: var(--text-main); text-anchor: middle; }
    .lab { font-size: 14px; font-weight: 700; fill: #8b5cf6; text-anchor: middle; }
    .regions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.8rem; }
    .reg { border: 1px dashed var(--border-color); border-radius: 10px; padding: 6px; opacity: 0.45; display: flex; flex-wrap: wrap; gap: 4px; align-content: flex-start; }
    .reg.in { opacity: 1; border-style: solid; border-color: rgba(139, 92, 246, 0.6); background: rgba(139, 92, 246, 0.06); }
    .rh { width: 100%; font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
    .reg .chip { font-size: 0.7rem; padding: 1px 6px; }
    @media (max-width: 520px) { .regions { grid-template-columns: 1fr; } }
  `]
})
export class SetVennWidget {
  readonly ops = OPS;
  readonly id = `venn${uid++}-`;
  op = signal<Op>('UNION');
  swapped = signal(false);

  a = computed(() => (this.swapped() ? Q2 : Q1));
  b = computed(() => (this.swapped() ? Q1 : Q2));
  private sorted = (xs: number[]) => [...new Set(xs)].sort((x, y) => x - y);
  onlyA = computed(() => this.sorted(this.a().filter(x => !this.b().includes(x))));
  onlyB = computed(() => this.sorted(this.b().filter(x => !this.a().includes(x))));
  both = computed(() => this.sorted(this.a().filter(x => this.b().includes(x))));

  show = computed(() => {
    switch (this.op()) {
      case 'INTERSECT': return { a: false, both: true, b: false };
      case 'EXCEPT': return { a: true, both: false, b: false };
      default: return { a: true, both: true, b: true };
    }
  });

  ids = computed(() => {
    switch (this.op()) {
      case 'UNION ALL': return [...this.a(), ...this.b()].sort((x, y) => x - y);
      case 'INTERSECT': return this.both();
      case 'EXCEPT': return this.onlyA();
      default: return this.sorted([...this.a(), ...this.b()]);
    }
  });
  rows = computed<Cell[][]>(() => this.ids().map(id => [id, name(id)]));
  rowClass = computed(() => this.ids().map((id, i, all) => (all[i - 1] === id || all[i + 1] === id ? 'tie' : '')));

  nm(id: number) { return name(id); }

  message = computed(() => {
    const a = this.a().length, b = this.b().length, n = this.ids().length;
    switch (this.op()) {
      case 'UNION': return `A has ${a} rows and B has ${b}, but UNION returns ${n}: it removes duplicates, so the ${this.both().length} products ordered in both periods appear once. Swapping A and B changes nothing.`;
      case 'UNION ALL': return `UNION ALL simply stacks the results: ${a} + ${b} = ${n} rows, duplicates included (amber). It skips the duplicate check, so it is faster. Use it whenever duplicates are impossible or wanted.`;
      case 'INTERSECT': return `INTERSECT keeps rows found in both results: the ${n} products ordered in both periods. Swapping A and B changes nothing.`;
      default: return `EXCEPT keeps rows of A that are not in B: ${n} product${n === 1 ? '' : 's'}. It is the only one where order matters. Press Swap to ask the opposite question.`;
    }
  });
}
