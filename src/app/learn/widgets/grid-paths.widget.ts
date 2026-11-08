import { Component, computed, signal } from '@angular/core';

type Mode = 'count' | 'cost';
const R = 5, C = 6;
const COST = [
  [1, 3, 1, 2, 8, 1],
  [1, 5, 1, 9, 1, 2],
  [4, 2, 1, 3, 2, 6],
  [7, 1, 8, 1, 1, 2],
  [2, 4, 1, 5, 3, 1]
];
const START_WALLS = [8, 15, 26];

/** Grid DP: number of right/down paths (with blocked cells), or cheapest right/down path. */
@Component({
  selector: 'w-grid-paths',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>DP on a grid</h3></div>
      <div class="w-controls" role="group" aria-label="Question">
        <button type="button" class="w-btn" [class.on]="mode() === 'count'" (click)="setMode('count')" [attr.aria-pressed]="mode() === 'count'">How many paths?</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'cost'" (click)="setMode('cost')" [attr.aria-pressed]="mode() === 'cost'">Cheapest path</button>
      </div>
      <p class="w-hint">{{ mode() === 'count'
        ? 'Move only right or down from the top-left to the bottom-right. A cell’s count = count from above + count from the left. Click cells to block or unblock them.'
        : 'Each cell has a cost (small number). Move only right or down. A cell’s best = its cost + the cheaper of the cell above and the cell to the left.' }}</p>

      <div class="grid mono">
        @for (k of cells; track k) {
          <button type="button" class="cell" [class.wall]="mode() === 'count' && walls().has(k)" [class.done]="k < shown()" [class.cur]="k === shown() - 1" [class.dep]="isDep(k)" [class.path]="onPath(k)" (click)="toggle(k)"
                  [attr.aria-label]="'Row ' + (row(k) + 1) + ', column ' + (col(k) + 1)">
            @if (mode() === 'cost') { <small>{{ cost[row(k)][col(k)] }}</small> }
            <b>{{ k < shown() && !(mode() === 'count' && walls().has(k)) ? table()[k] : '' }}</b>
          </button>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="shown.set(shown() + 1)" [disabled]="shown() >= total">Next cell</button>
        <button type="button" class="w-btn" (click)="shown.set(total)">Fill all</button>
        <button type="button" class="w-btn" (click)="shown.set(0)">Restart</button>
        @if (mode() === 'count') { <button type="button" class="w-btn" (click)="clearWalls()">Clear blocks</button> }
      </div>
      <div class="w-msg" [class.ok]="shown() >= total" [class.info]="shown() < total" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 3px; max-width: 360px; margin: 0 auto; }
    .cell { position: relative; aspect-ratio: 1.15; min-width: 0; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-main); color: var(--text-main); padding: 0; cursor: pointer; font: inherit; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .cell small { position: absolute; top: 2px; left: 4px; font-size: 0.6rem; color: var(--text-muted); }
    .cell b { font-size: 0.85rem; }
    .cell.done { background: rgba(139, 92, 246, 0.14); }
    .cell.dep { background: rgba(6, 182, 212, 0.28); border-color: #0891b2; }
    .cell.cur { background: rgba(245, 158, 11, 0.4); border-color: #f59e0b; }
    .cell.path { background: rgba(16, 185, 129, 0.45); border-color: #10b981; }
    .cell.wall { background: var(--text-muted); opacity: 0.75; }
  `]
})
export class GridPathsWidget {
  readonly cells = Array.from({ length: R * C }, (_, i) => i);
  readonly total = R * C;
  readonly cost = COST;
  mode = signal<Mode>('count');
  walls = signal(new Set(START_WALLS));
  shown = signal(0);

  row(k: number) { return Math.floor(k / C); }
  col(k: number) { return k % C; }

  /** The finished table, in row-major order. */
  table = computed(() => {
    const t: number[] = Array(R * C).fill(0);
    for (let k = 0; k < R * C; k++) {
      const r = this.row(k), c = this.col(k);
      const up = r > 0 ? t[k - C] : null, left = c > 0 ? t[k - 1] : null;
      if (this.mode() === 'count') {
        if (this.walls().has(k)) t[k] = 0;
        else t[k] = k === 0 ? 1 : (up ?? 0) + (left ?? 0);
      } else {
        const prev = [up, left].filter((x): x is number => x !== null);
        t[k] = COST[r][c] + (prev.length ? Math.min(...prev) : 0);
      }
    }
    return t;
  });

  /** Cheapest path, walked back from the bottom-right corner. */
  path = computed(() => {
    const s = new Set<number>(), t = this.table();
    if (this.mode() !== 'cost' || this.shown() < this.total) return s;
    let k = R * C - 1;
    s.add(k);
    while (k !== 0) {
      const r = this.row(k), c = this.col(k);
      if (r === 0) k -= 1;
      else if (c === 0) k -= C;
      else k = t[k - C] <= t[k - 1] ? k - C : k - 1;
      s.add(k);
    }
    return s;
  });

  isDep(k: number) {
    const cur = this.shown() - 1;
    if (cur < 0 || this.shown() >= this.total) return false;
    return (k === cur - C) || (k === cur - 1 && this.col(cur) > 0);
  }
  onPath(k: number) { return this.path().has(k); }

  message = computed(() => {
    const t = this.table(), n = this.shown();
    if (n === 0) return this.mode() === 'count' ? 'Start in the top-left corner: there is exactly 1 way to be there.' : 'Start in the top-left corner: the cost of a path that only stands there is its own cost.';
    if (n >= this.total) return this.mode() === 'count'
      ? `${t[R * C - 1]} different paths reach the bottom-right corner. ${R * C} cells, each computed once from two neighbours: O(rows × columns). Listing every path would take far longer.`
      : `The cheapest path costs ${t[R * C - 1]} (green). Walk back from the corner, always to the cheaper neighbour, to recover it.`;
    const k = n - 1, r = this.row(k), c = this.col(k);
    if (this.mode() === 'count') {
      if (this.walls().has(k)) return `Row ${r + 1}, column ${c + 1} is blocked: 0 paths go through it.`;
      if (k === 0) return 'Top-left: 1 way.';
      return `Row ${r + 1}, column ${c + 1}: ${r > 0 ? t[k - C] : 0} (from above) + ${c > 0 ? t[k - 1] : 0} (from the left) = ${t[k]}.`;
    }
    if (k === 0) return `Top-left: cost ${t[0]}.`;
    const opts = [r > 0 ? `above ${t[k - C]}` : '', c > 0 ? `left ${t[k - 1]}` : ''].filter(Boolean).join(', ');
    return `Row ${r + 1}, column ${c + 1}: cost ${COST[r][c]} + cheapest of (${opts}) = ${t[k]}.`;
  });

  toggle(k: number) {
    if (this.mode() !== 'count' || k === 0 || k === R * C - 1) return;
    this.walls.update(w => { const n = new Set(w); if (n.has(k)) n.delete(k); else n.add(k); return n; });
    this.shown.set(0);
  }
  clearWalls() { this.walls.set(new Set()); this.shown.set(0); }
  setMode(m: Mode) { this.mode.set(m); this.shown.set(0); }
}
