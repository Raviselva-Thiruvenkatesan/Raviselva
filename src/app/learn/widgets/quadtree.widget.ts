import { Component, computed, signal } from '@angular/core';

type Index = 'none' | 'grid' | 'quad';
interface Pt { x: number; y: number }
interface Box { x: number; y: number; w: number; h: number }
interface QNode extends Box { pts: Pt[]; kids: QNode[] | null; depth: number }

const SIZE = 320, CAP = 3, MAX_DEPTH = 5, CELLS = 4, QW = 110, QH = 80;

/** Deterministic sample: a dense cluster of sensors around the core of the building plus a few scattered ones. */
function samplePoints(): Pt[] {
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pts: Pt[] = [];
  for (let i = 0; i < 22; i++) pts.push({ x: Math.round(190 + rnd() * 90), y: Math.round(30 + rnd() * 80) });
  for (let i = 0; i < 12; i++) pts.push({ x: Math.round(12 + rnd() * 296), y: Math.round(12 + rnd() * 296) });
  return pts;
}

const intersects = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (p: Pt, b: Box) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

function build(points: Pt[]): QNode {
  const root: QNode = { x: 0, y: 0, w: SIZE, h: SIZE, pts: [], kids: null, depth: 0 };
  const insert = (n: QNode, p: Pt) => {
    if (n.kids) { insert(n.kids.find(k => inside(p, k))!, p); return; }
    n.pts.push(p);
    if (n.pts.length > CAP && n.depth < MAX_DEPTH) {
      const hw = n.w / 2, hh = n.h / 2, d = n.depth + 1;
      n.kids = [
        { x: n.x, y: n.y, w: hw, h: hh, pts: [], kids: null, depth: d },
        { x: n.x + hw, y: n.y, w: hw, h: hh, pts: [], kids: null, depth: d },
        { x: n.x, y: n.y + hh, w: hw, h: hh, pts: [], kids: null, depth: d },
        { x: n.x + hw, y: n.y + hh, w: hw, h: hh, pts: [], kids: null, depth: d }
      ];
      const old = n.pts;
      n.pts = [];
      for (const q of old) insert(n, q);
    }
  };
  for (const p of points) insert(root, p);
  return root;
}

function allNodes(n: QNode, out: QNode[] = []): QNode[] {
  out.push(n);
  n.kids?.forEach(k => allNodes(k, out));
  return out;
}

