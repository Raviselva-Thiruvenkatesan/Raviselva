import { Component, computed, signal } from '@angular/core';

interface Trial { value: string; stored?: string; bytes?: string; error?: string; note: string }
interface TypeCase { type: string; group: string; size: string; range: string; trials: Trial[] }

const OVER = (t: string, v: string) => `Msg 220, Level 16: Arithmetic overflow error for data type ${t}, value = ${v}.`;
const TRUNC = 'Msg 2628, Level 16: String or binary data would be truncated in table \'BuildMart.dbo.T\', column \'Col\'. Truncated value: \'Plywood sh\'.';
const DATE_ERR = 'Msg 241, Level 16: Conversion failed when converting date and/or time from character string.';

/** Every result here was produced by SQL Server 2022 with INSERT INTO dbo.T (Col) VALUES (value). */
const TYPES: TypeCase[] = [
  { type: 'tinyint', group: 'Whole numbers', size: '1 byte', range: '0 to 255', trials: [
    { value: '200', stored: '200', bytes: '1', note: 'Fits: tinyint holds 0 to 255, handy for small codes and ages.' },
    { value: '300', error: OVER('tinyint', '300'), note: 'Too big. SQL Server refuses the row instead of wrapping round or clipping it.' },
    { value: '-1', error: OVER('tinyint', '-1'), note: 'tinyint has no negative numbers at all.' }
  ] },
  { type: 'int', group: 'Whole numbers', size: '4 bytes', range: '−2,147,483,648 to 2,147,483,647', trials: [
    { value: '2147483647', stored: '2147483647', bytes: '4', note: 'The largest int. The default choice for counts and ids.' },
    { value: '2147483648', error: 'Msg 8115, Level 16: Arithmetic overflow error converting expression to data type int.', note: 'One more is too many. Use bigint for values beyond about 2.1 billion.' },
    { value: '12.7', stored: '12', bytes: '4', note: 'No error, but the fraction is cut off, not rounded: 12.7 becomes 12. A silent loss to watch for.' },
    { value: '\'12\'', stored: '12', bytes: '4', note: 'Text that looks like a whole number is converted for you (an implicit conversion).' },
    { value: '\'12.5\'', error: 'Msg 245, Level 16: Conversion failed when converting the varchar value \'12.5\' to data type int.', note: 'Text with a decimal point cannot become an int, unlike the number 12.7 above.' }
  ] },
  { type: 'bigint', group: 'Whole numbers', size: '8 bytes', range: 'about ±9.2 × 10¹⁸', trials: [
    { value: '2147483648', stored: '2147483648', bytes: '8', note: 'Past the int limit, still tiny for bigint. Used for very large tables and counters.' }
  ] },
  { type: 'decimal(10,2)', group: 'Exact decimals', size: '9 bytes', range: '10 digits, 2 after the point: up to 99,999,999.99', trials: [
    { value: '18.5', stored: '18.50', bytes: '9', note: 'Stored exactly, always with 2 decimal places. This is the type for money and measurements.' },
    { value: '19.999', stored: '20.00', bytes: '9', note: 'Extra decimal places are rounded (not cut off) to fit the scale of 2.' },
    { value: '0.1 + 0.2', stored: '0.30', bytes: '9', note: 'decimal is exact: 0.1 + 0.2 is exactly 0.30.' },
    { value: '123456789.5', error: 'Msg 8115, Level 16: Arithmetic overflow error converting numeric to data type numeric.', note: 'Nine digits before the point, but (10,2) leaves room for only eight.' }
  ] },
  { type: 'float', group: 'Approximate numbers', size: '8 bytes', range: 'about ±1.8 × 10³⁰⁸, ~15 significant digits', trials: [
    { value: '0.1', stored: '0.1', bytes: '8', note: 'Shown as 0.1, but stored as the nearest binary fraction, 0.1000000000000000055… Fine for science and geometry, wrong for money.' },
    { value: 'CAST(0.1 AS float) + CAST(0.2 AS float)', stored: '0.30000000000000004', bytes: '8', note: 'The classic binary rounding error. SSMS may round it to 0.3 on screen, but comparing it with = 0.3 is false.' }
  ] },
  { type: 'varchar(10)', group: 'Text', size: '1 byte per character + 2', range: 'up to 10 characters, one code page', trials: [
    { value: '\'Sand\'', stored: 'Sand', bytes: '4', note: 'Variable length: only the 4 characters used are stored.' },
    { value: 'N\'Zoë\'', stored: 'Zoë', bytes: '3', note: 'ë exists in the server’s Latin code page, so it survives.' },
    { value: 'N\'Łódź\'', stored: 'Lódz', bytes: '4', note: 'Ł and ź are not in the code page, so SQL Server quietly swaps them for the nearest letters. No error, but the data has changed.' },
    { value: 'N\'日本\'', stored: '??', bytes: '2', note: 'No close match exists, so each character becomes a question mark.' },
    { value: '\'Plywood sheet 18 mm\'', error: TRUNC, note: 'Too long for 10 characters: the INSERT fails rather than cutting the text.' }
  ] },
  { type: 'nvarchar(10)', group: 'Text', size: '2 bytes per character + 2', range: 'up to 10 characters, any language', trials: [
    { value: 'N\'Łódź\'', stored: 'Łódź', bytes: '8', note: 'nvarchar stores Unicode, so every name survives. That is why BuildMart uses it for names.' },
    { value: 'N\'日本\'', stored: '日本', bytes: '4', note: 'Two characters, two bytes each.' },
    { value: 'N\'Plywood sheet 18 mm\'', error: TRUNC, note: 'The length limit counts characters, and 19 is more than 10.' }
  ] },
  { type: 'char(10)', group: 'Text', size: 'always 10 bytes', range: 'exactly 10 characters', trials: [
    { value: '\'Sand\'', stored: 'Sand······', bytes: '10', note: 'Fixed length: padded with spaces (shown as dots) to 10 characters. Good only for codes that are always the same length.' }
  ] },
  { type: 'date', group: 'Dates', size: '3 bytes', range: '0001-01-01 to 9999-12-31', trials: [
    { value: '\'2024-02-29\'', stored: '2024-02-29', bytes: '3', note: '2024 is a leap year, so 29 February is a real date.' },
    { value: '\'20241231\'', stored: '2024-12-31', bytes: '3', note: 'yyyymmdd with no separators is read the same way on every server, whatever its language settings.' },
    { value: '\'2024-02-30\'', error: DATE_ERR, note: 'There is no 30 February, so the value is rejected.' },
    { value: '\'31/12/2024\'', error: DATE_ERR, note: 'With US English settings SQL Server reads this as month 31. Write dates as \'yyyy-mm-dd\' or \'yyyymmdd\'.' }
  ] },
  { type: 'bit', group: 'Yes / no', size: '1 byte holds up to 8 bit columns', range: '0, 1 or NULL', trials: [
    { value: '1', stored: '1', bytes: '1', note: 'SQL Server has no boolean column type; bit is the usual stand-in.' },
    { value: '5', stored: '1', bytes: '1', note: 'Any number other than 0 becomes 1.' },
    { value: '\'true\'', stored: '1', bytes: '1', note: 'The strings \'true\' and \'false\' are accepted.' },
    { value: '\'yes\'', error: 'Msg 245, Level 16: Conversion failed when converting the varchar value \'yes\' to data type bit.', note: 'Other words are not.' }
  ] }
];

