import { Component, computed, signal } from '@angular/core';
import { ISO, IsoLevel, IsoProblem } from './master-data';

const LEVELS: { id: IsoLevel; label: string; set: string }[] = [
  { id: 'ru', label: 'READ UNCOMMITTED', set: 'SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;' },
  { id: 'rc', label: 'READ COMMITTED', set: 'SET TRANSACTION ISOLATION LEVEL READ COMMITTED;' },
  { id: 'rr', label: 'REPEATABLE READ', set: 'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;' },
  { id: 'ser', label: 'SERIALIZABLE', set: 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;' },
  { id: 'rcsi', label: 'READ COMMITTED + RCSI', set: '-- database has READ_COMMITTED_SNAPSHOT ON\nSET TRANSACTION ISOLATION LEVEL READ COMMITTED;' },
  { id: 'snap', label: 'SNAPSHOT', set: 'SET TRANSACTION ISOLATION LEVEL SNAPSHOT;' }
];
const PROBLEMS: { id: IsoProblem; label: string }[] = [
  { id: 'dirty', label: 'Dirty read' },
  { id: 'nonrep', label: 'Non-repeatable read' },
  { id: 'phantom', label: 'Phantom' }
];

interface Row { who: 1 | 2; sql: string; result?: string; wait?: boolean; late?: string }

/** Run one of the three read problems at each isolation level; results are SQL Server’s, from two real sessions. */
@Component({
  selector: 'w-isolation-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which problems does each level stop?</h3></div>
      <div class="w-controls" role="group" aria-label="Problem">
        @for (p of problems; track p.id) {
          <button type="button" class="w-btn small" [class.on]="prob() === p.id" [attr.aria-pressed]="prob() === p.id" (click)="prob.set(p.id)">{{ p.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Isolation level of Session 1">
        @for (l of levels; track l.id) {
          <button type="button" class="w-btn small lvl" [class.on]="lvl() === l.id" [attr.aria-pressed]="lvl() === l.id" (click)="lvl.set(l.id)">{{ l.label }}</button>
        }
      </div>
      <div class="tl" role="list" aria-label="Timeline">
        <div class="hd"><span>Session 1 (reader)</span><span>Session 2 (writer)</span></div>
        @for (r of rows(); track $index) {
          <div class="step" role="listitem" [class.s2]="r.who === 2">
            <div class="cell">
              <span class="who">Session {{ r.who }}</span>
              <pre class="mono">{{ r.sql }}</pre>
              @if (r.wait) { <div class="wait"><i class="bi bi-hourglass-split" aria-hidden="true"></i> waits for the other session’s lock…</div> }
              @if (r.result) { <div class="res mono">{{ r.late ? r.late + ' ' : '' }}→ {{ r.result }}</div> }
            </div>
          </div>
        }
      </div>
      <div class="w-msg" [class.ok]="!happens()" [class.err]="happens()" aria-live="polite"><span>{{ verdict() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .tl { display: flex; flex-direction: column; gap: 5px; margin-top: 0.5rem; }
    .hd { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.74rem; font-weight: 700; color: var(--text-muted); }
    .step { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cell { grid-column: 1; min-width: 0; border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 8px; background: var(--bg-main); }
    .step.s2 .cell { grid-column: 2; border-color: rgba(8, 145, 178, 0.45); }
    pre { margin: 0; font-size: 0.7rem; white-space: pre-wrap; overflow-wrap: anywhere; }
    .wait { font-size: 0.74rem; color: #0891b2; font-weight: 700; margin-top: 3px; }
    .res { font-size: 0.78rem; font-weight: 800; margin-top: 3px; color: #7c3aed; }
    .who { display: none; font-size: 0.68rem; font-weight: 700; color: var(--text-muted); }
    @media (max-width: 560px) { .hd { display: none; } .step, .step.s2 { grid-template-columns: 1fr; } .step.s2 .cell { grid-column: 1; } .who { display: block; } }
  `]
})
export class IsolationLabWidget {
  readonly levels = LEVELS;
  readonly problems = PROBLEMS;
  lvl = signal<IsoLevel>('rc');
  prob = signal<IsoProblem>('dirty');
  run = computed(() => ISO[this.lvl()][this.prob()]);

  rows = computed<Row[]>(() => {
    const r = this.run(), set = LEVELS.find(l => l.id === this.lvl())!.set;
    switch (this.prob()) {
      case 'dirty': return [
        { who: 2, sql: 'BEGIN TRANSACTION;\nUPDATE dbo.Products SET Price = 9.99\nWHERE ProductId = 2;' },
        { who: 1, sql: `${set}\nSELECT Price FROM dbo.Products\nWHERE ProductId = 2;`, wait: r.readerWaits, result: r.readerWaits ? undefined : r.read },
        { who: 2, sql: 'ROLLBACK;' },
        ...(r.readerWaits ? [{ who: 1 as const, sql: '(the waiting SELECT finishes)', result: r.read, late: 'after the rollback' }] : [])
      ];
      case 'nonrep': return [
        { who: 1, sql: `${set}\nBEGIN TRANSACTION;\nSELECT Stock FROM dbo.Products\nWHERE ProductId = 2;`, result: r.first },
        { who: 2, sql: 'UPDATE dbo.Products SET Stock = Stock - 10\nWHERE ProductId = 2;', wait: r.writerWaits },
        { who: 1, sql: 'SELECT Stock FROM dbo.Products\nWHERE ProductId = 2;\nCOMMIT;', result: r.read },
        ...(r.writerWaits ? [{ who: 2 as const, sql: '(the waiting UPDATE runs now)' }] : [])
      ];
      default: return [
        { who: 1, sql: `${set}\nBEGIN TRANSACTION;\nSELECT COUNT(*) FROM dbo.Products\nWHERE CategoryId = 1;`, result: r.first },
        { who: 2, sql: 'INSERT INTO dbo.Products (…)\nVALUES (N\'Spirit level\', 1, …);', wait: r.writerWaits },
        { who: 1, sql: 'SELECT COUNT(*) FROM dbo.Products\nWHERE CategoryId = 1;\nCOMMIT;', result: r.read },
        ...(r.writerWaits ? [{ who: 2 as const, sql: '(the waiting INSERT runs now)' }] : [])
      ];
    }
  });

  happens = computed(() => {
    const r = this.run();
    return this.prob() === 'dirty' ? r.read === '9.99' : r.read !== r.first;
  });

  verdict = computed(() => {
    const r = this.run(), lvl = this.lvl();
    const vers = lvl === 'rcsi' || lvl === 'snap';
    switch (this.prob()) {
      case 'dirty':
        if (this.happens()) return 'Dirty read: Session 1 read 9.99, a price that was rolled back and never existed. No S lock was taken, so nothing stopped it.';
        return vers
          ? 'Prevented without waiting: Session 1 read the last committed version (89.00) from the version store.'
          : 'Prevented by waiting: Session 1 needed an S lock on a row with an X lock, so it waited until the rollback and then read 89.00.';
      case 'nonrep':
        if (this.happens()) return `Non-repeatable read: the same SELECT in one transaction returned 12, then 2.${lvl === 'rcsi' ? ' RCSI gives each statement its own snapshot, so the second statement saw the new committed value.' : ' The S lock was released after the first read, so the UPDATE went straight through.'}`;
        return lvl === 'snap'
          ? 'Prevented without blocking anyone: the UPDATE committed, but the snapshot transaction kept seeing the data as it was when it started (12).'
          : 'Prevented by locking: Session 1 kept its S lock, so the UPDATE waited until Session 1 committed. Session 1 read 12 both times.';
      default:
        if (this.happens()) return `Phantom: the count went from 3 to 4 inside one transaction.${lvl === 'rr' ? ' REPEATABLE READ locked the three rows it had read, but not the gap where a new row could go.' : ''}`;
        return lvl === 'snap'
          ? 'Prevented without locks: the INSERT committed, but the snapshot transaction does not see rows committed after it started.'
          : 'Prevented by key-range locks: the INSERT waited until Session 1 committed, so Session 1 counted 3 both times.';
    }
  });
}
