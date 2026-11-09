import { Component, computed, signal } from '@angular/core';

type Who = 1 | 2;
type Res = 'h' | 'd';
interface State { holds: Record<Res, Who | null>; waits: Partial<Record<Who, Res>>; gone: Who | null; done: Who[] }
interface Step { who: Who | 0; sql: string; state: State; note: string; cycle?: boolean }

const H = (h: Who | null, d: Who | null, waits: Partial<Record<Who, Res>> = {}, gone: Who | null = null, done: Who[] = []): State => ({ holds: { h, d }, waits, gone, done });

/** The steps of each run, as they happened in two real SQL Server sessions (hammer = product 1, drill = product 2). */
function steps(sameOrder: boolean, s1Low: boolean): Step[] {
  if (sameOrder) return [
    { who: 1, sql: 'UPDATE … WHERE ProductId = 1;  -- hammer', state: H(1, null), note: 'Session 1 takes an X lock on the hammer.' },
    { who: 2, sql: 'UPDATE … WHERE ProductId = 1;  -- hammer', state: H(1, null, { 2: 'h' }), note: 'Session 2 also starts with the hammer, so it waits for Session 1. It holds nothing yet.' },
    { who: 1, sql: 'UPDATE … WHERE ProductId = 2;  -- drill', state: H(1, 1, { 2: 'h' }), note: 'The drill is free, so Session 1 takes it. Nobody is waiting for Session 1’s locks except Session 2: no cycle.' },
    { who: 1, sql: 'COMMIT;', state: H(2, null, {}, null, [1]), note: 'Session 1 commits and releases both locks; Session 2’s waiting UPDATE gets the hammer.' },
    { who: 2, sql: 'UPDATE … WHERE ProductId = 2;  -- drill\nCOMMIT;', state: H(null, null, {}, null, [1, 2]), note: 'Session 2 finishes. Both sales went through, one after the other: hammer 38, drill 10.' }
  ];
  const victim: Who = s1Low ? 1 : 2, other: Who = victim === 1 ? 2 : 1;
  return [
    { who: 1, sql: 'UPDATE … WHERE ProductId = 1;  -- hammer', state: H(1, null), note: 'Session 1 takes an X lock on the hammer.' },
    { who: 2, sql: 'UPDATE … WHERE ProductId = 2;  -- drill', state: H(1, 2), note: 'Session 2 starts with the drill and takes an X lock on it.' },
    { who: 1, sql: 'UPDATE … WHERE ProductId = 2;  -- drill', state: H(1, 2, { 1: 'd' }), note: 'Session 1 wants the drill, which Session 2 holds. Ordinary blocking so far.' },
    { who: 2, sql: 'UPDATE … WHERE ProductId = 1;  -- hammer', state: H(1, 2, { 1: 'd', 2: 'h' }), cycle: true, note: 'Session 2 wants the hammer, which Session 1 holds. Each now waits for the other: a cycle. Neither can ever go on.' },
    { who: 0, sql: '-- lock monitor (within about 5 seconds)', state: H(other, other, {}, victim),
      note: `SQL Server picks Session ${victim} as the victim${s1Low ? ' (it set DEADLOCK_PRIORITY LOW)' : ' (both had done the same work; in these runs it was always Session 2)'}, rolls back its whole transaction and sends it Msg 1205. Its locks are released, so Session ${other}’s waiting UPDATE runs.` },
    { who: other, sql: 'COMMIT;', state: H(null, null, {}, victim, [other]), note: `Session ${other} commits: hammer 39, drill 11. Session ${victim} has nothing to commit (@@TRANCOUNT 0) and must run its transaction again.` }
  ];
}

