import { Component, computed, signal } from '@angular/core';

type Way = 'loop' | 'include' | 'project';
const WAYS: { id: Way; label: string; code: string }[] = [
  { id: 'loop', label: 'Query in a loop', code: 'foreach (var o in orders)\n    await db.OrderItems.CountAsync(i => i.OrderId == o.OrderId);' },
  { id: 'include', label: 'Include', code: 'await db.Orders.Include(o => o.Items).ToListAsync();' },
  { id: 'project', label: 'Projection', code: 'await db.Orders.Select(o => new { o.OrderId, Lines = o.Items.Count }).ToListAsync();' }
];
const SIZES = [10, 100, 1000, 10000];
const NETS: { label: string; ms: number }[] = [
  { label: 'Same machine (0.1 ms)', ms: 0.1 },
  { label: 'Same data centre (0.5 ms)', ms: 0.5 },
  { label: 'Across the country (15 ms)', ms: 15 }
];

/** How the number of round trips grows with the number of orders; network time only (commands × latency). */
@Component({
  selector: 'w-round-trips',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Counting round trips</h3></div>
      <div class="w-controls" role="group" aria-label="How the lines are loaded">
        @for (w of ways; track w.id) {
          <button type="button" class="w-btn small" [class.on]="way() === w.id" [attr.aria-pressed]="way() === w.id" (click)="way.set(w.id)">{{ w.label }}</button>
        }
      </div>
      <pre class="sqlbox mono">{{ code() }}</pre>
      <div class="w-controls" role="group" aria-label="Number of orders">
        <span class="lbl">Orders</span>
        @for (n of sizes; track n) {
          <button type="button" class="w-btn small" [class.on]="size() === n" [attr.aria-pressed]="size() === n" (click)="size.set(n)">{{ n.toLocaleString('en-GB') }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Network between application and database">
        <span class="lbl">Network</span>
        @for (net of nets; track net.ms; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="netIx() === i" [attr.aria-pressed]="netIx() === i" (click)="netIx.set(i)">{{ net.label }}</button>
        }
      </div>
      <div class="dots" aria-hidden="true">
        @for (d of dots(); track $index) { <span class="dot" [class.first]="$index === 0"></span> }
        @if (commands() > dots().length) { <span class="more">+{{ (commands() - dots().length).toLocaleString('en-GB') }} more</span> }
      </div>
      <div class="stats">
        <div><span class="n">{{ commands().toLocaleString('en-GB') }}</span> {{ commands() === 1 ? 'command' : 'commands' }}</div>
        <div><span class="n">{{ wait() }}</span> spent waiting on the network</div>
      </div>
      <div class="w-msg" [class.err]="way() === 'loop'" [class.ok]="way() !== 'loop'" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .lbl { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); min-width: 4.2rem; }
    .sqlbox { font-size: 0.72rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0.3rem 0 0.5rem; white-space: pre; overflow-x: auto; }
    .dots { display: flex; flex-wrap: wrap; gap: 3px; margin: 0.6rem 0 0.3rem; min-height: 14px; align-items: center; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #0891b2; }
    .dot.first { background: #8b5cf6; }
    .more { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-left: 4px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 6px; font-size: 0.78rem; color: var(--text-muted); }
    .stats > div { border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 8px; }
    .stats .n { display: block; font-size: 1.1rem; font-weight: 800; color: var(--text-main); }
  `]
})
export class RoundTripsWidget {
  readonly ways = WAYS;
  readonly sizes = SIZES;
  readonly nets = NETS;
  way = signal<Way>('loop');
  size = signal(10);
  netIx = signal(1);

  code = computed(() => WAYS.find(w => w.id === this.way())!.code);
  /** Measured with EF Core 10 on BuildMart: 10 orders gave 11 commands in a loop and 1 with a projection. */
  commands = computed(() => (this.way() === 'loop' ? this.size() + 1 : 1));
  dots = computed(() => Array.from({ length: Math.min(this.commands(), 60) }));
  wait = computed(() => {
    const ms = this.commands() * NETS[this.netIx()].ms;
    return ms < 1000 ? `${ms.toLocaleString('en-GB', { maximumFractionDigits: 1 })} ms` : `${(ms / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} s`;
  });
  note = computed(() => {
    const n = this.size();
    if (this.way() === 'loop') return `One query for the orders (purple), then one per order: ${(n + 1).toLocaleString('en-GB')} round trips. Each waits for the network before the next starts, so the time grows with the number of orders and with the distance to the server.`;
    if (this.way() === 'include') return 'One command: EF Core joins Orders to OrderItems and builds each order’s Items list from the rows. More data comes back (every line), but only one round trip.';
    return 'One command, and only the numbers you need: SQL Server counts the lines, so neither the lines nor extra round trips cross the network.';
  });
}
