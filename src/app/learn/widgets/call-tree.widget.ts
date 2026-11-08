import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

interface TNode { id: number; k: number; x: number; y: number; parent?: number; cached: boolean; order: number }

/** Build the call tree of Fib(n), laid out with leaves left to right and parents centred above. */
function buildTree(n: number, memo: boolean): TNode[] {
  const nodes: TNode[] = [];
  const known = new Set<number>();
  let leafX = 0;
  const visit = (k: number, depth: number, parent?: number): number => {
    const id = nodes.length;
    const node: TNode = { id, k, x: 0, y: depth, parent, cached: false, order: id };
    nodes.push(node);
    // Same order as the C# in the lesson: base case first, then the memo.
    if (k <= 1) {
      node.x = leafX++;
    } else if (memo && known.has(k)) {
      node.cached = true;
      node.x = leafX++;
    } else {
      const a = visit(k - 1, depth + 1, id);
      const b = visit(k - 2, depth + 1, id);
      node.x = (nodes[a].x + nodes[b].x) / 2;
    }
    if (memo) known.add(k);
    return id;
  };
  visit(n, 0);
  return nodes;
}

const GAP = 30, LEVEL = 46, R = 13;

/** Draw the recursion tree of Fib(n), with and without memoisation, and replay the calls in order. */
@Component({
  selector: 'w-call-tree',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The call tree of Fib(n)</h3></div>
      <p class="w-hint">Each circle is one call. Click a circle to highlight every call with the same argument, or press Play to see the calls in the order they happen.</p>
      <div class="w-controls">
        <label class="w-field">n = {{ n() }}
          <input type="range" min="2" max="7" [value]="n()" (input)="setN(+$any($event.target).value)" aria-label="n">
        </label>
        <button type="button" class="w-btn" [class.on]="!memo()" (click)="setMemo(false)" [attr.aria-pressed]="!memo()">Plain recursion</button>
        <button type="button" class="w-btn" [class.on]="memo()" (click)="setMemo(true)" [attr.aria-pressed]="memo()">With memo</button>
        <button type="button" class="w-btn primary" (click)="play()"><i class="bi bi-play-fill" aria-hidden="true"></i> Play</button>
      </div>

      <div class="svg-wrap">
        <svg [attr.viewBox]="viewBox()" role="img" [attr.aria-label]="'Call tree of Fib(' + n() + ') with ' + nodes().length + ' calls'">
          @for (e of edges(); track e.id) {
            <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" [class.hidden]="e.order >= shownCount()" />
          }
          @for (c of nodes(); track c.id) {
            <g class="node" [class.hidden]="c.order >= shownCount()" [class.same]="sel() === c.k" [class.cached]="c.cached" [class.now]="c.order === shownCount() - 1 && playing()"
               (click)="select(c.k)" (keydown.enter)="select(c.k)" tabindex="0" role="button" [attr.aria-label]="'Fib(' + c.k + ')' + (c.cached ? ', from the memo' : '')">
              <circle [attr.cx]="px(c.x)" [attr.cy]="py(c.y)" [attr.r]="R" />
              <text [attr.x]="px(c.x)" [attr.y]="py(c.y) + 4" text-anchor="middle">{{ c.k }}</text>
            </g>
          }
        </svg>
      </div>

      <div class="stats small">
        <span><b>{{ nodes().length }}</b> calls</span>
        <span><b>{{ repeats() }}</b> repeated calls</span>
        @if (sel() !== null) { <span>Fib({{ sel() }}) is called <b>{{ selCount() }}</b> {{ selCount() === 1 ? 'time' : 'times' }}</span> }
      </div>
      <div class="w-msg" [class.err]="!memo() && repeats() > 0" [class.ok]="memo()" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .svg-wrap { overflow-x: auto; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 12px; }
    svg { display: block; width: 100%; min-width: 320px; height: auto; max-height: 360px; }
    .edge { stroke: var(--text-muted); stroke-width: 1.2; opacity: 0.6; transition: opacity 0.2s; }
    .node { cursor: pointer; transition: opacity 0.2s; outline: none; }
    .node circle { fill: rgba(139, 92, 246, 0.15); stroke: var(--purple); stroke-width: 1.5; }
    .node text { font-size: 12px; font-weight: 700; fill: var(--text-main); pointer-events: none; }
    .node.cached circle { fill: rgba(16, 185, 129, 0.18); stroke: #10b981; stroke-dasharray: 3 2; }
    .node.same circle { fill: rgba(245, 158, 11, 0.4); stroke: #f59e0b; stroke-width: 2.5; }
    .node.now circle { stroke-width: 4; }
    .node:focus-visible circle { stroke-width: 3.5; }
    .hidden { opacity: 0.08; }
    .stats { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; color: var(--text-muted); }
    .stats b { color: var(--text-main); }
  `]
})
export class CallTreeWidget {
  readonly R = R;
  n = signal(5);
  memo = signal(false);
  sel = signal<number | null>(null);
  shownCount = signal(Number.MAX_SAFE_INTEGER);
  playing = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  nodes = computed(() => buildTree(this.n(), this.memo()));
  private width = computed(() => Math.max(...this.nodes().map(c => c.x)) + 1);
  private depth = computed(() => Math.max(...this.nodes().map(c => c.y)) + 1);
  viewBox = computed(() => `0 0 ${this.width() * GAP + 10} ${this.depth() * LEVEL + 6}`);

  px(x: number) { return 5 + GAP / 2 + x * GAP; }
  py(y: number) { return 4 + R + y * LEVEL; }

  edges = computed(() => {
    const all = this.nodes();
    return all.filter(c => c.parent !== undefined).map(c => {
      const p = all[c.parent!];
      return { id: c.id, order: c.order, x1: this.px(p.x), y1: this.py(p.y) + R, x2: this.px(c.x), y2: this.py(c.y) - R };
    });
  });

  /** Calls whose argument was already computed somewhere earlier: wasted work without a memo. */
  repeats = computed(() => {
    const seen = new Set<number>();
    let r = 0;
    for (const c of this.nodes()) { if (seen.has(c.k)) r++; else seen.add(c.k); }
    return r;
  });

  selCount = computed(() => this.nodes().filter(c => c.k === this.sel()).length);

  note = computed(() => {
    const n = this.n();
    if (this.memo()) {
      return `With a memo each Fib(k) is calculated once and later calls (dashed green) just read the stored answer: ${this.nodes().length} calls instead of ${buildTree(n, false).length}. The work is now O(n).`;
    }
    return `Fib(${n}) makes ${this.nodes().length} calls, and ${this.repeats()} of them repeat work already done. Each extra n multiplies the calls by about 1.6, so Fib(40) needs over 300 million calls: O(2ⁿ).`;
  });

  setN(v: number) { this.stop(); this.n.set(v); this.sel.set(null); }
  setMemo(v: boolean) { this.stop(); this.memo.set(v); }
  select(k: number) { this.sel.set(this.sel() === k ? null : k); }

  play() {
    this.stop();
    this.playing.set(true);
    this.shownCount.set(0);
    const total = this.nodes().length;
    const tick = () => {
      this.shownCount.update(c => c + 1);
      if (this.shownCount() >= total) { this.playing.set(false); return; }
      this.timer = setTimeout(tick, Math.max(120, 2400 / total));
    };
    tick();
  }

  private stop() {
    clearTimeout(this.timer);
    this.playing.set(false);
    this.shownCount.set(Number.MAX_SAFE_INTEGER);
  }
}
