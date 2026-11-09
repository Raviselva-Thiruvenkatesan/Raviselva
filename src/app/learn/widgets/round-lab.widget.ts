import { Component, computed, signal } from '@angular/core';

interface Dec { p: number; s: number; int?: boolean }
const TYPES: { label: string; t: Dec }[] = [
  { label: 'int', t: { p: 10, s: 0, int: true } },
  { label: 'decimal(10,2)', t: { p: 10, s: 2 } },
  { label: 'decimal(5,2)', t: { p: 5, s: 2 } },
  { label: 'decimal(8,4)', t: { p: 8, s: 4 } },
  { label: 'decimal(18,4)', t: { p: 18, s: 4 } },
  { label: 'decimal(38,10)', t: { p: 38, s: 10 } }
];
const VALUES = ['2.5', '-2.5', '12.345', '18.675', '1234.5', '-2.7'];

/** Result precision and scale of decimal arithmetic, including SQL Server's reduction when precision passes 38. */
export function resultType(a: Dec, op: string, b: Dec): { p: number; s: number; int: boolean; capped: boolean } {
  if (a.int && b.int) return { p: 10, s: 0, int: true, capped: false };
  let p: number, s: number;
  const add = op === '+' || op === '-';
  if (add) { s = Math.max(a.s, b.s); p = Math.max(a.p - a.s, b.p - b.s) + s + 1; }
  else if (op === '*') { p = a.p + b.p + 1; s = a.s + b.s; }
  else { s = Math.max(6, a.s + b.p + 1); p = a.p - a.s + b.s + s; }
  if (p <= 38) return { p, s, int: false, capped: false };
  const integral = p - s;
  if (add) s = Math.max(0, 38 - Math.max(a.p - a.s, b.p - b.s));
  else if (integral < 32) s = Math.min(s, 38 - integral);
  else if (s > 6) s = 6;
  return { p: 38, s, int: false, capped: true };
}

/** Scaled-integer helpers so 2.5 and 18.675 round exactly, as decimal does. */
const scaleOf = (v: string) => (v.includes('.') ? v.split('.')[1].length : 0);
const toUnits = (v: string) => BigInt(v.replace('.', ''));
const pow = (n: number) => 10n ** BigInt(n);
function fmt(units: bigint, s: number): string {
  const neg = units < 0n, u = neg ? -units : units, str = u.toString().padStart(s + 1, '0');
  const body = s ? `${str.slice(0, -s)}.${str.slice(-s)}` : str;
  return (neg && u !== 0n ? '-' : '') + body;
}
/** Divide toward zero, or round half away from zero, by 10^k. */
function shift(units: bigint, k: number, mode: 'round' | 'trunc' | 'ceil' | 'floor'): bigint {
  if (k <= 0) return units;
  const d = pow(k), q = units / d, r = units % d;
  if (r === 0n) return q;
  if (mode === 'trunc') return q;
  if (mode === 'ceil') return units > 0n ? q + 1n : q;
  if (mode === 'floor') return units < 0n ? q - 1n : q;
  const twice = (r < 0n ? -r : r) * 2n;
  return twice >= d ? q + (units < 0n ? -1n : 1n) : q;
}

