import { Component, computed, signal } from '@angular/core';

/** Times are half-month steps through 2024: 0 = 1 Jan 2024, 1 = 15 Jan, … 24 = 1 Jan 2025. */
const END = 24;
const OPEN = 1e9;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (p: number) => p >= OPEN ? '9999-12-31' : p >= END ? '2025-01-01' : `2024-${String(Math.floor(p / 2) + 1).padStart(2, '0')}-${p % 2 ? '15' : '01'}`;
const nice = (p: number) => p >= END ? '1 Jan 2025' : `${p % 2 ? 15 : 1} ${MONTHS[Math.floor(p / 2)]}`;

/** The hammer’s price versions (the same edge rules were checked on SQL Server with a loaded history). */
const VERSIONS = [
  { price: '16.00', from: 0, to: 4 },
  { price: '17.50', from: 4, to: 10 },
  { price: '18.50', from: 10, to: 16 },
  { price: '19.00', from: 16, to: 20 },
  { price: '20.00', from: 20, to: OPEN }
];

type Clause = 'asof' | 'fromto' | 'between' | 'contained' | 'all';
const CLAUSES: { id: Clause; label: string }[] = [
  { id: 'asof', label: 'AS OF' }, { id: 'fromto', label: 'FROM … TO' }, { id: 'between', label: 'BETWEEN … AND' },
  { id: 'contained', label: 'CONTAINED IN' }, { id: 'all', label: 'ALL' }
];

