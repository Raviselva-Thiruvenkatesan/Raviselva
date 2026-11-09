import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell } from './sql-data';

interface Note { id: number; body: string }
interface Step { sql: string; text: string; bad?: boolean }

const WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/** An IDENTITY column's counter: inserts take the next number, failures and rollbacks burn one, DELETE never gives one back. */
@Component({
  selector: 'w-identity-gaps',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where IDENTITY gaps come from</h3></div>
      <div class="w-controls">
        <label class="w-field">IDENTITY(seed, increment)
          <select [value]="cfg()" (change)="setCfg($any($event.target).value)">
            <option value="1,1">IDENTITY(1, 1)</option>
            <option value="1000,10">IDENTITY(1000, 10)</option>
          </select>
        </label>
        <div class="counter" aria-live="polite"><span class="w-label">Next value</span><span class="mono big">{{ next() }}</span></div>
      </div>
      <div class="w-controls" role="group" aria-label="Statements">
        <button type="button" class="w-btn" (click)="insert()"><i class="bi bi-plus-lg" aria-hidden="true"></i> INSERT a row</button>
        <button type="button" class="w-btn" (click)="fail()"><i class="bi bi-x-lg" aria-hidden="true"></i> INSERT that fails</button>
        <button type="button" class="w-btn" (click)="rollback()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> INSERT, then ROLLBACK</button>
        <button type="button" class="w-btn" [disabled]="!rows().length" (click)="deleteLast()"><i class="bi bi-trash" aria-hidden="true"></i> DELETE the last row</button>
        <button type="button" class="w-btn" (click)="truncate()"><i class="bi bi-eraser" aria-hidden="true"></i> TRUNCATE TABLE</button>
      </div>
      <div class="w-grid two">
        <div>
          <div class="w-label">dbo.Notes</div>
          <app-sql-grid [cols]="['NoteId', 'Body']" [rows]="grid()" label="Rows in dbo.Notes" />
        </div>
        <div>
          <div class="w-label">What happened</div>
          <ol class="log" aria-live="polite">
            @for (s of log(); track $index) {
              <li [class.bad]="s.bad"><code class="mono">{{ s.sql }}</code><span>{{ s.text }}</span></li>
            } @empty { <li class="empty">Run a statement.</li> }
          </ol>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .counter { display: flex; flex-direction: column; padding: 4px 12px; border-radius: 10px; border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.12); }
    .counter .w-label { margin: 0; }
    .big { font-size: 1.2rem; font-weight: 800; }
    .log { margin: 0; padding-left: 1.3rem; font-size: 0.82rem; display: grid; gap: 6px; max-height: 260px; overflow-y: auto; }
    .log li { display: flex; flex-direction: column; gap: 1px; }
    .log code { font-size: 0.76rem; color: var(--purple); overflow-wrap: anywhere; }
    .log li.bad code { color: #ef4444; }
    .log .empty { color: var(--text-muted); list-style: none; margin-left: -1.3rem; }
  `]
})
export class IdentityGapsWidget {
  cfg = signal('1,1');
  seed = computed(() => +this.cfg().split(',')[0]);
  step = computed(() => +this.cfg().split(',')[1]);
  next = signal(1);
  rows = signal<Note[]>([]);
  log = signal<Step[]>([]);
  made = signal(0);

  grid = computed<Cell[][]>(() => this.rows().map(r => [r.id, r.body]));
  gaps = computed(() => {
    const ids = this.rows().map(r => r.id);
    if (!ids.length) return 0;
    return (ids[ids.length - 1] - this.seed()) / this.step() + 1 - ids.length;
  });

  message = computed(() => {
    const g = this.gaps();
    if (!this.log().length) return 'Insert a few rows, then try the other statements and watch the counter on the right.';
    if (g > 0) return `${g} ${g === 1 ? 'number is' : 'numbers are'} missing from the sequence of ids. That is normal: IDENTITY promises unique, increasing numbers, never gap-free ones. Never use it for invoice numbers that must not skip.`;
    return 'No gaps so far: every number handed out is still in the table.';
  });

  private add(s: Step) { this.log.update(l => [...l, s].slice(-8)); }
  private take() { const v = this.next(); this.next.set(v + this.step()); return v; }
  private word() { const w = WORDS[this.made() % WORDS.length]; this.made.update(n => n + 1); return w; }

  setCfg(v: string) { this.cfg.set(v); this.reset(); }
  reset() { this.next.set(this.seed()); this.rows.set([]); this.log.set([]); this.made.set(0); }

  insert() {
    const body = this.word(), id = this.take();
    this.rows.update(r => [...r, { id, body }]);
    this.add({ sql: `INSERT … VALUES (N'${body}');`, text: `Took ${id}. The row is stored.` });
  }
  fail() {
    const id = this.take();
    this.add({ sql: 'INSERT … VALUES (NULL);', text: `Msg 515: Body does not allow NULL. Number ${id} was already taken and is not given back.`, bad: true });
  }
  rollback() {
    const id = this.take();
    this.add({ sql: 'BEGIN TRAN; INSERT …; ROLLBACK;', text: `The row is undone, but number ${id} is not: the counter is not part of the transaction.`, bad: true });
  }
  deleteLast() {
    const last = this.rows()[this.rows().length - 1];
    this.rows.update(r => r.slice(0, -1));
    this.add({ sql: `DELETE … WHERE NoteId = ${last.id};`, text: `Row ${last.id} is gone; the next value stays ${this.next()}. DELETE never resets the counter.` });
  }
  truncate() {
    this.rows.set([]);
    this.next.set(this.seed());
    this.add({ sql: 'TRUNCATE TABLE dbo.Notes;', text: `All rows removed and the counter is reset to the seed, ${this.seed()}.` });
  }
}
