import { Component, computed, signal } from '@angular/core';
import { segment } from './graph-data';

type Mode = 'bf' | 'fw';

// ---------- Bellman-Ford ----------
const BF_NODES = [
  { id: 'S', x: 40, y: 110 }, { id: 'A', x: 150, y: 40 }, { id: 'B', x: 150, y: 185 },
  { id: 'C', x: 270, y: 75 }, { id: 'D', x: 300, y: 190 }
];
/** Deliberately listed in an unhelpful order, so several rounds are needed. */
const BF_EDGES: [string, string, number][] = [['C', 'D', 2], ['A', 'D', 5], ['A', 'C', -4], ['B', 'C', 4], ['B', 'A', 3], ['S', 'B', 2], ['S', 'A', 6]];
const BF_CYCLE: [string, string, number] = ['D', 'A', -6];
const BF_IDS = ['S', 'A', 'B', 'C', 'D'];

interface BfRow { label: string; dist: Record<string, number>; changed: string[] }

function bellmanFord(edges: [string, string, number][]) {
  const dist: Record<string, number> = Object.fromEntries(BF_IDS.map(id => [id, Infinity]));
  dist['S'] = 0;
  const rows: BfRow[] = [{ label: 'start', dist: { ...dist }, changed: ['S'] }];
  const n = BF_IDS.length;
  let stoppedEarly = false;
  for (let round = 1; round <= n - 1; round++) {
    const changed: string[] = [];
    for (const [a, b, w] of edges) if (dist[a] + w < dist[b]) { dist[b] = dist[a] + w; if (!changed.includes(b)) changed.push(b); }
    rows.push({ label: `round ${round}`, dist: { ...dist }, changed });
    if (!changed.length) { stoppedEarly = true; break; }
  }
  let negCycle = false;
  if (!stoppedEarly) {
    const changed: string[] = [];
    for (const [a, b, w] of edges) if (dist[a] + w < dist[b]) { dist[b] = dist[a] + w; if (!changed.includes(b)) changed.push(b); }
    negCycle = changed.length > 0;
    rows.push({ label: 'check', dist: { ...dist }, changed });
  }
  return { rows, negCycle };
}

// ---------- Floyd-Warshall ----------
const FW_N = 4;
const FW_EDGES: [number, number, number][] = [[0, 1, 3], [0, 3, 7], [1, 0, 8], [1, 2, 2], [2, 0, 5], [2, 3, 1], [3, 0, 2]];

function floyd() {
  const d = Array.from({ length: FW_N }, (_, i) => Array.from({ length: FW_N }, (_, j) => (i === j ? 0 : Infinity)));
  for (const [a, b, w] of FW_EDGES) d[a][b] = w;
  const mats = [{ k: -1, d: d.map(r => [...r]), changed: [] as string[] }];
  for (let k = 0; k < FW_N; k++) {
    const changed: string[] = [];
    for (let i = 0; i < FW_N; i++) for (let j = 0; j < FW_N; j++)
      if (d[i][k] + d[k][j] < d[i][j]) { d[i][j] = d[i][k] + d[k][j]; changed.push(`${i},${j}`); }
    mats.push({ k, d: d.map(r => [...r]), changed });
  }
  return mats;
}

