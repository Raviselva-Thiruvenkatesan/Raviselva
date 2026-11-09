import { Component, computed, signal } from '@angular/core';

type Part = 'year' | 'quarter' | 'month' | 'week' | 'day';
const PARTS: Part[] = ['year', 'quarter', 'month', 'week', 'day'];
const PRESETS: { a: string; b: string; part: Part }[] = [
  { a: '2023-12-31', b: '2024-01-01', part: 'year' },
  { a: '2024-01-01', b: '2024-12-31', part: 'year' },
  { a: '2024-01-31', b: '2024-02-01', part: 'month' },
  { a: '2024-06-08', b: '2024-06-09', part: 'week' },
  { a: '2024-03-30', b: '2024-04-02', part: 'day' }
];
const DAY = 86400000;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Start of the period that contains t. Weeks start on Sunday for DATEDIFF, whatever SET DATEFIRST says. */
function startOf(t: number, part: Part): number {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth();
  switch (part) {
    case 'year': return Date.UTC(y, 0, 1);
    case 'quarter': return Date.UTC(y, m - (m % 3), 1);
    case 'month': return Date.UTC(y, m, 1);
    case 'week': return t - d.getUTCDay() * DAY;
    default: return t;
  }
}
function nextStart(t: number, part: Part): number {
  const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth();
  switch (part) {
    case 'year': return Date.UTC(y + 1, 0, 1);
    case 'quarter': return Date.UTC(y, m + 3, 1);
    case 'month': return Date.UTC(y, m + 1, 1);
    case 'week': return t + 7 * DAY;
    default: return t + DAY;
  }
}
/** DATEDIFF counts the period boundaries crossed between the two dates (verified against SQL Server 2022). */
export function boundaries(a: number, b: number, part: Part): number[] {
  const lo = Math.min(a, b), hi = Math.max(a, b), out: number[] = [];
  for (let t = nextStart(startOf(lo, part), part); t <= hi && out.length < 400; t = nextStart(t, part)) out.push(t);
  return out;
}

