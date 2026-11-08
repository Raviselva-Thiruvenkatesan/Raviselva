import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

interface Fmt { spec: string; label: string; kind: 'num' | 'int' | 'pct' }

const FORMATS: Fmt[] = [
  { spec: 'F2', label: 'fixed, 2 decimals', kind: 'num' },
  { spec: 'N2', label: 'thousands separators', kind: 'num' },
  { spec: 'N0', label: 'separators, no decimals', kind: 'num' },
  { spec: 'E2', label: 'scientific', kind: 'num' },
  { spec: '0.000', label: 'custom pattern', kind: 'num' },
  { spec: '#,##0.0', label: 'custom with separator', kind: 'num' },
  { spec: 'P1', label: 'percent (×100)', kind: 'pct' },
  { spec: 'D6', label: 'zero-padded integer', kind: 'int' },
  { spec: 'X', label: 'hexadecimal', kind: 'int' }
];

/** Try .NET format strings, and compare + concatenation with StringBuilder. */
@Component({
  selector: 'w-format-lab',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Formatting and building strings</h3></div>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="tab() === 'fmt'" (click)="tab.set('fmt')" [attr.aria-pressed]="tab() === 'fmt'">Format strings</button>
        <button type="button" class="w-btn" [class.on]="tab() === 'sb'" (click)="tab.set('sb')" [attr.aria-pressed]="tab() === 'sb'">+ vs StringBuilder</button>
      </div>

      @if (tab() === 'fmt') {
        <div class="w-controls">
          <label class="w-field">double value =
            <input class="mono" type="number" step="any" style="width:9rem" [ngModel]="num()" (ngModelChange)="num.set(+$event || 0)">
          </label>
          <span class="small text-muted align-self-end">Results use CultureInfo.InvariantCulture.</span>
        </div>
        <div class="fmts">
          @for (f of formats; track f.spec) {
            <div class="fmt">
              <code class="mono">{{ codeFor(f) }}</code>
              <strong class="mono">"{{ apply(f) }}"</strong>
              <small>{{ f.label }}</small>
            </div>
          }
        </div>
        <div class="code mono">$"|{{ '{' }}name,-8{{ '}' }}|{{ '{' }}qty,5{{ '}' }}|"  →  "|{{ pad('Bolt', -8) }}|{{ pad('24', 5) }}|"  <span class="c">// alignment: - = left, + = right</span></div>
      } @else {
        <p class="w-hint">Strings can’t change, so <span class="mono">s += x</span> in a loop builds a brand-new string every time and copies everything so far. StringBuilder grows one buffer instead.</p>
        <label class="w-field w-100 mb-3">Loop iterations: <span class="mono big">{{ n() }}</span>
          <input type="range" min="10" max="10000" step="10" [ngModel]="n()" (ngModelChange)="n.set(+$event)" aria-label="Iterations">
        </label>
        <div class="cmp">
          <div class="side">
            <div class="mono small"><span class="k">string</span> s = ""; s += "item;";</div>
            <div class="bar-wrap"><div class="bar bad" [style.width.%]="100"></div></div>
            <div class="small"><strong>{{ n() | number }}</strong> string objects created<br><strong>{{ concatCopies() | number }}</strong> characters copied</div>
          </div>
          <div class="side">
            <div class="mono small"><span class="k">var</span> sb = <span class="k">new</span> StringBuilder(); sb.Append("item;");</div>
            <div class="bar-wrap"><div class="bar good" [style.width.%]="sbPct()"></div></div>
            <div class="small"><strong>{{ sbGrowths() }}</strong> extra chunks allocated (total capacity {{ sbCap() | number }})<br><strong>{{ sbCopies() | number }}</strong> characters copied (once on Append, once in ToString)</div>
          </div>
        </div>
        <div class="w-msg info"><i class="bi bi-speedometer2" aria-hidden="true"></i><span>StringBuilder copies about {{ ratio() }}× fewer characters here. The gap grows with every iteration, because + is O(n²) and StringBuilder is O(n).</span></div>
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .fmts { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); margin-bottom: 0.8rem; }
    .fmt { padding: 7px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); display: grid; gap: 1px; }
    .fmt code { font-size: 0.75rem; color: var(--text-muted); word-break: break-all; }
    .fmt strong { color: var(--purple); font-size: 0.95rem; word-break: break-all; }
    .fmt small { font-size: 0.7rem; color: var(--text-muted); }
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: pre; }
    .c { color: #64748b; } .k { color: #c792ea; }
    .big { color: var(--purple); }
    .cmp { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 640px) { .cmp { grid-template-columns: 1fr 1fr; } }
    .side { padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); display: grid; gap: 8px; }
    .side .mono { word-break: break-word; }
    .bar-wrap { height: 14px; border-radius: 999px; background: rgba(148, 163, 184, 0.15); overflow: hidden; }
    .bar { height: 100%; border-radius: inherit; transition: width 0.3s; min-width: 3px; }
    .bar.bad { background: #ef4444; }
    .bar.good { background: #10b981; }
  `]
})
export class FormatLabWidget {
  formats = FORMATS;
  tab = signal<'fmt' | 'sb'>('fmt');
  num = signal(1234567.891);
  n = signal(1000);

  private readonly piece = 5;   // "item;"

  codeFor(f: Fmt) {
    if (f.kind === 'int') return `${Math.trunc(this.num())}.ToString("${f.spec}")`;
    if (f.kind === 'pct') return `0.4567.ToString("${f.spec}")`;
    return `value.ToString("${f.spec}")`;
  }

  apply(f: Fmt): string {
    const v = this.num();
    const group = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fixed = (x: number, d: number) => {
      const neg = x < 0;
      const [i, frac] = Math.abs(x).toFixed(d).split('.');
      return { neg, i, frac };
    };
    switch (f.spec) {
      case 'F2': return v.toFixed(2);
      case 'N2': case 'N0': {
        const p = fixed(v, f.spec === 'N2' ? 2 : 0);
        return (p.neg ? '-' : '') + group(p.i) + (p.frac ? '.' + p.frac : '');
      }
      case 'E2': {
        const [m, e] = v.toExponential(2).split('e');
        const exp = parseInt(e, 10);
        return `${m}E${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(3, '0')}`;
      }
      case '0.000': return v.toFixed(3);
      case '#,##0.0': {
        const p = fixed(v, 1);
        return (p.neg ? '-' : '') + group(p.i) + '.' + p.frac;
      }
      case 'P1': return '45.7 %';
      case 'D6': {
        const i = Math.trunc(v);
        return (i < 0 ? '-' : '') + String(Math.abs(i)).padStart(6, '0');
      }
      case 'X': {
        const i = Math.trunc(v);
        return i < 0 ? (i >>> 0).toString(16).toUpperCase() : i.toString(16).toUpperCase();
      }
    }
    return '';
  }

  pad(s: string, w: number) {
    return w < 0 ? s.padEnd(-w) : s.padStart(w);
  }

  concatCopies = computed(() => this.piece * this.n() * (this.n() + 1) / 2);
  /** StringBuilder keeps a chain of chunks: growing adds a chunk (no copying); ToString copies once at the end. */
  private sb = computed(() => {
    let cap = 16, growths = 0;
    const len = this.piece * this.n();
    while (cap < len) { cap += Math.min(Math.max(cap, 16), 8000); growths++; }
    return { cap, copies: 2 * len, growths };
  });
  sbCopies = computed(() => this.sb().copies);
  sbGrowths = computed(() => this.sb().growths);
  sbCap = computed(() => this.sb().cap);
  sbPct = computed(() => Math.max(0.5, (100 * this.sbCopies()) / this.concatCopies()));
  ratio = computed(() => Math.round(this.concatCopies() / this.sbCopies()));
}
