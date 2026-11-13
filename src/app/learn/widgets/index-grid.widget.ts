import { Component, computed, signal } from '@angular/core';

/** A grid of cells drawn as indexed triangles: pick a triangle to see its indices, and compare memory with and without an index buffer. */
@Component({
  selector: 'w-index-grid',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Sharing corners with indices</h3></div>
      <div class="sliders">
        <label class="w-field"><span>Columns: {{ cols() }}</span><input type="range" min="1" max="6" [value]="cols()" (input)="setCols(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Rows: {{ rows() }}</span><input type="range" min="1" max="4" [value]="rows()" (input)="setRows(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Triangle {{ tri() }} of {{ triCount() }}</span><input type="range" min="0" [max]="triCount() - 1" [value]="tri()" (input)="tri.set(+$any($event.target).value)" /></label>
      </div>
      <svg [attr.viewBox]="'-14 -14 ' + (cols() * cell + 28) + ' ' + (rows() * cell + 28)" class="grid" role="img" [attr.aria-label]="'Grid of ' + cols() + ' by ' + rows() + ' cells; triangle ' + tri() + ' uses vertices ' + current().join(', ')">
        @for (t of triangles(); track $index; let i = $index) {
          <polygon [attr.points]="points(t)" class="t" [class.sel]="i === tri()" />
        }
        @for (v of vertices(); track v.id) {
          <circle [attr.cx]="v.x" [attr.cy]="v.y" r="9" class="v" [class.sel]="current().includes(v.id)" />
          <text [attr.x]="v.x" [attr.y]="v.y + 3.5" class="vn">{{ v.id }}</text>
        }
      </svg>
      <div class="idx mono" aria-label="Index buffer">
        @for (i of indexList(); track $index; let k = $index) {
          <span [class.sel]="isCurrent(k)" [class.gap]="k % 3 === 0 && k > 0">{{ i }}</span>
        }
      </div>
      <table class="wtable mono">
        <thead><tr><th scope="col"></th><th scope="col">Vertices stored</th><th scope="col">Bytes (24-byte vertices)</th></tr></thead>
        <tbody>
          <tr><td>Plain list</td><td>{{ triCount() * 3 }}</td><td>{{ plain() }}</td></tr>
          <tr><td>Indexed (16-bit)</td><td>{{ vertexCount() }} + {{ triCount() * 3 }} indices</td><td>{{ indexed() }}</td></tr>
        </tbody>
      </table>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0 12px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .grid { width: 100%; max-width: 420px; display: block; margin: 0.5rem auto; }
    .t { fill: rgba(139, 92, 246, 0.08); stroke: var(--border-color); stroke-width: 1.2; }
    .t.sel { fill: rgba(245, 158, 11, 0.45); stroke: #f59e0b; stroke-width: 2; }
    .v { fill: var(--bg-main); stroke: #8b5cf6; stroke-width: 1.5; }
    .v.sel { fill: #f59e0b; stroke: #b45309; }
    .vn { font-size: 9px; font-weight: 800; text-anchor: middle; fill: var(--text-main); }
    .idx { display: flex; flex-wrap: wrap; gap: 2px; font-size: 0.72rem; margin: 0.3rem 0; }
    .idx span { padding: 1px 4px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color); }
    .idx span.gap { margin-left: 6px; }
    .idx span.sel { background: rgba(245, 158, 11, 0.35); border-color: #f59e0b; font-weight: 800; }
    .wtable { font-size: 0.76rem; margin: 0.4rem 0; }
  `]
})
export class IndexGridWidget {
  readonly cell = 60;
  cols = signal(3);
  rows = signal(2);
  tri = signal(0);
  setCols(n: number) { this.cols.set(n); this.tri.set(0); }
  setRows(n: number) { this.rows.set(n); this.tri.set(0); }

  vertexCount = computed(() => (this.cols() + 1) * (this.rows() + 1));
  triCount = computed(() => this.cols() * this.rows() * 2);
  vertices = computed(() => {
    const out: { id: number; x: number; y: number }[] = [];
    for (let r = 0; r <= this.rows(); r++)
      for (let c = 0; c <= this.cols(); c++) out.push({ id: r * (this.cols() + 1) + c, x: c * this.cell, y: r * this.cell });
    return out;
  });
  /** Two triangles per cell, wound like the square in the lesson: (tl, tr, br) and (br, bl, tl). */
  triangles = computed(() => {
    const w = this.cols() + 1, out: number[][] = [];
    for (let r = 0; r < this.rows(); r++)
      for (let c = 0; c < this.cols(); c++) {
        const tl = r * w + c, tr = tl + 1, bl = tl + w, br = bl + 1;
        out.push([tl, tr, br], [br, bl, tl]);
      }
    return out;
  });
  indexList = computed(() => this.triangles().flat());
  current = computed(() => this.triangles()[Math.min(this.tri(), this.triCount() - 1)]);
  isCurrent(k: number) { return Math.floor(k / 3) === this.tri(); }
  points(t: number[]) {
    const v = this.vertices();
    return t.map(i => `${v[i].x},${v[i].y}`).join(' ');
  }
  plain = computed(() => (this.triCount() * 3 * 24).toLocaleString('en-GB'));
  indexed = computed(() => (this.vertexCount() * 24 + this.triCount() * 3 * 2).toLocaleString('en-GB'));
  message = computed(() => {
    const p = this.triCount() * 3 * 24, ix = this.vertexCount() * 24 + this.triCount() * 3 * 2;
    const t = this.current();
    return `Triangle ${this.tri()} is indices ${t.join(', ')}. The indexed grid takes ${Math.round(ix / p * 100)}% of the plain list’s memory. ` +
      (this.cols() > 1 && this.rows() > 1 ? 'An inner vertex is shared by 6 triangles but stored once.' : 'Add rows and columns: inner vertices are shared by 6 triangles.');
  });
}
