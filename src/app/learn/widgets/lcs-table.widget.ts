import { Component, computed, signal } from '@angular/core';

type Mode = 'lcs' | 'edit';

/** Build the full table for LCS or edit distance. Row i / column j = first i letters of a, first j of b. */
function build(a: string, b: string, mode: Mode): number[][] {
  const t = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++)
    for (let j = 0; j <= b.length; j++) {
      if (mode === 'edit' && (i === 0 || j === 0)) { t[i][j] = i + j; continue; }
      if (i === 0 || j === 0) continue;
      if (mode === 'lcs') t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
      else t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] : 1 + Math.min(t[i - 1][j - 1], t[i - 1][j], t[i][j - 1]);
    }
  return t;
}

/** Walk back from the bottom-right cell to recover the answer. */
function trace(a: string, b: string, t: number[][], mode: Mode) {
  const cells = new Set<string>(), steps: string[] = [];
  let i = a.length, j = b.length;
  cells.add(`${i},${j}`);
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && (mode === 'edit' ? t[i][j] === t[i - 1][j - 1] : t[i][j] === t[i - 1][j - 1] + 1)) {
      steps.unshift(mode === 'lcs' ? a[i - 1] : `keep ${a[i - 1]}`); i--; j--;
    } else if (mode === 'lcs') {
      if (i > 0 && (j === 0 || t[i - 1][j] >= t[i][j - 1])) i--; else j--;
    } else if (i > 0 && j > 0 && t[i][j] === t[i - 1][j - 1] + 1) { steps.unshift(`replace ${a[i - 1]}→${b[j - 1]}`); i--; j--; }
    else if (i > 0 && t[i][j] === t[i - 1][j] + 1) { steps.unshift(`delete ${a[i - 1]}`); i--; }
    else { steps.unshift(`insert ${b[j - 1]}`); j--; }
    cells.add(`${i},${j}`);
  }
  return { cells, steps };
}

