import { Component, computed, signal } from '@angular/core';

type Mode = 'query' | 'update' | 'fenwick';
type Visit = 'full' | 'part' | 'out';
interface SNode { k: number; lo: number; hi: number; x: number; y: number; level: number }

const N = 8;
const START = [5, 8, 6, 3, 9, 2, 7, 4];

/** Heap-numbered segment tree nodes over 8 leaves: node k has children 2k and 2k + 1. */
function layout(): SNode[] {
  const out: SNode[] = [];
  const go = (k: number, lo: number, hi: number, level: number) => {
    const x = 26 + ((lo + hi) / 2) * 41;
    out.push({ k, lo, hi, x, y: 22 + level * 46, level });
    if (lo === hi) return;
    const mid = Math.floor((lo + hi) / 2);
    go(2 * k, lo, mid, level + 1);
    go(2 * k + 1, mid + 1, hi, level + 1);
  };
  go(1, 0, N - 1, 0);
  return out;
}
const NODES = layout();
const lowbit = (i: number) => i & -i;

/** Segment tree (range sums, point updates) and Fenwick tree (prefix sums) over the same 8 values. */
@Component({
  selector: 'w-segment-tree',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Range sums in O(log n)</h3></div>
      <p class="w-hint">Tonnes of rebar delivered on days 0–7. Each tree node stores the sum of its range of days, so any range sum needs only a few nodes.</p>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="mode() === 'query'" (click)="mode.set('query')" [attr.aria-pressed]="mode() === 'query'">Segment tree: range sum</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'update'" (click)="mode.set('update')" [attr.aria-pressed]="mode() === 'update'">Segment tree: update</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'fenwick'" (click)="mode.set('fenwick')" [attr.aria-pressed]="mode() === 'fenwick'">Fenwick tree</button>
      </div>

      <div class="w-controls">
        @if (mode() === 'update') {
          <label class="w-field">Day
            <select [value]="'' + at()" (change)="at.set(+$any($event.target).value)">
              @for (d of days; track d) { <option [value]="'' + d" [selected]="d === at()">{{ d }}</option> }
            </select>
          </label>
          <button type="button" class="w-btn" (click)="change(-1)" [disabled]="values()[at()] === 0">−1</button>
          <button type="button" class="w-btn" (click)="change(1)" [disabled]="values()[at()] >= 20">+1</button>
          <button type="button" class="w-btn" (click)="reset()">Reset values</button>
        } @else {
          <label class="w-field">From day
            <select [value]="'' + lo()" (change)="setLo(+$any($event.target).value)">
              @for (d of days; track d) { <option [value]="'' + d" [selected]="d === lo()">{{ d }}</option> }
            </select>
          </label>
          <label class="w-field">To day
            <select [value]="'' + hi()" (change)="setHi(+$any($event.target).value)">
              @for (d of days; track d) { <option [value]="'' + d" [selected]="d === hi()" [disabled]="d < lo()">{{ d }}</option> }
            </select>
          </label>
        }
      </div>

      @if (mode() !== 'fenwick') {
        <svg viewBox="0 0 340 196" class="gsvg" role="img" [attr.aria-label]="'Segment tree over values ' + values().join(', ')">
          @for (n of nodes; track n.k) {
            @if (n.k > 1) { <line [attr.x1]="parentOf(n).x" [attr.y1]="parentOf(n).y + 11" [attr.x2]="n.x" [attr.y2]="n.y - 11" class="g-edge" [class.on]="mark(n) === 'path' || (mark(n) === 'full' || mark(n) === 'part') && mark(parentOf(n)) === 'part'" /> }
          }
          @for (n of nodes; track n.k) {
            <g class="g-node" [class.done]="mark(n) === 'full'" [class.cur]="mark(n) === 'part' || mark(n) === 'path'" [class.bad]="mark(n) === 'out'" [style.opacity]="mark(n) === '' ? 0.45 : 1">
              <rect [attr.x]="n.x - (n.level === 3 ? 17 : 19)" [attr.y]="n.y - 11" [attr.width]="n.level === 3 ? 34 : 38" height="22" rx="6" />
              <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ sum(n.lo, n.hi) }}</text>
            </g>
          }
          @for (d of days; track d) { <text [attr.x]="26 + d * 41" y="186" text-anchor="middle" class="idx">day {{ d }}</text> }
        </svg>
        <div class="legend small">
          @if (mode() === 'query') {
            <span><i class="sw full"></i>inside the range: use its sum</span>
            <span><i class="sw part"></i>partly inside: look at both children</span>
            <span><i class="sw out"></i>outside: skip</span>
          } @else {
            <span><i class="sw part"></i>sums that change (leaf to root)</span>
          }
        </div>
      } @else {
        <svg viewBox="0 0 340 196" class="gsvg" role="img" [attr.aria-label]="'Fenwick tree for the prefix sums'">
          @for (i of fIdx; track i) {
            <g class="g-node" [class.done]="addChain().includes(i)" [class.bad]="subChain().includes(i)" [style.opacity]="addChain().includes(i) || subChain().includes(i) ? 1 : 0.5">
              <rect [attr.x]="fx(i - lowbitOf(i) + 1) - 18" [attr.y]="146 - level(i) * 38" [attr.width]="fx(i) - fx(i - lowbitOf(i) + 1) + 36" height="26" rx="6" />
              <text [attr.x]="(fx(i) + fx(i - lowbitOf(i) + 1)) / 2" [attr.y]="156 - level(i) * 38" text-anchor="middle" class="g-sub">t[{{ i }}]</text>
              <text [attr.x]="(fx(i) + fx(i - lowbitOf(i) + 1)) / 2" [attr.y]="168 - level(i) * 38" text-anchor="middle">{{ fen()[i] }}</text>
            </g>
          }
          @for (d of days; track d) { <text [attr.x]="fx(d + 1)" y="190" text-anchor="middle" class="idx">{{ values()[d] }}</text> }
        </svg>
        <div class="legend small">
          <span><i class="sw full"></i>added: prefix up to day {{ hi() }}</span>
          @if (lo() > 0) { <span><i class="sw out"></i>subtracted: prefix up to day {{ lo() - 1 }}</span> }
        </div>
      }

      <div class="w-msg mt-2" [class.ok]="mode() !== 'update'" [class.info]="mode() === 'update'" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .gsvg { max-width: 520px; }
    .idx { font-size: 9px; fill: var(--text-muted); }
    .g-node text { font-size: 11px; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; justify-content: center; margin-top: 0.4rem; }
    .sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; border: 2px solid; }
    .sw.full { border-color: #10b981; background: rgba(16, 185, 129, 0.3); }
    .sw.part { border-color: #f59e0b; background: rgba(245, 158, 11, 0.4); }
    .sw.out { border-color: #ef4444; background: rgba(239, 68, 68, 0.2); }
  `]
})
export class SegmentTreeWidget {
  readonly nodes = NODES;
  readonly days = Array.from({ length: N }, (_, i) => i);
  readonly fIdx = Array.from({ length: N }, (_, i) => i + 1);
  mode = signal<Mode>('query');
  values = signal([...START]);
  lo = signal(2);
  hi = signal(6);
  at = signal(4);
  lastChanged = signal<number | null>(null);

  /** Which nodes a range query visits, and how. */
  visits = computed(() => {
    const m = new Map<number, Visit>(), l = this.lo(), r = this.hi();
    const go = (k: number, a: number, b: number) => {
      if (r < a || b < l) { m.set(k, 'out'); return; }
      if (l <= a && b <= r) { m.set(k, 'full'); return; }
      m.set(k, 'part');
      const mid = Math.floor((a + b) / 2);
      go(2 * k, a, mid);
      go(2 * k + 1, mid + 1, b);
    };
    go(1, 0, N - 1);
    return m;
  });

  /** Node numbers from the chosen leaf up to the root. */
  path = computed(() => {
    let k = NODES.find(n => n.lo === this.at() && n.hi === this.at())!.k;
    const p: number[] = [];
    while (k >= 1) { p.push(k); k = Math.floor(k / 2); }
    return p;
  });

  /** Fenwick array t[1..8]: t[i] = sum of the lowbit(i) values ending at position i. */
  fen = computed(() => {
    const v = this.values(), t = Array(N + 1).fill(0);
    for (let i = 1; i <= N; i++) for (let j = i - lowbit(i) + 1; j <= i; j++) t[i] += v[j - 1];
    return t;
  });
  addChain = computed(() => this.chain(this.hi() + 1));
  subChain = computed(() => this.chain(this.lo()));

  private chain(i: number) { const c: number[] = []; for (; i > 0; i -= lowbit(i)) c.push(i); return c; }

  sum(a: number, b: number) { let s = 0; for (let i = a; i <= b; i++) s += this.values()[i]; return s; }
  parentOf(n: SNode) { return NODES.find(p => p.k === Math.floor(n.k / 2))!; }
  mark(n: SNode): Visit | 'path' | '' {
    if (this.mode() === 'update') return this.path().includes(n.k) ? 'path' : '';
    return this.visits().get(n.k) ?? '';
  }
  lowbitOf(i: number) { return lowbit(i); }
  level(i: number) { return Math.log2(lowbit(i)); }
  fx(i: number) { return 26 + (i - 1) * 41; }

  message = computed(() => {
    const l = this.lo(), r = this.hi();
    if (this.mode() === 'query') {
      const v = this.visits(), used = [...v.entries()].filter(([, s]) => s === 'full');
      return `Sum of days ${l}–${r} = ${used.map(([k]) => { const n = NODES.find(x => x.k === k)!; return this.sum(n.lo, n.hi); }).join(' + ')} = ${this.sum(l, r)}. The query touched ${v.size} of 15 nodes and added ${used.length}; a plain loop reads ${r - l + 1} values. With a million days: about 40 nodes instead of up to a million values.`;
    }
    if (this.mode() === 'update') {
      const c = this.lastChanged();
      return `${c === null ? '' : `Day ${c} is now ${this.values()[c]}. `}A change on day ${this.at()} affects only the ${this.path().length} sums on the path from its leaf to the root, so only they are updated: O(log n). A prefix-sum array would have to rebuild up to n entries.`;
    }
    const a = this.addChain(), s = this.subChain(), f = this.fen();
    const part = (c: number[]) => c.map(i => `t[${i}]`).join(' + ');
    const pre = (c: number[]) => c.reduce((x, i) => x + f[i], 0);
    return l === 0
      ? `Prefix up to day ${r} = ${part(a)} = ${pre(a)}. Jump down with i -= i & -i: ${a.join(' → ')}. At most log₂ n + 1 cells.`
      : `Days ${l}–${r} = prefix(${r}) − prefix(${l - 1}) = (${part(a)}) − (${part(s)}) = ${pre(a)} − ${pre(s)} = ${pre(a) - pre(s)}.`;
  });

  setLo(v: number) { this.lo.set(v); if (this.hi() < v) this.hi.set(v); }
  setHi(v: number) { this.hi.set(Math.max(v, this.lo())); }
  change(d: number) { this.values.update(v => v.map((x, i) => (i === this.at() ? x + d : x))); this.lastChanged.set(this.at()); }
  reset() { this.values.set([...START]); this.lastChanged.set(null); }
}
