import { Component, computed, signal } from '@angular/core';
import { SARG } from './perf-data';

interface Pair { id: string; label: string; bad: string; good: string; why: string }
const PAIRS: Pair[] = [
  { id: 'year', label: 'Year', bad: 'WHERE YEAR(SaleDate) = 2023', good: "WHERE SaleDate >= '2023-01-01'\n  AND SaleDate <  '2024-01-01'", why: 'YEAR() must be worked out for every row before it can be compared. The range compares the column as it is stored, so SQL Server seeks to the first day and stops after the last.' },
  { id: 'add', label: 'Date arithmetic', bad: "WHERE DATEADD(day, 30, SaleDate) >= '2024-12-01'", good: "WHERE SaleDate >= DATEADD(day, -30, '2024-12-01')", why: 'Moving the 30 days to the other side means the calculation is done once, on the constant, instead of once per row.' },
  { id: 'math', label: 'Arithmetic', bad: 'WHERE Amount * 1.2 > 96', good: 'WHERE Amount > 96 / 1.2', why: 'Same idea: divide the constant instead of multiplying every Amount.' },
  { id: 'left', label: 'Starts with', bad: "WHERE LEFT(Channel, 2) = 'Sh'", good: "WHERE Channel LIKE 'Sh%'", why: 'LIKE with a fixed start is a range in the index (from “Sh” to just before “Si”). LEFT() hides the column inside a function.' },
  { id: 'conv', label: 'Data type', bad: "WHERE Channel = N'Phone'", good: "WHERE Channel = 'Phone'", why: 'Channel is varchar. The N prefix makes the value nvarchar, which wins on data type precedence, so the column is converted (CONVERT_IMPLICIT) on every row.' },
  { id: 'str', label: 'Date as text', bad: "WHERE CONVERT(char(10), SaleDate, 23) = '2023-06-01'", good: "WHERE SaleDate = '2023-06-01'", why: 'Turning a date into text to compare it is a function on the column. Compare dates with dates.' }
];

const fmt = (n: number) => n.toLocaleString('en-GB');

/** Pairs of WHERE clauses that return the same rows: the real plan operator and logical reads for each. */
@Component({
  selector: 'w-sarg-check',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Same rows, different work</h3></div>
      <div class="w-controls" role="group" aria-label="Predicate">
        @for (p of pairs; track p.id) {
          <button type="button" class="w-btn small" [class.on]="pid() === p.id" [attr.aria-pressed]="pid() === p.id" (click)="pid.set(p.id)">{{ p.label }}</button>
        }
      </div>
      <div class="cols">
        @for (side of sides; track side) {
          <div class="col" [class.bad]="side === 'bad'" [class.good]="side === 'good'">
            <div class="ph">{{ side === 'bad' ? 'Not sargable' : 'Sargable' }}</div>
            <pre class="sqlbox mono">SELECT COUNT(*) FROM dbo.Sales
{{ side === 'bad' ? pair().bad : pair().good }};</pre>
            <div class="facts">
              <span class="op" [class.seek]="r(side).op.includes('Seek')">{{ r(side).op }}</span>
              <span class="mono muted">{{ r(side).index }}</span>
            </div>
            <div class="reads"><span class="n">{{ fmt(r(side).reads) }}</span> logical reads</div>
            <div class="muted small-t">{{ fmt(r(side).rows) }} rows counted</div>
            @if (r(side).warn) { <div class="warn"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i> {{ r(side).warn }}</div> }
          </div>
        }
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ pair().why }} {{ ratio() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.7rem; margin: 0.5rem 0 0.7rem; }
    @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
    .col { border: 1px solid var(--border-color); border-radius: 10px; padding: 8px; min-width: 0; border-top-width: 4px; }
    .col.bad { border-top-color: #ef4444; }
    .col.good { border-top-color: #10b981; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .sqlbox { font-size: 0.72rem; background: #0b1020; color: #e2e8f0; border-radius: 8px; padding: 6px 8px; margin: 0 0 0.5rem; white-space: pre; overflow-x: auto; }
    .facts { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; font-size: 0.78rem; }
    .op { font-weight: 800; color: #ef4444; }
    .op.seek { color: #059669; }
    .muted { color: var(--text-muted); }
    .reads { margin-top: 0.3rem; font-size: 0.8rem; }
    .reads .n { font-size: 1.25rem; font-weight: 800; }
    .small-t { font-size: 0.74rem; }
    .warn { margin-top: 0.3rem; font-size: 0.74rem; color: #b45309; }
  `]
})
export class SargCheckWidget {
  readonly pairs = PAIRS;
  readonly sides = ['bad', 'good'] as const;
  readonly fmt = fmt;
  pid = signal('year');
  pair = computed(() => PAIRS.find(p => p.id === this.pid())!);
  r(side: 'bad' | 'good') { return SARG[`${this.pid()}:${side}`]; }
  ratio = computed(() => {
    const b = this.r('bad').reads, g = this.r('good').reads;
    return g < b ? `Here the sargable version reads ${fmt(b - g)} fewer pages${b / g >= 2 ? `, about ${Math.round(b / g)} times less` : ''}.` : '';
  });
}
