import { Component, computed, signal } from '@angular/core';
import { SqlOutputComponent } from './sql-output.component';
import { BATCH_OUT } from './prog-data';

const LINES = [
  "DECLARE @City nvarchar(40) = N'Leeds';",
  'SELECT COUNT(*) AS Customers FROM dbo.Customers WHERE City = @City;',
  "CREATE OR ALTER VIEW dbo.LeedsCustomers AS SELECT FirstName, LastName FROM dbo.Customers WHERE City = N'Leeds';",
  'SELECT COUNT(*) AS InView FROM dbo.LeedsCustomers;',
  "PRINT CONCAT(N'Done for ', @City);"
];
const USES_CITY = [false, true, false, false, true];

interface Batch { lines: number[]; fate: string; ok: boolean }

/** Switch GO lines on and off between five statements and see how SQL Server compiles and runs each batch. */
@Component({
  selector: 'w-batch-split',
  standalone: true,
  imports: [SqlOutputComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where do the batches end?</h3></div>
      <p class="hint">Click a gap to add or remove a <span class="mono">GO</span>. Each colour is one batch.</p>
      <div class="script" role="group" aria-label="Script">
        @for (l of lines; track $index; let i = $index) {
          <div class="ln mono" [class]="'b' + (batchOf()[i] % 4)"><span class="no">{{ i + 1 }}</span><span class="code">{{ l }}</span></div>
          @if (i < 4) {
            <button type="button" class="gap mono" [class.on]="go()[i]" [attr.aria-pressed]="go()[i]" (click)="toggle(i)" [attr.aria-label]="(go()[i] ? 'Remove' : 'Add') + ' GO after line ' + (i + 1)">{{ go()[i] ? 'GO' : '+ GO' }}</button>
          }
        }
      </div>
      <div class="w-controls presets">
        <button type="button" class="w-btn small" (click)="set(0)">No GO</button>
        <button type="button" class="w-btn small" (click)="set(14)">View in its own batch</button>
        <button type="button" class="w-btn small" (click)="set(15)">GO after every line</button>
      </div>

      <ol class="fates">
        @for (b of batches(); track $index; let k = $index) {
          <li [class]="'b' + (k % 4)"><span class="tag">Batch {{ k + 1 }}</span> <span class="mono lines">line{{ b.lines.length > 1 ? 's' : '' }} {{ range(b.lines) }}</span> <span [class.bad]="!b.ok">{{ b.fate }}</span></li>
        }
      </ol>
      <div class="ph">What SSMS shows</div>
      <app-sql-output [text]="out()" label="Results" />
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .hint { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 0.5rem; }
    .small { font-size: 0.78rem; padding: 3px 9px; }
    .script { display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; border: 1px solid var(--border-color); }
    .ln { display: grid; grid-template-columns: 1.6em 1fr; gap: 6px; padding: 4px 8px; font-size: 0.74rem; border-left: 4px solid; }
    .ln .no { color: var(--text-muted); text-align: right; }
    .ln .code { overflow-wrap: anywhere; }
    .b0 { border-left-color: #8b5cf6; background: rgba(139, 92, 246, 0.08); }
    .b1 { border-left-color: #10b981; background: rgba(16, 185, 129, 0.08); }
    .b2 { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.09); }
    .b3 { border-left-color: #0ea5e9; background: rgba(14, 165, 233, 0.08); }
    .gap { all: unset; box-sizing: border-box; cursor: pointer; font-size: 0.7rem; padding: 1px 8px 1px 2.3em; color: var(--text-muted); background: var(--bg-main); border-top: 1px dashed var(--border-color); border-bottom: 1px dashed var(--border-color); }
    .gap:hover { color: var(--text-main); background: rgba(139, 92, 246, 0.08); }
    .gap.on { color: #e2e8f0; background: #0b1020; font-weight: 700; border-color: transparent; }
    .gap:focus-visible { outline: 2px solid var(--purple); outline-offset: -2px; }
    .presets { margin-top: 0.5rem; }
    .fates { list-style: none; padding: 0; margin: 0.6rem 0; display: flex; flex-direction: column; gap: 3px; }
    .fates li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; font-size: 0.8rem; padding: 4px 8px; border-radius: 8px; border-left: 4px solid; }
    .fates .tag { font-weight: 700; }
    .fates .lines { color: var(--text-muted); font-size: 0.72rem; }
    .fates .bad { color: #ef4444; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
  `]
})
export class BatchSplitWidget {
  readonly lines = LINES;
  go = signal([false, false, false, false]);
  private mask = computed(() => this.go().reduce((m, on, i) => m | (on ? 1 << i : 0), 0));
  batchOf = computed(() => { let b = 0; return LINES.map((_, i) => (i > 0 && this.go()[i - 1] ? ++b : b)); });

  /** Why each batch fails or runs; the output below is SQL Server's own. */
  batches = computed<Batch[]>(() => {
    const groups: number[][] = [];
    this.batchOf().forEach((b, i) => (groups[b] ??= []).push(i));
    let viewMade = false;
    return groups.map(g => {
      if (g.includes(2) && g[0] !== 2) return { lines: g, ok: false, fate: 'Msg 111: CREATE VIEW is not the first statement, so the whole batch is rejected. Nothing in it runs.' };
      if (g.includes(2) && g.length > 1) return { lines: g, ok: false, fate: 'Msg 156: the view runs to the end of the batch, so the next statement is read as part of it. The view is not created.' };
      if (g.some(i => USES_CITY[i]) && !g.includes(0)) return { lines: g, ok: false, fate: 'Msg 137: @City was declared in another batch, so this one does not compile. Nothing in it runs.' };
      if (g.includes(2)) { viewMade = true; return { lines: g, ok: true, fate: 'Creates the view.' }; }
      if (g.includes(3) && !viewMade) return { lines: g, ok: false, fate: 'Compiles and runs, but the view does not exist yet: Msg 208 when line 4 runs.' };
      return { lines: g, ok: true, fate: g.length === 1 && g[0] === 0 ? 'Runs: declares @City, which disappears when the batch ends.' : 'Runs.' };
    });
  });

  out = computed(() => BATCH_OUT[this.mask()]);

  message = computed(() => {
    const m = this.mask();
    if (m === 0) return 'One batch: SQL Server rejects all of it because CREATE VIEW is not first. Add a GO before line 3.';
    if (m === 14) return 'This works: @City is declared and used in batch 1, the view has a batch of its own, and line 4 runs after the view exists. Only line 5 fails: @City died with batch 1.';
    if (this.batches().every(b => b.ok)) return 'Every batch runs.';
    return 'A batch is compiled as a whole before any of it runs. A compile error (Msg 111, 137, 156) stops the entire batch; the other batches still run.';
  });

  toggle(i: number) { this.go.update(g => g.map((v, k) => (k === i ? !v : v))); }
  set(mask: number) { this.go.set([0, 1, 2, 3].map(i => !!(mask >> i & 1))); }
  range(ls: number[]) { return ls.length > 1 ? `${ls[0] + 1}–${ls[ls.length - 1] + 1}` : `${ls[0] + 1}`; }
}
