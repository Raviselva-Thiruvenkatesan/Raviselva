import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { CUSTOMERS, Cell, ORDERS, ORDER_ITEMS, money } from './sql-data';

const r2 = (v: number) => Math.round(v * 100) / 100;
const orderTotals = ORDERS.map(o => ({ OrderId: o.OrderId, Total: r2(ORDER_ITEMS.filter(i => i.OrderId === o.OrderId).reduce((s, i) => s + i.Quantity * i.UnitPrice, 0)) }));
const live = ORDERS.filter(o => o.Status !== 'Cancelled');
const customerTotals = [...new Set(live.map(o => o.CustomerId))].sort((a, b) => a - b).map(id => {
  const mine = live.filter(o => o.CustomerId === id);
  return { CustomerId: id, Orders: mine.length, Spent: r2(mine.reduce((s, o) => s + orderTotals.find(t => t.OrderId === o.OrderId)!.Total, 0)) };
});
const avgSpent = customerTotals.reduce((s, c) => s + c.Spent, 0) / customerTotals.length;
const avg6 = (v: number) => (Math.trunc(v * 1e6 + 1e-6) / 1e6).toFixed(6);
const first = (id: number) => CUSTOMERS.find(c => c.CustomerId === id)!.FirstName;

interface Step { name: string; sql: string; cols: string[]; rows: Cell[][]; note: string }
const STEPS: Step[] = [
  {
    name: 'OrderTotals',
    sql: 'SELECT OrderId, SUM(Quantity * UnitPrice) AS Total\nFROM dbo.OrderItems\nGROUP BY OrderId',
    cols: ['OrderId', 'Total'], rows: orderTotals.map(t => [t.OrderId, money(t.Total)]),
    note: 'Step 1 works only with OrderItems: one row per order, with its total. It knows nothing about customers yet.'
  },
  {
    name: 'CustomerTotals',
    sql: "SELECT o.CustomerId, COUNT(*) AS Orders, SUM(t.Total) AS Spent\nFROM OrderTotals AS t\nJOIN dbo.Orders AS o ON o.OrderId = t.OrderId\nWHERE o.Status <> 'Cancelled'\nGROUP BY o.CustomerId",
    cols: ['CustomerId', 'Orders', 'Spent'], rows: customerTotals.map(c => [c.CustomerId, c.Orders, money(c.Spent)]),
    note: 'Step 2 reads step 1 as if it were a table, drops Chloe’s cancelled order, and adds up each customer’s orders. Customers without orders never appear here.'
  },
  {
    name: 'Average',
    sql: 'SELECT AVG(Spent) AS AvgSpent FROM CustomerTotals',
    cols: ['AvgSpent'], rows: [[avg6(avgSpent)]],
    note: `Step 3 reduces step 2 to a single number: the ${customerTotals.length} customers spent ${avg6(avgSpent)} on average.`
  },
  {
    name: 'Final SELECT',
    sql: 'SELECT c.FirstName, ct.Orders, ct.Spent, a.AvgSpent\nFROM CustomerTotals AS ct\nJOIN dbo.Customers AS c ON c.CustomerId = ct.CustomerId\nCROSS JOIN Average AS a\nWHERE ct.Spent > a.AvgSpent\nORDER BY ct.Spent DESC',
    cols: ['FirstName', 'Orders', 'Spent', 'AvgSpent'],
    rows: customerTotals.filter(c => c.Spent > avgSpent).sort((a, b) => b.Spent - a.Spent).map(c => [first(c.CustomerId), c.Orders, money(c.Spent), avg6(avgSpent)]),
    note: 'The main query uses two of the steps: CustomerTotals for the rows and Average (one row, so CROSS JOIN just adds its column) for the comparison.'
  }
];

/** A chain of CTEs as named steps: click a step to see its query and the rows it hands on. */
@Component({
  selector: 'w-cte-chain',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A query as named steps</h3></div>
      <div class="chain" role="tablist" aria-label="CTE steps">
        @for (s of steps; track s.name; let k = $index) {
          @if (k > 0) { <i class="bi bi-arrow-right arrow" aria-hidden="true"></i> }
          <button type="button" role="tab" class="step" [class.on]="si() === k" [class.used]="uses().includes(k)" [attr.aria-selected]="si() === k" (click)="si.set(k)">
            <span class="sn">{{ s.name }}</span><span class="sc">{{ s.rows.length }} row{{ s.rows.length === 1 ? '' : 's' }}</span>
          </button>
        }
      </div>
      <app-code [code]="step().sql" [title]="step().name + '.sql'" [compact]="true" [copyable]="false" />
      <div class="gap"></div>
      <app-sql-grid [cols]="step().cols" [rows]="step().rows" [label]="step().name" />
      <div class="w-msg info" aria-live="polite"><span>{{ step().note }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 0.7rem; }
    .arrow { color: var(--text-muted); font-size: 0.8rem; }
    .step { all: unset; box-sizing: border-box; display: flex; flex-direction: column; padding: 5px 10px; border-radius: 10px; border: 1px solid var(--border-color); cursor: pointer; }
    .step .sn { font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.78rem; font-weight: 700; }
    .step .sc { font-size: 0.68rem; color: var(--text-muted); }
    .step.used { border-color: rgba(139, 92, 246, 0.5); border-style: dashed; }
    .step.on { background: rgba(139, 92, 246, 0.14); border-color: #8b5cf6; border-style: solid; }
    .step:focus-visible { outline: 2px solid var(--purple); }
    .gap { height: 0.6rem; }
    .w-msg { margin-top: 0.7rem; }
  `]
})
export class CteChainWidget {
  readonly steps = STEPS;
  si = signal(1);
  step = computed(() => STEPS[this.si()]);
  /** The steps the selected step reads from, outlined with a dashed border. */
  uses = computed(() => [[], [0], [1], [1, 2]][this.si()]);
}
