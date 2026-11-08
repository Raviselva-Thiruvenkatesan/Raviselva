import { Component, computed, signal } from '@angular/core';
import { BNode, layoutBinary } from './tree-layout';

type Order = 'pre' | 'in' | 'post' | 'level';
interface Frame { cur: number | null; visited: number[]; holder: number[]; say: string }

const b = (key: number, left: BNode | null = null, right: BNode | null = null): BNode => ({ key, left, right });
const ROOT = b(8, b(4, b(2, b(1)), b(6, null, b(7))), b(12, b(10), b(14)));

function dfs(order: Exclude<Order, 'level'>): Frame[] {
  const f: Frame[] = [], visited: number[] = [], path: number[] = [];
  const rule = { pre: 'node, left, right', in: 'left, node, right', post: 'left, right, node' }[order];
  f.push({ cur: null, visited: [], holder: [], say: `${order === 'pre' ? 'Pre' : order === 'in' ? 'In' : 'Post'}-order visits each subtree as: ${rule}. The recursion remembers where it is with the call stack.` });
  const go = (n: BNode | null) => {
    if (!n) return;
    path.push(n.key);
    const leaf = !n.left && !n.right;
    if (order === 'pre') {
      visited.push(n.key);
      f.push({ cur: n.key, visited: [...visited], holder: [...path], say: `Arrive at ${n.key}: visit it immediately, then go to its ${leaf ? 'children (none: a leaf)' : 'left subtree, then its right subtree'}.` });
    } else if (!leaf) {
      f.push({ cur: n.key, visited: [...visited], holder: [...path], say: `Arrive at ${n.key}. ${order === 'in' ? 'Do not visit it yet: its left subtree comes first.' : 'Do not visit it yet: both subtrees come first.'}` });
    }
    go(n.left);
    if (order === 'in') {
      visited.push(n.key);
      f.push({ cur: n.key, visited: [...visited], holder: [...path], say: leaf ? `${n.key} is a leaf: visit it.` : `Left subtree of ${n.key} is finished: visit ${n.key}, then go right.` });
    }
    go(n.right);
    if (order === 'post') {
      visited.push(n.key);
      f.push({ cur: n.key, visited: [...visited], holder: [...path], say: leaf ? `${n.key} is a leaf: visit it.` : `Both subtrees of ${n.key} are finished: now visit ${n.key}.` });
    }
    path.pop();
  };
  go(ROOT);
  f.push({ cur: null, visited: [...visited], holder: [], say: `Done: ${visited.join(' ')}.${order === 'in' ? ' This is a binary search tree, so in-order gives the keys sorted.' : ''}` });
  return f;
}

function bfs(): Frame[] {
  const f: Frame[] = [], visited: number[] = [];
  const q: BNode[] = [ROOT];
  f.push({ cur: null, visited: [], holder: [ROOT.key], say: 'Level order uses a queue instead of recursion. Start with the root in the queue.' });
  while (q.length) {
    const n = q.shift()!;
    visited.push(n.key);
    const kids = [n.left, n.right].filter((k): k is BNode => !!k);
    q.push(...kids);
    f.push({ cur: n.key, visited: [...visited], holder: q.map(x => x.key), say: `Dequeue ${n.key} and visit it. ${kids.length ? `Enqueue its children ${kids.map(k => k.key).join(' and ')} at the back.` : 'It has no children.'}` });
  }
  f.push({ cur: null, visited: [...visited], holder: [], say: `Done: ${visited.join(' ')}. Level by level, left to right: nearest nodes first.` });
  return f;
}

/** Step through pre-, in-, post- and level-order traversal of the same binary tree. */
@Component({
  selector: 'w-traversal-stepper',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Four ways to walk a tree</h3></div>
      <div class="w-controls" role="group" aria-label="Traversal order">
        @for (o of orders; track o.id) { <button type="button" class="w-btn" [class.on]="order() === o.id" (click)="setOrder(o.id)" [attr.aria-pressed]="order() === o.id">{{ o.label }}</button> }
      </div>

      <svg [attr.viewBox]="'0 0 ' + lay.width + ' ' + lay.height" class="tree" role="img" [attr.aria-label]="'Visited so far: ' + (f().visited.join(' ') || 'none')">
        @for (e of lay.edges; track e.id) { <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" /> }
        @for (n of lay.nodes; track n.id) {
          <g class="node" [class.cur]="num(n.id) === f().cur" [class.done]="f().visited.includes(num(n.id))" [class.held]="f().holder.includes(num(n.id))">
            <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.label }}</text>
            @if (rank(num(n.id)) > 0) { <text [attr.x]="n.x + 15" [attr.y]="n.y - 12" class="rank">{{ rank(num(n.id)) }}</text> }
          </g>
        }
      </svg>

      <div class="w-label">Visit order</div>
      <div class="seq mono">
        @for (k of full(); track $index; let i = $index) { <span class="s" [class.on]="i < f().visited.length">{{ i < f().visited.length ? k : '·' }}</span> }
      </div>
      <div class="w-label mt-2">{{ order() === 'level' ? 'Queue (front → back)' : 'Call stack (root → current)' }}</div>
      <div class="seq mono">
        @for (k of f().holder; track $index) { <span class="s held">{{ k }}</span> } @empty { <span class="small text-muted">empty</span> }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="atEnd()" [class.info]="!atEnd()" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { width: 100%; max-width: 440px; display: block; margin: 0 auto; }
    .edge { stroke: var(--border-color); stroke-width: 2; }
    .node circle { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.5); stroke-width: 1.5; transition: all 0.2s; }
    .node text { font-size: 12px; font-weight: 700; fill: var(--text-main); }
    .node .rank { font-size: 10px; fill: #059669; }
    .node.held circle { stroke: #0891b2; stroke-width: 2.5; }
    .node.done circle { fill: rgba(16, 185, 129, 0.3); stroke: #10b981; }
    .node.cur circle { fill: rgba(245, 158, 11, 0.4); stroke: #f59e0b; stroke-width: 3; }
    .seq { display: flex; flex-wrap: wrap; gap: 4px; min-height: 1.9rem; align-items: center; }
    .s { min-width: 1.9rem; text-align: center; padding: 2px 6px; border-radius: 7px; border: 1.5px dashed var(--border-color); color: var(--text-muted); }
    .s.on { border-style: solid; border-color: #10b981; background: rgba(16, 185, 129, 0.2); color: var(--text-main); font-weight: 700; }
    .s.held { border-style: solid; border-color: #0891b2; background: rgba(6, 182, 212, 0.12); color: var(--text-main); font-weight: 700; }
  `]
})
export class TraversalStepperWidget {
  readonly lay = layoutBinary(ROOT, 40, 50, 22);
  readonly orders: { id: Order; label: string }[] = [
    { id: 'pre', label: 'Pre-order' }, { id: 'in', label: 'In-order' }, { id: 'post', label: 'Post-order' }, { id: 'level', label: 'Level order' }
  ];
  order = signal<Order>('pre');
  idx = signal(0);
  frames = computed(() => { const o = this.order(); return o === 'level' ? bfs() : dfs(o); });
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  full = computed(() => this.frames()[this.frames().length - 1].visited);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);

  num(id: string) { return Number(id); }
  rank(key: number) { return this.f().visited.indexOf(key) + 1; }
  setOrder(o: Order) { this.order.set(o); this.idx.set(0); }
}