/** Two dates on a timeline, with every year/month/week/day boundary between them marked: DATEDIFF counts those marks. */
@Component({
  selector: 'w-datediff-line',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>DATEDIFF counts boundaries</h3></div>
      <div class="w-controls" role="group" aria-label="Examples">
        @for (p of presets; track $index; let i = $index) {
          <button type="button" class="w-btn mono small" (click)="load(i)">{{ p.part }}: {{ p.a }} → {{ p.b }}</button>
        }
      </div>
      <div class="w-controls">
        <label class="w-field">start date <input type="date" [value]="a()" (change)="setA($any($event.target).value)" /></label>
        <label class="w-field">end date <input type="date" [value]="b()" (change)="setB($any($event.target).value)" /></label>
        <label class="w-field">datepart
          <select class="mono" [value]="part()" (change)="part.set($any($event.target).value)">@for (p of parts; track p) { <option [value]="p">{{ p }}</option> }</select>
        </label>
      </div>
      <svg [attr.viewBox]="'0 0 ' + W + ' 92'" class="line" role="img" [attr.aria-label]="message()">
        <line [attr.x1]="X0" y1="46" [attr.x2]="W - X0" y2="46" class="axis" />
        <rect [attr.x]="xa()" y="38" [attr.width]="xb() - xa()" height="16" rx="4" class="span" />
        @if (ticks().length <= 60) {
          @for (t of ticks(); track t) {
            <line [attr.x1]="x(t)" y1="30" [attr.x2]="x(t)" y2="62" class="tick" />
            @if (ticks().length <= 8) { <text [attr.x]="x(t)" y="76" class="tl">{{ label(t) }}</text> }
          }
        }
        <circle [attr.cx]="xa()" cy="46" r="6" class="pt" /><text [attr.x]="xa()" y="20" class="dl">{{ lo() }}</text>
        <circle [attr.cx]="xb()" cy="46" r="6" class="pt" /><text [attr.x]="xb()" y="20" class="dl">{{ hi() }}</text>
      </svg>
      <div class="expr mono">DATEDIFF({{ part() }}, '{{ a() }}', '{{ b() }}') <span class="arrow">→</span> <b>{{ result() }}</b></div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 4px 9px; font-weight: 600; }
    .line { width: 100%; display: block; margin: 0.4rem 0 0.6rem; }
    .axis { stroke: var(--border-color); stroke-width: 2; }
    .span { fill: rgba(139, 92, 246, 0.18); stroke: #8b5cf6; stroke-width: 1; }
    .tick { stroke: #f59e0b; stroke-width: 2.5; }
    .tl { font-size: 9px; font-weight: 700; fill: #d97706; text-anchor: middle; }
    .pt { fill: #10b981; stroke: var(--bg-main); stroke-width: 2; }
    .dl { font-size: 10px; font-weight: 700; fill: var(--text-main); text-anchor: middle; font-family: 'Cascadia Code', Consolas, monospace; }
    .expr { font-size: 0.9rem; padding: 8px 10px; border-radius: 10px; background: #0b1020; color: #ffcb6b; overflow-x: auto; white-space: nowrap; }
    .expr b { color: #c3e88d; }
    .arrow { color: #64748b; margin: 0 0.5em; }
  `]
})
export class DatediffLineWidget {
  readonly parts = PARTS;
  readonly presets = PRESETS;
  readonly W = 600;
  readonly X0 = 40;
  a = signal('2023-12-31');
  b = signal('2024-01-01');
  part = signal<Part>('year');

  ta = computed(() => parse(this.a()));
  tb = computed(() => parse(this.b()));
  lo = computed(() => iso(Math.min(this.ta(), this.tb())));
  hi = computed(() => iso(Math.max(this.ta(), this.tb())));
  ticks = computed(() => boundaries(this.ta(), this.tb(), this.part()));
  result = computed(() => (this.tb() >= this.ta() ? 1 : -1) * this.ticks().length);
  days = computed(() => Math.round(Math.abs(this.tb() - this.ta()) / DAY));

  /** Pad the view by one period on each side so the boundaries near the ends are visible. */
  view = computed(() => {
    const pad = Math.max(DAY, (Math.max(this.ta(), this.tb()) - Math.min(this.ta(), this.tb())) * 0.15, 2 * DAY);
    return [Math.min(this.ta(), this.tb()) - pad, Math.max(this.ta(), this.tb()) + pad];
  });
  x(t: number) { const [l, h] = this.view(); return this.X0 + ((t - l) / (h - l)) * (this.W - 2 * this.X0); }
  xa = computed(() => this.x(Math.min(this.ta(), this.tb())));
  xb = computed(() => this.x(Math.max(this.ta(), this.tb())));
  label(t: number) {
    const s = iso(t), p = this.part();
    return p === 'year' ? s.slice(0, 4) : p === 'day' || p === 'week' ? s.slice(5) : s.slice(0, 7);
  }

  message = computed(() => {
    const n = Math.abs(this.result()), d = this.days(), p = this.part();
    const many = this.ticks().length > 60 ? ' (too many to draw)' : '';
    if (p === 'year' && n === 1 && d <= 1) return 'One day apart, yet DATEDIFF(year) is 1: the dates are on either side of 1 January. DATEDIFF counts boundaries crossed, not whole years. To get someone’s age, you have to check whether the birthday has happened yet this year.';
    if (p === 'year' && n === 0 && d > 300) return `${d} days apart, almost a full year, yet DATEDIFF(year) is 0: no 1 January lies between them.`;
    if (p === 'week') return `Week boundaries fall on Sundays for DATEDIFF, whatever SET DATEFIRST says. ${n} Sunday${n === 1 ? '' : 's'} crossed${many}.`;
    if (p === 'day') return `${n} midnight${n === 1 ? '' : 's'} crossed${many}: for whole days, DATEDIFF(day) is the count you expect.`;
    return `${n} ${p} boundar${n === 1 ? 'y' : 'ies'} crossed${many} in ${d} day${d === 1 ? '' : 's'}. The amber marks are the starts of each ${p}; DATEDIFF counts them and ignores how far into the period each date is.`;
  });

  load(i: number) { const p = PRESETS[i]; this.a.set(p.a); this.b.set(p.b); this.part.set(p.part); }
  setA(v: string) { if (v) this.a.set(v); }
  setB(v: string) { if (v) this.b.set(v); }
}
