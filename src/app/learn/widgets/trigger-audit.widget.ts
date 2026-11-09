import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, money } from './sql-data';

interface Row { ProductId: number; Name: string; Price: number }
interface Audit { id: number; action: string; pid: number; old: number | null; neu: number | null; maybe?: boolean }
interface Stmt { id: string; sql: string; run: (t: Row[]) => { after: Row[]; ins: Row[]; del: Row[] } }

const START: Row[] = PRODUCTS.map(p => ({ ProductId: p.ProductId, Name: p.Name, Price: p.Price }));
const r2 = (v: number) => Math.round(v * 100 + 1e-9) / 100;

/** The lesson’s audit trigger, step by step: run statements against Products and watch inserted, deleted and the audit table. */
const STMTS: Stmt[] = [
  { id: 'ins', sql: "INSERT INTO dbo.Products (Name, CategoryId, Price, …)\nVALUES (N'Spirit level 600 mm', 1, 15.00, …),\n       (N'Wood glue 1 L', 4, 8.40, …);",
    run: t => { const next = Math.max(...t.map(r => r.ProductId), 12) + 1; const ins = [{ ProductId: next, Name: 'Spirit level 600 mm', Price: 15 }, { ProductId: next + 1, Name: 'Wood glue 1 L', Price: 8.4 }]; return { after: [...t, ...ins], ins, del: [] }; } },
  { id: 'paint', sql: 'UPDATE dbo.Products\nSET Price = Price * 1.10\nWHERE CategoryId = 5;   -- two paint products',
    run: t => { const del = t.filter(r => r.ProductId === 10 || r.ProductId === 11); const ins = del.map(r => ({ ...r, Price: r2(r.Price * 1.1) })); return { after: t.map(r => ins.find(i => i.ProductId === r.ProductId) ?? r), ins, del }; } },
  { id: 'stock', sql: 'UPDATE dbo.Products\nSET Stock = Stock + 10\nWHERE ProductId = 2;     -- price unchanged',
    run: t => { const del = t.filter(r => r.ProductId === 2); return { after: t, ins: del.map(r => ({ ...r })), del }; } },
  { id: 'none', sql: 'UPDATE dbo.Products\nSET Price = 5\nWHERE CategoryId = 7;    -- Plumbing: no products',
    run: t => ({ after: t, ins: [], del: [] }) },
  { id: 'del', sql: 'DELETE FROM dbo.Products\nWHERE ProductId > 12;    -- the products added here',
    run: t => { const del = t.filter(r => r.ProductId > 12); return { after: t.filter(r => r.ProductId <= 12), ins: [], del }; } }
];

