import { Component, computed, signal } from '@angular/core';

const A = [3, 1, 4, 1, 5, 9, 2, 6];
const PREFIX = A.reduce((p, x) => [...p, p[p.length - 1] + x], [0]);
const DAYS = 8;
const UPDATES = [
  { from: 1, to: 4, add: 2 },
  { from: 3, to: 6, add: 5 },
  { from: 0, to: 7, add: 1 }
];

/** Range sums from a prefix array, and range updates with a difference array. */
@Component({
  selector: 'w-prefix-sums',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Prefix sums and difference arrays</h3></div>
      <p class="w-hint">Build <span class="mono">prefix</span> once: <span class="mono">prefix[i]</span> is the total of the first i items. Then any range total is one subtraction. Drag the two sliders.</p>

      <div class="w-controls">
        <label class="w-label m-0" for="ps-l">from {{ lo() }}</label>
        <input id="ps-l" type="range" min="0" max="7" [value]="lo()" (input)="setLo(+$any($event.target).value)" />
        <label class="w-label m-0" for="ps-r">to {{ hi() }}</label>
        <input id="ps-r" type="range" min="0" max="7" [value]="hi()" (input)="setHi(+$any($event.target).value)" />
      </div>

      <div class="grid mono">
        <span class="lab">i</span>
        @for (x of prefix; track $index; let i = $index) { <span class="ix">{{ i }}</span> }
        <span class="lab">a[i]</span>
        @for (x of a; track $index; let i = $index) { <span class="c" [class.in]="i >= lo() && i <= hi()">{{ x }}</span> }
        <span></span>
        <span class="lab">prefix</span>
        @for (p of prefix; track $index; let i = $index) { <span class="c p" [class.plus]="i === hi() + 1" [class.minus]="i === lo()">{{ p }}</span> }
      </div>
      <div class="w-msg ok mt-2" aria-live="polite"><div>
        <span class="mono">sum(a[{{ lo() }}..{{ hi() }}]) = prefix[{{ hi() + 1 }}] − prefix[{{ lo() }}] = {{ prefix[hi() + 1] }} − {{ prefix[lo()] }} = <b>{{ rangeSum() }}</b></span>
        <span class="small d-block mt-1">@if (hi() > lo()) {Adding the items one by one would take {{ hi() - lo() }} addition{{ hi() - lo() === 1 ? '' : 's' }}; with the prefix array it is always 1 subtraction.} @else {A range of one item: the same formula still works, with no special case.}</span>
      </div></div>

      <div class="w-label mt-3">Difference array: add a crew to a range of days in O(1)</div>
      <p class="w-hint mt-0 mb-2">Each update touches only two cells: <span class="mono">diff[from] += n</span> and <span class="mono">diff[to + 1] −= n</span>. A running total over <span class="mono">diff</span> rebuilds the real values.</p>
      <div class="ups small">
        @for (u of updates; track $index; let k = $index) {
          <span class="up" [class.done]="k < applied()" [class.cur]="k === applied() - 1">+{{ u.add }} people on days {{ u.from }}–{{ u.to }}</span>
        }
      </div>
      <div class="grid mono mt-2 diff">
        <span class="lab">day</span>
        @for (d of diff(); track $index; let i = $index) { <span class="ix">{{ i < days ? i : 'end' }}</span> }
        <span class="lab">diff</span>
        @for (d of diff(); track $index; let i = $index) { <span class="c" [class.plus]="touched().plus === i" [class.minus]="touched().minus === i">{{ d }}</span> }
        <span class="lab">crew</span>
        @for (c of crew(); track $index) { <span class="c p">{{ c }}</span> }
      </div>
      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="applied.set(applied() + 1)" [disabled]="applied() >= updates.length">Apply next update</button>
        <button type="button" class="w-btn" (click)="applied.set(0)">Reset</button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .grid { display: grid; grid-template-columns: 3.4rem repeat(9, minmax(0, 1fr)); gap: 3px; align-items: center; }
    .lab { font-size: 0.7rem; color: var(--text-muted); }
    .ix { text-align: center; font-size: 0.62rem; color: var(--text-muted); }
    .c { text-align: center; padding: 4px 0; border-radius: 6px; border: 1.5px solid var(--border-color); background: var(--bg-main); font-weight: 700; font-size: 0.85rem; min-width: 0; transition: all 0.2s; }
    .c.p { border-color: rgba(6, 182, 212, 0.45); background: rgba(6, 182, 212, 0.08); }
    .c.in { border-color: rgba(139, 92, 246, 0.7); background: rgba(139, 92, 246, 0.22); }
    .c.plus { border-color: #10b981; background: rgba(16, 185, 129, 0.3); }
    .c.minus { border-color: #ef4444; background: rgba(239, 68, 68, 0.2); }
    input[type=range] { width: 7rem; accent-color: #8b5cf6; }
    .ups { display: flex; flex-wrap: wrap; gap: 6px; }
    .up { padding: 2px 8px; border-radius: 999px; border: 1px dashed var(--border-color); color: var(--text-muted); }
    .up.done { border-style: solid; color: var(--text-main); }
    .up.cur { border-color: #f59e0b; background: rgba(245, 158, 11, 0.15); }
  `]
})
export class PrefixSumsWidget {
  readonly a = A;
  readonly prefix = PREFIX;
  readonly updates = UPDATES;
  readonly days = DAYS;
  lo = signal(2);
  hi = signal(5);
  applied = signal(0);

  rangeSum = computed(() => PREFIX[this.hi() + 1] - PREFIX[this.lo()]);
  diff = computed(() => {
    const d = Array(DAYS + 1).fill(0);
    for (const u of UPDATES.slice(0, this.applied())) { d[u.from] += u.add; d[u.to + 1] -= u.add; }
    return d;
  });
  crew = computed(() => {
    let run = 0;
    return this.diff().slice(0, DAYS).map(x => (run += x));
  });
  touched = computed(() => {
    const u = UPDATES[this.applied() - 1];
    return u ? { plus: u.from, minus: u.to + 1 } : { plus: -1, minus: -1 };
  });

  setLo(v: number) { this.lo.set(v); if (this.hi() < v) this.hi.set(v); }
  setHi(v: number) { this.hi.set(v); if (this.lo() > v) this.lo.set(v); }
}
