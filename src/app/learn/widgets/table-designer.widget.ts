import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Choice { type: string; bytes: number; issue?: string }
interface ColDef { name: string; choices: Choice[]; good: number }

/** Each column offers a sensible type and some tempting mistakes. Bytes are the stored size (text: a typical value). */
const COLS: ColDef[] = [
  { name: 'SupplierId', good: 0, choices: [
    { type: 'int', bytes: 4 },
    { type: 'nvarchar(10)', bytes: 10, issue: 'Text ids sort wrongly (10 before 9) and cost more space. Use int.' }
  ] },
  { name: 'Name', good: 0, choices: [
    { type: 'nvarchar(60)', bytes: 32 },
    { type: 'varchar(60)', bytes: 16, issue: 'varchar silently changes letters outside its code page. Supplier names are typed by people: use nvarchar.' },
    { type: 'nvarchar(max)', bytes: 32, issue: 'nvarchar(max) cannot be an index key, and a supplier name never needs 2 GB. Give it a sensible limit.' }
  ] },
  { name: 'Phone', good: 0, choices: [
    { type: 'varchar(20)', bytes: 13 },
    { type: 'int', bytes: 4, issue: 'Phone numbers are not numbers: int drops the leading 0 of 01904 555 010 and cannot hold spaces or +44.' }
  ] },
  { name: 'CreditLimit', good: 0, choices: [
    { type: 'decimal(10,2)', bytes: 9 },
    { type: 'float', bytes: 8, issue: 'float is approximate: sums of money drift by fractions of a penny. Use decimal.' },
    { type: 'int', bytes: 4, issue: 'int cannot hold pence. Use decimal(10,2).' }
  ] },
  { name: 'Rating', good: 0, choices: [
    { type: 'tinyint', bytes: 1 },
    { type: 'int', bytes: 4 },
    { type: 'bigint', bytes: 8, issue: 'A 1-to-5 rating in 8 bytes: it works, but tinyint (1 byte) is plenty.' }
  ] },
  { name: 'CreatedAt', good: 0, choices: [
    { type: 'datetime2(0)', bytes: 6 },
    { type: 'nvarchar(20)', bytes: 38, issue: 'Dates stored as text sort as text, accept 2024-02-30, and need converting before any date maths. Use datetime2 or date.' },
    { type: 'datetime', bytes: 8 }
  ] }
];

