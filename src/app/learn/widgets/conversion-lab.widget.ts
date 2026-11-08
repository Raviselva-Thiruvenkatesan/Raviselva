import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Row { code: string; ok: boolean; result: string; why: string }

const INT_MIN = -2147483648n;
const INT_MAX = 2147483647n;

/** Compare int.Parse / int.TryParse / Convert.ToInt32, and casting vs rounding a double. */
@Component({
  selector: 'w-conversion-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Conversion lab</h3></div>

      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="mode() === 'text'" (click)="mode.set('text')" [attr.aria-pressed]="mode() === 'text'">Text → int</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'num'" (click)="mode.set('num')" [attr.aria-pressed]="mode() === 'num'">double → int</button>
      </div>

      @if (mode() === 'text') {
        <p class="w-hint">Type what a user might enter. Try <span class="mono">42</span>, <span class="mono"> 7 </span>, <span class="mono">12.5</span>, <span class="mono">abc</span> or <span class="mono">99999999999</span>.</p>
        <div class="w-controls">
          <label class="w-field">string input =
            <input class="mono" size="16" [ngModel]="text()" (ngModelChange)="text.set($event)" spellcheck="false">
          </label>
          <div class="presets">
            @for (p of presets; track p) { <button type="button" class="w-btn mono" (click)="text.set(p)">"{{ p }}"</button> }
          </div>
        </div>
      } @else {
        <p class="w-hint">Move the slider. Watch how a cast <strong>cuts off</strong> the decimals, while Convert and Math.Round <strong>round</strong>.</p>
        <div class="w-controls">
          <label class="w-field">double d = <span class="mono big">{{ num() }}</span>
            <input type="range" min="-5" max="5" step="0.1" [ngModel]="num()" (ngModelChange)="num.set(+$event)" aria-label="Value of d">
          </label>
          <div class="presets">
            @for (p of numPresets; track p) { <button type="button" class="w-btn mono" (click)="num.set(p)">{{ p }}</button> }
          </div>
        </div>
      }

      <div class="rows" aria-live="polite">
        @for (r of rows(); track r.code) {
          <div class="row-item" [class.bad]="!r.ok">
            <code class="mono">{{ r.code }}</code>
            <span class="res mono" [class.w-ok]="r.ok" [class.w-err]="!r.ok">
              <i class="bi" [class.bi-check-circle]="r.ok" [class.bi-x-octagon]="!r.ok" aria-hidden="true"></i> {{ r.result }}</span>
            <small>{{ r.why }}</small>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .presets { display: flex; flex-wrap: wrap; gap: 6px; align-self: flex-end; }
    .presets .w-btn { padding: 4px 9px; font-size: 0.8rem; }
    .big { font-size: 1rem; color: var(--purple); }
    .rows { display: grid; gap: 8px; }
    .row-item {
      display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 4px 12px; align-items: center;
      padding: 0.6rem 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main);
    }
    .row-item.bad { border-color: rgba(239, 68, 68, 0.35); }
    .row-item code { font-size: 0.86rem; color: var(--text-main); word-break: break-all; }
    .res { font-weight: 700; font-size: 0.92rem; }
    .row-item small { grid-column: 1 / -1; color: var(--text-muted); font-size: 0.82rem; }
    @media (max-width: 560px) { .row-item { grid-template-columns: 1fr; } }
  `]
})
export class ConversionLabWidget {
  mode = signal<'text' | 'num'>('text');
  text = signal('42');
  num = signal(2.7);
  presets = ['42', ' 7 ', '12.5', 'abc', '', '99999999999'];
  numPresets = [2.7, -2.7, 2.5, 3.5];

  rows = computed<Row[]>(() => this.mode() === 'text' ? this.textRows(this.text()) : this.numRows(this.num()));

  private textRows(s: string): Row[] {
    const lit = JSON.stringify(s);
    const p = parseInt32(s);
    return [
      {
        code: `int.Parse(${lit})`,
        ok: p.ok, result: p.ok ? String(p.value) : p.error!,
        why: p.ok ? 'Works when the text is a valid whole number (spaces around it are allowed).' : p.error === 'FormatException'
          ? 'Throws: the text is not a whole number. An unhandled exception crashes the program.'
          : 'Throws: the number is too big or small for an int.'
      },
      {
        code: `int.TryParse(${lit}, out int n)`,
        ok: true, result: p.ok ? `true, n = ${p.value}` : 'false, n = 0',
        why: p.ok ? 'Returns true and puts the number in n.' : 'Never throws. Returns false so you can show a friendly message. Best choice for user input.'
      },
      {
        code: `Convert.ToInt32(${lit})`,
        ok: p.ok, result: p.ok ? String(p.value) : p.error!,
        why: p.ok ? 'Same as int.Parse for text (but returns 0 for null instead of throwing).' : 'Throws the same exceptions as int.Parse for bad text.'
      }
    ];
  }

  private numRows(d: number): Row[] {
    const show = (n: number) => (Object.is(n, -0) ? 0 : n).toString();
    return [
      { code: `(int)${d}`, ok: true, result: show(Math.trunc(d)), why: 'An explicit cast drops everything after the decimal point (towards zero). It does not round.' },
      { code: `Convert.ToInt32(${d})`, ok: true, result: show(roundHalfEven(d)), why: 'Rounds to the nearest whole number. Exactly .5 goes to the nearest EVEN number (2.5 → 2, 3.5 → 4).' },
      { code: `(int)Math.Round(${d}, MidpointRounding.AwayFromZero)`, ok: true, result: show(Math.sign(d) * Math.round(Math.abs(d))), why: 'The "school" rounding: .5 always rounds away from zero (2.5 → 3).' }
    ];
  }
}

function parseInt32(s: string): { ok: boolean; value?: number; error?: string } {
  const t = s.trim();
  if (!/^[+-]?\d+$/.test(t)) return { ok: false, error: 'FormatException' };
  const n = BigInt(t);
  if (n < INT_MIN || n > INT_MAX) return { ok: false, error: 'OverflowException' };
  return { ok: true, value: Number(n) };
}

function roundHalfEven(d: number): number {
  const f = Math.floor(d);
  const diff = d - f;
  const eps = 1e-9;
  if (Math.abs(diff - 0.5) < eps) return f % 2 === 0 ? f : f + 1;
  return Math.round(d);
}
