import { Component, computed, input, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';
import { SqlGridComponent } from './sql-grid.component';
import { Cell } from './sql-data';

/** One statement to try, with what SQL Server 2022 really returned for it. */
export interface Scenario {
  label: string;
  sql: string;
  /** Result shown after a success (usually a SELECT of the changed table). */
  cols?: string[];
  rows?: Cell[][];
  rowClass?: string[];
  /** The error message when the statement fails. */
  error?: string;
  /** It succeeds, but does damage (shown amber, not green). */
  warn?: boolean;
  note: string;
}

/** Pick a statement, see the result or the exact error. Shared by the module 2 widgets. */
@Component({
  selector: 'app-scenario-lab',
  standalone: true,
  imports: [CodeViewComponent, SqlGridComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>{{ heading() }}</h3></div>
      @if (setup()) { <p class="w-hint">{{ setup() }}</p> }
      <div class="w-controls" role="group" [attr.aria-label]="heading()">
        @for (s of scenarios(); track s.label; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="pick() === i" [attr.aria-pressed]="pick() === i" (click)="pick.set(i)">
            <i class="bi" [class.bi-check-circle]="!s.error && !s.warn" [class.bi-exclamation-triangle]="s.warn" [class.bi-x-circle]="!!s.error"
               [class.w-ok]="!s.error && !s.warn" [class.warn]="s.warn" [class.w-err]="!!s.error" aria-hidden="true"></i>{{ s.label }}
          </button>
        }
      </div>
      <app-code [code]="cur().sql" title="Statement.sql" [compact]="true" [copyable]="false" />
      <div class="spacer"></div>
      @if (cur().error) {
        <div class="res bad" role="status"><i class="bi bi-x-octagon" aria-hidden="true"></i><span class="mono">{{ cur().error }}</span></div>
      } @else if (cur().cols) {
        <app-sql-grid [cols]="cur().cols!" [rows]="cur().rows ?? []" [rowClass]="cur().rowClass ?? []" label="Table after the statement" />
      }
      <div class="w-msg" [class.ok]="!cur().error && !cur().warn" [class.err]="!!cur().error" [class.amber]="cur().warn" aria-live="polite"><span>{{ cur().note }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .spacer { height: 0.75rem; }
    .warn { color: #d97706; }
    .w-msg.amber { background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.4); }
    .res { border-radius: 12px; padding: 0.8rem 1rem; display: flex; gap: 0.6rem; align-items: flex-start; }
    .res.bad { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.35); font-size: 0.82rem; }
    .res.bad i { color: #ef4444; font-size: 1.1rem; }
    .res.bad .mono { overflow-wrap: anywhere; white-space: pre-wrap; }
  `]
})
export class ScenarioLabComponent {
  heading = input.required<string>();
  setup = input('');
  scenarios = input.required<Scenario[]>();
  pick = signal(0);
  cur = computed(() => this.scenarios()[Math.min(this.pick(), this.scenarios().length - 1)]);
}
