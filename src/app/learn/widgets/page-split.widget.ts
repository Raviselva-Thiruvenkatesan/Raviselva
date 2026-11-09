import { Component, computed, signal } from '@angular/core';

/** A model of a clustered index's leaf level with 4 rows a page (a real page here holds about 56). */
const CAP = 4;
const COUNT = 24;
type Order = 'asc' | 'scrambled' | 'desc';
const SEQ: Record<Order, number[]> = {
  asc: Array.from({ length: COUNT }, (_, i) => i + 1),
  scrambled: Array.from({ length: COUNT }, (_, i) => (i + 1) * 7 % 25),
  desc: Array.from({ length: COUNT }, (_, i) => COUNT - i)
};
const LABEL: Record<Order, string> = { asc: 'Ascending (IDENTITY)', scrambled: 'Scrambled (like NEWID)', desc: 'Descending' };

interface Page { no: number; keys: number[] }
interface State { pages: Page[]; next: number; splits: number; done: number; last: number | null; split: number | null }

const START: State = { pages: [{ no: 1, keys: [] }], next: 2, splits: 0, done: 0, last: null, split: null };

/** Insert one key into the leaf chain (pages kept in key order; `no` is the page's place in the file). */
function insert(s: State, key: number): State {
  const pages = s.pages.map(p => ({ no: p.no, keys: [...p.keys] }));
  // The page for a key is the last one whose first key is not above it (the first page for the smallest keys).
  let i = 0;
  pages.forEach((pg, k) => { if (pg.keys.length && pg.keys[0] <= key) i = k; });
  const p = pages[i];
  let next = s.next, splits = s.splits, split: number | null = null;
  if (p.keys.length < CAP) {
    p.keys = [...p.keys, key].sort((a, b) => a - b);
  } else if (i === pages.length - 1 && key > p.keys[CAP - 1]) {
    // Past the end of the last page: start a new page, no rows move.
    pages.push({ no: next++, keys: [key] });
  } else {
    // A split: a new page at the end of the file takes the upper half of the rows.
    const all = [...p.keys, key].sort((a, b) => a - b);
    const half = Math.ceil(all.length / 2);
    p.keys = all.slice(0, half);
    pages.splice(i + 1, 0, { no: next, keys: all.slice(half) });
    split = next++;
    splits++;
  }
  return { pages, next, splits, done: s.done + 1, last: key, split };
}

