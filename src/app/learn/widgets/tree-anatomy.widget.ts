import { Component, computed, signal } from '@angular/core';
import { GNode, layoutGeneral } from './tree-layout';

const g = (id: string, label: string, children: GNode[] = []): GNode => ({ id, label, children });
const TREE = g('p', 'Project', [
  g('a', 'Bldg A', [
    g('a1', 'Level 1', [g('c1', 'C1'), g('c2', 'C2')]),
    g('a2', 'Level 2', [g('c3', 'C3')])
  ]),
  g('b', 'Bldg B', [
    g('b1', 'Level 1', [g('x1', 'B1'), g('x2', 'B2'), g('x3', 'B3')])
  ])
]);

interface Info { node: GNode; parent: GNode | null; depth: number; height: number; size: number; path: GNode[] }

function index(root: GNode) {
  const info = new Map<string, Info>();
  const walk = (n: GNode, parent: GNode | null, path: GNode[]): { height: number; size: number } => {
    const kids = n.children.map(c => walk(c, n, [...path, n]));
    const height = kids.length ? 1 + Math.max(...kids.map(k => k.height)) : 0;
    const size = 1 + kids.reduce((s, k) => s + k.size, 0);
    info.set(n.id, { node: n, parent, depth: path.length, height, size, path: [...path, n] });
    return { height, size };
  };
  walk(root, null, []);
  return info;
}

/** Click any node of a small project hierarchy to see the tree vocabulary for it. */
@Component({
  selector: 'w-tree-anatomy',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Anatomy of a tree</h3></div>
      <p class="w-hint">A project broken down into buildings, levels and columns. Click any node.</p>

      <svg [attr.viewBox]="'0 0 ' + lay.width + ' ' + lay.height" class="tree" role="group" aria-label="Project hierarchy tree">
        @for (e of lay.edges; track e.id) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" [class.path]="onPath(e.to) && onPath(e.from)" [class.sub]="inSub(e.to) && e.to !== sel()" />
        }
        @for (n of lay.nodes; track n.id) {
          <g class="node" [class.sel]="n.id === sel()" [class.path]="onPath(n.id) && n.id !== sel()" [class.sub]="inSub(n.id) && n.id !== sel()" [class.leaf]="isLeaf(n.id)"
             (click)="sel.set(n.id)" (keydown.enter)="sel.set(n.id)" tabindex="0" role="button" [attr.aria-label]="n.label">
            <rect [attr.x]="n.x - w(n.label) / 2" [attr.y]="n.y - 12" [attr.width]="w(n.label)" height="24" rx="7" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.label }}</text>
          </g>
        }
      </svg>
      <p class="small text-muted mb-2">Amber = selected · blue = path from the root · purple = its subtree · dashed = leaf</p>

      <div class="facts">
        <div><span class="w-label">Kind</span><b>{{ kind() }}</b></div>
        <div><span class="w-label">Depth</span><b>{{ cur().depth }}</b> <small>{{ cur().depth === 1 ? 'edge' : 'edges' }} from the root</small></div>
        <div><span class="w-label">Height</span><b>{{ cur().height }}</b> <small>{{ cur().height === 1 ? 'edge' : 'edges' }} down to its deepest leaf</small></div>
        <div><span class="w-label">Parent</span><b>{{ cur().parent?.label ?? 'none' }}</b></div>
        <div><span class="w-label">Children</span><b>{{ childNames() }}</b></div>
        <div><span class="w-label">Subtree size</span><b>{{ cur().size }}</b> <small>{{ cur().size === 1 ? 'node' : 'nodes' }}</small></div>
      </div>
      <div class="w-msg info mt-2"><span>Path: {{ pathText() }}. The whole tree has {{ total }} nodes and {{ total - 1 }} edges (always n − 1) and height {{ rootHeight }}.</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { width: 100%; max-width: 560px; display: block; margin: 0 auto; }
    .edge { stroke: var(--border-color); stroke-width: 2; }
    .edge.path { stroke: #0891b2; stroke-width: 3; }
    .edge.sub { stroke: rgba(139, 92, 246, 0.7); }
    .node { cursor: pointer; outline: none; }
    .node rect { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.5); stroke-width: 1.5; transition: all 0.2s; }
    .node.leaf rect { stroke-dasharray: 4 3; }
    .node text { font-size: 11px; font-weight: 700; fill: var(--text-main); pointer-events: none; }
    .node.sub rect { fill: rgba(139, 92, 246, 0.2); }
    .node.path rect { fill: rgba(6, 182, 212, 0.18); stroke: #0891b2; }
    .node.sel rect { fill: rgba(245, 158, 11, 0.3); stroke: #f59e0b; stroke-width: 2.5; }
    .node:focus-visible rect { stroke-width: 3; }
    .facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
    .facts > div { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); min-width: 0; }
    .facts .w-label { display: block; margin: 0; }
    .facts small { color: var(--text-muted); margin-left: 4px; }
  `]
})
export class TreeAnatomyWidget {
  readonly lay = layoutGeneral(TREE, 52, 54, 30);
  readonly info = index(TREE);
  readonly total = this.info.get('p')!.size;
  readonly rootHeight = this.info.get('p')!.height;
  sel = signal('a1');

  cur = computed(() => this.info.get(this.sel())!);
  kind = computed(() => {
    const c = this.cur();
    if (!c.parent) return 'Root (no parent)';
    return c.node.children.length ? 'Internal node' : 'Leaf (no children)';
  });
  childNames = computed(() => this.cur().node.children.map(c => c.label).join(', ') || 'none');
  pathText = computed(() => this.cur().path.map(n => n.label).join(' → '));

  w(label: string) { return Math.max(30, label.length * 7 + 10); }
  isLeaf(id: string) { return this.info.get(id)!.node.children.length === 0; }
  onPath(id: string) { return this.cur().path.some(n => n.id === id); }
  inSub(id: string) { return this.info.get(id)!.path.some(n => n.id === this.sel()); }
}
