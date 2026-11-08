import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

const COLS = 10, ROWS = 7;
const START = 3 * COLS + 0, TARGET = 3 * COLS + 9;
const WALLS = [3, 13, 23, 33, 43, 26, 36, 46, 56, 66, 16, 51, 52, 58, 18];

interface Run { order: number[]; dist: number[]; parent: number[]; enq: number[]; deq: number[]; found: boolean }

/** Plain BFS over the grid, recording when each cell entered and left the queue. */
function bfs(walls: Set<number>): Run {
  const n = COLS * ROWS;
  const dist = Array(n).fill(-1), parent = Array(n).fill(-1), enq = Array(n).fill(Infinity), deq = Array(n).fill(Infinity);
  const q = [START], order: number[] = [];
  dist[START] = 0; enq[START] = 0;
  let step = 0, found = false;
  while (q.length) {
    const c = q.shift()!;
    step++;
    deq[c] = step;
    order.push(c);
    if (c === TARGET) { found = true; break; }
    const r = Math.floor(c / COLS), col = c % COLS;
    const nb = [[r - 1, col], [r, col + 1], [r + 1, col], [r, col - 1]];
    for (const [rr, cc] of nb) {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      const k = rr * COLS + cc;
      if (walls.has(k) || dist[k] >= 0) continue;
      dist[k] = dist[c] + 1; parent[k] = c; enq[k] = step;
      q.push(k);
    }
  }
  return { order, dist, parent, enq, deq, found };
}

/** Breadth-first search spreading over a site plan, one ring of distance at a time. */
@Component({
  selector: 'w-bfs-grid',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>BFS on a site plan</h3></div>
      <p class="w-hint">Find the shortest walk from <b>S</b> to <b>T</b>, moving up, down, left or right. Dark cells are blocked. Click cells to add or remove obstacles.</p>

      <div class="grid" role="grid" aria-label="Site plan grid">
        @for (c of cells; track c) {
          <button type="button" class="cell mono" [class.wall]="walls().has(c)" [class.done]="state(c) === 'done'" [class.wait]="state(c) === 'wait'" [class.cur]="c === cur()" [class.path]="path().has(c)"
                  [class.end]="c === start || c === target" (click)="toggle(c)" [attr.aria-label]="label(c)">
            {{ c === start ? 'S' : c === target ? 'T' : state(c) !== 'none' ? run().dist[c] : '' }}
          </button>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="play()" [disabled]="atEnd()"><i class="bi bi-play-fill" aria-hidden="true"></i> Play</button>
        <button type="button" class="w-btn" (click)="finish()">Finish</button>
        <button type="button" class="w-btn" (click)="restart()">Restart</button>
        <button type="button" class="w-btn" (click)="clearWalls()">Clear obstacles</button>
      </div>
      <div class="small">Visited <b>{{ k() }}</b> · In the queue <b>{{ queueSize() }}</b> · <span class="key k1"></span> visited <span class="key k2"></span> waiting in the queue <span class="key k3"></span> shortest path</div>
      <div class="w-msg mt-2" [class.ok]="atEnd() && run().found" [class.err]="atEnd() && !run().found" [class.info]="!atEnd()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; max-width: 460px; margin: 0 auto; }
    .cell { aspect-ratio: 1; min-width: 0; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-size: 0.72rem; font-weight: 700; padding: 0; cursor: pointer; transition: background 0.2s; }
    .cell.wall { background: var(--text-muted); border-color: var(--text-muted); opacity: 0.75; }
    .cell.done { background: rgba(139, 92, 246, 0.22); }
    .cell.wait { background: rgba(6, 182, 212, 0.25); border-color: #0891b2; }
    .cell.cur { background: rgba(245, 158, 11, 0.5); border-color: #f59e0b; }
    .cell.path { background: rgba(16, 185, 129, 0.55); border-color: #10b981; }
    .cell.end { outline: 2px solid #8b5cf6; outline-offset: -2px; font-size: 0.85rem; }
    .key { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin: 0 3px 0 6px; vertical-align: middle; }
    .k1 { background: rgba(139, 92, 246, 0.35); } .k2 { background: rgba(6, 182, 212, 0.4); } .k3 { background: rgba(16, 185, 129, 0.6); }
  `]
})
export class BfsGridWidget {
  readonly cells = Array.from({ length: COLS * ROWS }, (_, i) => i);
  readonly start = START;
  readonly target = TARGET;
  walls = signal(new Set(WALLS));
  k = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  run = computed(() => bfs(this.walls()));
  atEnd = computed(() => this.k() >= this.run().order.length);
  cur = computed(() => (this.k() > 0 && !this.atEnd() ? this.run().order[this.k() - 1] : -1));
  queueSize = computed(() => this.cells.filter(c => this.state(c) === 'wait').length);
  path = computed(() => {
    const s = new Set<number>();
    const r = this.run();
    if (!this.atEnd() || !r.found) return s;
    for (let c = r.parent[TARGET]; c !== -1 && c !== START; c = r.parent[c]) s.add(c);
    return s;
  });

  state(c: number): 'done' | 'wait' | 'none' {
    const r = this.run(), k = this.k();
    if (r.deq[c] <= k) return 'done';
    if (r.enq[c] <= k && r.dist[c] >= 0) return 'wait';
    return 'none';
  }

  message = computed(() => {
    const r = this.run(), k = this.k();
    if (k === 0) return 'Start: S is in the queue with distance 0. Each step takes the cell at the front of the queue and adds its unvisited neighbours at the back with distance + 1.';
    if (this.atEnd()) return r.found
      ? `Reached T at distance ${r.dist[TARGET]}: the shortest possible walk. BFS explores in rings of equal distance, so the first time it reaches T is by a shortest route. ${r.order.length} cells visited.`
      : `The queue ran empty without reaching T: the obstacles cut it off. Every reachable cell (${r.order.length}) was visited.`;
    const c = r.order[k - 1];
    return `Took the cell at distance ${r.dist[c]} from the front of the queue and added its free neighbours at distance ${r.dist[c] + 1}.`;
  });

  label(c: number) {
    const r = Math.floor(c / COLS) + 1, col = (c % COLS) + 1;
    return `Row ${r}, column ${col}${c === START ? ', start' : c === TARGET ? ', target' : this.walls().has(c) ? ', blocked' : ''}`;
  }

  toggle(c: number) {
    if (c === START || c === TARGET) return;
    this.walls.update(w => { const n = new Set(w); n.has(c) ? n.delete(c) : n.add(c); return n; });
    this.restart();
  }
  clearWalls() { this.walls.set(new Set()); this.restart(); }
  step() { if (!this.atEnd()) this.k.update(x => x + 1); }
  finish() { clearTimeout(this.timer); this.k.set(this.run().order.length); }
  restart() { clearTimeout(this.timer); this.k.set(0); }
  play() {
    clearTimeout(this.timer);
    const tick = () => { this.step(); if (!this.atEnd()) this.timer = setTimeout(tick, 90); };
    tick();
  }
}
