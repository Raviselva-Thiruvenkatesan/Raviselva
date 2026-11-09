import { Component, computed, signal } from '@angular/core';
import { SqlOutputComponent } from './sql-output.component';
import { UDF_OUT } from './prog-data';

type Kind = 'scalar' | 'inline' | 'multi';
type Use = 'select' | 'from' | 'apply' | 'exec';

const KINDS: { id: Kind; label: string; fn: string; def: string }[] = [
  { id: 'scalar', label: 'Scalar', fn: 'dbo.PriceWithVat', def: 'CREATE FUNCTION dbo.PriceWithVat (@Price decimal(10,2))\nRETURNS decimal(10,2)\nAS BEGIN RETURN ROUND(@Price * 1.20, 2); END;' },
  { id: 'inline', label: 'Inline table-valued', fn: 'dbo.OrdersFor', def: 'CREATE FUNCTION dbo.OrdersFor (@CustomerId int)\nRETURNS TABLE\nAS RETURN SELECT o.OrderId, o.OrderDate, o.Status, SUM(…) AS Total\n          FROM dbo.Orders AS o JOIN dbo.OrderItems AS i … GROUP BY …;' },
  { id: 'multi', label: 'Multi-statement', fn: 'dbo.StockReport', def: 'CREATE FUNCTION dbo.StockReport (@Below int)\nRETURNS @Report TABLE (ProductId int, Name nvarchar(60), Stock int, Advice nvarchar(20))\nAS BEGIN INSERT …; UPDATE …; RETURN; END;' }
];
const USES: { id: Use; label: string }[] = [
  { id: 'select', label: 'In the SELECT list' }, { id: 'from', label: 'In FROM' }, { id: 'apply', label: 'With CROSS APPLY' }, { id: 'exec', label: 'With EXEC' }
];
const SQL: Record<string, string> = {
  'scalar:select': 'SELECT Name, Price, dbo.PriceWithVat(Price) AS WithVat\nFROM dbo.Products\nWHERE CategoryId = 1;',
  'scalar:from': 'SELECT * FROM dbo.PriceWithVat(42.00);',
  'scalar:apply': 'SELECT p.Name, v.*\nFROM dbo.Products AS p\nCROSS APPLY dbo.PriceWithVat(p.Price) AS v;',
  'scalar:exec': 'DECLARE @v decimal(10,2);\nEXEC @v = dbo.PriceWithVat @Price = 42.00;\nSELECT @v AS WithVat;',
  'inline:select': 'SELECT dbo.OrdersFor(4);',
  'inline:from': 'SELECT * FROM dbo.OrdersFor(4);',
  'inline:apply': "SELECT c.FirstName, f.OrderId, f.Total\nFROM dbo.Customers AS c\nCROSS APPLY dbo.OrdersFor(c.CustomerId) AS f\nWHERE c.City = N'York';",
  'inline:exec': 'EXEC dbo.OrdersFor 4;',
  'multi:select': 'SELECT dbo.StockReport(30);',
  'multi:from': 'SELECT * FROM dbo.StockReport(30);',
  'multi:apply': 'SELECT c.Name AS Category, r.Name, r.Advice\nFROM dbo.Categories AS c\nCROSS APPLY dbo.StockReport(30) AS r\nWHERE c.CategoryId = 6;',
  'multi:exec': 'EXEC dbo.StockReport 30;'
};
const WHY: Record<string, string> = {
  'scalar:select': 'The normal use: one value per row. It works in WHERE and ORDER BY too.',
  'scalar:from': 'A scalar function returns a value, not a table, so FROM cannot find a table of that name (Msg 208).',
  'scalar:apply': 'APPLY needs a table on its right. For a calculation per row, put the scalar call in the SELECT list, or use CROSS APPLY (VALUES (…)).',
  'scalar:exec': 'A surprise: a scalar function can be run with EXEC, like a procedure, with the result caught in a variable. You will rarely need it.',
  'inline:select': 'A table-valued function returns rows and columns, which cannot fit in one cell of the SELECT list (Msg 4121).',
  'inline:from': 'The normal use: a view with a parameter. It is expanded into the query like a view.',
  'inline:apply': 'APPLY runs it once per outer row, with that row’s value. Customers without orders drop out; OUTER APPLY would keep them.',
  'inline:exec': 'EXEC is for procedures. A table-valued function must be used in FROM (Msg 2809).',
  'multi:select': 'Same rule as the inline kind: a table cannot go in the SELECT list (Msg 4121).',
  'multi:from': 'Works: the body runs, fills @Report, and the rows are returned.',
  'multi:apply': 'Works, but this one ignores the outer row (no column is passed in), so every category would get the same four rows (the WHERE keeps only Safety here). It is a cross join with extra cost.',
  'multi:exec': 'Same rule: EXEC is for procedures (Msg 2809).'
};