/** Rounding functions and the result type of decimal arithmetic. */
@Component({
  selector: 'w-round-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rounding, and what type a calculation returns</h3></div>
      <div class="w-controls" role="group" aria-label="View">
        <button type="button" class="w-btn" [class.on]="tab() === 'round'" [attr.aria-pressed]="tab() === 'round'" (click)="tab.set('round')">Rounding</button>
        <button type="button" class="w-btn" [class.on]="tab() === 'type'" [attr.aria-pressed]="tab() === 'type'" (click)="tab.set('type')">Result types</button>
      </div>
      @if (tab() === 'round') {
        <div class="w-controls" role="group" aria-label="Value">
          @for (v of values; track v) {
            <button type="button" class="w-btn mono" [class.on]="value() === v" [attr.aria-pressed]="value() === v" (click)="value.set(v)">{{ v }}</button>
          }
        </div>
        <label class="w-field len">length = {{ len() }}
          <input type="range" min="-2" max="3" [value]="len()" (input)="len.set(+$any($event.target).value)" />
        </label>
        <div class="tscroll">
          <table class="wtable mono rt"><tbody>
            <tr><th>Expression</th><th>Result</th></tr>
            @for (r of rows(); track r.e) { <tr [class.hl]="r.hl"><td>{{ r.e }}</td><td class="num">{{ r.v }}</td></tr> }
          </tbody></table>
        </div>
        <div class="w-msg info" aria-live="polite"><span>{{ roundNote() }}</span></div>
      } @else {
        <div class="w-controls">
          <label class="w-field">left
            <select class="mono" [value]="ai()" (change)="ai.set(+$any($event.target).value)">@for (t of types; track t.label; let i = $index) { <option [value]="i">{{ t.label }}</option> }</select>
          </label>
          <label class="w-field">operator
            <select class="mono" [value]="op()" (change)="op.set($any($event.target).value)">@for (o of ops; track o) { <option [value]="o">{{ o }}</option> }</select>
          </label>
          <label class="w-field">right
            <select class="mono" [value]="bi()" (change)="bi.set(+$any($event.target).value)">@for (t of types; track t.label; let i = $index) { <option [value]="i">{{ t.label }}</option> }</select>
          </label>
        </div>
        <div class="big mono">{{ types[ai()].label }} {{ op() }} {{ types[bi()].label }} <span class="arrow">→</span> <b>{{ resLabel() }}</b></div>
        <p class="rule mono">{{ ruleText() }}</p>
        <div class="w-msg info" aria-live="polite"><span>{{ typeNote() }}</span></div>
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .len { max-width: 260px; margin-bottom: 0.8rem; }
    .rt td, .rt th { text-align: left; padding: 5px 10px; }
    .rt td.num { text-align: right; font-weight: 700; }
    .rt tr.hl td { background: rgba(245, 158, 11, 0.18); }
    .big { font-size: 1rem; padding: 10px 12px; border-radius: 10px; background: var(--bg-main); border: 1px solid var(--border-color); overflow-x: auto; white-space: nowrap; }
    .big b { color: var(--purple); }
    .arrow { color: var(--text-muted); margin: 0 4px; }
    .rule { font-size: 0.8rem; color: var(--text-muted); margin: 0.6rem 0 0; overflow-wrap: anywhere; }
  `]
})
export class RoundLabWidget {
  readonly values = VALUES;
  readonly types = TYPES;
  readonly ops = ['+', '-', '*', '/'];
  tab = signal<'round' | 'type'>('round');
  value = signal('2.5');
  len = signal(0);
  ai = signal(1);
  op = signal('/');
  bi = signal(1);

  rows = computed(() => {
    const v = this.value(), s = scaleOf(v), u = toUnits(v), n = this.len();
    const k = s - n; // digits to drop
    const round = (mode: 'round' | 'trunc') => {
      if (k <= 0) return fmt(u, s);
      const kept = shift(u, k, mode) * pow(k);
      return fmt(kept, s);
    };
    const whole = (mode: 'ceil' | 'floor' | 'trunc') => fmt(shift(u, s, mode), 0);
    return [
      { e: `ROUND(${v}, ${n})`, v: round('round'), hl: true },
      { e: `ROUND(${v}, ${n}, 1)`, v: round('trunc'), hl: false },
      { e: `CEILING(${v})`, v: whole('ceil'), hl: false },
      { e: `FLOOR(${v})`, v: whole('floor'), hl: false },
      { e: `CAST(${v} AS int)`, v: whole('trunc'), hl: false }
    ];
  });

  roundNote = computed(() => {
    const v = this.value(), n = this.len();
    if (n < 0) return `A negative length rounds to the left of the point: ROUND(x, -2) rounds to hundreds. The scale of the value is kept, so the result still shows ${scaleOf(v)} decimal place${scaleOf(v) === 1 ? '' : 's'}.`;
    if (v.startsWith('-')) return 'Watch the negatives: CEILING goes up towards zero (-2), FLOOR goes down (-3), and CAST to int simply drops the fraction. ROUND rounds a half away from zero, so -2.5 becomes -3.';
    if (v === '2.5') return 'ROUND rounds a half away from zero: 2.5 becomes 3, not 2. (Some languages, including C#’s Math.Round, round halves to the even number by default.) The third argument 1 truncates instead.';
    return 'ROUND keeps the original number of decimal places and fills them with zeros: ROUND(12.345, 2) is 12.350, not 12.35. Cast to decimal(10,2) when the number of places matters.';
  });

  res = computed(() => resultType(TYPES[this.ai()].t, this.op(), TYPES[this.bi()].t));
  resLabel = computed(() => (this.res().int ? 'int' : `decimal(${this.res().p},${this.res().s})`));
  ruleText = computed(() => {
    const a = TYPES[this.ai()].t, b = TYPES[this.bi()].t, op = this.op();
    if (a.int && b.int) return 'int with int gives int: any fraction from / is dropped.';
    const nm = (t: Dec) => (t.int ? 'int = decimal(10,0)' : '');
    const pre = [nm(a), nm(b)].filter(Boolean)[0];
    const r = op === '*' ? 'p = p1 + p2 + 1, s = s1 + s2' : op === '/' ? 's = max(6, s1 + p2 + 1), p = p1 − s1 + s2 + s' : 's = max(s1, s2), p = max(p1 − s1, p2 − s2) + s + 1';
    return (pre ? pre + '; ' : '') + r + (this.res().capped ? '; then capped at precision 38' : '');
  });
  typeNote = computed(() => {
    const r = this.res(), op = this.op();
    if (r.int) return 'Both sides are int, so 7 / 2 is 3. Make one side decimal (7 / 2.0) to keep the fraction.';
    if (r.capped) return `The exact result would need more than 38 digits, the maximum, so SQL Server cuts the scale to ${r.s} decimal places to keep room for the whole-number part. Long chains of multiplication and division on wide decimals lose decimals this way.`;
    if (op === '/') return `Division gives at least 6 decimal places, here ${r.s}. That is why 10.00 / 3.00 shows 3.3333333333333 rather than 3.33. Round or cast the result to the scale you want to store.`;
    if (op === '*') return `Multiplying adds the scales: ${r.s} decimal places. A price times a VAT rate of 1.20 has 4 places until you round it.`;
    return `Adding or subtracting keeps the larger scale (${r.s}) and adds one digit of precision for a possible carry.`;
  });
}