/** Try values against SQL Server column types and see what is stored, or the error you get. */
@Component({
  selector: 'w-type-fit',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Will it fit? Values meet column types</h3></div>
      <div class="w-controls" role="group" aria-label="Column type">
        @for (t of types; track t.type; let i = $index) {
          <button type="button" class="w-btn mono" [class.on]="ti() === i" [attr.aria-pressed]="ti() === i" (click)="pickType(i)">{{ t.type }}</button>
        }
      </div>
      <div class="w-grid two">
        <div>
          <div class="w-label">{{ cur().group }}: {{ cur().range }}</div>
          <p class="sql mono"><span class="kw">CREATE TABLE</span> dbo.T (Col <span class="ty">{{ cur().type }}</span>);<br><span class="kw">INSERT INTO</span> dbo.T (Col) <span class="kw">VALUES</span> (<span class="val">{{ trial().value }}</span>);</p>
          <div class="w-label">Value to insert</div>
          <div class="w-controls" role="group" aria-label="Value">
            @for (v of cur().trials; track v.value; let i = $index) {
              <button type="button" class="w-btn mono small" [class.on]="vi() === i" [attr.aria-pressed]="vi() === i" (click)="vi.set(i)">{{ v.value }}</button>
            }
          </div>
        </div>
        <div>
          @if (trial().error) {
            <div class="res bad" role="status"><i class="bi bi-x-octagon" aria-hidden="true"></i><span class="mono">{{ trial().error }}</span></div>
          } @else {
            <div class="res ok" role="status">
              <div><span class="w-label">Stored</span><span class="mono big">{{ trial().stored }}</span></div>
              @if (cur().group === 'Text') {
                <div><span class="w-label">DATALENGTH</span><span class="mono big">{{ trial().bytes }} {{ trial().bytes === '1' ? 'byte' : 'bytes' }}</span></div>
              }
            </div>
          }
          <p class="size">Storage for {{ cur().type }}: {{ cur().size }}.</p>
        </div>
      </div>
      <div class="w-msg" [class.err]="!!trial().error" [class.ok]="!trial().error" aria-live="polite"><span>{{ trial().note }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 9px; font-weight: 600; }
    .sql { font-size: 0.82rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; overflow-x: auto; white-space: nowrap; line-height: 1.7; }
    .sql .kw { color: #c792ea; }
    .sql .ty { color: #82aaff; }
    .sql .val { color: #c3e88d; }
    .res { border-radius: 12px; padding: 0.8rem 1rem; display: flex; gap: 1.2rem; flex-wrap: wrap; align-items: flex-start; }
    .res.ok { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.35); }
    .res.bad { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); font-size: 0.82rem; gap: 0.6rem; flex-wrap: nowrap; }
    .res.bad i { color: #ef4444; font-size: 1.1rem; }
    .res.bad .mono { overflow-wrap: anywhere; }
    .res .w-label { display: block; margin-bottom: 2px; }
    .big { font-size: 1.15rem; font-weight: 800; white-space: pre; }
    .size { font-size: 0.82rem; color: var(--text-muted); margin: 0.6rem 0 0; }
  `]
})
export class TypeFitWidget {
  readonly types = TYPES;
  ti = signal(1);
  vi = signal(2);

  cur = computed(() => TYPES[this.ti()]);
  trial = computed(() => this.cur().trials[Math.min(this.vi(), this.cur().trials.length - 1)]);

  pickType(i: number) { this.ti.set(i); this.vi.set(0); }
}