/** Bellman-Ford rounds (with a negative edge) and Floyd-Warshall matrices, step by step. */
@Component({
  selector: 'w-bellman-floyd',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Bellman-Ford and Floyd-Warshall</h3></div>
      <div class="w-controls" role="group" aria-label="Algorithm">
        <button type="button" class="w-btn" [class.on]="mode() === 'bf'" (click)="setMode('bf')" [attr.aria-pressed]="mode() === 'bf'">Bellman-Ford (one source)</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'fw'" (click)="setMode('fw')" [attr.aria-pressed]="mode() === 'fw'">Floyd-Warshall (all pairs)</button>
      </div>

      @if (mode() === 'bf') {
        <p class="w-hint">One-way links with costs; A → C is −4 (a negative cost, like a credit). Each round relaxes <b>every</b> edge once, in the order listed below. With 5 nodes, 4 rounds are always enough, unless there is a negative cycle.</p>
        <div class="w-controls">
          <button type="button" class="w-btn" [class.on]="cycle()" (click)="setCycle(!cycle())" [attr.aria-pressed]="cycle()">Add D → A (−6): a negative cycle</button>
        </div>
        <svg viewBox="0 0 340 230" class="gsvg small-g" role="img" aria-label="Directed graph with a negative edge">
          <defs><marker id="bf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="arrow" /></marker></defs>
          @for (e of bfLines(); track e.key) {
            <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="g-edge" [class.bad]="e.w < 0" marker-end="url(#bf-arrow)" />
            <text [attr.x]="e.mx" [attr.y]="e.my + 4" text-anchor="middle" class="g-w" [class.neg]="e.w < 0">{{ e.w }}</text>
          }
          @for (n of bfNodes; track n.id) {
            <g class="g-node" [class.done]="bfRow().dist[n.id] < inf"><circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" /><text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.id }}</text></g>
          }
        </svg>
        <div class="small mono mb-1">Edge order: {{ edgeOrder() }}</div>
        <div class="tscroll">
          <table class="wtable mono"><tbody>
            <tr><th></th>@for (id of bfIds; track id) { <th>{{ id }}</th> }</tr>
            @for (r of bfShown(); track r.label) {
              <tr><th>{{ r.label }}</th>@for (id of bfIds; track id) { <td [class.hl]="r.changed.includes(id)">{{ show(r.dist[id]) }}</td> }</tr>
            }
          </tbody></table>
        </div>
      } @else {
        <p class="w-hint">Distances between every pair of 4 places. Step k allows routes that pass through place k. A cell improves when going i → k → j is shorter than the best i → j so far.</p>
        <div class="tscroll">
          <table class="wtable mono fw"><tbody>
            <tr><th>from \\ to</th>@for (j of fwIdx; track j) { <th>{{ j + 1 }}</th> }</tr>
            @for (i of fwIdx; track i) {
              <tr><th>{{ i + 1 }}</th>@for (j of fwIdx; track j) { <td [class.hl]="fwCur().changed.includes(i + ',' + j)" [class.ok]="i === fwCur().k || j === fwCur().k">{{ show(fwCur().d[i][j]) }}</td> }</tr>
            }
          </tbody></table>
        </div>
        <div class="small mt-1">Links: 1→2 (3), 1→4 (7), 2→1 (8), 2→3 (2), 3→1 (5), 3→4 (1), 4→1 (2)</div>
      }

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Next {{ mode() === 'bf' ? 'round' : 'k' }}</button>
        <button type="button" class="w-btn" (click)="idx.set(total() - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="atEnd() && !(mode() === 'bf' && bf().negCycle)" [class.err]="atEnd() && mode() === 'bf' && bf().negCycle" [class.info]="!atEnd()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .arrow { fill: var(--text-muted); }
    .small-g { max-width: 380px; }
    .g-w.neg { fill: #dc2626; }
    .fw td { min-width: 2.4rem; }
  `]
})
export class BellmanFloydWidget {
  readonly inf = Infinity;
  readonly bfNodes = BF_NODES;
  readonly bfIds = BF_IDS;
  readonly fwIdx = [0, 1, 2, 3];
  readonly fw = floyd();
  mode = signal<Mode>('bf');
  cycle = signal(false);
  idx = signal(0);
  private pos = new Map(BF_NODES.map(n => [n.id, n]));

  bfEdges = computed(() => (this.cycle() ? [...BF_EDGES, BF_CYCLE] : BF_EDGES));
  bf = computed(() => bellmanFord(this.bfEdges()));
  bfLines = computed(() => this.bfEdges().map(([a, b, w]) => ({ key: a + b, w, ...segment(this.pos.get(a)!, this.pos.get(b)!, 16) })));
  edgeOrder = computed(() => this.bfEdges().map(([a, b, w]) => `${a}→${b} ${w}`).join(', '));
  total = computed(() => (this.mode() === 'bf' ? this.bf().rows.length : this.fw.length));
  atEnd = computed(() => this.idx() >= this.total() - 1);
  bfShown = computed(() => this.bf().rows.slice(0, this.idx() + 1));
  bfRow = computed(() => this.bfShown()[this.bfShown().length - 1]);
  fwCur = computed(() => this.fw[Math.min(this.idx(), this.fw.length - 1)]);

  message = computed(() => {
    if (this.mode() === 'bf') {
      const r = this.bfRow(), { negCycle } = this.bf();
      if (r.label === 'start') return 'Start: S = 0, everything else ∞.';
      if (r.label === 'check') return negCycle
        ? `Extra check after ${BF_IDS.length - 1} rounds: ${r.changed.join(', ')} still improved. With no negative cycle that is impossible, so a negative cycle exists (A → C → D → A costs −4 + 2 − 6 = −8). Shortest paths are undefined: you could loop for ever.`
        : 'Extra check: nothing improves any more, so there is no negative cycle and these distances are final.';
      if (!r.changed.length) return `${r.label}: no distance changed, so every later round would change nothing either. Stop early: these are the shortest distances, even with the −4 edge.`;
      return `${r.label}: relaxed all ${this.bfEdges().length} edges; ${r.changed.join(', ')} improved. A shortest path with up to ${r.label.split(' ')[1]} edge(s) is now known for every node.`;
    }
    const m = this.fwCur();
    if (m.k < 0) return 'Start: direct links only (∞ = no direct link). Diagonal is 0.';
    return m.changed.length
      ? `k = ${m.k + 1}: allowing routes through ${m.k + 1}, ${m.changed.length} cell(s) improved (amber). Three nested loops over k, i, j: O(V³).`
      : `k = ${m.k + 1}: going through ${m.k + 1} improves nothing.`;
  });

  show(d: number) { return d === Infinity ? '∞' : String(d); }
  setMode(m: Mode) { this.mode.set(m); this.idx.set(0); }
  setCycle(v: boolean) { this.cycle.set(v); this.idx.set(0); }
}