@Component({
  selector: 'w-trigger-audit',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside the audit trigger</h3></div>
      <div class="w-controls" role="group" aria-label="Trigger version">
        <button type="button" class="w-btn small" [class.on]="!buggy()" [attr.aria-pressed]="!buggy()" (click)="buggy.set(false)">Set-based (correct)</button>
        <button type="button" class="w-btn small" [class.on]="buggy()" [attr.aria-pressed]="buggy()" (click)="buggy.set(true)">Variables (one row)</button>
        <button type="button" class="w-btn small" (click)="reset()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</button>
      </div>
      <pre class="trg mono">{{ triggerText() }}</pre>
      <div class="ph">Run a statement</div>
      <div class="stmts">
        @for (s of stmts; track s.id) {
          <button type="button" class="stmt mono" [class.last]="last()?.id === s.id" (click)="run(s)">{{ s.sql }}</button>
        }
      </div>

      @if (last(); as l) {
        <div class="cols">
          <div class="pane">
            <div class="ph">inserted ({{ l.ins.length }} row{{ l.ins.length === 1 ? '' : 's' }})</div>
            <app-sql-grid [cols]="['ProductId', 'Name', 'Price']" [rows]="grid(l.ins)" label="inserted" />
          </div>
          <div class="pane">
            <div class="ph">deleted ({{ l.del.length }} row{{ l.del.length === 1 ? '' : 's' }})</div>
            <app-sql-grid [cols]="['ProductId', 'Name', 'Price']" [rows]="grid(l.del)" label="deleted" />
          </div>
        </div>
      }
      <div class="ph">dbo.ProductAudit</div>
      <app-sql-grid [cols]="['AuditId', 'Action', 'ProductId', 'OldPrice', 'NewPrice']" [rows]="auditRows()" [rowClass]="auditClass()" label="Audit table" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .trg { font-size: 0.7rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin: 0.5rem 0 0.3rem; }
    .stmts { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: 6px; }
    .stmt { all: unset; box-sizing: border-box; cursor: pointer; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.7rem; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .stmt:hover { border-color: #8b5cf6; }
    .stmt.last { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .stmt:focus-visible { outline: 2px solid var(--purple); }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.7rem; }
    @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
  `]
})
export class TriggerAuditWidget {
  readonly stmts = STMTS;
  buggy = signal(false);
  private table = signal<Row[]>(START);
  audit = signal<Audit[]>([]);
  private nextId = signal(1);
  last = signal<{ id: string; ins: Row[]; del: Row[]; logged: number } | null>(null);

  triggerText = computed(() => this.buggy()
    ? `CREATE OR ALTER TRIGGER dbo.trg_Products_Audit ON dbo.Products\nAFTER INSERT, UPDATE, DELETE AS\nBEGIN\n    IF @@ROWCOUNT = 0 RETURN;\n    SET NOCOUNT ON;\n    DECLARE @Id int, @Old decimal(10,2), @New decimal(10,2);\n    SELECT @Id = COALESCE(i.ProductId, d.ProductId), @Old = d.Price, @New = i.Price\n    FROM inserted AS i FULL OUTER JOIN deleted AS d ON d.ProductId = i.ProductId;\n    INSERT INTO dbo.ProductAudit (Action, ProductId, OldPrice, NewPrice)\n    VALUES (CASE WHEN @Old IS NULL THEN 'INSERT' WHEN @New IS NULL THEN 'DELETE' ELSE 'UPDATE' END,\n            @Id, @Old, @New);   -- one row, whatever the statement changed\nEND;`
    : `CREATE OR ALTER TRIGGER dbo.trg_Products_Audit ON dbo.Products\nAFTER INSERT, UPDATE, DELETE AS\nBEGIN\n    IF @@ROWCOUNT = 0 RETURN;\n    SET NOCOUNT ON;\n    INSERT INTO dbo.ProductAudit (Action, ProductId, OldPrice, NewPrice)\n    SELECT CASE WHEN d.ProductId IS NULL THEN 'INSERT'\n                WHEN i.ProductId IS NULL THEN 'DELETE' ELSE 'UPDATE' END,\n           COALESCE(i.ProductId, d.ProductId), d.Price, i.Price\n    FROM inserted AS i FULL OUTER JOIN deleted AS d ON d.ProductId = i.ProductId\n    ORDER BY COALESCE(i.ProductId, d.ProductId);\nEND;`);

  run(s: Stmt) {
    const { after, ins, del } = s.run(this.table());
    const ids = [...new Set([...ins, ...del].map(r => r.ProductId))].sort((a, b) => a - b);
    const rows: Audit[] = ids.map(pid => {
      const i = ins.find(r => r.ProductId === pid), d = del.find(r => r.ProductId === pid);
      return { id: 0, action: !d ? 'INSERT' : !i ? 'DELETE' : 'UPDATE', pid, old: d?.Price ?? null, neu: i?.Price ?? null };
    });
    let logged = rows;
    if (this.buggy() && rows.length > 1) logged = [{ ...rows[rows.length - 1], maybe: true }];
    let n = this.nextId();
    logged = logged.map(r => ({ ...r, id: n++ }));
    this.nextId.set(n);
    this.audit.update(a => [...a, ...logged]);
    this.table.set(after);
    this.last.set({ id: s.id, ins, del, logged: logged.length });
  }

  reset() { this.table.set(START); this.audit.set([]); this.nextId.set(1); this.last.set(null); }

  grid(rs: Row[]): Cell[][] { return rs.map(r => [r.ProductId, r.Name, money(r.Price)]); }
  auditRows = computed<Cell[][]>(() => this.audit().map(a => [a.id, a.action, a.pid, a.old === null ? null : money(a.old), a.neu === null ? null : money(a.neu)]));
  auditClass = computed(() => this.audit().map(a => (a.maybe ? 'tie' : a.id >= this.nextId() - (this.last()?.logged ?? 0) ? 'on' : '')));

  message = computed(() => {
    const l = this.last();
    if (!l) return 'Run a statement. The trigger sees the changed rows in inserted and deleted, and writes to the audit table.';
    const changed = Math.max(l.ins.length, l.del.length);
    if (!changed) return 'No rows matched, but the trigger still fired once. IF @@ROWCOUNT = 0 RETURN; made it stop straight away, so nothing was logged.';
    if (this.buggy() && changed > 1) return `${changed} rows changed, but the variables can hold only one, so only one audit row was written (highlighted). Which row it is depends on the order SQL Server read them in: it is not defined. Switch to the set-based version.`;
    if (l.id === 'ins') return 'INSERT: inserted holds the new rows and deleted is empty, so the FULL OUTER JOIN finds no old row: Action INSERT, OldPrice NULL.';
    if (l.id === 'del') return 'DELETE: deleted holds the removed rows and inserted is empty: Action DELETE, NewPrice NULL.';
    if (l.id === 'stock') return 'An UPDATE fills both tables, even when the price did not change. This trigger logs every update; the price-history trigger in the lesson skips these with WHERE i.Price <> d.Price.';
    return 'UPDATE: deleted holds each row before the change, inserted after it. Joined on ProductId, they give the old and the new price side by side.';
  });
}
