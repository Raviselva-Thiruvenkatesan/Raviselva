import { Component, computed, signal } from '@angular/core';

/** One statement of a scenario and the state after it. Values match the lesson’s runs on SQL Server. */
interface Step {
  sql: string;
  /** @@TRANCOUNT after the statement. */
  tc: number;
  /** What this session sees after the statement (one value per tracked item). */
  mine: string[];
  /** What is committed, i.e. what any other session would read after the statement. */
  saved: string[];
  note: string;
  err?: boolean;
  skipped?: boolean;
}
interface Scenario { id: string; label: string; items: string[]; start: string[]; steps: Step[]; end: string; ok: boolean }

const S0 = ['12', '150', 'none'];
const SCENARIOS: Scenario[] = [
  {
    id: 'commit', label: 'Place an order', ok: true, items: ['Drill stock', 'Screws stock', 'Order 11'], start: S0,
    steps: [
      { sql: 'BEGIN TRANSACTION;', tc: 1, mine: S0, saved: S0, note: '@@TRANCOUNT goes to 1. From now on, changes are provisional until COMMIT.' },
      { sql: 'INSERT INTO dbo.Orders … VALUES (3, \'2024-06-20\', \'Pending\');', tc: 1, mine: ['12', '150', 'Pending, 0 lines'], saved: S0, note: 'This session sees order 11. Nothing is committed: other sessions cannot read it yet (they wait, or read the old state).' },
      { sql: 'INSERT INTO dbo.OrderItems … (@OrderId, 2, 1, 89.00), (@OrderId, 8, 3, 11.90);', tc: 1, mine: ['12', '150', 'Pending, 2 lines'], saved: S0, note: 'Two order lines added, still provisional.' },
      { sql: 'UPDATE dbo.Products SET Stock = Stock - … WHERE ProductId IN (2, 8);', tc: 1, mine: ['11', '147', 'Pending, 2 lines'], saved: S0, note: 'Stock taken out. If the server stopped now, recovery would undo all three changes.' },
      { sql: 'COMMIT;', tc: 0, mine: ['11', '147', 'Pending, 2 lines'], saved: ['11', '147', 'Pending, 2 lines'], note: 'COMMIT makes all three changes permanent at once, and releases the locks.' }
    ],
    end: 'All or nothing, and here it was all: the order, its lines and the stock change were committed together.'
  },
  {
    id: 'error', label: 'Error, no XACT_ABORT', ok: false, items: ['Drill stock', 'Line for order 99'], start: ['12', 'none'],
    steps: [
      { sql: 'BEGIN TRANSACTION;', tc: 1, mine: ['12', 'none'], saved: ['12', 'none'], note: 'A transaction is open.' },
      { sql: 'UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;', tc: 1, mine: ['11', 'none'], saved: ['12', 'none'], note: 'The drill’s stock is 11 in this session, still 12 for everyone else.' },
      { sql: 'INSERT INTO dbo.OrderItems … VALUES (99, 2, 1, 89.00);', tc: 1, mine: ['11', 'none'], saved: ['12', 'none'], err: true, note: 'Msg 547: there is no order 99. Only this statement fails. The transaction is still open (@@TRANCOUNT 1) and the UPDATE is still there.' },
      { sql: 'COMMIT;', tc: 0, mine: ['11', 'none'], saved: ['11', 'none'], note: 'The batch carried on to COMMIT, which saved the UPDATE without the line it belonged to.' }
    ],
    end: 'Half done: the stock went down for an order line that was never written. This is the trap.'
  },
  {
    id: 'xact', label: 'Error with XACT_ABORT', ok: true, items: ['Drill stock', 'Line for order 99'], start: ['12', 'none'],
    steps: [
      { sql: 'SET XACT_ABORT ON;', tc: 0, mine: ['12', 'none'], saved: ['12', 'none'], note: 'From now on, any run-time error rolls back the whole transaction and ends the batch.' },
      { sql: 'BEGIN TRANSACTION;', tc: 1, mine: ['12', 'none'], saved: ['12', 'none'], note: 'A transaction is open.' },
      { sql: 'UPDATE dbo.Products SET Stock = Stock - 1 WHERE ProductId = 2;', tc: 1, mine: ['11', 'none'], saved: ['12', 'none'], note: 'Provisional change, as before.' },
      { sql: 'INSERT INTO dbo.OrderItems … VALUES (99, 2, 1, 89.00);', tc: 0, mine: ['12', 'none'], saved: ['12', 'none'], err: true, note: 'Msg 547 again, but now SQL Server rolls back the whole transaction (@@TRANCOUNT 0) and stops the batch.' },
      { sql: 'COMMIT;', tc: 0, mine: ['12', 'none'], saved: ['12', 'none'], skipped: true, note: 'Never runs: the batch ended at the error.' }
    ],
    end: 'Nothing half done: the drill is still at 12 and no transaction is left open.'
  },
  {
    id: 'nested', label: 'Nested BEGIN, then ROLLBACK', ok: false, items: ['Hammer price', 'Tape price'], start: ['18.50', '9.75'],
    steps: [
      { sql: 'BEGIN TRANSACTION;', tc: 1, mine: ['18.50', '9.75'], saved: ['18.50', '9.75'], note: 'The outer transaction: @@TRANCOUNT 1.' },
      { sql: 'UPDATE dbo.Products SET Price = 20.00 WHERE ProductId = 1;', tc: 1, mine: ['20.00', '9.75'], saved: ['18.50', '9.75'], note: 'Provisional change to the hammer.' },
      { sql: 'BEGIN TRANSACTION;', tc: 2, mine: ['20.00', '9.75'], saved: ['18.50', '9.75'], note: 'Not a new transaction: @@TRANCOUNT just goes up to 2.' },
      { sql: 'UPDATE dbo.Products SET Price = 10.00 WHERE ProductId = 3;', tc: 2, mine: ['20.00', '10.00'], saved: ['18.50', '9.75'], note: 'Provisional change to the tape measure.' },
      { sql: 'COMMIT;', tc: 1, mine: ['20.00', '10.00'], saved: ['18.50', '9.75'], note: 'The “inner” COMMIT commits nothing. It only takes @@TRANCOUNT back to 1.' },
      { sql: 'ROLLBACK;', tc: 0, mine: ['18.50', '9.75'], saved: ['18.50', '9.75'], note: 'ROLLBACK undoes everything since the outermost BEGIN, including the tape change that was “committed”.' }
    ],
    end: 'Only the outermost COMMIT really commits; ROLLBACK always undoes the whole transaction.'
  },
  {
    id: 'save', label: 'Savepoint', ok: true, items: ['Order 11', 'Its lines'], start: ['none', '0'],
    steps: [
      { sql: 'BEGIN TRANSACTION;', tc: 1, mine: ['none', '0'], saved: ['none', '0'], note: 'A transaction is open.' },
      { sql: 'INSERT INTO dbo.Orders … VALUES (5, \'2024-06-21\', \'Pending\');', tc: 1, mine: ['Pending', '0'], saved: ['none', '0'], note: 'Order 11, provisional.' },
      { sql: 'SAVE TRANSACTION BeforeLines;', tc: 1, mine: ['Pending', '0'], saved: ['none', '0'], note: 'A marker inside the transaction. @@TRANCOUNT does not change.' },
      { sql: 'INSERT INTO dbo.OrderItems … VALUES (11, 12, 3, 6.80);', tc: 1, mine: ['Pending', '1'], saved: ['none', '0'], note: 'A line for three pairs of goggles (none are in stock, so we will take it back).' },
      { sql: 'ROLLBACK TRANSACTION BeforeLines;', tc: 1, mine: ['Pending', '0'], saved: ['none', '0'], note: 'Undoes only what came after the savepoint. The order stays, and the transaction is still open.' },
      { sql: 'COMMIT;', tc: 0, mine: ['Pending', '0'], saved: ['Pending', '0'], note: 'The order is committed without the line.' }
    ],
    end: 'A savepoint lets you undo part of a transaction on purpose. It cannot rescue a doomed transaction after an error.'
  }
];

