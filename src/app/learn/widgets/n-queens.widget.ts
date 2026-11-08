import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

type Kind = 'start' | 'place' | 'clash' | 'back' | 'solution' | 'done';
interface Frame { cols: number[]; tr: number; tc: number; kind: Kind; placed: number; backs: number; sols: number; say: string }

/** Full backtracking search for n queens, one frame per decision. */
function search(n: number): Frame[] {
  const f: Frame[] = [], cols: number[] = [];
  let placed = 0, backs = 0, sols = 0;
  const push = (tr: number, tc: number, kind: Kind, say: string) => f.push({ cols: [...cols], tr, tc, kind, placed, backs, sols, say });
  const safe = (r: number, c: number) => cols.every((cc, rr) => cc !== c && Math.abs(cc - c) !== r - rr);
  push(-1, -1, 'start', `Place ${n} queens so that no two share a row, column or diagonal. Go row by row; in each row try the columns from left to right.`);
  const go = (r: number) => {
    if (r === n) { sols++; push(-1, -1, 'solution', `Solution ${sols} found! Every row has a queen and none attack each other. Keep going to find the others.`); return; }
    for (let c = 0; c < n; c++) {
      if (!safe(r, c)) { push(r, c, 'clash', `Row ${r + 1}, column ${c + 1} is attacked. Try the next column.`); continue; }
      cols.push(c); placed++;
      push(r, c, 'place', `Row ${r + 1}, column ${c + 1} is safe: place a queen${r + 1 < n ? ` and move to row ${r + 2}` : ' in the last row'}.`);
      go(r + 1);
      cols.pop(); backs++;
      push(r, c, 'back', `Back in row ${r + 1}: remove the queen from column ${c + 1} (undo the choice) and try the next column.`);
    }
  };
  go(0);
  push(-1, -1, 'done', `Search complete: ${sols} solution${sols === 1 ? '' : 's'} for ${n} × ${n}, after ${placed.toLocaleString('en-US')} placements and ${backs.toLocaleString('en-US')} take-backs. Even with one queen per row and no pruning, there would be ${(n ** n).toLocaleString('en-US')} full boards to check.`);
  return f;
}

/** N-queens solved by backtracking: place, check, undo. */
@Component({
  selector: 'w-n-queens',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Backtracking: n queens</h3></div>
      <div class="w-controls" role="group" aria-label="Board size">
        <span class="w-label m-0">Board</span>
        @for (s of sizes; track s) { <button type="button" class="w-btn" [class.on]="n() === s" (click)="setN(s)" [attr.aria-pressed]="n() === s">{{ s }} × {{ s }}</button> }
      </div>

      <div class="board" [style.grid-template-columns]="'repeat(' + n() + ', 1fr)'" role="img" [attr.aria-label]="'Queens in columns ' + (f().cols.map(colNo).join(', ') || 'none')">
        @for (cell of cells(); track cell.i) {
          <div class="sq" [class.dark]="cell.dark" [class.hit]="cell.attacked" [class.try]="cell.r === f().tr && cell.c === f().tc" [class.clash]="cell.r === f().tr && cell.c === f().tc && f().kind === 'clash'" [class.undo]="cell.r === f().tr && cell.c === f().tc && f().kind === 'back'">
            @if (cell.queen) { <span class="q" [class.sol]="f().kind === 'solution'">♛</span> }
          </div>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="play()" [disabled]="atEnd()"><i class="bi bi-play-fill" aria-hidden="true"></i> Play</button>
        <button type="button" class="w-btn" (click)="nextSolution()" [disabled]="atEnd()">Next solution</button>
        <button type="button" class="w-btn" (click)="finish()">Finish</button>
        <button type="button" class="w-btn" (click)="restart()">Restart</button>
      </div>
      <div class="small">Placements <b>{{ f().placed }}</b> · Take-backs <b>{{ f().backs }}</b> · Solutions <b>{{ f().sols }}</b></div>
      <div class="w-msg mt-2" [class.ok]="f().kind === 'solution' || f().kind === 'done'" [class.err]="f().kind === 'clash'" [class.info]="!['solution', 'done', 'clash'].includes(f().kind)" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .board { display: grid; gap: 0; width: min(100%, 300px); aspect-ratio: 1; margin: 0 auto; border: 2px solid var(--border-color); border-radius: 8px; overflow: hidden; }
    .sq { display: flex; align-items: center; justify-content: center; background: var(--bg-main); transition: background 0.15s; }
    .sq.dark { background: rgba(139, 92, 246, 0.12); }
    .sq.hit { background: rgba(239, 68, 68, 0.12); }
    .sq.try { outline: 3px solid #f59e0b; outline-offset: -3px; }
    .sq.clash { background: rgba(239, 68, 68, 0.4); }
    .sq.undo { outline-color: #0891b2; }
    .q { font-size: clamp(1rem, 5vw, 1.6rem); line-height: 1; color: #7c3aed; }
    .q.sol { color: #059669; }
  `]
})
export class NQueensWidget {
  readonly sizes = [4, 5, 6, 8];
  n = signal(4);
  idx = signal(0);
  private timer?: ReturnType<typeof setTimeout>;
  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  frames = computed(() => search(this.n()));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);
  cells = computed(() => {
    const n = this.n(), cols = this.f().cols;
    return Array.from({ length: n * n }, (_, i) => {
      const r = Math.floor(i / n), c = i % n;
      const attacked = cols.some((cc, rr) => rr !== r && (cc === c || Math.abs(cc - c) === Math.abs(rr - r))) || (cols[r] !== undefined && cols[r] !== c);
      return { i, r, c, dark: (r + c) % 2 === 1, queen: cols[r] === c, attacked };
    });
  });

  colNo(c: number) { return c + 1; }
  setN(s: number) { this.n.set(s); this.restart(); }
  step() { if (!this.atEnd()) this.idx.update(i => i + 1); }
  finish() { clearTimeout(this.timer); this.idx.set(this.frames().length - 1); }
  restart() { clearTimeout(this.timer); this.idx.set(0); }
  nextSolution() {
    clearTimeout(this.timer);
    const fr = this.frames();
    let i = this.idx() + 1;
    while (i < fr.length - 1 && fr[i].kind !== 'solution') i++;
    this.idx.set(i);
  }
  play() {
    clearTimeout(this.timer);
    const tick = () => { this.step(); if (!this.atEnd() && this.f().kind !== 'solution') this.timer = setTimeout(tick, this.n() > 6 ? 40 : 160); };
    tick();
  }
}
