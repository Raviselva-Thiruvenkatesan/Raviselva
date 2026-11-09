import { Component, computed, input } from '@angular/core';
import { SqlGridComponent } from './sql-grid.component';
import { Cell } from './sql-data';

type Block = { kind: 'grid'; cols: string[]; rows: Cell[][] } | { kind: 'msg'; lines: { text: string; err: boolean }[] };

/**
 * Parse SSMS-style text output (as in the lessons: result grids with a dashed header line,
 * and messages such as "Msg 547, Level 16 …") into grids and message blocks.
 */
export function parseSqlOutput(text: string): Block[] {
  return text.split(/\n\s*\n/).filter(c => c.trim()).map(chunk => {
    const lines = chunk.split('\n');
    if (lines.length >= 2 && /^-+( +-+)*$/.test(lines[1].trimEnd())) {
      const segs = [...lines[1].matchAll(/-+/g)].map(m => [m.index!, m[0].length]);
      const cut = (l: string) => segs.map(([s, n], k) => l.slice(s, k === segs.length - 1 ? undefined : s + n).trim());
      return { kind: 'grid', cols: cut(lines[0]), rows: lines.slice(2).map(l => cut(l).map(v => (v === 'NULL' ? null : v))) } as Block;
    }
    let inErr = false;
    return { kind: 'msg', lines: lines.map(l => { const start = /^Msg \d+, Level/.test(l); const err = start || inErr; inErr = start; return { text: l, err }; }) } as Block;
  });
}

/** Results and messages of a script run, rendered like SSMS: grids first in order, messages in a panel. */
@Component({
  selector: 'app-sql-output',
  standalone: true,
  imports: [SqlGridComponent],
  template: `
    <div class="outs">
      @for (b of blocks(); track $index) {
        @if (b.kind === 'grid') {
          <app-sql-grid [cols]="b.cols" [rows]="b.rows" [label]="label()" />
        } @else {
          <div class="msgs mono" role="log">
            @for (l of b.lines; track $index) { <div [class.err]="l.err">{{ l.text }}</div> }
          </div>
        }
      } @empty {
        <div class="msgs mono quiet">Commands completed successfully.</div>
      }
    </div>
  `,
  styles: [`
    .outs { display: flex; flex-direction: column; gap: 0.45rem; min-width: 0; }
    .msgs { font-size: 0.74rem; padding: 6px 9px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-main); overflow-wrap: anywhere; }
    .msgs .err { color: #ef4444; }
    .msgs.quiet { color: var(--text-muted); font-style: italic; }
    .mono { font-family: 'Cascadia Code', Consolas, monospace; }
  `]
})
export class SqlOutputComponent {
  text = input.required<string>();
  label = input('Results');
  blocks = computed(() => parseSqlOutput(this.text()));
}
