import { Component, computed, signal } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell, PRODUCTS, Product } from './sql-data';

interface When { id: string; sql: string; label: string; test: (p: Product) => boolean }
const WHENS: When[] = [
  { id: 'out', sql: 'WHEN Stock = 0', label: 'Out of stock', test: p => p.Stock === 0 },
  { id: 'low', sql: 'WHEN Stock < 20', label: 'Low', test: p => p.Stock < 20 },
  { id: 'ok', sql: 'WHEN Stock < 100', label: 'OK', test: p => p.Stock < 100 }
];

/** A searched CASE: WHENs are tried top to bottom and the first true one wins. Reorder them and drop the ELSE. */
@Component({
  selector: 'w-case-flow',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>CASE: the first true WHEN wins</h3></div>
      <div class="caseb mono" role="group" aria-label="The CASE expression">
        <div class="kw">CASE</div>
        @for (w of order(); track w.id; let i = $index; let last = $last) {
          <div class="when" [class.dead]="hits()[i] === 0">
            <span class="txt">&nbsp;&nbsp;{{ w.sql }} THEN <span class="str">N'{{ w.label }}'</span></span>
            <span class="count">{{ hits()[i] }} row{{ hits()[i] === 1 ? '' : 's' }}</span>
            <span class="mv">
              <button type="button" class="w-btn tiny" [disabled]="i === 0" (click)="move(i, -1)" [attr.aria-label]="'Move ' + w.sql + ' up'"><i class="bi bi-arrow-up" aria-hidden="true"></i></button>
              <button type="button" class="w-btn tiny" [disabled]="last" (click)="move(i, 1)" [attr.aria-label]="'Move ' + w.sql + ' down'"><i class="bi bi-arrow-down" aria-hidden="true"></i></button>
            </span>
          </div>
        }
        <div class="when" [class.off]="!useElse()">
          <span class="txt">&nbsp;&nbsp;@if (useElse()) {ELSE <span class="str">N'Plenty'</span>} @else {<s>ELSE N'Plenty'</s>}</span>
          <span class="count">{{ elseHits() }} row{{ elseHits() === 1 ? '' : 's' }}</span>
          <span class="mv"><label class="check"><input type="checkbox" [checked]="useElse()" (change)="useElse.set(!useElse())" /> ELSE</label></span>
        </div>
        <div class="kw">END AS StockLevel</div>
      </div>
      <app-sql-grid [cols]="['Name', 'Stock', 'StockLevel', 'Matched by']" [rows]="rows()" label="Products with their CASE result" />
      <div class="w-msg" [class.info]="!problem()" [class.err]="!!problem()" aria-live="polite"><span>{{ problem() || message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .caseb { font-size: 0.84rem; background: #0b1020; color: #e2e8f0; border-radius: 12px; padding: 8px 10px; margin-bottom: 0.8rem; overflow-x: auto; }
    .kw { color: #c792ea; padding: 2px 0; }
    .when { display: flex; align-items: center; gap: 10px; padding: 2px 0; border-radius: 6px; min-width: max-content; }
    .when .txt { flex: 1; white-space: pre; }
    .when.dead .txt { opacity: 0.45; text-decoration: line-through; text-decoration-color: #ef4444; }
    .when.off .txt { opacity: 0.45; }
    .str { color: #c3e88d; }
    .count { color: #fbbf24; font-size: 0.76rem; min-width: 4.2rem; text-align: right; }
    .mv { display: inline-flex; gap: 4px; min-width: 4.6rem; }
    .tiny { padding: 2px 7px; font-size: 0.72rem; background: #111833; color: #e2e8f0; border-color: #334155; }
    .check { display: inline-flex; gap: 4px; align-items: center; font-size: 0.74rem; color: #94a3b8; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
  `]
})
export class CaseFlowWidget {
  order = signal<When[]>([...WHENS]);
  useElse = signal(true);

  /** Index of the WHEN that matched each product, or -1 for ELSE / no match. */
  matched = computed(() => PRODUCTS.map(p => this.order().findIndex(w => w.test(p))));
  hits = computed(() => this.order().map((_, i) => this.matched().filter(m => m === i).length));
  elseHits = computed(() => this.matched().filter(m => m === -1).length);

  rows = computed<Cell[][]>(() => PRODUCTS.map((p, k) => {
    const m = this.matched()[k];
    const label = m >= 0 ? this.order()[m].label : this.useElse() ? 'Plenty' : null;
    return [p.Name, p.Stock, label, m >= 0 ? this.order()[m].sql : this.useElse() ? 'ELSE' : '(nothing)'];
  }));

  problem = computed(() => {
    const dead = this.order().filter((_, i) => i > 0 && this.hits()[i] === 0);
    if (dead.length) return `${dead.map(d => d.sql).join(' and ')} can no longer match: an earlier WHEN already catches every row it would. Put the narrowest conditions first.`;
    if (!this.useElse() && this.elseHits() > 0) return `Without ELSE, the ${this.elseHits()} rows that match no WHEN get NULL. If that is not what you want, always write an ELSE.`;
    return '';
  });
  message = computed(() => 'SQL Server tries each WHEN from the top and stops at the first one that is true, so “Stock < 100” only sees rows that were not already caught. Move the WHENs to see the order matter. ');

  move(i: number, d: number) {
    const o = [...this.order()];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    this.order.set(o);
  }
}
