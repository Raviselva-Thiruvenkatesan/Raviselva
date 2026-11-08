import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

/** A 2D (rectangular) array and a jagged array drawn as grids; click cells to see their [row, col] address. */
@Component({
  selector: 'w-grid-2d',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rows and columns</h3></div>
      <div class="w-controls" role="group" aria-label="Array kind">
        <button type="button" class="w-btn" [class.on]="kind() === 'rect'" (click)="setKind('rect')" [attr.aria-pressed]="kind() === 'rect'">2D array <span class="mono">int[,]</span></button>
        <button type="button" class="w-btn" [class.on]="kind() === 'jagged'" (click)="setKind('jagged')" [attr.aria-pressed]="kind() === 'jagged'">Jagged array <span class="mono">int[][]</span></button>
        <button type="button" class="w-btn" (click)="walk()"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> Nested loop order</button>
      </div>
      <p class="w-hint">Click any cell. {{ kind() === 'rect' ? 'Every row has the same number of columns.' : 'Each row is its own array, so rows can have different lengths.' }}</p>

      <div class="grid-wrap">
        <div class="col-head" aria-hidden="true">
          <span></span>
          @for (c of colIdx(); track c) { <span class="mono">{{ c }}</span> }
        </div>
        @for (row of data(); track $index; let r = $index) {
          <div class="g-row">
            <span class="row-head mono" aria-hidden="true">{{ r }}</span>
            @for (v of row; track $index; let c = $index) {
              <button type="button" class="cell mono" [class.sel]="sel()[0] === r && sel()[1] === c"
                [class.row]="sel()[0] === r" [class.col]="kind() === 'rect' && sel()[1] === c"
                (click)="sel.set([r, c])" [attr.aria-label]="'Row ' + r + ', column ' + c + ': ' + v">{{ v }}</button>
            }
          </div>
        }
      </div>

      <div class="w-msg info" aria-live="polite">
        <code class="mono">{{ access() }}</code>
        <span>= <strong>{{ data()[sel()[0]][sel()[1]] }}</strong> · {{ info() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .grid-wrap { display: inline-flex; flex-direction: column; gap: 4px; max-width: 100%; overflow-x: auto; padding-bottom: 4px; }
    .col-head, .g-row { display: flex; gap: 4px; align-items: center; }
    .col-head span, .row-head { width: 48px; text-align: center; font-size: 0.75rem; color: var(--text-muted); flex: none; }
    .row-head { width: 22px; }
    .col-head span:first-child { width: 22px; }
    .cell {
      width: 48px; height: 42px; flex: none; border-radius: 8px; font-weight: 700; cursor: pointer;
      border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); transition: all 0.2s;
    }
    .cell.row, .cell.col { background: rgba(139, 92, 246, 0.08); }
    .cell.sel { border-color: var(--purple); background: rgba(139, 92, 246, 0.25); color: var(--purple); transform: scale(1.06); }
    .w-msg { flex-wrap: wrap; }
  `]
})
export class Grid2dWidget {
  kind = signal<'rect' | 'jagged'>('rect');
  sel = signal<[number, number]>([1, 2]);
  private rect = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]];
  private jag = [[1, 2], [3, 4, 5, 6], [7]];
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  data = computed(() => (this.kind() === 'rect' ? this.rect : this.jag));
  colIdx = computed(() => Array.from({ length: Math.max(...this.data().map(r => r.length)) }, (_, i) => i));
  access = computed(() => {
    const [r, c] = this.sel();
    return this.kind() === 'rect' ? `grid[${r}, ${c}]` : `jagged[${r}][${c}]`;
  });
  info = computed(() => this.kind() === 'rect'
    ? `grid.GetLength(0) = ${this.rect.length} rows, grid.GetLength(1) = ${this.rect[0].length} columns, grid.Length = ${this.rect.length * this.rect[0].length} cells`
    : `jagged.Length = ${this.jag.length} rows, jagged[${this.sel()[0]}].Length = ${this.jag[this.sel()[0]].length}`);

  setKind(k: 'rect' | 'jagged') {
    clearTimeout(this.timer);
    this.kind.set(k);
    this.sel.set([1, 1]);
  }

  /** Visit every cell in row-major order, like for (r) { for (c) { ... } }. */
  walk() {
    clearTimeout(this.timer);
    const cells: [number, number][] = [];
    this.data().forEach((row, r) => row.forEach((_, c) => cells.push([r, c])));
    let k = 0;
    const tick = () => {
      if (k >= cells.length) return;
      this.sel.set(cells[k++]);
      this.timer = setTimeout(tick, 380);
    };
    tick();
  }
}
