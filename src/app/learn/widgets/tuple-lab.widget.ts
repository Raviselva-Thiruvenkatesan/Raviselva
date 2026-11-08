import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** A method that returns several values as a tuple, and deconstruction into variables (with discards). */
@Component({
  selector: 'w-tuple-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Return several values at once</h3></div>
      <label class="w-field w-100 mb-2">double[] loads = <input class="mono" [ngModel]="raw()" (ngModelChange)="raw.set($event)" spellcheck="false" aria-label="Numbers separated by commas"></label>

      <div class="code mono">
        <div><span class="k">static</span> (<span class="t">double</span> Min, <span class="t">double</span> Max, <span class="t">double</span> Avg) Stats(<span class="t">double</span>[] v)</div>
        <div>    =&gt; (v.Min(), v.Max(), v.Average());</div>
      </div>

      <div class="tuple" aria-live="polite">
        <span class="paren">(</span>
        @for (p of parts(); track p.name; let last = $last) {
          <div class="el" [class.disc]="discard().includes(p.name)">
            <small class="mono">{{ p.name }}</small><strong class="mono">{{ p.value }}</strong>
          </div>
          @if (!last) { <span class="comma">,</span> }
        }
        <span class="paren">)</span>
      </div>

      <div class="w-controls mt-2" role="group" aria-label="Discard elements">
        <span class="small text-muted">Discard with _:</span>
        @for (n of names; track n) {
          <button type="button" class="w-btn mono" [class.on]="discard().includes(n)" (click)="toggle(n)" [attr.aria-pressed]="discard().includes(n)">{{ n }}</button>
        }
      </div>

      <div class="code mono">
        <div>var ({{ decon() }}) = Stats(loads);</div>
        @for (p of kept(); track p.name) { <div><span class="c">// {{ p.var }} = {{ p.value }}</span></div> }
      </div>
      <div class="w-msg" [class.err]="!valid()" [class.info]="valid()">
        <i class="bi" [class.bi-x-octagon]="!valid()" [class.bi-boxes]="valid()" aria-hidden="true"></i>
        <span>{{ valid() ? 'Deconstruction unpacks the tuple into separate variables by position. _ throws away values you don’t need.' : 'InvalidOperationException: Sequence contains no elements. Enter at least one number.' }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: pre; margin: 0.5rem 0; }
    .k { color: #c792ea; } .t { color: #82aaff; } .c { color: #c3e88d; }
    .tuple { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 0; }
    .paren, .comma { font-size: 1.6rem; color: var(--text-muted); font-weight: 300; }
    .el { display: flex; flex-direction: column; align-items: center; padding: 6px 14px; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.07); transition: all 0.2s; }
    .el small { font-size: 0.7rem; color: var(--text-muted); }
    .el strong { font-size: 1.1rem; color: var(--purple); }
    .el.disc { opacity: 0.35; border-style: dashed; }
  `]
})
export class TupleLabWidget {
  names = ['Min', 'Max', 'Avg'];
  raw = signal('12.5, 40, 22, 8.5');
  discard = signal<string[]>(['Max']);

  private nums = computed(() => this.raw().split(',').map(s => s.trim()).filter(s => s !== '' && !isNaN(+s)).map(Number));
  valid = computed(() => this.nums().length > 0);

  parts = computed(() => {
    const v = this.nums();
    if (!v.length) return this.names.map(n => ({ name: n, value: '?' }));
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    return [
      { name: 'Min', value: String(Math.min(...v)) },
      { name: 'Max', value: String(Math.max(...v)) },
      { name: 'Avg', value: String(+avg.toFixed(4)) }
    ];
  });

  kept = computed(() => this.parts().filter(p => !this.discard().includes(p.name)).map(p => ({ ...p, var: p.name.toLowerCase() })));
  decon = computed(() => this.names.map(n => (this.discard().includes(n) ? '_' : n.toLowerCase())).join(', '));

  toggle(n: string) {
    this.discard.update(d => (d.includes(n) ? d.filter(x => x !== n) : [...d, n]));
  }
}
