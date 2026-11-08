import { Component, computed, signal } from '@angular/core';

type Problem = 'stairs' | 'coins';
const COINS = [1, 3, 4];
interface Frame { i: number; vals: (number | null)[]; from: number[]; say: string }

function stairs(n: number): Frame[] {
  const v: (number | null)[] = Array(n + 1).fill(null), f: Frame[] = [];
  v[0] = 1; v[1] = 1;
  f.push({ i: 1, vals: [...v], from: [], say: 'Base cases: there is 1 way to stand still (0 steps) and 1 way to climb 1 step.' });
  for (let i = 2; i <= n; i++) {
    v[i] = v[i - 1]! + v[i - 2]!;
    f.push({ i, vals: [...v], from: [i - 1, i - 2], say: `ways[${i}] = ways[${i - 1}] + ways[${i - 2}] = ${v[i - 1]} + ${v[i - 2]} = ${v[i]}. The last move was either 1 step (from ${i - 1}) or 2 steps (from ${i - 2}).` });
  }
  return f;
}

function coins(n: number): Frame[] {
  const v: (number | null)[] = Array(n + 1).fill(null), f: Frame[] = [];
  v[0] = 0;
  f.push({ i: 0, vals: [...v], from: [], say: `Coins ${COINS.join(', ')}. Base case: amount 0 needs 0 coins.` });
  for (let a = 1; a <= n; a++) {
    let best = Infinity, from = -1;
    const parts: string[] = [];
    for (const c of COINS) if (c <= a && v[a - c]! + 1 < best) { best = v[a - c]! + 1; from = a - c; }
    for (const c of COINS) if (c <= a) parts.push(`${c}: 1 + ${v[a - c]}`);
    v[a] = best;
    f.push({ i: a, vals: [...v], from: [from], say: `min[${a}]: last coin ${parts.join(', ')} → best ${best} (after a ${a - from} coin).` });
  }
  return f;
}

/** Fill a 1-D DP table left to right, each cell built from smaller answers. */
@Component({
  selector: 'w-dp-table',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Filling a DP table</h3></div>
      <div class="w-controls" role="group" aria-label="Problem">
        <button type="button" class="w-btn" [class.on]="problem() === 'stairs'" (click)="setProblem('stairs')" [attr.aria-pressed]="problem() === 'stairs'">Stairs: 1 or 2 steps at a time</button>
        <button type="button" class="w-btn" [class.on]="problem() === 'coins'" (click)="setProblem('coins')" [attr.aria-pressed]="problem() === 'coins'">Fewest coins (1, 3, 4)</button>
      </div>
      <p class="w-hint">{{ problem() === 'stairs' ? 'How many different ways to climb n steps, taking 1 or 2 at a time? Each answer is built from the two before it.' : 'Fewest coins that make each amount. For every amount, try each coin as the last one and reuse the answer for what remains.' }}</p>

      <div class="cells mono" [style.grid-template-columns]="'repeat(' + (n + 1) + ', minmax(0, 1fr))'">
        @for (v of f().vals; track $index; let i = $index) {
          <div class="cell">
            <small>{{ i }}</small>
            <span class="c" [class.cur]="i === f().i && idx() > 0" [class.dep]="f().from.includes(i)" [class.empty]="v === null">{{ v ?? '' }}</span>
          </div>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Next cell</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Fill all</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small">Cells computed <b>{{ idx() + (problem() === 'stairs' ? 2 : 1) }}</b>, each once</span>
      </div>
      <div class="w-msg" [class.ok]="atEnd()" [class.info]="!atEnd()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: grid; gap: 3px; }
    .cell { display: flex; flex-direction: column; align-items: center; min-width: 0; }
    .cell small { font-size: 0.6rem; color: var(--text-muted); }
    .c { width: 100%; text-align: center; padding: 5px 0; border-radius: 6px; border: 1.5px solid rgba(139, 92, 246, 0.45); background: var(--bg-main); font-weight: 700; font-size: 0.82rem; min-height: 1.9rem; transition: all 0.2s; }
    .c.empty { border-style: dashed; border-color: var(--border-color); }
    .c.dep { border-color: #0891b2; background: rgba(6, 182, 212, 0.18); }
    .c.cur { border-color: #f59e0b; background: rgba(245, 158, 11, 0.3); }
  `]
})
export class DpTableWidget {
  readonly n = 10;
  problem = signal<Problem>('stairs');
  idx = signal(0);
  frames = computed(() => (this.problem() === 'stairs' ? stairs(this.n) : coins(this.n)));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);
  message = computed(() => {
    if (!this.atEnd()) return this.f().say;
    const v = this.f().vals;
    return this.problem() === 'stairs'
      ? `${v[this.n]} ways to climb ${this.n} steps, with ${this.n - 1} additions. The plain recursion would make ${this.naiveCalls(this.n)} calls, recomputing the same answers again and again.`
      : `Done. Note amount 6: DP says ${v[6]} coins (3 + 3). The greedy “biggest coin first” takes 4 + 1 + 1 = 3 coins. Greedy is not optimal for these coins; DP is.`;
  });

  private naiveCalls(n: number): number { return n <= 1 ? 1 : 1 + this.naiveCalls(n - 1) + this.naiveCalls(n - 2); }
  setProblem(p: Problem) { this.problem.set(p); this.idx.set(0); }
}
