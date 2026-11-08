import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** Explore DateTime: properties, Add methods, TimeSpan differences and format strings. */
@Component({
  selector: 'w-date-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>DateTime explorer</h3></div>

      <div class="w-controls">
        <label class="w-field">Start date <input type="date" [ngModel]="startStr()" (ngModelChange)="setStart($event)"></label>
        <label class="w-field">Time <input type="time" [ngModel]="timeStr()" (ngModelChange)="setTime($event)"></label>
        <label class="w-field">AddDays( <span class="mono">{{ add() }}</span> )
          <input type="range" min="-60" max="400" [ngModel]="add()" (ngModelChange)="add.set(+$event)" aria-label="Days to add">
        </label>
      </div>

      <div class="w-grid two">
        <div>
          <div class="w-label">var d = new DateTime({{ y(start()) }}, {{ start().getMonth() + 1 }}, {{ start().getDate() }}, {{ start().getHours() }}, {{ start().getMinutes() }}, 0);</div>
          <table class="props">
            <tbody>
              @for (r of props(); track r[0]) { <tr><td class="mono">{{ r[0] }}</td><td class="mono">{{ r[1] }}</td></tr> }
            </tbody>
          </table>
        </div>
        <div>
          <div class="w-label">var later = d.AddDays({{ add() }});</div>
          <div class="later mono">{{ fmt(later(), 'dddd, d MMMM yyyy HH:mm') }}</div>
          <div class="w-label mt-2">TimeSpan span = later - d;</div>
          <table class="props">
            <tbody>
              <tr><td class="mono">span.Days</td><td class="mono">{{ add() }}</td></tr>
              <tr><td class="mono">span.TotalHours</td><td class="mono">{{ add() * 24 }}</td></tr>
              <tr><td class="mono">span.TotalMinutes</td><td class="mono">{{ add() * 1440 }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="w-label mt-3">d.ToString(format)</div>
      <div class="fmts">
        @for (f of formats; track f) {
          <div class="fmt"><code class="mono">"{{ f }}"</code><strong class="mono">{{ fmt(start(), f) }}</strong></div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .props { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
    .props td { padding: 4px 8px; border-bottom: 1px solid var(--border-color); }
    .props td:last-child { text-align: right; font-weight: 700; color: var(--purple); }
    .later { padding: 8px 10px; border-radius: 10px; border: 2px solid rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.08); font-weight: 700; font-size: 0.88rem; }
    .fmts { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
    .fmt { padding: 6px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); display: grid; }
    .fmt code { font-size: 0.75rem; color: var(--text-muted); }
    .fmt strong { color: var(--purple); font-size: 0.9rem; }
    .w-label { word-break: break-word; text-transform: none; letter-spacing: 0; font-family: 'Cascadia Code', Consolas, monospace; font-weight: 600; }
  `]
})
export class DateLabWidget {
  start = signal(new Date(2026, 10, 8, 9, 30));
  add = signal(30);
  formats = ['dd-MM-yyyy', 'yyyy-MM-dd', 'dd/MM/yy', 'd MMM yyyy', 'dddd', 'HH:mm', 'hh:mm tt', 'yyyy-MM-ddTHH:mm:ss'];

  startStr = computed(() => `${this.y(this.start())}-${p2(this.start().getMonth() + 1)}-${p2(this.start().getDate())}`);
  timeStr = computed(() => `${p2(this.start().getHours())}:${p2(this.start().getMinutes())}`);
  later = computed(() => {
    const d = new Date(this.start());
    d.setDate(d.getDate() + this.add());
    return d;
  });

  props = computed<[string, string][]>(() => {
    const d = this.start();
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startOfYear.getTime()) / 86400000) + 1;
    const leap = (yr: number) => (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
    return [
      ['d.Year', String(d.getFullYear())],
      ['d.Month', String(d.getMonth() + 1)],
      ['d.Day', String(d.getDate())],
      ['d.DayOfWeek', DAYS[d.getDay()]],
      ['d.DayOfYear', String(dayOfYear)],
      ['d.Hour', String(d.getHours())],
      ['DateTime.IsLeapYear(d.Year)', leap(d.getFullYear()) ? 'True' : 'False'],
      ['DateTime.DaysInMonth(...)', String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())]
    ];
  });

  y(d: Date) { return String(d.getFullYear()).padStart(4, '0'); }

  setStart(v: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '');
    if (!m) return;
    const d = new Date(this.start());
    d.setFullYear(+m[1], +m[2] - 1, +m[3]);
    this.start.set(d);
  }

  setTime(v: string) {
    const m = /^(\d{2}):(\d{2})/.exec(v ?? '');
    if (!m) return;
    const d = new Date(this.start());
    d.setHours(+m[1], +m[2]);
    this.start.set(d);
  }

  /** A small subset of .NET custom date format specifiers (invariant culture names). */
  fmt(d: Date, f: string): string {
    const tokens: Record<string, () => string> = {
      yyyy: () => this.y(d), yy: () => p2(d.getFullYear() % 100),
      MMMM: () => MONTHS[d.getMonth()], MMM: () => MONTHS[d.getMonth()].slice(0, 3), MM: () => p2(d.getMonth() + 1),
      dddd: () => DAYS[d.getDay()], dd: () => p2(d.getDate()), d: () => String(d.getDate()),
      HH: () => p2(d.getHours()), hh: () => p2(d.getHours() % 12 || 12), mm: () => p2(d.getMinutes()),
      ss: () => p2(d.getSeconds()), tt: () => (d.getHours() < 12 ? 'AM' : 'PM')
    };
    return f.replace(/yyyy|yy|MMMM|MMM|MM|dddd|dd|d|HH|hh|mm|ss|tt/g, t => tokens[t]());
  }
}