/** LCS and edit distance tables for two words, filled cell by cell, with the traceback. */
@Component({
  selector: 'w-lcs-table',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Comparing two words</h3></div>
      <div class="w-controls" role="group" aria-label="Question">
        <button type="button" class="w-btn" [class.on]="mode() === 'lcs'" (click)="setMode('lcs')" [attr.aria-pressed]="mode() === 'lcs'">Longest common subsequence</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'edit'" (click)="setMode('edit')" [attr.aria-pressed]="mode() === 'edit'">Edit distance</button>
      </div>
      <div class="w-controls">
        <label class="w-label m-0" for="lcs-a">A</label>
        <input id="lcs-a" class="w-field mono word" [value]="a()" (input)="setA($any($event.target).value)" />
        <label class="w-label m-0" for="lcs-b">B</label>
        <input id="lcs-b" class="w-field mono word" [value]="b()" (input)="setB($any($event.target).value)" />
      </div>
      <p class="w-hint">{{ mode() === 'lcs'
        ? 'Cell (i, j) = LCS of the first i letters of A and the first j of B. Letters equal: diagonal + 1. Otherwise: the bigger of above and left.'
        : 'Cell (i, j) = fewest single-letter inserts, deletes or replacements to turn the first i letters of A into the first j of B. Letters equal: copy the diagonal. Otherwise: 1 + the smallest of diagonal (replace), above (delete) and left (insert).' }}</p>

      <div class="tscroll">
        <table class="wtable mono lt"><tbody>
          <tr><th></th><th>·</th>@for (ch of bChars(); track $index) { <th>{{ ch }}</th> }</tr>
          @for (row of table(); track $index; let i = $index) {
            <tr>
              <th>{{ i === 0 ? '·' : aChars()[i - 1] }}</th>
              @for (v of row; track $index; let j = $index) {
                <td [class.hl]="isCur(i, j)" [class.dep]="isDep(i, j)" [class.ok]="done() && path().cells.has(i + ',' + j)" [class.match]="i > 0 && j > 0 && aChars()[i - 1] === bChars()[j - 1]">{{ filled(i, j) ? v : '' }}</td>
              }
            </tr>
          }
        </tbody></table>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="shown.set(shown() + 1)" [disabled]="done()">Next cell</button>
        <button type="button" class="w-btn" (click)="shown.set(totalCells())">Fill all</button>
        <button type="button" class="w-btn" (click)="shown.set(0)">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="done()" [class.info]="!done()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .word { width: 8rem; text-transform: uppercase; }
    .lt td, .lt th { min-width: 1.7rem; }
    .lt td.match { color: #7c3aed; }
    .lt td.dep { background: rgba(6, 182, 212, 0.22); }
  `]
})
export class LcsTableWidget {
  mode = signal<Mode>('lcs');
  a = signal('STEEL');
  b = signal('STEAL');
  shown = signal(0);

  aChars = computed(() => [...this.a()]);
  bChars = computed(() => [...this.b()]);
  table = computed(() => build(this.a(), this.b(), this.mode()));
  cols = computed(() => this.b().length + 1);
  /** Inner cells to fill (row 0 and column 0 are base cases, shown from the start). */
  totalCells = computed(() => this.a().length * this.b().length);
  done = computed(() => this.shown() >= this.totalCells());
  path = computed(() => trace(this.a(), this.b(), this.table(), this.mode()));
  cur = computed(() => {
    const k = this.shown() - 1, w = this.b().length;
    return k < 0 || this.done() ? null : { i: Math.floor(k / w) + 1, j: (k % w) + 1 };
  });

  filled(i: number, j: number) {
    if (i === 0 || j === 0) return true;
    return (i - 1) * this.b().length + (j - 1) < this.shown();
  }
  isCur(i: number, j: number) { const c = this.cur(); return !!c && c.i === i && c.j === j; }
  isDep(i: number, j: number) {
    const c = this.cur();
    if (!c) return false;
    return (i === c.i - 1 && j === c.j - 1) || (i === c.i - 1 && j === c.j) || (i === c.i && j === c.j - 1);
  }

  message = computed(() => {
    const t = this.table(), A = this.a(), B = this.b();
    if (!A || !B) return 'Type two words.';
    if (this.done()) {
      const p = this.path();
      return this.mode() === 'lcs'
        ? `LCS length ${t[A.length][B.length]}: “${p.steps.join('')}”. Green cells are the traceback: go diagonal on a match, otherwise towards the bigger neighbour. Table size ${A.length + 1} × ${B.length + 1}: O(n·m).`
        : `Edit distance ${t[A.length][B.length]}: ${p.steps.filter(s => !s.startsWith('keep')).join(', ') || 'no changes'}. Green cells are the traceback. Spell checkers rank suggestions by this number.`;
    }
    const c = this.cur();
    if (!c) return this.mode() === 'lcs' ? 'Row 0 and column 0 are 0: an empty word has nothing in common with anything.' : 'Row 0 and column 0 count letters: turning an empty word into one of length k takes k inserts.';
    const x = A[c.i - 1], y = B[c.j - 1], v = t[c.i][c.j];
    if (this.mode() === 'lcs') return x === y ? `${x} = ${y}: diagonal ${t[c.i - 1][c.j - 1]} + 1 = ${v}.` : `${x} ≠ ${y}: max(above ${t[c.i - 1][c.j]}, left ${t[c.i][c.j - 1]}) = ${v}.`;
    return x === y ? `${x} = ${y}: no edit needed, copy the diagonal: ${v}.` : `${x} ≠ ${y}: 1 + min(replace ${t[c.i - 1][c.j - 1]}, delete ${t[c.i - 1][c.j]}, insert ${t[c.i][c.j - 1]}) = ${v}.`;
  });

  private clean(v: string) { return v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8); }
  setA(v: string) { this.a.set(this.clean(v)); this.shown.set(0); }
  setB(v: string) { this.b.set(this.clean(v)); this.shown.set(0); }
  setMode(m: Mode) { this.mode.set(m); this.shown.set(0); }
}