/** Design dbo.Suppliers: pick types, NULL rules and a primary key, and see the CREATE TABLE script and its problems. */
@Component({
  selector: 'w-table-designer',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Design the Suppliers table</h3></div>
      <div class="tscroll">
        <table class="wtable design"><tbody>
          <tr><th>Column</th><th>Type</th><th>NULL allowed</th><th>Primary key</th></tr>
          @for (c of cols; track c.name; let i = $index) {
            <tr [class.warn]="!!issueOf(i)">
              <td class="mono name">{{ c.name }}</td>
              <td>
                <select class="mono" [value]="pick()[i]" (change)="setPick(i, +$any($event.target).value)" [attr.aria-label]="'Type of ' + c.name">
                  @for (t of c.choices; track t.type; let j = $index) { <option [value]="j">{{ t.type }}</option> }
                </select>
              </td>
              <td><input type="checkbox" [checked]="nulls()[i]" (change)="setNull(i)" [attr.aria-label]="c.name + ' allows NULL'" /></td>
              <td><input type="radio" name="pk" [checked]="pk() === i" (change)="pk.set(i)" [attr.aria-label]="c.name + ' is the primary key'" /></td>
            </tr>
          }
        </tbody></table>
      </div>
      <div class="w-controls opts">
        <label class="check"><input type="radio" name="pk" [checked]="pk() === -1" (change)="pk.set(-1)" /> No primary key</label>
        <label class="check"><input type="checkbox" [checked]="ident()" [disabled]="pk() !== 0" (change)="ident.set(!ident())" /> SupplierId is <span class="mono">IDENTITY</span></label>
      </div>
      <app-code [code]="sql()" title="CreateSuppliers.sql" [compact]="true" [copyable]="false" />
      <div class="w-msg" [class.ok]="!problems().length" [class.err]="!!problems().length" aria-live="polite">
        @if (problems().length) {
          <ul class="probs">@for (p of problems(); track p) { <li>{{ p }}</li> }</ul>
        } @else {
          <span>A solid design: sensible types, a primary key, and NULL only where a value may genuinely be unknown. A typical row takes about {{ bytes() }} bytes of data.</span>
        }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .design td, .design th { text-align: left; padding: 5px 8px; }
    .design td:nth-child(3), .design td:nth-child(4), .design th:nth-child(3), .design th:nth-child(4) { text-align: center; }
    .design tr.warn td { background: rgba(239, 68, 68, 0.08); }
    .design .name { font-weight: 700; }
    .design select { font-size: 0.8rem; padding: 3px 6px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); }
    .design input { accent-color: var(--purple); }
    .opts { margin-top: 0.75rem; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.86rem; cursor: pointer; }
    .check input { accent-color: var(--purple); }
    .probs { margin: 0; padding-left: 1.1rem; display: grid; gap: 4px; list-style: disc; }
  `]
})
export class TableDesignerWidget {
  readonly cols = COLS;
  pick = signal<number[]>([0, 1, 1, 1, 0, 1]);
  nulls = signal<boolean[]>([false, false, true, false, false, false]);
  pk = signal(-1);
  ident = signal(true);

  issueOf(i: number) { return COLS[i].choices[this.pick()[i]].issue ?? ''; }
  typeOf(i: number) { return COLS[i].choices[this.pick()[i]].type; }

  bytes = computed(() => COLS.reduce((s, c, i) => s + c.choices[this.pick()[i]].bytes, 0));

  sql = computed(() => {
    const pk = this.pk(), w = Math.max(...COLS.map(c => c.name.length));
    const lines = COLS.map((c, i) => {
      let line = `    ${c.name.padEnd(w)} ${this.typeOf(i).padEnd(13)} ${this.nulls()[i] ? 'NULL' : 'NOT NULL'}`;
      if (i === 0 && pk === 0 && this.ident()) line = line.replace(this.typeOf(0).padEnd(13), (this.typeOf(0) + ' IDENTITY').padEnd(13));
      if (i === pk) line += ' PRIMARY KEY';
      return line;
    });
    return `CREATE TABLE dbo.Suppliers (\n${lines.join(',\n')}\n);`;
  });

  problems = computed(() => {
    const out: string[] = [];
    const pk = this.pk();
    if (pk >= 0 && this.nulls()[pk]) out.push(`Msg 8111: Cannot define PRIMARY KEY constraint on nullable column in table 'Suppliers'. A key must always have a value.`);
    if (pk === 0 && this.ident() && this.pick()[0] !== 0) out.push(`Msg 2749: Identity column 'SupplierId' must be of data type int, bigint, smallint, tinyint, or decimal or numeric with a scale of 0, unencrypted, and constrained to be nonnullable.`);
    if (pk === -1) out.push('No primary key: nothing stops two identical suppliers, and other tables have nothing reliable to point at.');
    else if (pk !== 0) out.push(`${COLS[pk].name} as the primary key: keys should be short, unique and never change. ${COLS[pk].name} is none of those; SupplierId is.`);
    COLS.forEach((_, i) => { const m = this.issueOf(i); if (m) out.push(m); });
    if (this.nulls()[1]) out.push('Name allows NULL: a supplier with no name is almost certainly a mistake. Make it NOT NULL.');
    return out;
  });

  setPick(i: number, j: number) { this.pick.update(p => p.map((v, k) => (k === i ? j : v))); }
  setNull(i: number) { this.nulls.update(n => n.map((v, k) => (k === i ? !v : v))); }
}
