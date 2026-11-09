import { Component, computed, signal } from '@angular/core';

type Fn = 'LEN' | 'LEFT' | 'RIGHT' | 'SUBSTRING' | 'CHARINDEX' | 'REPLACE' | 'UPPER' | 'TRIM' | 'REVERSE';
const FNS: Fn[] = ['LEN', 'LEFT', 'RIGHT', 'SUBSTRING', 'CHARINDEX', 'REPLACE', 'UPPER', 'TRIM', 'REVERSE'];

const ci = (s: string) => s.toLowerCase();
/** T-SQL CHARINDEX under a case-insensitive collation: 1-based, 0 when not found. */
function charIndex(find: string, s: string, start = 1): number {
  if (!find) return 0;
  const i = ci(s).indexOf(ci(find), Math.max(0, start - 1));
  return i + 1;
}
/** REPLACE under a case-insensitive collation: matches ignore case, the replacement is inserted as typed. */
function replaceCi(s: string, find: string, by: string): string {
  if (!find) return s;
  let out = '', i = 0;
  const low = ci(s), f = ci(find);
  for (;;) {
    const j = low.indexOf(f, i);
    if (j < 0) return out + s.slice(i);
    out += s.slice(i, j) + by;
    i = j + find.length;
  }
}

/** String functions on a real product name: 1-based positions, with the characters each function uses highlighted. */
@Component({
  selector: 'w-sql-string',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>String functions, character by character</h3></div>
      <div class="w-controls">
        <label class="w-field grow">Text
          <input class="mono" [value]="text()" (input)="text.set($any($event.target).value)" maxlength="30" />
        </label>
      </div>
      <div class="w-controls" role="group" aria-label="Function">
        @for (f of fns; track f) {
          <button type="button" class="w-btn mono" [class.on]="fn() === f" [attr.aria-pressed]="fn() === f" (click)="fn.set(f)">{{ f }}</button>
        }
      </div>
      <div class="w-controls">
        @if (usesN()) {
          <label class="w-field">{{ fn() === 'SUBSTRING' ? 'start' : 'n' }} = {{ a() }}
            <input type="range" [min]="fn() === 'SUBSTRING' ? 0 : 1" [max]="text().length + 2" [value]="a()" (input)="a.set(+$any($event.target).value)" />
          </label>
        }
        @if (fn() === 'SUBSTRING') {
          <label class="w-field">length = {{ b() }}
            <input type="range" min="0" [max]="text().length + 2" [value]="b()" (input)="b.set(+$any($event.target).value)" />
          </label>
        }
        @if (fn() === 'CHARINDEX' || fn() === 'REPLACE') {
          <label class="w-field">find <input class="mono short" [value]="find()" (input)="find.set($any($event.target).value)" maxlength="10" /></label>
        }
        @if (fn() === 'REPLACE') {
          <label class="w-field">replace with <input class="mono short" [value]="by()" (input)="by.set($any($event.target).value)" maxlength="10" /></label>
        }
      </div>
      <div class="cells" role="img" [attr.aria-label]="'The characters of the text, with the ones ' + fn() + ' uses highlighted'">
        @for (ch of chars(); track $index; let i = $index) {
          <div class="cell" [class.on]="hit()[i]" [class.dim]="trail()[i]">
            <span class="ch mono">{{ ch === ' ' ? '·' : ch }}</span><span class="ix">{{ i + 1 }}</span>
          </div>
        }
      </div>
      <div class="expr mono"><span class="call">{{ call() }}</span> <span class="arrow">→</span> <span class="val">{{ result() }}</span></div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .grow { flex: 1; min-width: 200px; }
    .short { width: 7rem; }
    .cells { display: flex; flex-wrap: wrap; gap: 3px; margin: 0.4rem 0 0.8rem; }
    .cell { display: flex; flex-direction: column; align-items: center; width: 26px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-main); padding: 2px 0; transition: background 0.15s; }
    .cell.on { background: rgba(245, 158, 11, 0.3); border-color: #f59e0b; }
    .cell.dim { opacity: 0.5; border-style: dashed; }
    .ch { font-size: 0.95rem; font-weight: 700; line-height: 1.3; }
    .ix { font-size: 0.62rem; color: var(--text-muted); }
    .expr { font-size: 0.92rem; padding: 8px 10px; border-radius: 10px; background: #0b1020; color: #e2e8f0; overflow-x: auto; white-space: pre; }
    .expr .call { color: #ffcb6b; }
    .expr .arrow { color: #64748b; margin: 0 0.5em; }
    .expr .val { color: #c3e88d; font-weight: 700; }
  `]
})
export class SqlStringWidget {
  readonly fns = FNS;
  text = signal('Plywood sheet 18 mm');
  fn = signal<Fn>('SUBSTRING');
  a = signal(9);
  b = signal(5);
  find = signal('sheet');
  by = signal('board');

  chars = computed(() => [...this.text()]);
  usesN = computed(() => ['LEFT', 'RIGHT', 'SUBSTRING'].includes(this.fn()));
  /** Trailing spaces: LEN ignores them. */
  trail = computed(() => { const t = this.text(), end = t.replace(/ +$/, '').length; return this.chars().map((_, i) => i >= end); });

  hit = computed(() => {
    const t = this.text(), n = t.length, a = this.a(), b = this.b();
    const mark = (from: number, to: number) => this.chars().map((_, i) => i + 1 >= from && i + 1 <= to);
    switch (this.fn()) {
      case 'LEN': return mark(1, t.replace(/ +$/, '').length);
      case 'LEFT': return mark(1, a);
      case 'RIGHT': return mark(n - a + 1, n);
      case 'SUBSTRING': return mark(Math.max(1, a), a + b - 1);
      case 'CHARINDEX': { const p = charIndex(this.find(), t); return p ? mark(p, p + this.find().length - 1) : mark(0, -1); }
      case 'REPLACE': {
        const out = this.chars().map(() => false), low = ci(t), f = ci(this.find());
        if (!f) return out;
        for (let i = low.indexOf(f); i >= 0; i = low.indexOf(f, i + f.length)) for (let k = i; k < i + f.length; k++) out[k] = true;
        return out;
      }
      case 'TRIM': { const s = t.length - t.trimStart().length, e = t.trimEnd().length; return mark(s + 1, e); }
      default: return mark(1, n);
    }
  });

  q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  call = computed(() => {
    const s = this.q(this.text()), a = this.a(), b = this.b();
    switch (this.fn()) {
      case 'LEFT': case 'RIGHT': return `${this.fn()}(${s}, ${a})`;
      case 'SUBSTRING': return `SUBSTRING(${s}, ${a}, ${b})`;
      case 'CHARINDEX': return `CHARINDEX(${this.q(this.find())}, ${s})`;
      case 'REPLACE': return `REPLACE(${s}, ${this.q(this.find())}, ${this.q(this.by())})`;
      default: return `${this.fn()}(${s})`;
    }
  });

  result = computed(() => {
    const t = this.text(), n = t.length, a = this.a(), b = this.b();
    switch (this.fn()) {
      case 'LEN': return String(t.replace(/ +$/, '').length);
      case 'LEFT': return this.q(t.slice(0, a));
      case 'RIGHT': return this.q(t.slice(Math.max(0, n - a)));
      case 'SUBSTRING': { const from = Math.max(1, a), to = a + b - 1; return this.q(to < from ? '' : t.slice(from - 1, to)); }
      case 'CHARINDEX': return String(charIndex(this.find(), t));
      case 'REPLACE': return this.q(replaceCi(t, this.find(), this.by()));
      case 'UPPER': return this.q(t.toUpperCase());
      case 'TRIM': return this.q(t.trim());
      default: return this.q([...t].reverse().join(''));
    }
  });

  message = computed(() => {
    const t = this.text(), a = this.a(), b = this.b();
    switch (this.fn()) {
      case 'LEN': return t.endsWith(' ') ? 'LEN counts characters but ignores trailing spaces (the dashed boxes). DATALENGTH counts them, as bytes.' : 'LEN counts characters. Add spaces at the end of the text and see that LEN ignores them.';
      case 'LEFT': return a > t.length ? 'Asking for more characters than there are is fine: LEFT just returns the whole string.' : `LEFT takes the first ${a} characters.`;
      case 'RIGHT': return `RIGHT takes the last ${Math.min(a, t.length)} characters. Positions in T-SQL start at 1, not 0.`;
      case 'SUBSTRING': return a < 1
        ? `Start ${a} is before the first character. SUBSTRING still counts the positions before 1, so only ${Math.max(0, a + b - 1)} of the ${b} requested characters exist.`
        : `SUBSTRING(text, start, length): ${b} characters starting at position ${a}. Going past the end is not an error; you get what is there.`;
      case 'CHARINDEX': return charIndex(this.find(), t)
        ? `CHARINDEX returns the position where the first match starts, and ignores case under the usual collation. Combine it with LEFT or SUBSTRING to cut text at a character.`
        : 'Not found: CHARINDEX returns 0, not NULL or -1. Test with > 0.';
      case 'REPLACE': return 'REPLACE swaps every match, and under a case-insensitive collation it finds matches in any case.';
      case 'TRIM': return 'TRIM removes spaces from both ends (LTRIM and RTRIM do one end each). Type some spaces at the start or end to see it.';
      case 'UPPER': return 'UPPER and LOWER change case. Comparisons usually ignore case anyway, so these are mostly for display.';
      default: return 'REVERSE turns the string round. Rarely needed, but REVERSE plus CHARINDEX finds the last occurrence of a character.';
    }
  });
}
