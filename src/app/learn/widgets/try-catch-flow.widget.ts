import { Component, computed, signal } from '@angular/core';
import { SqlOutputComponent } from './sql-output.component';
import { TC_OUT } from './prog-data';

/** A two-update sale with every mix of TRY … CATCH, XACT_ABORT and ROLLBACK; the output is SQL Server’s own. */
@Component({
  selector: 'w-try-catch-flow',
  standalone: true,
  imports: [SqlOutputComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Does the sale survive the error?</h3></div>
      <div class="w-controls">
        <label class="check"><input type="checkbox" [checked]="fail()" (change)="fail.set(!fail())" /> Second update fails (wall plugs: 0 in stock)</label>
      </div>
      <div class="w-controls">
        <label class="check"><input type="checkbox" [checked]="tc()" (change)="tc.set(!tc())" /> TRY … CATCH</label>
        <label class="check"><input type="checkbox" [checked]="xa()" (change)="xa.set(!xa())" /> SET XACT_ABORT ON</label>
        <label class="check" [class.dim]="!tc()"><input type="checkbox" [checked]="rb()" [disabled]="!tc()" (change)="rb.set(!rb())" /> ROLLBACK in CATCH</label>
      </div>
      <div class="cols">
        <pre class="sqlbox mono" aria-label="Script">{{ sqlText() }}</pre>
        <div class="pane">
          <div class="ph">What SSMS shows</div>
          <app-sql-output [text]="out()" label="Result" />
        </div>
      </div>
      <div class="w-msg" [class.ok]="verdict().ok" [class.err]="!verdict().ok" aria-live="polite"><span>{{ verdict().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
    .check.dim { opacity: 0.5; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 0.7rem; margin-top: 0.4rem; }
    @media (max-width: 700px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .sqlbox { font-size: 0.72rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0; white-space: pre; overflow-x: auto; }
  `]
})
export class TryCatchFlowWidget {
  tc = signal(true);
  xa = signal(false);
  fail = signal(true);
  rb = signal(true);

  private key = computed(() => `t${+this.tc()}x${+this.xa()}f${+this.fail()}r${+(this.tc() && this.rb())}`);
  out = computed(() => TC_OUT[this.key()]);

  sqlText = computed(() => {
    const p2 = this.fail() ? 9 : 8, t = this.tc(), ind = t ? '    ' : '';
    const body = [`${ind}BEGIN TRANSACTION;`, `${ind}    UPDATE dbo.Products SET Stock = Stock - 2 WHERE ProductId = 2;`,
      `${ind}    UPDATE dbo.Products SET Stock = Stock - 5 WHERE ProductId = ${p2};`, `${ind}COMMIT;`, `${ind}PRINT N'Committed';`];
    // Same lines as the script that produced TC_OUT, so the error line numbers match.
    const lines = [...(this.xa() ? ['SET XACT_ABORT ON;'] : []), ...(t ? ['BEGIN TRY', ...body, 'END TRY', 'BEGIN CATCH',
      ...(this.rb() ? ['    IF @@TRANCOUNT > 0 ROLLBACK;'] : []), "    PRINT CONCAT(N'Caught error ', ERROR_NUMBER());", 'END CATCH;'] : body),
      'GO', `SELECT ProductId, Name, Stock FROM dbo.Products`, `WHERE ProductId IN (2, ${p2}) ORDER BY ProductId;`, 'SELECT @@TRANCOUNT AS OpenTransactions;'];
    return lines.join('\n');
  });

  verdict = computed(() => {
    if (!this.fail()) return { ok: true, text: 'Nothing fails: both updates run and COMMIT saves them (drill 12 → 10). Every setting gives the same result. Error handling only matters when something goes wrong.' };
    if (!this.tc()) return this.xa()
      ? { ok: true, text: 'XACT_ABORT ended the batch at the error and rolled the transaction back. Nothing was saved: the drill stock is still 12, and COMMIT and PRINT never ran.' }
      : { ok: false, text: 'Half a sale. The failed UPDATE ended on its own; the batch carried on, COMMIT saved the drill change (12 → 10), and it even printed “Committed”.' };
    if (this.rb()) return { ok: true, text: `The error jumped to CATCH, which rolled back. Nothing was saved: the drill stock is still 12.${this.xa() ? ' With XACT_ABORT the transaction was doomed, so a rollback was the only option anyway.' : ''}` };
    return this.xa()
      ? { ok: false, text: 'XACT_ABORT doomed the transaction, but CATCH did not roll it back. SQL Server rolled it back itself at the end of the batch and complained with Msg 3998. Nothing saved, but only by luck.' }
      : { ok: false, text: 'CATCH ran but did not roll back, so the transaction is still open (@@TRANCOUNT = 1). This session sees the drill at 10, but nothing is committed, and its locks block other users until someone commits or rolls back.' };
  });
}
