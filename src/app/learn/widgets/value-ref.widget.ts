import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Kind = 'struct' | 'class' | 'record';

/** Compare struct, class and record: what copying does, and what equality means. */
@Component({
  selector: 'w-value-ref',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>struct vs class vs record</h3></div>
      <p class="w-hint">Same code, three kinds of type. Watch what <span class="mono">p2 = p1</span> copies, and what <span class="mono">==</span> compares.</p>

      <div class="w-controls" role="group" aria-label="Kind of type">
        @for (k of kinds; track k) {
          <button type="button" class="w-btn mono" [class.on]="kind() === k" (click)="kind.set(k)" [attr.aria-pressed]="kind() === k">{{ k }}</button>
        }
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Point.cs" [compact]="true" [copyable]="false" [output]="output()" />
        <div>
          <div class="w-label">Memory after line 5</div>
          <div class="mem">
            <div class="col">
              <small class="w-label">stack</small>
              @if (kind() === 'struct') {
                <div class="val"><span class="mono">p1</span><b class="mono">X=1 Y=2</b></div>
                <div class="val changed"><span class="mono">p2</span><b class="mono">X=10 Y=2</b></div>
              } @else {
                <div class="val ref"><span class="mono">p1</span><b class="mono">→ #A</b></div>
                <div class="val ref"><span class="mono">p2</span><b class="mono">→ #A</b></div>
              }
            </div>
            @if (kind() !== 'struct') {
              <div class="col">
                <small class="w-label">heap</small>
                <div class="obj changed"><span class="mono">#A</span><b class="mono">X=10 Y=2</b><small>one shared object</small></div>
              </div>
            }
          </div>

          <table class="res">
            <tbody>
              @for (r of results(); track r[0]) { <tr><td class="mono">{{ r[0] }}</td><td class="mono" [class.w-ok]="r[1] === 'True' || r[1] === '1'" [class.w-err]="r[1].startsWith('error')">{{ r[1] }}</td></tr> }
            </tbody>
          </table>
          <div class="w-msg info"><i class="bi bi-lightbulb" aria-hidden="true"></i><span>{{ why() }}</span></div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .mem { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 0.8rem; }
    .col { flex: 1 1 140px; padding: 8px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); display: grid; gap: 6px; align-content: start; }
    .val, .obj { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 6px 10px; border-radius: 8px; border: 2px solid rgba(139, 92, 246, 0.45); font-size: 0.82rem; }
    .val.ref { border-color: rgba(14, 165, 233, 0.55); }
    .val.ref b { color: #0ea5e9; }
    .changed { background: rgba(245, 158, 11, 0.1); }
    .obj small { width: 100%; color: var(--text-muted); font-size: 0.7rem; }
    .res { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 0.2rem; }
    .res td { padding: 5px 8px; border-bottom: 1px solid var(--border-color); }
    .res td:last-child { text-align: right; font-weight: 700; }
  `]
})
export class ValueRefWidget {
  kinds: Kind[] = ['struct', 'class', 'record'];
  kind = signal<Kind>('struct');

  code = computed(() => {
    const k = this.kind();
    const decl = k === 'record'
      ? 'record Point(int X, int Y) { public int X { get; set; } = X; }'
      : `${k} Point { public int X, Y; public Point(int x, int y) { X = x; Y = y; } }`;
    return [
      decl,
      '',
      'var p1 = new Point(1, 2);',
      'var p2 = p1;',
      'p2.X = 10;',
      'Console.WriteLine(p1.X);',
      'Console.WriteLine(new Point(3, 4).Equals(new Point(3, 4)));',
      k === 'struct' ? '// new Point(3, 4) == new Point(3, 4)  → error CS0019' : 'Console.WriteLine(new Point(3, 4) == new Point(3, 4));'
    ].join('\n');
  });

  output = computed(() => {
    const k = this.kind();
    return k === 'struct' ? '1\nTrue' : k === 'class' ? '10\nFalse\nFalse' : '10\nTrue\nTrue';
  });

  results = computed<[string, string][]>(() => {
    const k = this.kind();
    return [
      ['p1.X after changing p2', k === 'struct' ? '1' : '10'],
      ['Equals (same values)', k === 'class' ? 'False' : 'True'],
      ['== (same values)', k === 'struct' ? 'error CS0019' : k === 'class' ? 'False' : 'True']
    ];
  });

  why = computed(() => ({
    struct: 'A struct is a VALUE type: p2 = p1 copies the whole value, so changing p2 leaves p1 alone. Equals compares the field values; == only works if you define it.',
    class: 'A class is a REFERENCE type: p2 = p1 copies the reference, so both variables see the same object. Equals and == compare identity (is it the same object?), so two separate objects with equal values are not equal.',
    record: 'A record is a class (reference type) with VALUE EQUALITY generated for you: two records with the same data are equal with both Equals and ==. Copying still shares the object, which is why records are usually made immutable.'
  }[this.kind()]));
}