/** Two sessions, two rows: watch the locks and waits, and see when they form a deadlock. */
@Component({
  selector: 'w-deadlock-cycle',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Blocking or deadlock?</h3></div>
      <div class="w-controls" role="group" aria-label="Order of Session 2">
        <button type="button" class="w-btn small" [class.on]="!same()" [attr.aria-pressed]="!same()" (click)="setSame(false)">Session 2: drill, then hammer</button>
        <button type="button" class="w-btn small" [class.on]="same()" [attr.aria-pressed]="same()" (click)="setSame(true)">Session 2: hammer, then drill (same order)</button>
      </div>
      <div class="w-controls">
        <label class="check" [class.dim]="same()"><input type="checkbox" [checked]="low()" [disabled]="same()" (change)="low.set(!low()); pos.set(0)" /> Session 1 runs SET DEADLOCK_PRIORITY LOW</label>
      </div>
      <svg class="gsvg" viewBox="0 0 420 210" role="img" [attr.aria-label]="aria()">
        <defs>
          @for (m of markers; track m.id) {
            <marker [attr.id]="m.id" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" [attr.fill]="m.color" /></marker>
          }
        </defs>
        @for (e of edges(); track e.id) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="edge" [class.wait]="e.wait" [class.cyc]="cycle() && e.wait" [attr.marker-end]="'url(#' + (cycle() && e.wait ? 'dl-cyc' : e.wait ? 'dl-wait' : 'dl-hold') + ')'" />
          <text [attr.x]="(e.x1 + e.x2) / 2" [attr.y]="(e.y1 + e.y2) / 2 - 6" class="g-w" text-anchor="middle">{{ e.wait ? 'waits for' : 'held by' }}</text>
        }
        @for (s of sessions; track s.who) {
          <g class="g-node" [class.bad]="st().gone === s.who" [class.done]="st().done.includes(s.who)" [class.wait]="!!st().waits[s.who]">
            <circle [attr.cx]="s.x" cy="105" r="34" />
            <text [attr.x]="s.x" y="101" text-anchor="middle">Session {{ s.who }}</text>
            <text [attr.x]="s.x" y="117" text-anchor="middle" class="g-sub">{{ label(s.who) }}</text>
          </g>
        }
        @for (r of res; track r.id) {
          <g class="g-node" [class.on]="st().holds[r.id] !== null">
            <rect x="170" [attr.y]="r.y - 20" width="80" height="40" rx="8" />
            <text x="210" [attr.y]="r.y + 4" text-anchor="middle">{{ r.name }}</text>
          </g>
        }
      </svg>
      <ol class="script mono">
        @for (s of all(); track $index; let i = $index) {
          <li [class.done]="i < pos()" [class.cur]="i === pos() - 1"><span class="tag">{{ s.who ? 'S' + s.who : '⚙' }}</span>{{ s.sql }}</li>
        }
      </ol>
      <div class="w-controls">
        <button type="button" class="w-btn primary" [disabled]="pos() >= all().length" (click)="pos.set(pos() + 1)">Next step</button>
        <button type="button" class="w-btn" [disabled]="pos() === 0" (click)="pos.set(0)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Start again</button>
      </div>
      <div class="w-msg" [class.info]="!cycle() && !st().gone" [class.err]="cycle() || !!st().gone" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .check { display: inline-flex; gap: 6px; align-items: center; font-size: 0.82rem; cursor: pointer; }
    .check input { accent-color: #8b5cf6; }
    .check.dim { opacity: 0.5; }
    .edge { stroke: #8b5cf6; stroke-width: 2.5; }
    .edge.wait { stroke: #0891b2; stroke-dasharray: 6 4; }
    .edge.cyc { stroke: #ef4444; stroke-width: 3.5; }
    .script { list-style: none; margin: 0.4rem 0; padding: 8px 10px; background: #0b1020; color: #94a3b8; border-radius: 10px; font-size: 0.72rem; overflow-x: auto; }
    .script li { white-space: pre; padding: 1px 4px; border-radius: 4px; }
    .script li.done { color: #e2e8f0; }
    .script li.cur { background: rgba(139, 92, 246, 0.35); }
    .tag { display: inline-block; min-width: 2.2em; font-weight: 800; color: #c4b5fd; }
  `]
})
export class DeadlockCycleWidget {
  readonly sessions: { who: Who; x: number }[] = [{ who: 1, x: 60 }, { who: 2, x: 360 }];
  readonly res: { id: Res; name: string; y: number }[] = [{ id: 'h', name: 'Hammer', y: 45 }, { id: 'd', name: 'Drill', y: 165 }];
  readonly markers = [{ id: 'dl-hold', color: '#8b5cf6' }, { id: 'dl-wait', color: '#0891b2' }, { id: 'dl-cyc', color: '#ef4444' }];
  same = signal(false);
  low = signal(false);
  pos = signal(0);

  all = computed(() => steps(this.same(), this.low()));
  private cur = computed(() => (this.pos() === 0 ? null : this.all()[this.pos() - 1]));
  st = computed<State>(() => this.cur()?.state ?? H(null, null));
  cycle = computed(() => !!this.cur()?.cycle);

  /** Edges between a resource (centre x 210) and a session circle (x 60 or 360, y 105). */
  edges = computed(() => {
    const out: { id: string; x1: number; y1: number; x2: number; y2: number; wait: boolean }[] = [];
    const sx = (w: Who) => (w === 1 ? 94 : 326), rx = (w: Who) => (w === 1 ? 170 : 250);
    for (const r of this.res) {
      const h = this.st().holds[r.id];
      if (h) out.push({ id: 'h' + r.id, x1: rx(h), y1: r.y, x2: sx(h), y2: r.y < 105 ? 92 : 118, wait: false });
    }
    for (const w of [1, 2] as Who[]) {
      const r = this.st().waits[w];
      if (r) { const ry = this.res.find(x => x.id === r)!.y; out.push({ id: 'w' + w, x1: sx(w), y1: ry < 105 ? 92 : 118, x2: rx(w), y2: ry, wait: true }); }
    }
    return out;
  });

  label(w: Who) {
    const s = this.st();
    if (s.gone === w) return 'victim: 1205';
    if (s.done.includes(w)) return 'committed';
    if (s.waits[w]) return 'waiting';
    return s.holds.h === w || s.holds.d === w ? 'holding a lock' : 'idle';
  }
  aria = computed(() => `Session 1 is ${this.label(1)}, Session 2 is ${this.label(2)}.`);
  note = computed(() => this.cur()?.note ?? 'Press “Next step”. Solid arrows: a lock is held by a session. Dashed arrows: a session waits for a lock.');
  setSame(v: boolean) { this.same.set(v); this.pos.set(0); }
}
