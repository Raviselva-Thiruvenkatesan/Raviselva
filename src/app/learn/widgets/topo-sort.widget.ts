import { Component, computed, signal } from '@angular/core';
import { segment } from './graph-data';

interface Task { id: string; label: string; x: number; y: number }
const TASKS: Task[] = [
  { id: 'S', label: 'Survey', x: 50, y: 35 },
  { id: 'X', label: 'Excavate', x: 50, y: 120 },
  { id: 'F', label: 'Footings', x: 50, y: 205 },
  { id: 'O', label: 'Order steel', x: 170, y: 35 },
  { id: 'B', label: 'Fabricate', x: 170, y: 120 },
  { id: 'C', label: 'Columns', x: 170, y: 205 },
  { id: 'M', label: 'Beams', x: 290, y: 205 },
  { id: 'D', label: 'Deck', x: 290, y: 120 },
  { id: 'R', label: 'Roof', x: 290, y: 35 }
];
const DEPS: [string, string][] = [['S', 'X'], ['X', 'F'], ['F', 'C'], ['O', 'B'], ['B', 'C'], ['B', 'M'], ['C', 'M'], ['M', 'D'], ['D', 'R']];
const BAD: [string, string] = ['R', 'X'];

interface Frame { indeg: Record<string, number>; queue: string[]; order: string[]; cur: string | null; hot: string[]; say: string; stuck: boolean }

/** Kahn's algorithm: repeatedly take a task with no unfinished prerequisites. */
function kahn(edges: [string, string][]): Frame[] {
  const name = (id: string) => TASKS.find(t => t.id === id)!.label;
  const indeg: Record<string, number> = Object.fromEntries(TASKS.map(t => [t.id, 0]));
  for (const [, b] of edges) indeg[b]++;
  const queue = TASKS.filter(t => indeg[t.id] === 0).map(t => t.id);
  const order: string[] = [], f: Frame[] = [];
  f.push({ indeg: { ...indeg }, queue: [...queue], order: [], cur: null, hot: [], stuck: false, say: `Count each task’s prerequisites (its in-degree, the small number). Tasks with 0 can start now: ${queue.map(name).join(', ')}. Put them in a queue.` });
  while (queue.length) {
    const u = queue.shift()!;
    order.push(u);
    const freed: string[] = [], hot: string[] = [];
    for (const [a, b] of edges) if (a === u) { indeg[b]--; hot.push(a + b); if (indeg[b] === 0) { queue.push(b); freed.push(b); } }
    f.push({ indeg: { ...indeg }, queue: [...queue], order: [...order], cur: u, hot, stuck: false,
      say: `Do ${name(u)}. Each task that waited for it loses one prerequisite.${freed.length ? ` Now free to start: ${freed.map(name).join(', ')}.` : ''}` });
  }
  if (order.length < TASKS.length) {
    const left = TASKS.filter(t => !order.includes(t.id)).map(t => t.label);
    f.push({ ...f[f.length - 1], cur: null, hot: [], stuck: true, say: `The queue is empty but ${left.length} tasks are still waiting (${left.join(', ')}). Each one waits for another one in the group: a cycle. No valid order exists.` });
  } else {
    f.push({ ...f[f.length - 1], cur: null, hot: [], say: `All ${order.length} tasks are in order, and every task comes after its prerequisites. This is one valid topological order; others exist.` });
  }
  return f;
}

/** Order construction tasks so that every task comes after the tasks it depends on. */
@Component({
  selector: 'w-topo-sort',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Scheduling tasks with a topological sort</h3></div>
      <p class="w-hint">An arrow X → Y means “X must be finished before Y can start”. The small number is how many prerequisites are still unfinished.</p>
      <div class="w-controls">
        <button type="button" class="w-btn" [class.on]="bad()" (click)="setBad(!bad())" [attr.aria-pressed]="bad()">Add a wrong dependency: Roof → Excavate</button>
      </div>

      <svg viewBox="0 0 340 240" class="gsvg" role="img" [attr.aria-label]="'Order so far: ' + orderNames()">
        <defs><marker id="ts-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="arrow" /></marker></defs>
        @for (e of lines(); track e.key) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="g-edge" [class.hot]="f().hot.includes(e.key)" [class.bad]="e.bad" [class.dim]="isDone(e.from) && !f().hot.includes(e.key)" marker-end="url(#ts-arrow)" />
        }
        @for (t of tasks; track t.id) {
          <g class="g-node" [class.cur]="t.id === f().cur" [class.done]="isDone(t.id) && t.id !== f().cur" [class.wait]="f().queue.includes(t.id)" [class.bad]="f().stuck && !isDone(t.id)">
            <rect [attr.x]="t.x - 40" [attr.y]="t.y - 13" width="80" height="26" rx="8" />
            <text [attr.x]="t.x" [attr.y]="t.y + 4" text-anchor="middle" class="lab">{{ t.label }}</text>
            <text [attr.x]="t.x + 38" [attr.y]="t.y - 15" text-anchor="end" class="g-sub">{{ isDone(t.id) ? '✓' : f().indeg[t.id] }}</text>
          </g>
        }
      </svg>

      <div class="w-grid two mt-1">
        <div><div class="w-label">Queue (ready to start)</div><div class="chips">@for (q of f().queue; track q) { <span class="chip wait">{{ name(q) }}</span> } @empty { <span class="small text-muted">empty</span> }</div></div>
        <div><div class="w-label">Order</div><div class="chips">@for (q of f().order; track q; let i = $index) { <span class="chip ok">{{ i + 1 }}. {{ name(q) }}</span> } @empty { <span class="small text-muted">none yet</span> }</div></div>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="atEnd() && !f().stuck" [class.err]="f().stuck" [class.info]="!atEnd()" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .arrow { fill: var(--text-muted); }
    .lab { font-size: 11px !important; }
  `]
})
export class TopoSortWidget {
  readonly tasks = TASKS;
  bad = signal(false);
  idx = signal(0);
  private pos = new Map(TASKS.map(t => [t.id, t]));

  edges = computed<[string, string][]>(() => (this.bad() ? [...DEPS, BAD] : DEPS));
  frames = computed(() => kahn(this.edges()));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);
  lines = computed(() => this.edges().map(([a, b]) => {
    const p = this.pos.get(a)!, q = this.pos.get(b)!;
    // stop the arrow at the edge of the box (boxes are 80 × 26)
    const dx = q.x - p.x, dy = q.y - p.y;
    const tx = dx === 0 ? Infinity : 42 / Math.abs(dx), ty = dy === 0 ? Infinity : 15 / Math.abs(dy);
    const t = Math.min(tx, ty);
    const s = segment(p, q, 0);
    return { key: a + b, from: a, bad: a === BAD[0] && b === BAD[1], x1: p.x + dx * t, y1: p.y + dy * t, x2: q.x - dx * t, y2: q.y - dy * t, mx: s.mx };
  }));
  orderNames = computed(() => this.f().order.map(id => this.name(id)).join(', ') || 'none');

  name(id: string) { return this.pos.get(id)!.label; }
  isDone(id: string) { return this.f().order.includes(id); }
  setBad(v: boolean) { this.bad.set(v); this.idx.set(0); }
}
