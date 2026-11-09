import { Component, computed, signal } from '@angular/core';
import { num } from './vec-plane';

type Kind = 'brute' | 'grid' | 'tree';
interface R { x0: number; y0: number; x1: number; y1: number }
interface Node { r: R; items: number[]; kids: Node[] | null }

const WX = 24, WY = 16, CELL = 3, LEAF = 6, DEPTH = 6;
const S = 12, OX = 6, OY = 6;

/** 160 small elements, the same every time (a tiny linear congruential generator). */
const ITEMS: R[] = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out: R[] = [];
  for (let i = 0; i < 160; i++) {
    const cluster = i < 90, x = cluster ? 2 + rnd() * 9 : rnd() * (WX - 1), y = cluster ? 2 + rnd() * 6 : rnd() * (WY - 1);
    const w = 0.2 + rnd() * 0.9, h = 0.2 + rnd() * 0.9;
    out.push({ x0: x, y0: y, x1: Math.min(WX, x + w), y1: Math.min(WY, y + h) });
  }
  return out;
})();

const hit = (a: R, b: R) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Quadtree: split a node into four when it holds more than LEAF items; an item goes into every child it overlaps. */
function build(r: R, items: number[], depth: number): Node {
  if (items.length <= LEAF || depth === DEPTH) return { r, items, kids: null };
  const mx = (r.x0 + r.x1) / 2, my = (r.y0 + r.y1) / 2;
  const quads: R[] = [
    { x0: r.x0, y0: r.y0, x1: mx, y1: my }, { x0: mx, y0: r.y0, x1: r.x1, y1: my },
    { x0: r.x0, y0: my, x1: mx, y1: r.y1 }, { x0: mx, y0: my, x1: r.x1, y1: r.y1 }
  ];
  return { r, items: [], kids: quads.map(q => build(q, items.filter(i => hit(ITEMS[i], q)), depth + 1)) };
}
const TREE = build({ x0: 0, y0: 0, x1: WX, y1: WY }, ITEMS.map((_, i) => i), 0);
const NODES: Node[] = [];
(function walk(n: Node) { NODES.push(n); n.kids?.forEach(walk); })(TREE);

/** Uniform grid: each cell lists the items that overlap it. */
const GRID: number[][] = (() => {
  const g: number[][] = Array.from({ length: (WX / CELL) * (WY / CELL) }, () => []);
  ITEMS.forEach((it, i) => {
    for (let cx = Math.floor(it.x0 / CELL); cx <= Math.min(WX / CELL - 1, Math.floor(it.x1 / CELL)); cx++)
      for (let cy = Math.floor(it.y0 / CELL); cy <= Math.min(WY / CELL - 1, Math.floor(it.y1 / CELL)); cy++) g[cy * (WX / CELL) + cx].push(i);
  });
  return g;
})();

