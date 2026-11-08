import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LNode { id: number; v: number }

/** A singly linked list drawn as boxes and arrows. Every operation walks the list visibly and counts its steps. */
@Component({
  selector: 'w-linked-list',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Nodes and next pointers</h3></div>
      <p class="w-hint">Each node holds a value and a reference to the next node. Run an operation and watch how many nodes it has to visit.</p>

      <div class="chain" role="list" aria-label="Linked list">
        <span class="ptr mono">head</span><span class="arrow" aria-hidden="true">→</span>
        @for (n of nodes(); track n.id; let i = $index) {
          <div class="node" role="listitem" [class.visit]="visit() === i" [class.hit]="hit() === n.id" [class.fresh]="fresh() === n.id">
            <span class="v mono">{{ n.v }}</span><span class="nx" aria-hidden="true">•</span>
          </div>
          <span class="arrow" aria-hidden="true">→</span>
        }
        <span class="null mono">null</span>
      </div>
      @if (useTail()) { <div class="small mono text-muted mt-1">tail → {{ nodes().length ? nodes()[nodes().length - 1].v : 'null' }}</div> }

      <div class="w-controls mt-2">
        <label class="w-field">value <input class="mono" type="number" style="width:4.5rem" [ngModel]="val()" (ngModelChange)="val.set(+$event || 0)" aria-label="Value"></label>
        <button type="button" class="w-btn primary" (click)="addFirst()" [disabled]="busy()">AddFirst</button>
        <button type="button" class="w-btn" (click)="addLast()" [disabled]="busy()">AddLast</button>
        <button type="button" class="w-btn" (click)="find()" [disabled]="busy()">Find value</button>
        <button type="button" class="w-btn" (click)="remove()" [disabled]="busy()">Remove value</button>
        <button type="button" class="w-btn" (click)="get()" [disabled]="busy()">Get index {{ val() }}</button>
      </div>
      <div class="w-controls">
        <label class="small d-flex align-items-center gap-1"><input type="checkbox" [ngModel]="useTail()" (ngModelChange)="useTail.set($event)"> keep a <span class="mono">tail</span> reference</label>
        <button type="button" class="w-btn" (click)="reset()" [disabled]="busy()">Reset</button>
      </div>
      <div class="w-msg" [class.err]="msg().err" [class.ok]="!msg().err" aria-live="polite"><span>{{ msg().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .chain { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 2px; padding: 10px; border-radius: 12px; background: var(--bg-main); border: 1px solid var(--border-color); min-height: 62px; }
    .ptr, .null { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
    .arrow { color: var(--text-muted); font-size: 1rem; }
    .node { display: inline-flex; border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 8px; overflow: hidden; transition: all 0.25s; }
    .node .v { padding: 4px 9px; font-weight: 700; min-width: 2.3rem; text-align: center; }
    .node .nx { padding: 4px 6px; border-left: 2px solid rgba(139, 92, 246, 0.5); color: var(--purple); }
    .node.visit { border-color: #f59e0b; background: rgba(245, 158, 11, 0.18); transform: translateY(-3px); }
    .node.hit { border-color: #10b981; background: rgba(16, 185, 129, 0.2); }
    .node.fresh { border-color: #10b981; background: rgba(16, 185, 129, 0.2); }
  `]
})
export class LinkedListWidget {
  private nextId = 0;
  private readonly start = [3, 8, 15, 4, 42];
  nodes = signal<LNode[]>(this.start.map(v => ({ id: this.nextId++, v })));
  val = signal(15);
  useTail = signal(false);
  visit = signal(-1);
  hit = signal(-1);
  fresh = signal(-1);
  busy = signal(false);
  msg = signal({ text: 'head points at the first node; the last node’s next is null.', err: false });
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  addFirst() {
    const n = { id: this.nextId++, v: this.val() };
    this.nodes.update(a => [n, ...a]);
    this.mark(n.id);
    this.msg.set({ text: `New node → old head, then head → new node. 2 pointer changes, no walking: O(1).`, err: false });
  }

  addLast() {
    const n = { id: this.nextId++, v: this.val() };
    if (this.useTail()) {
      this.nodes.update(a => [...a, n]);
      this.mark(n.id);
      this.msg.set({ text: 'tail.Next = new node; tail = new node. With a tail reference this is O(1).', err: false });
      return;
    }
    const len = this.nodes().length;
    if (len === 0) {
      this.nodes.set([n]);
      this.mark(n.id);
      this.msg.set({ text: 'The list was empty, so the new node simply becomes head.', err: false });
      return;
    }
    this.walk(len - 1, () => {
      this.nodes.update(a => [...a, n]);
      this.mark(n.id);
      this.msg.set({ text: `Had to walk all ${len} nodes to find the last one: O(n). Keep a tail reference to make this O(1).`, err: false });
    });
  }

  find() {
    const i = this.nodes().findIndex(n => n.v === this.val());
    const stop = i < 0 ? this.nodes().length - 1 : i;
    this.walk(stop, () => {
      if (i < 0) this.msg.set({ text: `Visited all ${this.nodes().length} nodes: ${this.val()} is not in the list. O(n).`, err: true });
      else { this.hit.set(this.nodes()[i].id); this.msg.set({ text: `Found ${this.val()} after visiting ${i + 1} node${i ? 's' : ''}. No index jumps: you must follow next pointers. O(n).`, err: false }); }
    });
  }

  remove() {
    const i = this.nodes().findIndex(n => n.v === this.val());
    const stop = i < 0 ? this.nodes().length - 1 : i;
    this.walk(stop, () => {
      if (i < 0) return this.msg.set({ text: `${this.val()} not found, nothing removed.`, err: true });
      this.nodes.update(a => a.filter((_, k) => k !== i));
      this.msg.set({ text: i === 0
        ? 'Removed the head: head = head.Next. One pointer change: O(1).'
        : `Found it at position ${i}, then previous.Next = node.Next. The node is skipped and the garbage collector frees it. Finding: O(n); unlinking: O(1).`, err: false });
    });
  }

  get() {
    const i = this.val();
    if (i < 0 || i >= this.nodes().length) return this.msg.set({ text: `Index ${i} is out of range (0 to ${this.nodes().length - 1}).`, err: true });
    this.walk(i, () => {
      this.hit.set(this.nodes()[i].id);
      this.msg.set({ text: `list[${i}] needed ${i + 1} hops from head. An array does this in one step; a linked list in O(n).`, err: false });
    });
  }

  reset() {
    this.nodes.set(this.start.map(v => ({ id: this.nextId++, v })));
    this.clear();
    this.msg.set({ text: 'Reset.', err: false });
  }

  /** Highlight nodes 0..stop one after another, then run `done`. */
  private walk(stop: number, done: () => void) {
    this.clear();
    if (stop < 0) { done(); return; }
    this.busy.set(true);
    let k = 0;
    const tick = () => {
      this.visit.set(k);
      if (k >= stop) {
        this.timer = setTimeout(() => { this.visit.set(-1); this.busy.set(false); done(); }, 380);
        return;
      }
      k++;
      this.timer = setTimeout(tick, 380);
    };
    tick();
  }

  private mark(id: number) { this.clear(); this.fresh.set(id); }
  private clear() { this.visit.set(-1); this.hit.set(-1); this.fresh.set(-1); }
}