/** Where each kind of function can go: every cell is SQL Server’s real answer. */
@Component({
  selector: 'w-udf-kinds',
  standalone: true,
  imports: [SqlOutputComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where can each function go?</h3></div>
      <div class="tscroll">
        <table class="wtable matrix">
          <thead><tr><th scope="col"></th>@for (u of uses; track u.id) { <th scope="col">{{ u.label }}</th> }</tr></thead>
          <tbody>
            @for (k of kinds; track k.id) {
              <tr>
                <th scope="row">{{ k.label }}</th>
                @for (u of uses; track u.id) {
                  <td [class.ok]="works(k.id, u.id)" [class.no]="!works(k.id, u.id)">
                    <button type="button" class="cell" [class.sel]="kind() === k.id && use() === u.id" [attr.aria-pressed]="kind() === k.id && use() === u.id" (click)="kind.set(k.id); use.set(u.id)" [attr.aria-label]="k.label + ', ' + u.label + ': ' + (works(k.id, u.id) ? 'works' : 'error')">{{ works(k.id, u.id) ? '✓' : '✗' }}</button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      <pre class="def mono">{{ def() }}</pre>
      <pre class="sqlbox mono">{{ sqlText() }}</pre>
      <app-sql-output [text]="out()" label="Result" />
      <div class="w-msg" [class.ok]="works(kind(), use())" [class.err]="!works(kind(), use())" aria-live="polite"><span>{{ why() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .matrix th[scope='row'] { text-align: left; white-space: nowrap; }
    .matrix td { padding: 0; }
    .matrix td.ok { background: rgba(16, 185, 129, 0.12); }
    .matrix td.no { background: rgba(239, 68, 68, 0.07); }
    .cell { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 4px 0; cursor: pointer; font-weight: 800; text-align: center; }
    .matrix td.ok .cell { color: #059669; }
    .matrix td.no .cell { color: #dc2626; }
    .cell.sel { outline: 2px solid #8b5cf6; outline-offset: -2px; border-radius: 4px; background: rgba(139, 92, 246, 0.15); }
    .cell:focus-visible { outline: 2px solid var(--purple); outline-offset: -2px; }
    .def { font-size: 0.72rem; color: var(--text-muted); margin: 0.6rem 0 0.4rem; padding: 6px 10px; border-radius: 10px; border: 1px dashed var(--border-color); white-space: pre-wrap; overflow-wrap: anywhere; }
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0 0 0.5rem; white-space: pre; overflow-x: auto; }
  `]
})
export class UdfKindsWidget {
  readonly kinds = KINDS;
  readonly uses = USES;
  kind = signal<Kind>('inline');
  use = signal<Use>('apply');

  private key = computed(() => `${this.kind()}:${this.use()}`);
  works(k: Kind, u: Use) { return !/^Msg \d+/m.test(UDF_OUT[`${k}:${u}`]); }
  def = computed(() => KINDS.find(k => k.id === this.kind())!.def);
  sqlText = computed(() => SQL[this.key()]);
  out = computed(() => UDF_OUT[this.key()]);
  why = computed(() => WHY[this.key()]);
}
