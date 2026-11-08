import { Component, computed, signal } from '@angular/core';

const START = [3, 8, 5, 12, 9, 7, 6];
const MAX = 15;
const W = 320;

interface Frame { a: number[]; hl: number[]; ok: number[]; say: string }

function pushFrames(base: number[], v: number): Frame[] {
  const a = [...base, v], f: Frame[] = [];
  let i = a.length - 1;
  f.push({ a: [...a], hl: [i], ok: [], say: `Push ${v}: put it in the next free slot, index ${i} (the end of the array, the next spot on the bottom level).` });
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (a[p] <= a[i]) { f.push({ a: [...a], hl: [i, p], ok: [i], say: `Parent at index ${p} is ${a[p]} ≤ ${a[i]}: the heap rule holds. Stop.` }); return f; }
    [a[p], a[i]] = [a[i], a[p]];
    f.push({ a: [...a], hl: [p, i], ok: [], say: `${a[p]} < its parent ${a[i]} (index (${i} − 1) / 2 = ${p}): swap them. Sift up.` });
    i = p;
  }
  f.push({ a: [...a], hl: [0], ok: [0], say: `${a[0]} reached the root: it is the new minimum.` });
  return f;
}

function popFrames(base: number[]): Frame[] {
  const a = [...base], f: Frame[] = [];
  const min = a[0], last = a.pop()!;
  if (!a.length) { f.push({ a: [], hl: [], ok: [], say: `Pop returns ${min}. The heap is now empty.` }); return f; }
  a[0] = last;
  f.push({ a: [...a], hl: [0], ok: [], say: `Pop returns the root ${min}. Move the last item ${last} to the root to keep the tree complete.` });
  let i = 0;
  for (;;) {
    const l = 2 * i + 1, r = l + 1;
    let s = i;
    if (l < a.length && a[l] < a[s]) s = l;
    if (r < a.length && a[r] < a[s]) s = r;
    if (s === i) {
      f.push({ a: [...a], hl: [i], ok: [i], say: l < a.length ? `${a[i]} is ≤ its children: the heap rule holds. Stop.` : `${a[i]} has no children: stop.` });
      return f;
    }
    const kids = [l, r].filter(k => k < a.length).map(k => a[k]).join(' and ');
    [a[s], a[i]] = [a[i], a[s]];
    f.push({ a: [...a], hl: [i, s], ok: [], say: `Children are ${kids}. The smaller one, ${a[i]}, is less than ${a[s]}: swap. Sift down.` });
    i = s;
  }
}

/** A min-heap shown as a tree and as the array it is really stored in. */
@Component({
  selector: 'w-heap-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A min-heap: tree view and array view</h3></div>
      <p class="w-hint">Every parent is ≤ its children, so the smallest item is always at the root, index 0. The children of index i are at 2i + 1 and 2i + 2.</p>

      <svg [attr.viewBox]="'0 0 ' + width + ' 200'" class="tree" role="img" [attr.aria-label]="'Heap: ' + f().a.join(', ')">
        @for (v of f().a; track $index; let i = $index) {
          @if (i > 0) { <line [attr.x1]="px(i)" [attr.y1]="py(i)" [attr.x2]="px(parent(i))" [attr.y2]="py(parent(i))" class="edge" /> }
        }
        @for (v of f().a; track $index; let i = $index) {
          <g class="node" [class.hl]="f().hl.includes(i)" [class.ok]="f().ok.includes(i)">
            <circle [attr.cx]="px(i)" [attr.cy]="py(i)" r="15" />
            <text [attr.x]="px(i)" [attr.y]="py(i) + 4" text-anchor="middle">{{ v }}</text>
            <text [attr.x]="px(i)" [attr.y]="py(i) + 27" text-anchor="middle" class="ix">{{ i }}</text>
          </g>
        }
      </svg>

      <div class="w-label">Array</div>
      <div class="arr mono">
        @for (v of f().a; track $index; let i = $index) { <span class="c" [class.hl]="f().hl.includes(i)" [class.ok]="f().ok.includes(i)"><small>{{ i }}</small>{{ v }}</span> }
        @empty { <span class="small text-muted">empty</span> }
      </div>

      <div class="w-controls mt-2">
        <label class="w-label m-0" for="heap-val">Value</label>
        <input id="heap-val" class="w-field mono val" type="number" [value]="val()" (input)="val.set(+$any($event.target).value)" />
        <button type="button" class="w-btn primary" (click)="push()" [disabled]="cur().length >= max">Push</button>
        <button type="button" class="w-btn primary" (click)="pop()" [disabled]="!cur().length">Pop min</button>
        <button type="button" class="w-btn" (click)="step()" [disabled]="atEnd()">Next step</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>
      <div class="w-msg" [class.ok]="atEnd() && frames().length > 1" [class.info]="!atEnd() || frames().length === 1" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { width: 100%; max-width: 440px; display: block; margin: 0 auto; }
    .edge { stroke: var(--border-color); stroke-width: 2; }
    .node circle { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.55); stroke-width: 1.5; transition: all 0.2s; }
    .node text { font-size: 12px; font-weight: 700; fill: var(--text-main); }
    .node .ix { font-size: 8.5px; font-weight: 500; fill: var(--text-muted); }
    .node.hl circle { fill: rgba(245, 158, 11, 0.32); stroke: #f59e0b; stroke-width: 2.5; }
    .node.ok circle { fill: rgba(16, 185, 129, 0.3); stroke: #10b981; }
    .arr { display: flex; flex-wrap: wrap; gap: 3px; }
    .c { min-width: 2rem; text-align: center; padding: 2px 5px; border-radius: 7px; border: 1.5px solid rgba(139, 92, 246, 0.45); background: var(--bg-main); font-weight: 700; display: inline-flex; flex-direction: column; align-items: center; transition: all 0.2s; }
    .c small { font-size: 0.58rem; color: var(--text-muted); font-weight: 600; }
    .c.hl { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); }
    .c.ok { border-color: #10b981; background: rgba(16, 185, 129, 0.25); }
    .val { width: 5rem; }
  `]
})
export class HeapVizWidget {
  readonly width = W;
  readonly max = MAX;
  val = signal(4);
  frames = signal<Frame[]>([{ a: START, hl: [], ok: [], say: 'A min-heap of 7 items. Push a value or pop the minimum, then press Next step to watch it sift.' }]);
  idx = signal(0);

  f = computed(() => this.frames()[this.idx()]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);
  /** The heap as it will be once the current operation finishes. */
  cur = computed(() => this.frames()[this.frames().length - 1].a);

  parent(i: number) { return Math.floor((i - 1) / 2); }
  private depth(i: number) { return Math.floor(Math.log2(i + 1)); }
  px(i: number) { const d = this.depth(i), slots = 2 ** d; return ((i - (slots - 1)) + 0.5) * (W / slots); }
  py(i: number) { return 22 + this.depth(i) * 50; }

  push() {
    const v = this.val();
    if (!Number.isFinite(v)) return;
    this.frames.set(pushFrames(this.cur(), v)); this.idx.set(0);
  }
  pop() { if (this.cur().length) { this.frames.set(popFrames(this.cur())); this.idx.set(0); } }
  step() { if (!this.atEnd()) this.idx.update(i => i + 1); }
  reset() { this.frames.set([{ a: START, hl: [], ok: [], say: 'Reset to the starting heap.' }]); this.idx.set(0); }
}