/** Step through a transaction and watch @@TRANCOUNT, this session’s view and what is committed. */
@Component({
  selector: 'w-tx-stepper',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside a transaction</h3></div>
      <div class="w-controls" role="group" aria-label="Scenario">
        @for (s of scenarios; track s.id) {
          <button type="button" class="w-btn small" [class.on]="sid() === s.id" [attr.aria-pressed]="sid() === s.id" (click)="pick(s.id)">{{ s.label }}</button>
        }
      </div>
      <ol class="script mono" aria-label="Script">
        @for (st of sc().steps; track $index; let i = $index) {
          <li [class.done]="i < pos()" [class.cur]="i === pos() - 1" [class.err]="st.err && i < pos()" [class.skip]="st.skipped && i < pos()">{{ st.sql }}</li>
        }
      </ol>
      <div class="w-controls">
        <button type="button" class="w-btn primary" [disabled]="pos() >= sc().steps.length" (click)="pos.set(pos() + 1)">Run next statement</button>
        <button type="button" class="w-btn" [disabled]="pos() === 0" (click)="pos.set(0)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Start again</button>
        <span class="tc">@@TRANCOUNT <b [class.open]="tc() > 0">{{ tc() }}</b></span>
      </div>
      <div class="table-wrap">
        <table class="wtable">
          <thead><tr><th scope="col"></th><th scope="col">This session sees</th><th scope="col">Committed (other sessions)</th></tr></thead>
          <tbody>
            @for (it of sc().items; track it; let k = $index) {
              <tr><th scope="row">{{ it }}</th><td [class.diff]="mine()[k] !== saved()[k]">{{ mine()[k] }}</td><td>{{ saved()[k] }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="w-msg" [class.info]="pos() < sc().steps.length" [class.ok]="pos() === sc().steps.length && sc().ok" [class.err]="pos() === sc().steps.length && !sc().ok" aria-live="polite">
        <span>{{ message() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .script { list-style: none; margin: 0.4rem 0; padding: 8px 10px; background: #0b1020; color: #94a3b8; border-radius: 10px; font-size: 0.74rem; overflow-x: auto; }
    .script li { white-space: pre; padding: 1px 4px; border-radius: 4px; }
    .script li.done { color: #e2e8f0; }
    .script li.cur { background: rgba(139, 92, 246, 0.35); }
    .script li.err { color: #fca5a5; }
    .script li.skip { text-decoration: line-through; color: #64748b; }
    .tc { margin-left: auto; font-size: 0.85rem; }
    .tc b { display: inline-block; min-width: 1.6em; text-align: center; border-radius: 6px; padding: 1px 6px; background: var(--bg-secondary); }
    .tc b.open { background: rgba(245, 158, 11, 0.25); }
    .table-wrap { overflow-x: auto; }
    .wtable th[scope="row"] { text-align: left; white-space: nowrap; }
    .wtable td.diff { background: rgba(245, 158, 11, 0.18); font-weight: 700; }
  `]
})
export class TxStepperWidget {
  readonly scenarios = SCENARIOS;
  sid = signal('commit');
  pos = signal(0);
  sc = computed(() => SCENARIOS.find(s => s.id === this.sid())!);
  private last = computed(() => (this.pos() === 0 ? null : this.sc().steps[this.pos() - 1]));
  tc = computed(() => this.last()?.tc ?? 0);
  mine = computed(() => this.last()?.mine ?? this.sc().start);
  saved = computed(() => this.last()?.saved ?? this.sc().start);
  message = computed(() => {
    const l = this.last();
    if (!l) return 'Press “Run next statement”. Highlighted cells are changes this session can see but that are not committed.';
    return this.pos() === this.sc().steps.length ? `${l.note} ${this.sc().end}` : l.note;
  });
  pick(id: string) { this.sid.set(id); this.pos.set(0); }
}