/** Pick a FOR SYSTEM_TIME clause and its times, and see which row versions it returns. */
@Component({
  selector: 'w-temporal-timeline',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which versions does FOR SYSTEM_TIME return?</h3></div>
      <div class="w-controls" role="group" aria-label="Clause">
        @for (c of clauses; track c.id) {
          <button type="button" class="w-btn small" [class.on]="clause() === c.id" [attr.aria-pressed]="clause() === c.id" (click)="clause.set(c.id)">{{ c.label }}</button>
        }
      </div>
      <svg class="tl" viewBox="0 0 520 120" role="img" [attr.aria-label]="'Returned prices: ' + (hits().join(', ') || 'none')">
        @for (v of versions; track v.price; let i = $index) {
          <rect [attr.x]="x(v.from)" [attr.y]="14 + i * 15" [attr.width]="x(Math.min(v.to, END)) - x(v.from) + (v.to >= OPEN ? 14 : 0)" height="12" rx="3" class="ver" [class.hit]="match(v)" />
          <text [attr.x]="x(v.from) + 4" [attr.y]="24 + i * 15" class="vt" [class.hit]="match(v)">{{ v.price }}{{ v.to >= OPEN ? ' (current)' : '' }}</text>
        }
        @for (m of ticks; track m) {
          <line [attr.x1]="x(m)" [attr.x2]="x(m)" y1="96" y2="100" class="tick" />
          <text [attr.x]="x(m)" y="112" text-anchor="middle" class="tt">{{ m < END ? months[m / 2] : 'Jan' }}</text>
        }
        <line [attr.x1]="x(0)" [attr.x2]="x(END) + 14" y1="96" y2="96" class="axis" />
        @if (clause() === 'asof') {
          <line [attr.x1]="x(t())" [attr.x2]="x(t())" y1="6" y2="96" class="mark" />
        } @else if (clause() !== 'all') {
          <rect [attr.x]="x(a())" y="6" [attr.width]="x(b()) - x(a())" height="90" class="range" />
          <line [attr.x1]="x(a())" [attr.x2]="x(a())" y1="6" y2="96" class="mark" />
          <line [attr.x1]="x(b())" [attr.x2]="x(b())" y1="6" y2="96" class="mark" />
        }
      </svg>
      @if (clause() === 'asof') {
        <label class="w-field">t = {{ nice(t()) }}<input type="range" min="0" [max]="END" [value]="t()" (input)="t.set(+$any($event.target).value)" /></label>
      } @else if (clause() !== 'all') {
        <label class="w-field">start = {{ nice(a()) }}<input type="range" min="0" [max]="END - 1" [value]="a()" (input)="setA(+$any($event.target).value)" /></label>
        <label class="w-field">end = {{ nice(b()) }}<input type="range" min="1" [max]="END" [value]="b()" (input)="setB(+$any($event.target).value)" /></label>
      }
      <pre class="sqlbox mono">{{ sqlText() }}</pre>
      <div class="w-msg info" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .tl { width: 100%; display: block; margin: 0.4rem 0; }
    .ver { fill: var(--bg-secondary); stroke: var(--border-color); }
    .ver.hit { fill: rgba(139, 92, 246, 0.35); stroke: #8b5cf6; }
    .vt { font-size: 9px; font-weight: 700; fill: var(--text-muted); }
    .vt.hit { fill: var(--text-main); }
    .axis, .tick { stroke: var(--text-muted); stroke-width: 1; }
    .tt { font-size: 9px; fill: var(--text-muted); }
    .mark { stroke: #f59e0b; stroke-width: 2; }
    .range { fill: rgba(245, 158, 11, 0.12); }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; margin: 0.2rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .sqlbox { font-size: 0.72rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.5rem 0 0; white-space: pre; overflow-x: auto; }
  `]
})
export class TemporalTimelineWidget {
  readonly Math = Math;
  readonly END = END;
  readonly OPEN = OPEN;
  readonly versions = VERSIONS;
  readonly clauses = CLAUSES;
  readonly months = MONTHS;
  readonly ticks = Array.from({ length: 13 }, (_, i) => i * 2);
  readonly nice = nice;
  clause = signal<Clause>('asof');
  t = signal(4);
  a = signal(0);
  b = signal(4);

  x(p: number) { return 10 + p * 20; }
  setA(v: number) { this.a.set(v); if (this.b() <= v) this.b.set(v + 1); }
  setB(v: number) { this.b.set(v); if (this.a() >= v) this.a.set(v - 1); }

  match(v: { from: number; to: number }) {
    const t = this.t(), a = this.a(), b = this.b();
    switch (this.clause()) {
      case 'asof': return v.from <= t && v.to > t;
      case 'fromto': return v.from < b && v.to > a;
      case 'between': return v.from <= b && v.to > a;
      case 'contained': return v.from >= a && v.to <= b;
      default: return true;
    }
  }
  hits = computed(() => VERSIONS.filter(v => this.match(v)).map(v => v.price));

  sqlText = computed(() => {
    const t = `'${iso(this.t())}'`, a = `'${iso(this.a())}'`, b = `'${iso(this.b())}'`;
    const fst = { asof: `AS OF ${t}`, fromto: `FROM ${a} TO ${b}`, between: `BETWEEN ${a} AND ${b}`, contained: `CONTAINED IN (${a}, ${b})`, all: 'ALL' }[this.clause()];
    const rows = VERSIONS.filter(v => this.match(v)).map(v => `${v.price}  ${iso(v.from)}  ${iso(v.to)}`);
    return `SELECT Price, ValidFrom, ValidTo\nFROM dbo.PriceList FOR SYSTEM_TIME ${fst}\nWHERE ProductId = 1\nORDER BY ValidFrom;\n\n-- Price  ValidFrom   ValidTo\n` + (rows.length ? rows.map(r => '-- ' + r).join('\n') : '-- (no rows)');
  });

  note = computed(() => {
    const t = this.t(), a = this.a(), b = this.b();
    const startsAt = (p: number) => VERSIONS.find(v => v.from === p);
    switch (this.clause()) {
      case 'asof': return startsAt(t) && t > 0
        ? `At ${nice(t)} one version ends and the next begins. AS OF returns only the new one: ValidFrom <= t is true for it, and ValidTo > t is false for the old one.`
        : 'AS OF returns the one version that was current at that moment: ValidFrom <= t AND ValidTo > t. Move t onto a price change to see the edge rule.';
      case 'fromto': return startsAt(b)
        ? `A version starts exactly at the end of the range (${nice(b)}). FROM … TO leaves it out, because ValidFrom < end is false. Try BETWEEN.`
        : 'FROM … TO returns every version that was current at any moment inside the range. A version that only touches an edge is left out.';
      case 'between': return startsAt(b)
        ? `BETWEEN includes the version that starts exactly at the end (${nice(b)}): ValidFrom <= end. That is its only difference from FROM … TO.`
        : 'BETWEEN is FROM … TO with one change: a version that starts exactly at the end of the range is included as well.';
      case 'contained': return 'CONTAINED IN returns only versions that started and ended inside the range, so the current version (which has not ended) is never returned. Use it to ask what changed and was replaced within a period.';
      default: return 'ALL returns every version, current and historical: the row’s whole story.';
    }
  });
}
