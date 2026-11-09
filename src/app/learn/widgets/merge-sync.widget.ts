import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS } from './sql-data';

/** BranchStock and Stocktake exactly as created in the lesson. */
const TARGET: [number, number][] = [[1, 40], [3, 65], [9, 5], [12, 0]];
const SOURCE: [number, number][] = [[1, 38], [3, 65], [5, 20], [12, 6]];
const DUP: [number, number] = [1, 36];
const name = (id: number) => PRODUCTS.find(p => p.ProductId === id)!.Name;

type Action = 'UPDATE' | 'INSERT' | 'DELETE' | 'no change' | 'no clause';
interface Out { id: number; action: Action; oldQty: number | null; newQty: number | null; why: string }

/** Switch MERGE clauses on and off and watch what happens to each row of the target. */
@Component({
  selector: 'w-merge-sync',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Syncing the branch stock</h3></div>
      <div class="clauses" role="group" aria-label="MERGE clauses">
        <label class="check"><input type="checkbox" [checked]="matched()" (change)="matched.set(!matched())" /> <span class="mono">WHEN MATCHED AND t.Qty &lt;&gt; s.Qty THEN UPDATE</span></label>
        <label class="check"><input type="checkbox" [checked]="byTarget()" (change)="byTarget.set(!byTarget())" /> <span class="mono">WHEN NOT MATCHED BY TARGET THEN INSERT</span></label>
        <label class="check"><input type="checkbox" [checked]="bySource()" (change)="bySource.set(!bySource())" /> <span class="mono">WHEN NOT MATCHED BY SOURCE THEN DELETE</span></label>
        <label class="check dup"><input type="checkbox" [checked]="dup()" (change)="dup.set(!dup())" /> Add a second count for product 1: (1, 36)</label>
      </div>

      <div class="cols">
        <div class="pane">
          <div class="ph">Target: <span class="mono">dbo.BranchStock</span></div>
          <app-sql-grid [cols]="['ProductId', 'Qty']" [rows]="targetRows" label="Target before" />
        </div>
        <div class="pane">
          <div class="ph">Source: <span class="mono">dbo.Stocktake</span></div>
          <app-sql-grid [cols]="['ProductId', 'Qty']" [rows]="sourceRows()" [rowClass]="sourceClass()" label="Source" />
        </div>
      </div>

      <div class="ph">What happens to each product</div>
      <ul class="plan">
        @for (o of plan(); track o.id) {
          <li [class]="cls(o.action)"><span class="mono id">{{ o.id }}</span> <span class="nm">{{ nm(o.id) }}</span> <span class="act mono">{{ o.action }}</span> <span class="why">{{ o.why }}</span></li>
        }
      </ul>

      @if (error()) {
        <div class="w-msg err"><span class="mono">Msg 8672, Level 16: The MERGE statement attempted to UPDATE or DELETE the same row more than once.</span></div>
      } @else {
        <div class="cols">
          <div class="pane">
            <div class="ph">OUTPUT</div>
            <app-sql-grid [cols]="['Action', 'ProductId', 'OldQty', 'NewQty']" [rows]="outputRows()" label="OUTPUT rows" />
          </div>
          <div class="pane">
            <div class="ph">Target after</div>
            <app-sql-grid [cols]="['ProductId', 'Qty']" [rows]="after()" label="Target after" />
          </div>
        </div>
      }
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .clauses { display: flex; flex-direction: column; gap: 4px; margin-bottom: 0.6rem; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.78rem; cursor: pointer; overflow-wrap: anywhere; }
    .check input { accent-color: #8b5cf6; flex: none; }
    .check.dup input { accent-color: #ef4444; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.7rem; margin-bottom: 0.7rem; }
    @media (max-width: 520px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .plan { list-style: none; padding: 0; margin: 0 0 0.7rem; display: flex; flex-direction: column; gap: 3px; }
    .plan li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; padding: 3px 8px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.76rem; }
    .plan .id { color: var(--text-muted); }
    .plan .nm { font-weight: 600; }
    .plan .act { font-size: 0.7rem; font-weight: 700; padding: 0 6px; border-radius: 6px; background: var(--bg-secondary); }
    .plan .why { color: var(--text-muted); font-size: 0.72rem; }
    .plan li.upd { border-color: rgba(245, 158, 11, 0.55); } .plan li.upd .act { background: rgba(245, 158, 11, 0.2); }
    .plan li.ins { border-color: rgba(16, 185, 129, 0.55); } .plan li.ins .act { background: rgba(16, 185, 129, 0.2); }
    .plan li.del { border-color: rgba(239, 68, 68, 0.55); } .plan li.del .act { background: rgba(239, 68, 68, 0.2); }
    .w-msg { margin-top: 0.4rem; }
  `]
})
export class MergeSyncWidget {
  readonly targetRows: Cell[][] = TARGET;
  matched = signal(true);
  byTarget = signal(true);
  bySource = signal(true);
  dup = signal(false);

  private source = computed(() => (this.dup() ? [...SOURCE.slice(0, 1), DUP, ...SOURCE.slice(1)] : SOURCE));
  sourceRows = computed<Cell[][]>(() => this.source());
  sourceClass = computed(() => this.source().map(r => (this.dup() && r[0] === 1 ? 'tie' : '')));

  plan = computed<Out[]>(() => {
    const src = this.source(), ids = [...new Set([...TARGET.map(t => t[0]), ...src.map(s => s[0])])].sort((a, b) => a - b);
    return ids.map(id => {
      const t = TARGET.find(r => r[0] === id), ss = src.filter(r => r[0] === id);
      if (t && ss.length) {
        const changing = ss.filter(s => s[1] !== t[1]);
        if (!this.matched()) return { id, action: 'no clause', oldQty: t[1], newQty: t[1], why: 'matched, but there is no WHEN MATCHED clause' };
        if (!changing.length) return { id, action: 'no change', oldQty: t[1], newQty: t[1], why: `matched, but ${t[1]} = ${ss[0][1]}, so the AND test is false` };
        return { id, action: 'UPDATE', oldQty: t[1], newQty: changing[changing.length - 1][1], why: ss.length > 1 ? `matched by ${ss.length} source rows: which count wins?` : `matched, ${t[1]} → ${ss[0][1]}` };
      }
      if (ss.length) return this.byTarget() ? { id, action: 'INSERT', oldQty: null, newQty: ss[0][1], why: 'in the source only' } : { id, action: 'no clause', oldQty: null, newQty: null, why: 'in the source only, but there is no NOT MATCHED BY TARGET clause' };
      return this.bySource() ? { id, action: 'DELETE', oldQty: t![1], newQty: null, why: 'in the target only: not counted' } : { id, action: 'no clause', oldQty: t![1], newQty: t![1], why: 'in the target only, but there is no NOT MATCHED BY SOURCE clause' };
    });
  });

  /** A target row matched (and changed) by two source rows stops the whole statement. */
  error = computed(() => this.dup() && this.matched());

  outputRows = computed<Cell[][]>(() => this.plan().filter(o => ['UPDATE', 'INSERT', 'DELETE'].includes(o.action)).map(o => [o.action, o.id, o.oldQty, o.newQty]));
  after = computed<Cell[][]>(() => this.plan().filter(o => o.newQty !== null).map(o => [o.id, o.newQty]));

  cls(a: Action) { return a === 'UPDATE' ? 'upd' : a === 'INSERT' ? 'ins' : a === 'DELETE' ? 'del' : ''; }
  nm(id: number) { return name(id); }

  message = computed(() => {
    if (this.error()) return 'Product 1 is matched by two source rows, (1, 38) and (1, 36), and both would update it. SQL Server will not pick one, so the whole MERGE fails and nothing changes. Deduplicate the source first, or untick WHEN MATCHED to see that only a change, not a match, is the problem.';
    if (this.dup()) return 'Without a WHEN MATCHED clause, product 1 is matched twice but nothing changes it, so there is no error. A duplicate only matters when it would update or delete a row twice.';
    const on = [this.matched(), this.byTarget(), this.bySource()].filter(Boolean).length;
    if (on === 3) return 'All three clauses: the branch table now matches the stocktake exactly. Product 3 matched but did not change, so it is not in OUTPUT. The order of OUTPUT rows is not guaranteed.';
    if (!this.bySource()) return 'Without NOT MATCHED BY SOURCE, this is a plain upsert: product 9 was not counted, but it stays in the target untouched.';
    return 'A clause that is left out simply means “do nothing” for those rows. Each row falls into exactly one case: matched, source only or target only.';
  });
}
