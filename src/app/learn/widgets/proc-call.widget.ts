import { Component, computed, signal } from '@angular/core';
import { SqlOutputComponent } from './sql-output.component';

type Qty = '5' | '-5' | 'DEFAULT' | 'leave out';
const TARGETS = [
  { id: 9, label: '9 Wall plugs', stock: 0 as number | null },
  { id: 2, label: '2 Cordless drill', stock: 12 as number | null },
  { id: 99, label: '99 (no such product)', stock: null as number | null }
];
const QTYS: Qty[] = ['5', '-5', 'DEFAULT', 'leave out'];

/**
 * Build an EXEC of dbo.AddStock (from the lesson) and see what SQL Server returns.
 * The rules follow the real server: Msg 8162 when OUTPUT lands on @Qty, Msg 201 when @NewStock is missing
 * (the batch carries on), THROW 50001 for a quantity under 1 (the batch stops), RETURN 1 for an unknown product.
 */
@Component({
  selector: 'w-proc-call',
  standalone: true,
  imports: [SqlOutputComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Calling dbo.AddStock</h3></div>
      <pre class="sig mono">dbo.AddStock &#64;ProductId int, &#64;Qty int = 1, &#64;NewStock int OUTPUT</pre>
      <div class="w-controls" role="group" aria-label="Product">
        <span class="lab">&#64;ProductId</span>
        @for (t of targets; track t.id) {
          <button type="button" class="w-btn small" [class.on]="pid() === t.id" [attr.aria-pressed]="pid() === t.id" (click)="pid.set(t.id)">{{ t.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Quantity">
        <span class="lab">&#64;Qty</span>
        @for (q of qtys; track q) {
          <button type="button" class="w-btn small mono" [class.on]="qty() === q" [attr.aria-pressed]="qty() === q" (click)="qty.set(q)">{{ q }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Call style">
        <button type="button" class="w-btn small" [class.on]="named()" [attr.aria-pressed]="named()" (click)="named.set(true)">By name</button>
        <button type="button" class="w-btn small" [class.on]="!named()" [attr.aria-pressed]="!named()" (click)="named.set(false)">By position</button>
        <label class="check"><input type="checkbox" [checked]="passNew()" (change)="passNew.set(!passNew())" /> pass &#64;Stock</label>
        <label class="check"><input type="checkbox" [checked]="out()" [disabled]="!passNew()" (change)="out.set(!out())" /> with OUTPUT</label>
      </div>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>
      <div class="ph">What SSMS shows</div>
      <app-sql-output [text]="result()" label="Call result" />
      <div class="w-msg" [class.ok]="verdict().ok" [class.err]="!verdict().ok" aria-live="polite"><span>{{ verdict().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lab { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); font-family: 'Cascadia Code', Consolas, monospace; min-width: 6.2em; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; margin-left: 0.3rem; }
    .check input { accent-color: #8b5cf6; }
    .sig { font-size: 0.76rem; margin: 0 0 0.6rem; padding: 6px 10px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-main); white-space: pre-wrap; overflow-wrap: anywhere; }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.2rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
  `]
})
export class ProcCallWidget {
  readonly targets = TARGETS;
  readonly qtys = QTYS;
  pid = signal(9);
  qty = signal<Qty>('5');
  named = signal(true);
  passNew = signal(true);
  out = signal(true);

  private stockVar = computed(() => (this.passNew() ? `@Stock${this.out() ? ' OUTPUT' : ''}` : null));

  private args = computed(() => {
    const q = this.qty(), v = this.stockVar();
    if (this.named()) return [`@ProductId = ${this.pid()}`, ...(q === 'leave out' ? [] : [`@Qty = ${q}`]), ...(v ? [`@NewStock = ${v}`] : [])];
    return [String(this.pid()), ...(q === 'leave out' ? [] : [q]), ...(v ? [v] : [])];
  });

  sqlText = computed(() => `DECLARE @rc int, @Stock int;\n\nEXEC @rc = dbo.AddStock ${this.args().join(', ')};\n\nSELECT @rc AS ReturnCode, @Stock AS NewStock,\n       (SELECT Stock FROM dbo.Products WHERE ProductId = ${this.pid()}) AS RealStock;`);

  /** What each parameter receives, following positional binding when the call is by position. */
  private bound = computed(() => {
    const q = this.qty(), v = this.stockVar();
    if (this.named()) return { qty: q === '5' ? 5 : q === '-5' ? -5 : 1, newSupplied: !!v, outOnQty: false };
    const pos = this.args();
    return { qty: pos[1] === '5' ? 5 : pos[1] === '-5' ? -5 : 1, newSupplied: pos.length >= 3, outOnQty: q === 'leave out' && !!v && this.out() };
  });

  private run = computed(() => {
    const b = this.bound(), t = TARGETS.find(x => x.id === this.pid())!;
    const row = (rc: string, ns: string, real: number | null) => `ReturnCode  NewStock  RealStock\n----------  --------  ---------\n${rc.padStart(10)}  ${ns.padStart(8)}  ${(real === null ? 'NULL' : String(real)).padStart(9)}`;
    if (b.outOnQty) return { text: `Msg 8162, Level 16, State 2, Procedure dbo.AddStock, Line 0\nThe formal parameter "@Qty" was not declared as an OUTPUT parameter, but the actual parameter passed in requested output.\n\n${row('NULL', 'NULL', t.stock)}`, case: 'qtyOut' };
    if (!b.newSupplied) return { text: `Msg 201, Level 16, State 4, Procedure dbo.AddStock, Line 0\nProcedure or function 'AddStock' expects parameter '@NewStock', which was not supplied.\n\n${row('NULL', 'NULL', t.stock)}`, case: 'missing' };
    if (b.qty <= 0) return { text: 'Msg 50001, Level 16, State 1, Procedure dbo.AddStock, Line 10\nQuantity must be at least 1.', case: 'throw' };
    if (t.stock === null) return { text: row('1', 'NULL', null), case: 'noProduct' };
    const real = t.stock + b.qty;
    return { text: row('0', this.out() ? String(real) : 'NULL', real), case: this.out() ? 'ok' : 'noOutput' };
  });
  result = computed(() => this.run().text);

  verdict = computed(() => {
    const qty = this.bound().qty;
    switch (this.run().case) {
      case 'qtyOut': return { ok: false, text: 'By position, @Stock OUTPUT lands in the second parameter, @Qty, which is not an OUTPUT parameter (Msg 8162). To skip @Qty in a positional call, write DEFAULT in its place.' };
      case 'missing': return { ok: false, text: '@NewStock has no default, so it must be passed (Msg 201). The procedure never ran, and the batch carried on: the SELECT shows NULLs and the stock is unchanged.' };
      case 'throw': return { ok: false, text: 'The procedure checks @Qty first and THROWs 50001. With no TRY … CATCH around it, THROW ends the whole batch, so the SELECT after the EXEC never runs.' };
      case 'noProduct': return { ok: true, text: 'There is no product 99. The procedure uses RETURN 1 to say so: no error is raised, @rc is 1, and @Stock is never set.' };
      case 'noOutput': return { ok: false, text: `The stock really went up by ${qty}, but without OUTPUT at the call the new value is not copied back: @Stock stays NULL, with no error or warning.` };
      default: return { ok: true, text: `Success: RETURN 0, and OUTPUT copied the new stock back into @Stock.${this.qty() === 'leave out' || this.qty() === 'DEFAULT' ? ' @Qty took its default, 1.' : ''}` };
    }
  });
}
