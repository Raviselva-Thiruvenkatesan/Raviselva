import { Component, computed, signal } from '@angular/core';

type Strategy = 'double' | 'plus4';

/** Add items to a dynamic array and watch it resize: doubling vs growing by a fixed amount. */
@Component({
  selector: 'w-list-growth',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside List&lt;T&gt;.Add</h3></div>
      <p class="w-hint">Add items. When the hidden array is full, a bigger one is allocated and every item is copied across. Compare the two growth rules.</p>
      <div class="w-controls" role="group" aria-label="Growth rule">
        <span class="w-label m-0">When full</span>
        <button type="button" class="w-btn" [class.on]="strategy() === 'double'" (click)="setStrategy('double')" [attr.aria-pressed]="strategy() === 'double'">double the capacity (.NET)</button>
        <button type="button" class="w-btn" [class.on]="strategy() === 'plus4'" (click)="setStrategy('plus4')" [attr.aria-pressed]="strategy() === 'plus4'">add 4 more slots</button>
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn primary" (click)="add(1)">list.Add(x)</button>
        <button type="button" class="w-btn" (click)="add(10)">Add 10</button>
        <button type="button" class="w-btn" (click)="add(100)">Add 100</button>
        <button type="button" class="w-btn" (click)="add(1000)">Add 1,000</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>

      <div class="w-label">Count {{ fmt(count()) }} · Capacity {{ fmt(cap()) }}</div>
      @if (cap() <= 64) {
        <div class="cells" aria-hidden="true">
          @for (c of cells(); track $index; let i = $index) {
            <span class="cell" [class.full]="i < count()" [class.fresh]="i >= oldCap() && i < cap() && justGrew()"></span>
          }
          @if (cap() === 0) { <span class="small text-muted">empty: no array allocated yet</span> }
        </div>
      } @else {
        <div class="bar-bg" aria-hidden="true"><span class="bar" [style.width.%]="(100 * count()) / cap()"></span></div>
      }

      <div class="stats">
        <div><b>{{ fmt(copies()) }}</b><span>items copied by resizes</span></div>
        <div><b>{{ resizes() }}</b><span>resizes</span></div>
        <div><b>{{ avg() }}</b><span>average work per Add</span></div>
      </div>
      <div class="w-msg" [class.ok]="!justGrew()" [class.info]="justGrew()" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: flex; flex-wrap: wrap; gap: 3px; min-height: 18px; margin-bottom: 0.4rem; }
    .cell { width: 16px; height: 16px; border-radius: 3px; border: 1.5px solid rgba(139, 92, 246, 0.4); background: var(--bg-main); transition: all 0.2s; }
    .cell.full { background: var(--purple); border-color: var(--purple); }
    .cell.fresh:not(.full) { border-color: #10b981; background: rgba(16, 185, 129, 0.15); }
    .bar-bg { height: 16px; border-radius: 8px; background: rgba(139, 92, 246, 0.1); overflow: hidden; margin-bottom: 0.4rem; border: 1px solid rgba(139, 92, 246, 0.3); }
    .bar { display: block; height: 100%; background: var(--gradient-primary); transition: width 0.3s; }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 0.4rem; }
    .stats div { padding: 8px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-main); text-align: center; }
    .stats b { display: block; font-size: 1.15rem; }
    .stats span { font-size: 0.72rem; color: var(--text-muted); }
  `]
})
export class ListGrowthWidget {
  strategy = signal<Strategy>('double');
  count = signal(0);
  cap = signal(0);
  oldCap = signal(0);
  copies = signal(0);
  resizes = signal(0);
  justGrew = signal(false);
  msg = signal('new List<int>() starts with capacity 0. The first Add allocates room for 4.');

  cells = computed(() => Array.from({ length: this.cap() }));
  avg = computed(() => (this.count() ? ((this.count() + this.copies()) / this.count()).toFixed(2) : '–'));

  add(k: number) {
    let count = this.count(), cap = this.cap(), copies = this.copies(), resizes = this.resizes();
    let last = '';
    const before = cap;
    for (let j = 0; j < k; j++) {
      if (count === cap) {
        const next = cap === 0 ? 4 : this.strategy() === 'double' ? cap * 2 : cap + 4;
        last = cap === 0
          ? 'First Add: there was no array yet, so one with room for 4 was allocated. Nothing to copy.'
          : `Full at ${cap}: allocated a new array of ${next} and copied ${count} item${count === 1 ? '' : 's'} across.`;
        copies += count;
        cap = next;
        resizes++;
      }
      count++;
    }
    this.oldCap.set(before);
    this.justGrew.set(cap !== before);
    this.count.set(count); this.cap.set(cap); this.copies.set(copies); this.resizes.set(resizes);
    this.msg.set(last
      ? `${last}${k > 1 ? ' (last resize shown)' : ''}`
      : `Stored in a free slot: O(1). ${cap - count} free slot${cap - count === 1 ? '' : 's'} left before the next resize.`);
  }

  setStrategy(s: Strategy) { this.strategy.set(s); this.reset(); }

  reset() {
    this.count.set(0); this.cap.set(0); this.oldCap.set(0); this.copies.set(0); this.resizes.set(0); this.justGrew.set(false);
    this.msg.set(this.strategy() === 'double'
      ? 'Doubling: resizes get rarer as the list grows, so the average stays about 2 steps per Add.'
      : 'Fixed growth: a resize every 4 Adds, each copying everything. Add 1,000 and watch the average.');
  }

  fmt(x: number) { return x.toLocaleString('en-US'); }
}
