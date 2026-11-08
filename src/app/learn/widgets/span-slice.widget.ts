import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** A Span is a window onto existing memory: slice it, write through it, and compare allocations with Split/Substring. */
@Component({
  selector: 'w-span-slice',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A window onto memory</h3></div>
      <div class="w-controls">
        <label class="w-field">start <input class="mono" type="number" min="0" max="9" style="width:4.5rem" [ngModel]="start()" (ngModelChange)="start.set(clamp(+$event, 0, 9))"></label>
        <label class="w-field">length <input class="mono" type="number" min="0" max="10" style="width:4.5rem" [ngModel]="len()" (ngModelChange)="len.set(clamp(+$event, 0, 10))"></label>
        <button type="button" class="w-btn primary align-self-end mono" (click)="write()" [disabled]="!valid() || len() === 0">slice[0] = 99</button>
        <button type="button" class="w-btn align-self-end" (click)="reset()">Reset</button>
      </div>
      <div class="code mono">Span&lt;int&gt; slice = data.AsSpan({{ start() }}, {{ len() }});   <span class="c">// no copy</span></div>

      <div class="cells" aria-hidden="true">
        @for (v of data(); track $index; let i = $index) {
          <div class="cell" [class.in]="inSlice(i)" [class.changed]="changed() === i">
            <span class="si mono">{{ inSlice(i) ? 'slice[' + (i - start()) + ']' : '' }}</span>
            <span class="v mono">{{ v }}</span>
            <span class="di mono">data[{{ i }}]</span>
          </div>
        }
      </div>
      <div class="w-msg" [class.err]="!valid()" [class.info]="valid()" aria-live="polite"><span>{{ msg() }}</span></div>

      <div class="w-label mt-4">Parsing "B12,IPE300,6.5" one million times</div>
      <div class="cmp">
        <div class="side">
          <code class="mono">line.Split(',')</code>
          <div class="small">per line: 1 array + 3 new strings = <strong>4 allocations</strong></div>
          <div class="small">1M lines: <strong class="bad">4,000,000 objects</strong> for the GC</div>
        </div>
        <div class="side">
          <code class="mono">line.AsSpan() + IndexOf(',') + Slice</code>
          <div class="small">per line: slices of the original text = <strong>0 allocations</strong></div>
          <div class="small">1M lines: <strong class="good">0 objects</strong>, parse numbers straight from the span</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; margin-bottom: 0.7rem; }
    .c { color: #64748b; }
    .cells { display: flex; flex-wrap: wrap; gap: 3px; }
    .cell { width: 54px; display: flex; flex-direction: column; align-items: center; }
    .cell .v { width: 54px; height: 40px; display: grid; place-items: center; font-weight: 700; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-main); transition: all 0.2s; }
    .cell.in .v { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.15); }
    .cell.changed .v { border-color: #f59e0b; background: rgba(245, 158, 11, 0.25); }
    .si { font-size: 0.62rem; color: #0284c7; height: 14px; }
    .di { font-size: 0.62rem; color: var(--text-muted); }
    .cmp { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 640px) { .cmp { grid-template-columns: 1fr 1fr; } }
    .side { padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); display: grid; gap: 4px; }
    .side code { color: var(--text-main); font-size: 0.8rem; word-break: break-word; }
    .bad { color: #dc2626; } .good { color: #059669; }
  `]
})
export class SpanSliceWidget {
  private readonly initial = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  data = signal([...this.initial]);
  start = signal(3);
  len = signal(4);
  changed = signal(-1);

  clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Math.trunc(v || 0))); }
  valid = computed(() => this.start() + this.len() <= this.data().length);
  inSlice(i: number) { return this.valid() && i >= this.start() && i < this.start() + this.len(); }

  msg = computed(() => {
    if (!this.valid()) return `ArgumentOutOfRangeException: start + length (${this.start() + this.len()}) is past the end of the array (10).`;
    if (this.changed() >= 0) return `Writing slice[0] changed data[${this.changed()}] too: they are the SAME memory. A span is just a pointer + length, created on the stack, and it never copies.`;
    return `slice.Length = ${this.len()}. slice[0] is data[${this.start()}]. Making the span cost nothing: no new array was allocated.`;
  });

  write() {
    const i = this.start();
    this.data.update(d => d.map((v, k) => (k === i ? 99 : v)));
    this.changed.set(i);
  }

  reset() {
    this.data.set([...this.initial]);
    this.changed.set(-1);
  }
}
