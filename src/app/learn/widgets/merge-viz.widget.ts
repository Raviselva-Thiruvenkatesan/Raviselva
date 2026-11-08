import { Component, computed, signal } from '@angular/core';

const LEFT = [3, 9, 15, 27];
const RIGHT = [4, 8, 20, 30, 41];
const ARRAY = [38, 27, 43, 3, 9, 82, 10, 1];

interface MFrame { i: number; j: number; out: number[]; say: string; from?: 'L' | 'R' }

function mergeTrace(l: number[], r: number[]): MFrame[] {
  const f: MFrame[] = [{ i: 0, j: 0, out: [], say: 'Both halves are already sorted. Compare the two front items and take the smaller one.' }];
  let i = 0, j = 0;
  const out: number[] = [];
  while (i < l.length && j < r.length) {
    if (l[i] <= r[j]) { out.push(l[i]); f.push({ i: i + 1, j, out: [...out], from: 'L', say: `${l[i]} ≤ ${r[j]}: take ${l[i]} from the left.` }); i++; }
    else { out.push(r[j]); f.push({ i, j: j + 1, out: [...out], from: 'R', say: `${r[j]} < ${l[i]}: take ${r[j]} from the right.` }); j++; }
  }
  if (i < l.length || j < r.length) {
    const rest = i < l.length ? l.slice(i) : r.slice(j);
    out.push(...rest);
    f.push({ i: l.length, j: r.length, out: [...out], say: `One side is empty, so copy the rest (${rest.join(', ')}) as it is. Merged ${out.length} items with at most ${out.length - 1} comparisons: O(n).` });
  }
  return f;
}

/** Split rows (top) then merge rows (bottom) for merge sort on 8 items. */
function levelRows(a: number[]): { kind: 'split' | 'merge'; groups: number[][] }[] {
  const rows: { kind: 'split' | 'merge'; groups: number[][] }[] = [];
  let groups = [a];
  rows.push({ kind: 'split', groups });
  while (groups.some(g => g.length > 1)) {
    groups = groups.flatMap(g => (g.length > 1 ? [g.slice(0, Math.ceil(g.length / 2)), g.slice(Math.ceil(g.length / 2))] : [g]));
    rows.push({ kind: 'split', groups });
  }
  while (groups.length > 1) {
    const next: number[][] = [];
    for (let k = 0; k < groups.length; k += 2) next.push(k + 1 < groups.length ? [...groups[k], ...groups[k + 1]].sort((x, y) => x - y) : groups[k]);
    groups = next;
    rows.push({ kind: 'merge', groups });
  }
  return rows;
}

/** Merge two sorted halves step by step, then see the whole merge sort as levels. */
@Component({
  selector: 'w-merge-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The merge step, then the whole sort</h3></div>
      <p class="w-hint">Part 1: merging two sorted lists only ever compares the two front items.</p>

      <div class="merge">
        <div class="lane"><span class="w-label m-0">Left</span>
          @for (v of left; track $index; let k = $index) { <span class="chip mono" [class.used]="k < m().i" [class.front]="k === m().i">{{ v }}</span> }
        </div>
        <div class="lane"><span class="w-label m-0">Right</span>
          @for (v of right; track $index; let k = $index) { <span class="chip mono" [class.used]="k < m().j" [class.front]="k === m().j">{{ v }}</span> }
        </div>
        <div class="lane"><span class="w-label m-0">Result</span>
          @for (v of m().out; track $index; let k = $index) { <span class="chip mono out" [class.last]="k === m().out.length - 1">{{ v }}</span> }
        </div>
      </div>
      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="mi.set(mi() + 1)" [disabled]="mi() >= mframes.length - 1">Take next</button>
        <button type="button" class="w-btn" (click)="mi.set(0)">Restart</button>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ m().say }}</span></div>

      <p class="w-hint mt-3 mb-2">Part 2: merge sort splits until every piece has one item (a single item is always sorted), then merges pairs back up.</p>
      <div class="levels">
        @for (r of rows.slice(0, shown()); track $index; let ri = $index) {
          <div class="lvl">
            <span class="kind mono" [class.m]="r.kind === 'merge'">{{ r.kind === 'split' ? 'split' : 'merge' }}</span>
            <div class="groups">
              @for (g of r.groups; track $index) {
                <span class="grp mono" [class.m]="r.kind === 'merge'">{{ g.join(' ') }}</span>
              }
            </div>
          </div>
        }
      </div>
      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="shown.set(shown() + 1)" [disabled]="shown() >= rows.length">Next level</button>
        <button type="button" class="w-btn" (click)="shown.set(rows.length)">Show all</button>
        <button type="button" class="w-btn" (click)="shown.set(1)">Restart</button>
      </div>
      <div class="w-msg info"><span>{{ levelNote() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .merge { display: grid; gap: 6px; }
    .lane { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 30px; }
    .lane .w-label { width: 4.2rem; }
    .chip { padding: 3px 9px; border-radius: 7px; border: 1.5px solid rgba(139, 92, 246, 0.45); background: var(--bg-main); font-weight: 700; font-size: 0.85rem; transition: all 0.2s; }
    .chip.used { opacity: 0.25; }
    .chip.front { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); }
    .chip.out { border-color: rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.12); }
    .chip.out.last { background: rgba(16, 185, 129, 0.35); }
    .levels { display: grid; gap: 5px; }
    .lvl { display: flex; gap: 8px; align-items: center; }
    .kind { font-size: 0.66rem; width: 3.2rem; color: #b45309; font-weight: 700; }
    .kind.m { color: #059669; }
    .groups { display: flex; flex-wrap: wrap; gap: 5px; flex: 1; justify-content: center; }
    .grp { padding: 2px 7px; border-radius: 6px; border: 1.5px solid rgba(245, 158, 11, 0.55); background: rgba(245, 158, 11, 0.08); font-size: 0.78rem; white-space: nowrap; }
    .grp.m { border-color: rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.1); }
  `]
})
export class MergeVizWidget {
  readonly left = LEFT;
  readonly right = RIGHT;
  readonly mframes = mergeTrace(LEFT, RIGHT);
  readonly rows = levelRows(ARRAY);
  mi = signal(0);
  shown = signal(1);
  m = computed(() => this.mframes[Math.min(this.mi(), this.mframes.length - 1)]);

  levelNote = computed(() => {
    const s = this.shown();
    if (s <= 1) return 'Start: 8 unsorted items.';
    if (s <= 4) return `Splitting is just choosing a middle index. After log₂ 8 = 3 levels every piece has one item.`;
    if (s < this.rows.length) return 'Each merge level touches every item once: O(n) work per level.';
    return 'Sorted. 3 split levels and 3 merge levels; each merge level costs O(n). log n levels × O(n) = O(n log n), for every input.';
  });
}
