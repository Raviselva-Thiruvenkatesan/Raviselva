import { Component, computed, signal } from '@angular/core';
import { SNIFF } from './perf-data';

type Fix = 'none' | 'recompile' | 'unknown' | 'cover';
const FIXES: { id: Fix; label: string; code: string }[] = [
  { id: 'none', label: 'No fix', code: 'WHERE CustomerId = @CustomerId;' },
  { id: 'recompile', label: 'OPTION (RECOMPILE)', code: 'WHERE CustomerId = @CustomerId\nOPTION (RECOMPILE);' },
  { id: 'unknown', label: 'OPTIMIZE FOR UNKNOWN', code: 'WHERE CustomerId = @CustomerId\nOPTION (OPTIMIZE FOR UNKNOWN);' },
  { id: 'cover', label: 'Covering index', code: 'WHERE CustomerId = @CustomerId;\n-- index: (CustomerId, SaleDate DESC)\n--        INCLUDE (Amount, Quantity)' }
];
const fmt = (n: number) => n.toLocaleString('en-GB');
/** Fewest reads each customer needs with the indexes in place (the recompile runs, where each call gets its own plan). */
const SNIFF_BEST: Record<number, number> = Object.fromEntries(SNIFF['recompile:small'].map(c => [c.cust, c.reads]));
/** The average number of sales per customer, which OPTIMIZE FOR UNKNOWN plans for. */
const SNIFF_AVG = Math.round(120000 / 5000);

/** dbo.CustomerSummary called for a small and a big customer, in either order, with each fix: real plans and reads. */
@Component({
  selector: 'w-param-sniff',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which call compiles the plan?</h3></div>
      <div class="w-controls" role="group" aria-label="First call">
        <span class="lab">First call</span>
        <button type="button" class="w-btn small" [class.on]="first() === 'small'" [attr.aria-pressed]="first() === 'small'" (click)="first.set('small')">Customer 3000 (20 sales)</button>
        <button type="button" class="w-btn small" [class.on]="first() === 'big'" [attr.aria-pressed]="first() === 'big'" (click)="first.set('big')">Customer 1 (20,020 sales)</button>
      </div>
      <div class="w-controls" role="group" aria-label="Fix">
        <span class="lab">Fix</span>
        @for (f of fixes; track f.id) {
          <button type="button" class="w-btn small" [class.on]="fix() === f.id" [attr.aria-pressed]="fix() === f.id" (click)="fix.set(f.id)">{{ f.label }}</button>
        }
      </div>
      <pre class="sqlbox mono">CREATE OR ALTER PROCEDURE dbo.CustomerSummary &#64;CustomerId int AS
SELECT COUNT(*), SUM(Quantity), SUM(Amount)
FROM dbo.Sales
{{ fixCode() }}</pre>
      <div class="calls">
        @for (c of run(); track $index; let k = $index) {
          <div class="call" [class.bad]="c.bad">
            <div class="ph">Call {{ k + 1 }}: customer {{ c.cust }} <span class="muted">({{ fmt(c.rows) }} rows)</span></div>
            <div class="tag">{{ c.compiled ? 'Compiled a new plan' : 'Reused the cached plan' }}</div>
            <div class="plan">{{ c.plan }}</div>
            <div class="reads"><span class="n">{{ fmt(c.reads) }}</span> logical reads</div>
          </div>
        }
      </div>
      <div class="w-msg" [class.ok]="!anyBad()" [class.err]="anyBad()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lab { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); min-width: 4.5em; }
    .sqlbox { font-size: 0.74rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.3rem 0 0.6rem; white-space: pre; overflow-x: auto; }
    .calls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.7rem; margin-bottom: 0.7rem; }
    @media (max-width: 560px) { .calls { grid-template-columns: 1fr; } }
    .call { border: 1px solid var(--border-color); border-left: 4px solid #10b981; border-radius: 10px; padding: 8px 10px; min-width: 0; }
    .call.bad { border-left-color: #ef4444; }
    .ph { font-size: 0.82rem; font-weight: 700; }
    .muted { color: var(--text-muted); font-weight: 500; }
    .tag { font-size: 0.72rem; color: var(--text-muted); margin: 2px 0 4px; }
    .plan { font-size: 0.78rem; font-family: 'Cascadia Code', Consolas, monospace; }
    .reads { margin-top: 4px; font-size: 0.8rem; }
    .reads .n { font-size: 1.2rem; font-weight: 800; }
  `]
})
export class ParamSniffWidget {
  readonly fixes = FIXES;
  readonly fmt = fmt;
  first = signal<'small' | 'big'>('small');
  fix = signal<Fix>('none');
  fixCode = computed(() => FIXES.find(f => f.id === this.fix())!.code);

  /** A call is "bad" when it reads well over what its own best plan would need. */
  run = computed(() => {
    const d = SNIFF[`${this.fix()}:${this.first()}`];
    return d.map(c => ({ ...c, bad: c.reads > 2 * SNIFF_BEST[c.cust] }));
  });
  anyBad = computed(() => this.run().some(c => c.bad));

  message = computed(() => {
    const f = this.fix(), [a, b] = this.run();
    if (f === 'recompile') return 'Each call compiles its own plan for its own value: a seek for the small customer, a scan for the big one. The price is a compile on every call.';
    if (f === 'cover') return 'With Quantity in the index there are no lookups. A seek is now the best plan for both customers, so it does not matter which call compiled it. Fix the plan, not the sniffing.';
    if (f === 'unknown') return `OPTIMIZE FOR UNKNOWN plans for an average customer (about ${fmt(SNIFF_AVG)} rows), whichever value comes first. The plan no longer changes with the first call, but it is a seek with lookups for everyone, and customer 1 pays ${fmt(Math.max(a.reads, b.reads))} reads for it.`;
    if (a.bad || b.bad) {
      const bad = a.bad ? a : b;
      return bad.plan.includes('Lookup')
        ? `The plan was compiled for customer ${a.cust} and reused for customer ${bad.cust}: ${fmt(bad.rows)} key lookups, ${fmt(bad.reads)} reads instead of a scan.`
        : `The plan was compiled for customer ${a.cust}, a scan, and reused for customer ${bad.cust}: ${fmt(bad.reads)} reads for ${fmt(bad.rows)} rows that a seek could find in a handful.`;
    }
    return 'Both calls got a reasonable plan.';
  });
}