/** A window query (select everything in a rectangle) by brute force, through a uniform grid and through a quadtree. */
@Component({
  selector: 'w-spatial',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Finding elements without testing them all</h3></div>
      <div class="w-controls" role="group" aria-label="Index">
        @for (k of kinds; track k.k) {
          <button type="button" class="w-btn" [class.on]="kind() === k.k" [attr.aria-pressed]="kind() === k.k" (click)="kind.set(k.k)">{{ k.label }}</button>
        }
      </div>
      <svg viewBox="0 0 300 204" class="view" role="img" [attr.aria-label]="message()">
        <rect [attr.x]="OX" [attr.y]="OY" [attr.width]="WX * S" [attr.height]="WY * S" class="world" />
        @for (c of cells(); track $index) {
          <rect [attr.x]="sx(c.r.x0)" [attr.y]="sy(c.r.y1)" [attr.width]="(c.r.x1 - c.r.x0) * S" [attr.height]="(c.r.y1 - c.r.y0) * S" class="cell" [class.on]="c.on" />
        }
        @for (it of items; track $index) {
          <rect [attr.x]="sx(it.x0)" [attr.y]="sy(it.y1)" [attr.width]="(it.x1 - it.x0) * S" [attr.height]="(it.y1 - it.y0) * S" class="it" [class.cand]="state()[$index] === 1" [class.hit]="state()[$index] === 2" />
        }
        <rect [attr.x]="sx(q().x0)" [attr.y]="sy(q().y1)" [attr.width]="(q().x1 - q().x0) * S" [attr.height]="(q().y1 - q().y0) * S" class="q" />
      </svg>
      <div class="w-grid two mt-2">
        <div>
          <label class="w-field mb-1">window x = {{ qx() }} m
            <input type="range" min="0" max="20" step="0.5" [value]="qx()" (input)="qx.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-1">window y = {{ qy() }} m
            <input type="range" min="0" max="12" step="0.5" [value]="qy()" (input)="qy.set(+$any($event.target).value)" />
          </label>
          <label class="w-field">window size = {{ qs() }} m
            <input type="range" min="1" max="10" step="0.5" [value]="qs()" (input)="qs.set(+$any($event.target).value)" />
          </label>
        </div>
        <table class="wtable mono"><tbody>
          <tr><th>elements</th><td>{{ items.length }}</td></tr>
          <tr><th>{{ kind() === 'tree' ? 'nodes visited' : kind() === 'grid' ? 'cells visited' : '—' }}</th><td>{{ kind() === 'brute' ? '—' : result().visited }}</td></tr>
          <tr><th>boxes tested</th><td [class.hl]="kind() === 'brute'" [class.ok]="kind() !== 'brute'">{{ result().tested }}</td></tr>
          <tr><th>found</th><td>{{ result().found }}</td></tr>
        </tbody></table>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 520px; display: block; margin: 0 auto; }
    .world { fill: var(--bg-main); stroke: var(--border-color); }
    .cell { fill: none; stroke: var(--border-color); stroke-width: 0.8; }
    .cell.on { fill: rgba(245, 158, 11, 0.12); stroke: #f59e0b; }
    .it { fill: rgba(148, 163, 184, 0.35); stroke: var(--text-muted); stroke-width: 0.6; }
    .it.cand { fill: rgba(245, 158, 11, 0.5); stroke: #f59e0b; }
    .it.hit { fill: rgba(16, 185, 129, 0.7); stroke: #10b981; }
    .q { fill: rgba(59, 130, 246, 0.1); stroke: #3b82f6; stroke-width: 2; stroke-dasharray: 5 3; }
  `]
})
export class SpatialWidget {
  readonly items = ITEMS;
  readonly OX = OX;
  readonly OY = OY;
  readonly WX = WX;
  readonly WY = WY;
  readonly S = S;
  readonly kinds: { k: Kind; label: string }[] = [
    { k: 'brute', label: 'Test every box' }, { k: 'grid', label: 'Uniform grid' }, { k: 'tree', label: 'Quadtree' }
  ];

  kind = signal<Kind>('grid');
  qx = signal(4);
  qy = signal(3);
  qs = signal(3);

  q = computed<R>(() => ({ x0: this.qx(), y0: this.qy(), x1: Math.min(WX, this.qx() + this.qs()), y1: Math.min(WY, this.qy() + this.qs()) }));

  /** Which items were tested and which were found, plus the cells or nodes the search opened. */
  result = computed(() => {
    const q = this.q(), tested = new Set<number>(), open: R[] = [];
    if (this.kind() === 'brute') ITEMS.forEach((_, i) => tested.add(i));
    else if (this.kind() === 'grid') {
      const n = WX / CELL;
      for (let cx = Math.floor(q.x0 / CELL); cx <= Math.min(n - 1, Math.floor(q.x1 / CELL)); cx++)
        for (let cy = Math.floor(q.y0 / CELL); cy <= Math.min(WY / CELL - 1, Math.floor(q.y1 / CELL)); cy++) {
          open.push({ x0: cx * CELL, y0: cy * CELL, x1: (cx + 1) * CELL, y1: (cy + 1) * CELL });
          GRID[cy * n + cx].forEach(i => tested.add(i));
        }
    } else {
      const visit = (nd: Node) => {
        if (!hit(nd.r, q)) return;
        open.push(nd.r);
        if (nd.kids) nd.kids.forEach(visit); else nd.items.forEach(i => tested.add(i));
      };
      visit(TREE);
    }
    const found = [...tested].filter(i => hit(ITEMS[i], q));
    return { tested: tested.size, found: found.length, visited: open.length, open, foundSet: new Set(found), testedSet: tested };
  });
  state = computed(() => {
    const r = this.result();
    if (this.kind() === 'brute') return ITEMS.map((_, i) => (r.foundSet.has(i) ? 2 : 0));
    return ITEMS.map((_, i) => (r.foundSet.has(i) ? 2 : r.testedSet.has(i) ? 1 : 0));
  });
  cells = computed(() => {
    const open = this.result().open;
    if (this.kind() === 'grid') {
      const all: { r: R; on: boolean }[] = [];
      for (let cx = 0; cx < WX / CELL; cx++) for (let cy = 0; cy < WY / CELL; cy++) {
        const r = { x0: cx * CELL, y0: cy * CELL, x1: (cx + 1) * CELL, y1: (cy + 1) * CELL };
        all.push({ r, on: open.some(o => o.x0 === r.x0 && o.y0 === r.y0) });
      }
      return all;
    }
    if (this.kind() === 'tree') return NODES.filter(n => !n.kids).map(n => ({ r: n.r, on: open.includes(n.r) }));
    return [];
  });

  message = computed(() => {
    const r = this.result(), k = this.kind();
    if (k === 'brute') return `Brute force compares the window with all ${ITEMS.length} boxes to find ${r.found}. Fine for one query on a small model; hopeless for 200 000 elements queried on every mouse move.`;
    if (k === 'grid') return `The grid only opens the ${r.visited} cells under the window and tests the ${r.tested} boxes listed in them (amber) to find ${r.found} (green): ${num((r.tested / ITEMS.length) * 100, 0)}% of the work. Cells of a fixed size suit evenly spread models but waste effort where elements crowd together.`;
    return `The quadtree splits only where elements crowd, so the dense cluster gets small cells and empty space stays one big cell. The search visited ${r.visited} nodes and tested ${r.tested} boxes to find ${r.found}.`;
  });

  sx(x: number) { return OX + x * S; }
  sy(y: number) { return OY + (WY - y) * S; }
}
