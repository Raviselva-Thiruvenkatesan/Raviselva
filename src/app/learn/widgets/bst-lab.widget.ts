import { Component, computed, signal } from '@angular/core';
import { BNode, heightOf, layoutBinary } from './tree-layout';

const MAX_NODES = 15;
const PRESETS: { label: string; keys: number[] }[] = [
  { label: 'Mixed order', keys: [50, 30, 70, 20, 40, 60, 80, 35, 65] },
  { label: 'Sorted order', keys: [10, 20, 30, 40, 50, 60, 70] }
];

function insert(n: BNode | null, key: number): BNode {
  if (!n) return { key, left: null, right: null };
  if (key < n.key) n.left = insert(n.left, key);
  else if (key > n.key) n.right = insert(n.right, key);
  return n;
}
function size(n: BNode | null): number { return n ? 1 + size(n.left) + size(n.right) : 0; }

/** Insert, search and delete in a binary search tree, with the comparison path highlighted. */
@Component({
  selector: 'w-bst-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Binary search tree lab</h3></div>
      <p class="w-hint">Every key in a node’s left subtree is smaller, every key in its right subtree is bigger. So each comparison sends you one way only.</p>
      <div class="w-controls">
        <label class="w-label m-0" for="bst-key">Key</label>
        <input id="bst-key" class="w-field mono key" type="number" min="1" max="99" [value]="val()" (input)="val.set(+$any($event.target).value)" />
        <button type="button" class="w-btn primary" (click)="search()">Search</button>
        <button type="button" class="w-btn" (click)="add()">Insert</button>
        <button type="button" class="w-btn" (click)="remove()">Delete</button>
      </div>
      <div class="w-controls">
        <span class="w-label m-0">Start from</span>
        @for (p of presets; track p.label) { <button type="button" class="w-btn" (click)="load(p.keys, p.label)">{{ p.label }}</button> }
        <button type="button" class="w-btn" (click)="load([], 'Empty')">Empty</button>
      </div>

      <svg [attr.viewBox]="'0 0 ' + svgW() + ' ' + lay().height" class="tree" role="img" [attr.aria-label]="'Binary search tree with ' + count() + ' keys'">
        @for (e of lay().edges; track e.id) { <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" [class.path]="path().includes(num(e.from)) && path().includes(num(e.to))" /> }
        @for (n of lay().nodes; track n.id) {
          <g class="node" [class.path]="path().includes(num(n.id))" [class.hit]="num(n.id) === hit()">
            <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.label }}</text>
          </g>
        }
        @if (!count()) { <text x="50%" y="30" text-anchor="middle" class="empty">empty tree</text> }
      </svg>
      <div class="small">Keys <b>{{ count() }}</b> · Height <b>{{ height() }}</b> · Best possible height for {{ count() }} keys <b>{{ best() }}</b> · Comparisons <b>{{ path().length }}</b></div>
      <div class="w-msg mt-2" [class.ok]="msg().kind === 'ok'" [class.err]="msg().kind === 'err'" [class.info]="msg().kind === 'info'" aria-live="polite"><span>{{ msg().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { width: 100%; max-height: 330px; display: block; margin: 0 auto 6px; }
    .edge { stroke: var(--border-color); stroke-width: 2; }
    .edge.path { stroke: #f59e0b; stroke-width: 3; }
    .node circle { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.55); stroke-width: 1.5; transition: all 0.2s; }
    .node text { font-size: 12px; font-weight: 700; fill: var(--text-main); }
    .node.path circle { fill: rgba(245, 158, 11, 0.25); stroke: #f59e0b; }
    .node.hit circle { fill: rgba(16, 185, 129, 0.35); stroke: #10b981; stroke-width: 3; }
    .empty { font-size: 12px; fill: var(--text-muted); }
    .key { width: 5rem; }
  `]
})
export class BstLabWidget {
  readonly presets = PRESETS;
  root = signal<BNode | null>(build(PRESETS[0].keys));
  val = signal(35);
  path = signal<number[]>([]);
  hit = signal<number | null>(null);
  msg = signal<{ text: string; kind: 'ok' | 'err' | 'info' }>({ text: 'Type a key and press Search, Insert or Delete. Try “Sorted order” to see what goes wrong.', kind: 'info' });

  lay = computed(() => layoutBinary(this.root(), 38, 50, 22));
  svgW = computed(() => Math.max(this.lay().width, 200));
  count = computed(() => size(this.root()));
  height = computed(() => Math.max(0, heightOf(this.root())));
  best = computed(() => (this.count() ? Math.floor(Math.log2(this.count())) : 0));

  num(id: string) { return Number(id); }

  /** Keys compared on the way down from the root looking for `key`. */
  private walk(key: number) {
    const path: number[] = [];
    let n = this.root();
    while (n) {
      path.push(n.key);
      if (key === n.key) return { path, found: true };
      n = key < n.key ? n.left : n.right;
    }
    return { path, found: false };
  }

  private key(): number | null {
    const v = this.val();
    if (!Number.isInteger(v) || v < 1 || v > 99) { this.msg.set({ text: 'Use a whole number from 1 to 99.', kind: 'err' }); return null; }
    return v;
  }

  search() {
    const k = this.key(); if (k === null) return;
    const { path, found } = this.walk(k);
    this.path.set(path); this.hit.set(found ? k : null);
    const steps = path.map((p, i) => (i === path.length - 1 && found ? `${p} ✓` : `${k} ${k < p ? '<' : '>'} ${p} → go ${k < p ? 'left' : 'right'}`)).join(', ');
    this.msg.set(found
      ? { text: `${steps}. Found after ${path.length} comparison${path.length > 1 ? 's' : ''}: at most height + 1 = ${this.height() + 1}, however many keys there are.`, kind: 'ok' }
      : { text: `${steps || 'The tree is empty'}${path.length ? ', then nothing is there' : ''}: ${k} is not in the tree.`, kind: 'err' });
  }

  add() {
    const k = this.key(); if (k === null) return;
    const { path, found } = this.walk(k);
    if (found) { this.path.set(path); this.hit.set(k); return this.msg.set({ text: `${k} is already in the tree. A BST (like SortedSet) keeps each key once.`, kind: 'info' }); }
    if (this.count() >= MAX_NODES) return this.msg.set({ text: `This demo holds at most ${MAX_NODES} keys. Delete one or reset.`, kind: 'err' });
    this.root.set(insert(this.clone(), k));
    this.path.set(path); this.hit.set(k);
    const last = path[path.length - 1];
    this.msg.set({ text: last === undefined ? `${k} becomes the root.` : `Search for ${k} until you fall off the tree, then attach it there: the ${k < last ? 'left' : 'right'} child of ${last}. ${path.length} comparison${path.length > 1 ? 's' : ''}.`, kind: 'ok' });
  }

  remove() {
    const k = this.key(); if (k === null) return;
    const { path, found } = this.walk(k);
    if (!found) { this.path.set(path); this.hit.set(null); return this.msg.set({ text: `${k} is not in the tree, so there is nothing to delete.`, kind: 'err' }); }
    let text = '';
    const del = (n: BNode | null, key: number): BNode | null => {
      if (!n) return null;
      if (key < n.key) { n.left = del(n.left, key); return n; }
      if (key > n.key) { n.right = del(n.right, key); return n; }
      if (!n.left && !n.right) { text ||= `${key} is a leaf: just remove it.`; return null; }
      if (!n.left || !n.right) { const c = (n.left ?? n.right)!; text ||= `${key} has one child (${c.key}): the child takes its place.`; return c; }
      let s = n.right;
      while (s.left) s = s.left;
      text ||= `${key} has two children. Replace it with its in-order successor ${s.key} (the smallest key in its right subtree), then delete ${s.key} from below.`;
      n.key = s.key;
      n.right = del(n.right, s.key);
      return n;
    };
    this.root.set(del(this.clone(), k));
    this.path.set([]); this.hit.set(null);
    this.msg.set({ text, kind: 'ok' });
  }

  load(keys: number[], label: string) {
    this.root.set(build(keys));
    this.path.set([]); this.hit.set(null);
    this.msg.set({ text: keys.length ? `${label}: inserted ${keys.join(', ')}. Height ${this.height()}${this.height() > this.best() + 1 ? `: sorted input made a chain, so searching is O(n) again` : ''}.` : 'Empty tree.', kind: this.height() > this.best() + 1 ? 'err' : 'info' });
  }

  private clone(): BNode | null {
    const c = (n: BNode | null): BNode | null => (n ? { key: n.key, left: c(n.left), right: c(n.right) } : null);
    return c(this.root());
  }
}

function build(keys: number[]) {
  let r: BNode | null = null;
  for (const k of keys) r = insert(r, k);
  return r;
}
