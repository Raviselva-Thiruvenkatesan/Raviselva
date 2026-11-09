import { Component, computed, signal } from '@angular/core';

/** Every cell was produced by SQL Server 2022: TRY_CAST(input AS type), and CAST's error where TRY_CAST gave NULL. */
const TARGETS = ['int', 'decimal(10,2)', 'float', 'money', 'date', 'date, style 103'];
const CALL = (t: number, v: string) => (t === 5 ? `TRY_CONVERT(date, '${v}', 103)` : `TRY_CAST('${v}' AS ${TARGETS[t]})`);
const ERR: Record<string, string> = {
  int: 'Msg 245: Conversion failed when converting the varchar value \'{v}\' to data type int.',
  decimal: 'Msg 8114: Error converting data type varchar to numeric.',
  date: 'Msg 241: Conversion failed when converting date and/or time from character string.'
};
const ROWS: { v: string; r: (string | null)[]; why: string }[] = [
  { v: '42', r: ['42', '42.00', '42', '42.00', null, null], why: 'A clean whole number converts to every number type. No date can be made from it.' },
  { v: '42.5', r: [null, '42.50', '42.5', '42.50', null, null], why: 'Text with a decimal point cannot become an int, even though the number 42.5 can (it is cut to 42). Text conversions are stricter than number conversions.' },
  { v: ' 7 ', r: ['7', '7.00', '7', '7.00', null, null], why: 'Spaces around a number are ignored.' },
  { v: 'abc', r: [null, null, null, null, null, null], why: 'Not a number or a date in any type. TRY_CAST returns NULL instead of stopping the query.' },
  { v: '1e3', r: [null, null, '1000', null, null, null], why: 'Scientific notation is understood only by float.' },
  { v: '$12', r: [null, null, null, '12.00', null, null], why: 'Only money accepts a currency symbol.' },
  { v: '2024-02-29', r: [null, null, null, null, '2024-02-29', null], why: 'An ISO date converts to date. Style 103 expects dd/mm/yyyy, so the same text fails there.' },
  { v: '2024-02-30', r: [null, null, null, null, null, null], why: 'Looks like a date, but 30 February does not exist.' },
  { v: '31/12/2024', r: [null, null, null, null, null, '2024-12-31'], why: 'With US English settings a plain cast reads 31 as the month and fails. CONVERT with style 103 says the text is British dd/mm/yyyy.' },
  { v: '', r: ['0', null, '0', '0.00', '1900-01-01', '1900-01-01'], why: 'The trap: an empty string becomes 0 as an int or float, and 1 January 1900 as a date, with no error. Only decimal refuses it. Turn empty strings into NULL first with NULLIF(x, \'\').' }
];

/** A grid of real TRY_CAST results: which strings convert to which types, and what CAST would have raised. */
@Component({
  selector: 'w-convert-matrix',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>What converts to what?</h3></div>
      <p class="w-hint">Each cell is TRY_CAST(text AS type) on SQL Server 2022. NULL means the conversion failed. Click a cell.</p>
      <div class="tscroll">
        <table class="wtable mono cm"><tbody>
          <tr><th>text</th>@for (t of targets; track t) { <th>{{ t }}</th> }</tr>
          @for (row of rows; track row.v; let i = $index) {
            <tr>
              <th>'{{ row.v }}'</th>
              @for (c of row.r; track $index; let j = $index) {
                <td [class.ok]="c !== null" [class.no]="c === null" [class.sel]="i === ri() && j === ci()">
                  <button type="button" class="cellbtn" (click)="pick(i, j)" [attr.aria-label]="call(i, j) + ' gives ' + (c ?? 'NULL')">{{ c ?? 'NULL' }}</button>
                </td>
              }
            </tr>
          }
        </tbody></table>
      </div>
      <div class="expr mono">{{ call(ri(), ci()) }} <span class="arrow">→</span> <b>{{ cell() ?? 'NULL' }}</b></div>
      @if (cell() === null && castError()) {
        <div class="castErr mono"><span class="lbl">CAST instead of TRY_CAST:</span> {{ castError() }}</div>
      }
      <div class="w-msg info" aria-live="polite"><span>{{ rows[ri()].why }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cm th { white-space: nowrap; }
    .cm td { padding: 0; }
    .cm td.ok { background: rgba(16, 185, 129, 0.16); }
    .cm td.no { color: var(--text-muted); font-style: italic; }
    .cm td.sel { outline: 2px solid #f59e0b; outline-offset: -2px; }
    .cellbtn { all: unset; display: block; width: 100%; padding: 4px 6px; cursor: pointer; box-sizing: border-box; text-align: center; }
    .cellbtn:focus-visible { outline: 2px solid var(--purple); }
    .expr { margin-top: 0.75rem; font-size: 0.88rem; padding: 8px 10px; border-radius: 10px; background: #0b1020; color: #ffcb6b; overflow-x: auto; white-space: nowrap; }
    .expr b { color: #c3e88d; }
    .arrow { color: #64748b; margin: 0 0.5em; }
    .castErr { margin-top: 0.5rem; font-size: 0.8rem; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.08); overflow-wrap: anywhere; }
    .castErr .lbl { font-family: inherit; font-weight: 700; }
  `]
})
export class ConvertMatrixWidget {
  readonly targets = TARGETS;
  readonly rows = ROWS;
  ri = signal(9);
  ci = signal(4);

  cell = computed(() => ROWS[this.ri()].r[this.ci()]);
  call(i: number, j: number) { return CALL(j, ROWS[i].v); }
  castError = computed(() => {
    const t = this.ci(), v = ROWS[this.ri()].v;
    const key = t === 0 ? 'int' : t === 1 ? 'decimal' : t === 4 ? 'date' : '';
    return key ? ERR[key].replace('{v}', v) : '';
  });
  pick(i: number, j: number) { this.ri.set(i); this.ci.set(j); }
}
