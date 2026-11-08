import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Field = 'prev' | 'next';
interface DNode { v: string; prev: string | null; next: string | null }
type State = { nodes: Record<string, DNode>; head: string | null; tail: string | null; changed: { id: string; f: Field | 'head' | 'tail' }[] };
interface Step { line: number; say: string; apply: (s: State) => void }
interface Op { id: string; label: string; code: string; steps: Step[] }

const setPtr = (s: State, id: string, f: Field, to: string | null) => { s.nodes[id][f] = to; s.changed.push({ id, f }); };

const OPS: Op[] = [
  {
    id: 'remove', label: 'Remove C',
    code: 'void Remove(Node node)          // node = C\n{\n    node.Prev.Next = node.Next;  // B.Next = D\n    node.Next.Prev = node.Prev;  // D.Prev = B\n}',
    steps: [
      { line: 3, say: 'B now skips C: walking forward goes B → D.', apply: s => setPtr(s, 'B', 'next', 'D') },
      { line: 4, say: 'D now points back to B: walking backward goes D → B. C is unreachable and will be garbage-collected. Two pointer changes, no searching: O(1).', apply: s => setPtr(s, 'D', 'prev', 'B') }
    ]
  },
  {
    id: 'insert', label: 'Insert X after B',
    code: 'void InsertAfter(Node node, Node x)   // node = B\n{\n    x.Prev = node;                    // X.Prev = B\n    x.Next = node.Next;               // X.Next = C\n    node.Next.Prev = x;               // C.Prev = X\n    node.Next = x;                    // B.Next = X\n}',
    steps: [
      { line: 3, say: 'Wire the new node first: X points back to B.', apply: s => setPtr(s, 'X', 'prev', 'B') },
      { line: 4, say: 'X points forward to C. The list itself has not changed yet.', apply: s => setPtr(s, 'X', 'next', 'C') },
      { line: 5, say: 'C now points back to X.', apply: s => setPtr(s, 'C', 'prev', 'X') },
      { line: 6, say: 'B now points forward to X: X is in the list. Four pointer changes, O(1). Order matters: if you set B.Next first, you lose the way to C.', apply: s => setPtr(s, 'B', 'next', 'X') }
    ]
  },
  {
    id: 'remove-first', label: 'Remove the head (A)',
    code: 'void RemoveFirst()\n{\n    head = head.Next;    // head = B\n    head.Prev = null;    // B.Prev = null\n}',
    steps: [
      { line: 3, say: 'head moves to B.', apply: s => { s.head = 'B'; s.changed.push({ id: 'B', f: 'head' }); } },
      { line: 4, say: 'B no longer points back to A. A is unreachable. O(1), and RemoveLast is O(1) too, thanks to tail and Prev.', apply: s => setPtr(s, 'B', 'prev', null) }
    ]
  }
];

function initial(withX: boolean): State {
  const ids = ['A', 'B', 'C', 'D'];
  const nodes: Record<string, DNode> = {};
  ids.forEach((id, i) => nodes[id] = { v: id, prev: ids[i - 1] ?? null, next: ids[i + 1] ?? null });
  if (withX) nodes['X'] = { v: 'X', prev: null, next: null };
  return { nodes, head: 'A', tail: 'D', changed: [] };
}

/** Rewire a doubly linked list one pointer at a time and see each Prev/Next field change. */
@Component({
  selector: 'w-dll-rewire',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rewiring Prev and Next</h3></div>
      <p class="w-hint">Pick an operation and step through it. Each step changes one reference; the changed field lights up.</p>
      <div class="w-controls" role="group" aria-label="Operation">
        @for (o of ops; track o.id) {
          <button type="button" class="w-btn" [class.on]="op().id === o.id" (click)="pick(o.id)" [attr.aria-pressed]="op().id === o.id">{{ o.label }}</button>
        }
      </div>
      <div class="w-grid">
        <app-code [code]="op().code" title="DoublyLinkedList.cs" [compact]="true" [copyable]="false" [active]="step() > 0 ? [op().steps[step() - 1].line] : []" />
        <div>
          <div class="w-label">Following head → Next</div>
          <div class="chain mono">
            <span class="muted">head</span>
            @for (id of forward(); track $index) { <span class="muted">⇄</span><span class="pill-n">{{ id }}</span> }
            <span class="muted">→ null</span>
          </div>
          <div class="cards">
            @for (c of cards(); track c.id) {
              <div class="card-n" [class.gone]="!c.reachable">
                <div class="mono"><span class="f" [class.chg]="isChanged(c.id, 'prev')">◀ {{ c.n.prev ?? 'null' }}</span>
                  <b>{{ c.id }}</b>
                  <span class="f" [class.chg]="isChanged(c.id, 'next')">{{ c.n.next ?? 'null' }} ▶</span></div>
                <small>{{ c.reachable ? (state().head === c.id ? 'head' : state().tail === c.id ? 'tail' : '') : (c.id === 'X' ? 'new, not linked yet' : 'unreachable') }}</small>
              </div>
            }
          </div>
        </div>
      </div>
      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="next()" [disabled]="step() >= op().steps.length">Step {{ step() + 1 > op().steps.length ? '' : step() + 1 }}</button>
        <button type="button" class="w-btn" (click)="pick(op().id)">Reset</button>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ say() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .chain { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 0.85rem; margin-bottom: 8px; }
    .muted { color: var(--text-muted); }
    .pill-n { padding: 1px 8px; border-radius: 6px; background: rgba(139, 92, 246, 0.15); border: 1px solid var(--purple); font-weight: 700; }
    .cards { display: grid; gap: 5px; }
    .card-n { padding: 5px 9px; border-radius: 9px; border: 1px solid var(--border-color); background: var(--bg-main); font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; }
    .card-n > div { display: flex; gap: 10px; align-items: center; }
    .card-n small { color: var(--text-muted); }
    .card-n.gone { opacity: 0.55; border-style: dashed; }
    .f { padding: 0 5px; border-radius: 5px; }
    .f.chg { background: rgba(245, 158, 11, 0.3); outline: 1.5px solid #f59e0b; }
  `]
})
export class DllRewireWidget {
  readonly ops = OPS;
  opId = signal('remove');
  step = signal(0);
  op = computed(() => OPS.find(o => o.id === this.opId())!);

  /** Replay the first `step` steps on a fresh list; only the last step's change stays highlighted. */
  state = computed<State>(() => {
    const s = initial(this.op().id === 'insert');
    this.op().steps.slice(0, this.step()).forEach(st => { s.changed = []; st.apply(s); });
    return s;
  });

  forward = computed(() => {
    const s = this.state(), out: string[] = [];
    for (let id = s.head; id && out.length < 8; id = s.nodes[id].next) out.push(id);
    return out;
  });

  cards = computed(() => {
    const s = this.state(), seen = new Set(this.forward());
    return Object.keys(s.nodes).map(id => ({ id, n: s.nodes[id], reachable: seen.has(id) }));
  });

  say = computed(() => (this.step() === 0 ? 'Every node has a Prev and a Next reference. Press Step.' : this.op().steps[this.step() - 1].say));

  isChanged(id: string, f: Field) { return this.state().changed.some(c => c.id === id && c.f === f); }
  pick(id: string) { this.opId.set(id); this.step.set(0); }
  next() { this.step.update(s => Math.min(s + 1, this.op().steps.length)); }
}
