import { Component, computed, signal } from '@angular/core';
import { TIP, TIP_SCAN } from './perf-data';

const fmt = (n: number) => n.toLocaleString('en-GB');

/**
 * SELECT * FROM dbo.Sales WHERE CustomerId <= @k, with an index on CustomerId only.
 * For each @k: the plan SQL Server chose, and the logical reads of a forced seek-with-lookups and of a forced scan.
 */
@Component({
  selector: 'w-lookup-tipping',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Seek and lookups, or scan?</h3></div>
      <pre class="sqlbox mono">SELECT * FROM dbo.Sales
WHERE CustomerId &lt;= {{ p().k }};   -- {{ fmt(p().rows) }} rows</pre>
      <label class="w-field wide">Customers included: {{ p().k }}
        <input type="range" min="0" [max]="last" [value]="i()" (input)="i.set(+$any($event.target).value)" aria-label="How many customers" />
      </label>

      <div class="bars">
        <div class="bar-row" [class.chosen]="p().plan === 'seek'">
          <span class="lab">Index seek + {{ fmt(p().rows) }} key lookups</span>
          <span class="track"><span class="fill seek" [style.width.%]="w(p().seekReads)"></span></span>
          <span class="val mono">{{ fmt(p().seekReads) }}</span>
        </div>
        <div class="bar-row" [class.chosen]="p().plan === 'scan'">
          <span class="lab">Clustered index scan</span>
          <span class="track"><span class="fill scan" [style.width.%]="w(scan)"></span></span>
          <span class="val mono">{{ fmt(scan) }}</span>
        </div>
      </div>
      <p class="cap">Logical reads measured on SQL Server for each plan. The highlighted row is the plan the optimizer chose.</p>
      <div class="w-msg" [class.ok]="good()" [class.err]="!good()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .sqlbox { font-size: 0.76rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0 0 0.6rem; white-space: pre; overflow-x: auto; }
    .wide { display: flex; width: 100%; }
    .bars { display: flex; flex-direction: column; gap: 6px; margin-top: 0.7rem; }
    .bar-row { display: grid; grid-template-columns: minmax(0, 13rem) minmax(0, 1fr) 4.5rem; gap: 8px; align-items: center; font-size: 0.8rem; padding: 5px 8px; border-radius: 8px; border: 1px solid transparent; }
    .bar-row.chosen { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.08); font-weight: 700; }
    @media (max-width: 560px) { .bar-row { grid-template-columns: 1fr 4.5rem; } .track { grid-column: 1 / -1; grid-row: 2; } }
    .track { height: 12px; border-radius: 6px; background: var(--bg-secondary); overflow: hidden; }
    .fill { display: block; height: 100%; border-radius: 6px; }
    .fill.seek { background: #f59e0b; }
    .fill.scan { background: #0ea5e9; }
    .val { text-align: right; }
    .cap { font-size: 0.74rem; color: var(--text-muted); margin: 0.4rem 0 0.6rem; }
  `]
})
export class LookupTippingWidget {
  readonly last = TIP.length - 1;
  readonly scan = TIP_SCAN;
  readonly fmt = fmt;
  i = signal(3);
  p = computed(() => TIP[this.i()]);
  private max = computed(() => Math.max(TIP_SCAN, this.p().seekReads));
  w(v: number) { return Math.max(1, v / this.max() * 100); }

  /** The chosen plan is the cheaper one when its reads are the lower of the two. */
  good = computed(() => { const p = this.p(); return (p.plan === 'seek') === (p.seekReads <= TIP_SCAN); });
  message = computed(() => {
    const p = this.p(), pct = (p.rows / 1000).toFixed(p.rows < 1000 ? 2 : 1);
    if (p.plan === 'seek') return `${fmt(p.rows)} rows (${pct}% of the table): seeking the index and looking up each row costs ${fmt(p.seekReads)} reads, far less than a scan, so the optimizer uses the index.`;
    if (p.seekReads > TIP_SCAN) return `${fmt(p.rows)} rows (${pct}%): the lookups alone would cost ${fmt(p.seekReads)} reads, more than reading the whole table once. The optimizer ignores the index and scans.`;
    return `${fmt(p.rows)} rows (${pct}%): the optimizer has already switched to a scan, although the lookups would still be a little cheaper. Its cost model treats random lookups as dearer than reading pages in order, so it tips early.`;
  });
}
