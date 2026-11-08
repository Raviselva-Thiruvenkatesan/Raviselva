import { Component, computed, signal } from '@angular/core';
import { BNode, heightOf, layoutBinary } from './tree-layout';

interface AN { key: number; left: AN | null; right: AN | null; h: number }

const SEQS: { label: string; keys: number[] }[] = [
  { label: '10 20 30 40 50 25', keys: [10, 20, 30, 40, 50, 25] },
  { label: '1 to 7 sorted', keys: [1, 2, 3, 4, 5, 6, 7] },
  { label: '30 20 10 5 25 27', keys: [30, 20, 10, 5, 25, 27] }
];

const h = (n: AN | null) => (n ? n.h : 0);
const upd = (n: AN) => { n.h = 1 + Math.max(h(n.left), h(n.right)); };
const bal = (n: AN | null) => (n ? h(n.left) - h(n.right) : 0);
function rotR(y: AN): AN { const x = y.left!; y.left = x.right; x.right = y; upd(y); upd(x); return x; }
function rotL(x: AN): AN { const y = x.right!; x.right = y.left; y.left = x; upd(x); upd(y); return y; }

/** AVL insert that records which rotation it made (if any). */
function insert(n: AN | null, k: number, log: { text: string; keys: number[] }): AN {
  if (!n) return { key: k, left: null, right: null, h: 1 };
  if (k < n.key) n.left = insert(n.left, k, log);
  else if (k > n.key) n.right = insert(n.right, k, log);
  else return n;
  upd(n);
  const b = bal(n);
  if (b > 1 && k < n.left!.key) { log.text = `Node ${n.key} has balance +2 and ${k} went left-left: one right rotation around ${n.key}. ${n.left!.key} moves up.`; log.keys = [n.key, n.left!.key]; return rotR(n); }
  if (b < -1 && k > n.right!.key) { log.text = `Node ${n.key} has balance −2 and ${k} went right-right: one left rotation around ${n.key}. ${n.right!.key} moves up.`; log.keys = [n.key, n.right!.key]; return rotL(n); }
  if (b > 1) { const c = n.left!, g = c.right!; log.text = `Node ${n.key} has balance +2 and ${k} went left-right: rotate ${c.key} left, then ${n.key} right. ${g.key} moves to the top.`; log.keys = [n.key, c.key, g.key]; n.left = rotL(c); return rotR(n); }
  if (b < -1) { const c = n.right!, g = c.left!; log.text = `Node ${n.key} has balance −2 and ${k} went right-left: rotate ${c.key} right, then ${n.key} left. ${g.key} moves to the top.`; log.keys = [n.key, c.key, g.key]; n.right = rotR(c); return rotL(n); }
  return n;
}

function plainInsert(n: BNode | null, k: number): BNode {
  if (!n) return { key: k, left: null, right: null };
  if (k < n.key) n.left = plainInsert(n.left, k); else if (k > n.key) n.right = plainInsert(n.right, k);
  return n;
}

function find(n: AN | null, k: number): AN | null {
  while (n && n.key !== k) n = k < n.key ? n.left : n.right;
  return n;
}

/** Insert keys one by one into an AVL tree and watch the rotations keep it balanced. */
@Component({
  selector: 'w-avl-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>An AVL tree rebalancing itself</h3></div>
      <p class="w-hint">The small number beside each node is its <strong>balance factor</strong>: height(left) − height(right). AVL keeps every factor at −1, 0 or +1. When an insert makes one ±2, a rotation fixes it.</p>
      <div class="w-controls" role="group" aria-label="Insert sequence">
        <span class="w-label m-0">Sequence</span>
        @for (s of seqs; track s.label; let i = $index) { <button type="button" class="w-btn mono" [class.on]="seqIdx() === i" (click)="pick(i)" [attr.aria-pressed]="seqIdx() === i">{{ s.label }}</button> }
      </div>

      <svg [attr.viewBox]="'0 0 ' + svgW() + ' ' + lay().height" class="tree" role="img" [attr.aria-label]="'AVL tree after ' + count() + ' inserts'">
        @for (e of lay().edges; track e.id) { <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" /> }
        @for (n of lay().nodes; track n.id) {
          <g class="node" [class.rot]="state().log.keys.includes(num(n.id))" [class.new]="num(n.id) === lastKey()">
            <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.label }}</text>
            <text [attr.x]="n.x + 17" [attr.y]="n.y - 11" class="bf">{{ bfText(num(n.id)) }}</text>
          </g>
        }
        @if (!count()) { <text x="50%" y="30" text-anchor="middle" class="empty">empty tree</text> }
      </svg>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="count.set(count() + 1)" [disabled]="count() >= seq().length">{{ count() < seq().length ? 'Insert ' + seq()[count()] : 'All inserted' }}</button>
        <button type="button" class="w-btn" (click)="count.set(seq().length)">Insert all</button>
        <button type="button" class="w-btn" (click)="count.set(0)">Restart</button>
      </div>
      <div class="small">AVL height <b>{{ avlHeight() }}</b> · a plain BST with the same inserts would have height <b [class.w-err]="plainHeight() > avlHeight()">{{ plainHeight() }}</b></div>
      <div class="w-msg mt-2" [class.err]="!!state().log.text" [class.info]="!state().log.text" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { width: 100%; max-width: 420px; max-height: 280px; display: block; margin: 0 auto; }
    .edge { stroke: var(--border-color); stroke-width: 2; }
    .node circle { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.55); stroke-width: 1.5; transition: all 0.2s; }
    .node text { font-size: 12px; font-weight: 700; fill: var(--text-main); }
    .node .bf { font-size: 10px; font-weight: 600; fill: var(--text-muted); }
    .node.new circle { fill: rgba(16, 185, 129, 0.3); stroke: #10b981; }
    .node.rot circle { fill: rgba(245, 158, 11, 0.3); stroke: #f59e0b; stroke-width: 2.5; }
    .empty { font-size: 12px; fill: var(--text-muted); }
  `]
})
export class AvlVizWidget {
  readonly seqs = SEQS;
  seqIdx = signal(0);
  count = signal(0);
  seq = computed(() => SEQS[this.seqIdx()].keys);

  state = computed(() => {
    let root: AN | null = null;
    let log = { text: '', keys: [] as number[] };
    for (const k of this.seq().slice(0, this.count())) {
      log = { text: '', keys: [] };
      root = insert(root, k, log);
    }
    return { root, log };
  });
  lay = computed(() => layoutBinary(this.state().root, 40, 52, 24));
  svgW = computed(() => Math.max(this.lay().width, 200));
  avlHeight = computed(() => Math.max(0, heightOf(this.state().root)));
  plainHeight = computed(() => {
    let r: BNode | null = null;
    for (const k of this.seq().slice(0, this.count())) r = plainInsert(r, k);
    return Math.max(0, heightOf(r));
  });
  lastKey = computed(() => (this.count() ? this.seq()[this.count() - 1] : null));
  message = computed(() => {
    const k = this.lastKey();
    if (k === null) return 'Press Insert to add the first key. Watch the balance factors.';
    return this.state().log.text || `Inserted ${k} like in a normal BST. Every balance factor is still −1, 0 or +1, so no rotation is needed.`;
  });

  num(id: string) { return Number(id); }
  bfText(key: number) { const b = bal(find(this.state().root, key)); return b > 0 ? '+' + b : b < 0 ? '−' + -b : '0'; }
  pick(i: number) { this.seqIdx.set(i); this.count.set(0); }
}
