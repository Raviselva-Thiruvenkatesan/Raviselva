import { Component, computed, input } from '@angular/core';
import { Cell } from './sql-data';

/** A results grid like the one in SSMS: row numbers, column headers, NULL shown in italics, numbers right-aligned. */
@Component({
  selector: 'app-sql-grid',
  standalone: true,
  template: `
    <div class="grid-wrap" [attr.aria-label]="label()" role="region" tabindex="0">
      <table class="sgrid">
        <thead><tr><th scope="col" class="rn"></th>@for (h of cols(); track $index) { <th scope="col" [class.num]="numeric()[$index]">{{ h }}</th> }</tr></thead>
        <tbody>
          @for (r of rows(); track $index; let i = $index) {
            <tr [class]="rowClass().at(i) ?? ''">
              <td class="rn">{{ i + 1 }}</td>
              @for (v of r; track $index) {
                <td [class.num]="numeric()[$index]" [class.null]="v === null">{{ v === null ? 'NULL' : v }}</td>
              }
            </tr>
          } @empty {
            <tr><td class="empty" [attr.colspan]="cols().length + 1">(0 rows)</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .grid-wrap { overflow-x: auto; max-width: 100%; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-main); }
    .grid-wrap:focus-visible { outline: 2px solid rgba(139, 92, 246, 0.45); outline-offset: 1px; }
    .sgrid { border-collapse: collapse; width: 100%; font-size: 0.8rem; font-family: 'Cascadia Code', Consolas, monospace; font-variant-ligatures: none; }
    th, td { padding: 3px 8px; border-bottom: 1px solid var(--border-color); text-align: left; white-space: nowrap; }
    th { color: var(--text-muted); font-weight: 700; background: var(--bg-secondary); position: sticky; top: 0; }
    .num { text-align: right; }
    .rn { color: var(--text-muted); width: 1%; text-align: right; background: var(--bg-secondary); font-size: 0.72rem; }
    .null { color: var(--text-muted); font-style: italic; }
    .empty { color: var(--text-muted); text-align: center; font-style: italic; }
    tbody tr:last-child td { border-bottom: 0; }
    tr.on td { background: rgba(16, 185, 129, 0.14); }
    tr.off td { opacity: 0.42; text-decoration: line-through; text-decoration-color: rgba(239, 68, 68, 0.6); }
    tr.off td.rn { text-decoration: none; }
    tr.tie td { background: rgba(245, 158, 11, 0.18); }
    tr.pick td { background: rgba(139, 92, 246, 0.14); }
  `]
})
export class SqlGridComponent {
  cols = input.required<string[]>();
  rows = input.required<Cell[][]>();
  /** Optional class per row: 'on' kept, 'off' filtered out, 'tie' tied sort key, 'pick' selected. */
  rowClass = input<string[]>([]);
  label = input('Query results');
  numeric = computed(() => this.cols().map((_, i) => this.rows().length > 0 && this.rows().every(r => r[i] === null || typeof r[i] === 'number' || /^-?\d+(\.\d+)?$/.test(String(r[i])))));
}