/** A point set indexed three ways (none, uniform grid, quadtree) and searched with a rectangle. */
@Component({
  selector: 'w-quadtree',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Searching an area: grid vs quadtree</h3></div>
      <p class="w-hint">Sensors on a site plan. Find every sensor inside the dashed box. An index lets you skip whole regions that cannot contain an answer.</p>
      <div class="w-controls" role="group" aria-label="Index">
        <span class="w-label m-0">Index</span>
        @for (o of indexes; track o.id) { <button type="button" class="w-btn" [class.on]="index() === o.id" (click)="index.set(o.id)" [attr.aria-pressed]="index() === o.id">{{ o.label }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Click action">
        <span class="w-label m-0">Click</span>
        <button type="button" class="w-btn" [class.on]="!adding()" (click)="adding.set(false)" [attr.aria-pressed]="!adding()">moves the box</button>
        <button type="button" class="w-btn" [class.on]="adding()" (click)="adding.set(true)" [attr.aria-pressed]="adding()">adds a sensor</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>

      <svg viewBox="0 0 320 320" class="plan" (click)="onClick($event)" role="img" [attr.aria-label]="'Search box finds ' + result().found.length + ' of ' + points().length + ' sensors'">
        <rect x="0" y="0" width="320" height="320" class="bg" />
        @if (index() === 'grid') {
          @for (c of gridCells; track $index) {
            <rect [attr.x]="c.x" [attr.y]="c.y" [attr.width]="c.w" [attr.height]="c.h" class="cell" [class.visit]="isVisitedCell(c)" />
          }
        }
        @if (index() === 'quad') {
          @for (n of nodes(); track $index) {
            <rect [attr.x]="n.x" [attr.y]="n.y" [attr.width]="n.w" [attr.height]="n.h" class="cell" [class.visit]="!n.kids && result().visited.has(n)" />
          }
        }
        <rect [attr.x]="q().x" [attr.y]="q().y" [attr.width]="q().w" [attr.height]="q().h" class="query" />
        @for (p of points(); track $index) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3.6" class="pt" [class.chk]="result().checked.has(p)" [class.hit]="result().found.includes(p)" />
        }
      </svg>

      <div class="stats small">
        <span>Sensors checked <b>{{ result().checked.size }}</b> of {{ points().length }}</span>
        <span>Found <b>{{ result().found.length }}</b></span>
        @if (index() === 'quad') { <span>Leaf regions visited <b>{{ result().leaves }}</b> of {{ leafCount() }}</span> }
        @if (index() === 'grid') { <span>Cells visited <b>{{ result().leaves }}</b> of {{ gridCells.length }}</span> }
      </div>
      <div class="w-msg mt-2 info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plan { width: 100%; max-width: 360px; display: block; margin: 0 auto; cursor: crosshair; touch-action: manipulation; }
    .bg { fill: var(--bg-main); stroke: var(--border-color); }
    .cell { fill: transparent; stroke: rgba(139, 92, 246, 0.45); stroke-width: 1; }
    .cell.visit { fill: rgba(245, 158, 11, 0.14); }
    .query { fill: rgba(16, 185, 129, 0.08); stroke: #10b981; stroke-width: 2; stroke-dasharray: 6 4; }
    .pt { fill: var(--text-muted); opacity: 0.7; }
    .pt.chk { fill: #f59e0b; opacity: 1; }
    .pt.hit { fill: #10b981; opacity: 1; stroke: #065f46; stroke-width: 1; }
    .stats { display: flex; flex-wrap: wrap; gap: 4px 16px; justify-content: center; margin-top: 0.5rem; }
  `]
})
export class QuadtreeWidget {
  readonly indexes: { id: Index; label: string }[] = [
    { id: 'none', label: 'None (check all)' },
    { id: 'grid', label: 'Uniform grid' },
    { id: 'quad', label: 'Quadtree' }
  ];
  readonly gridCells: Box[] = Array.from({ length: CELLS * CELLS }, (_, i) => ({ x: (i % CELLS) * (SIZE / CELLS), y: Math.floor(i / CELLS) * (SIZE / CELLS), w: SIZE / CELLS, h: SIZE / CELLS }));
  index = signal<Index>('quad');
  adding = signal(false);
  points = signal<Pt[]>(samplePoints());
  centre = signal<Pt>({ x: 195, y: 110 });

  q = computed<Box>(() => {
    const c = this.centre();
    return { x: Math.min(Math.max(c.x - QW / 2, 0), SIZE - QW), y: Math.min(Math.max(c.y - QH / 2, 0), SIZE - QH), w: QW, h: QH };
  });
  tree = computed(() => build(this.points()));
  nodes = computed(() => allNodes(this.tree()));
  leafCount = computed(() => this.nodes().filter(n => !n.kids).length);

  result = computed(() => {
    const q = this.q(), checked = new Set<Pt>(), visited = new Set<QNode>();
    let leaves = 0;
    if (this.index() === 'none') this.points().forEach(p => checked.add(p));
    else if (this.index() === 'grid') {
      for (const c of this.gridCells) if (intersects(c, q)) { leaves++; this.points().filter(p => inside(p, c)).forEach(p => checked.add(p)); }
    } else {
      const go = (n: QNode) => {
        if (!intersects(n, q)) return;
        visited.add(n);
        if (n.kids) n.kids.forEach(go);
        else { leaves++; n.pts.forEach(p => checked.add(p)); }
      };
      go(this.tree());
    }
    const found = [...checked].filter(p => inside(p, q));
    return { checked, visited, found, leaves };
  });

  isVisitedCell(c: Box) { return intersects(c, this.q()); }

  message = computed(() => {
    const r = this.result(), n = this.points().length;
    if (this.index() === 'none') return `Without an index every one of the ${n} sensors is tested against the box: O(n) per search. Fine for 30 points, hopeless for a million.`;
    if (this.index() === 'grid') return `The grid only looks inside the ${r.leaves} cells the box touches: ${r.checked.size} sensors tested. Simple and fast when points are spread evenly, but a crowded cell still has to be scanned point by point. Move the box onto the dense cluster to see it.`;
    return `The quadtree splits any region holding more than ${CAP} sensors into four, so crowded areas get small regions and empty areas stay big. Regions outside the box are skipped with their whole subtree: ${r.checked.size} sensors tested. Typical search: O(log n + answers).`;
  });

  onClick(e: MouseEvent) {
    const r = (e.currentTarget as Element).getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * SIZE), y = Math.round(((e.clientY - r.top) / r.height) * SIZE);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    if (this.adding()) { if (this.points().length < 120) this.points.update(p => [...p, { x, y }]); }
    else this.centre.set({ x, y });
  }
  reset() { this.points.set(samplePoints()); this.centre.set({ x: 195, y: 110 }); }
}