/** Insert keys in different orders and watch pages fill, split and fall out of order. */
@Component({
  selector: 'w-page-split',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Page splits</h3></div>
      <div class="w-controls" role="group" aria-label="Insert order">
        @for (o of orders; track o) {
          <button type="button" class="w-btn small" [class.on]="order() === o" [attr.aria-pressed]="order() === o" (click)="pick(o)">{{ label[o] }}</button>
        }
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn primary" [disabled]="state().done >= count" (click)="step()">Insert {{ nextKey() ?? '' }}</button>
        <button type="button" class="w-btn" [disabled]="state().done >= count" (click)="all()">Insert all</button>
        <button type="button" class="w-btn" [disabled]="state().done < count" (click)="rebuild()">Rebuild</button>
        <button type="button" class="w-btn" (click)="reset()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Reset</button>
      </div>
      <div class="queue mono" aria-label="Keys still to insert">
        @for (k of seq(); track $index; let i = $index) { <span [class.gone]="i < state().done" [class.cur]="i === state().done">{{ k }}</span> }
      </div>

      <div class="ph">Leaf pages in key order (the number is the page’s place in the file)</div>
      <div class="chain">
        @for (p of state().pages; track p.no; let i = $index) {
          <div class="page" [class.split]="p.no === state().split" [class.ooo]="outOfOrder()[i]">
            <div class="pno">page {{ p.no }}</div>
            <div class="slots">
              @for (s of slots; track s) {
                <span class="slot mono" [class.full]="p.keys.at(s) !== undefined" [class.last]="p.keys[s] === state().last">{{ p.keys.at(s) ?? '' }}</span>
              }
            </div>
          </div>
        }
      </div>

      <div class="stats">
        <div><span class="n">{{ state().pages.length }}</span> pages</div>
        <div><span class="n">{{ state().splits }}</span> splits</div>
        <div><span class="n">{{ fill() }}%</span> average fullness</div>
        <div><span class="n">{{ frag() }}%</span> out of order</div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .queue { display: flex; flex-wrap: wrap; gap: 3px; font-size: 0.72rem; margin: 0.3rem 0 0.2rem; }
    .queue span { padding: 1px 5px; border-radius: 5px; background: var(--bg-secondary); }
    .queue .gone { opacity: 0.3; }
    .queue .cur { background: #8b5cf6; color: #fff; font-weight: 700; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin: 0.6rem 0 0.3rem; }
    .chain { display: flex; flex-wrap: wrap; gap: 6px; }
    .page { border: 1px solid var(--border-color); border-radius: 8px; padding: 4px; background: var(--bg-main); }
    .page.split { border-color: #f59e0b; box-shadow: 0 0 0 1px #f59e0b inset; }
    .page.ooo .pno { color: #ef4444; font-weight: 700; }
    .pno { font-size: 0.66rem; color: var(--text-muted); text-align: center; margin-bottom: 2px; }
    .slots { display: grid; grid-template-columns: repeat(4, 1.9rem); gap: 2px; }
    .slot { height: 1.5rem; display: grid; place-items: center; font-size: 0.72rem; border-radius: 4px; background: var(--bg-secondary); border: 1px dashed var(--border-color); }
    .slot.full { background: rgba(139, 92, 246, 0.16); border-style: solid; border-color: rgba(139, 92, 246, 0.4); }
    .slot.last { background: #8b5cf6; color: #fff; font-weight: 700; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr)); gap: 6px; margin: 0.7rem 0; font-size: 0.78rem; color: var(--text-muted); }
    .stats > div { border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 8px; }
    .stats .n { display: block; font-size: 1.1rem; font-weight: 800; color: var(--text-main); }
  `]
})
export class PageSplitWidget {
  readonly orders: Order[] = ['asc', 'scrambled', 'desc'];
  readonly label = LABEL;
  readonly slots = [0, 1, 2, 3];
  readonly count = COUNT;
  order = signal<Order>('scrambled');
  state = signal<State>(START);
  rebuilt = signal(false);

  seq = computed(() => SEQ[this.order()]);
  nextKey = computed(() => this.seq().at(this.state().done));

  /** A page is out of order when it sits earlier in the file than the page before it in the chain. */
  outOfOrder = computed(() => this.state().pages.map((p, i, ps) => i > 0 && p.no < ps[i - 1].no));
  fill = computed(() => { const ps = this.state().pages; const rows = ps.reduce((n, p) => n + p.keys.length, 0); return Math.round(rows / (ps.length * CAP) * 100); });
  frag = computed(() => { const o = this.outOfOrder(); return Math.round(o.filter(Boolean).length / o.length * 100); });

  message = computed(() => {
    const s = this.state(), o = this.order();
    if (this.rebuilt()) return 'REBUILD wrote the rows again in key order onto new pages, packed full and in file order: no free space and nothing out of order. The next scrambled insert will split a page straight away.';
    if (s.done === 0) return o === 'asc'
      ? 'Ascending keys, like an IDENTITY column. Press Insert and watch where each row goes.'
      : o === 'desc' ? 'Descending keys: each new row belongs before all the others.' : 'Keys in a scrambled order, like NEWID() values. Each row must go to its place in key order.';
    if (s.done < COUNT && s.split !== null) return `Split: the page was full, so a new page (page ${s.split}) was added at the end of the file and took the upper half of the rows. Both pages now have empty slots, and the new page sits wherever the end of the file was, not next to its neighbour in the chain.`;
    if (s.done >= COUNT) return o === 'asc'
      ? 'No splits. Every key was higher than all before it, so it went at the end of the last page, and a new page was started only when the last one was full. Pages are 100% full and in file order.'
      : o === 'desc'
        ? 'Every row had to go in front of the others, so the first page kept splitting. Pages end up half full and the chain runs backwards through the file.'
        : `${s.splits} splits. The index has more pages than it needs, each only partly full, and many sit out of order in the file. Every scan reads the extra pages. Try Rebuild.`;
    return `Inserted ${s.last}: there was room on its page, so nothing else moved.`;
  });

  pick(o: Order) { this.order.set(o); this.reset(); }
  step() { const k = this.nextKey(); if (k !== undefined) { this.rebuilt.set(false); this.state.update(s => insert(s, k)); } }
  all() { let s = this.state(); for (let i = s.done; i < COUNT; i++) s = insert(s, this.seq()[i]); this.rebuilt.set(false); this.state.set(s); }
  rebuild() {
    const keys = this.state().pages.flatMap(p => p.keys);
    const pages: Page[] = [];
    for (let i = 0; i < keys.length; i += CAP) pages.push({ no: pages.length + 1, keys: keys.slice(i, i + CAP) });
    this.state.set({ pages, next: pages.length + 1, splits: 0, done: COUNT, last: null, split: null });
    this.rebuilt.set(true);
  }
  reset() { this.state.set(START); this.rebuilt.set(false); }
}
