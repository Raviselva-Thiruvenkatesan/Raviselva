import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Call { k: number; ret?: number }
interface Step { line: number; calls: Call[]; text: string }

/** Watch Factorial(n) call itself down to the base case and then return back up. */
@Component({
  selector: 'w-recursion',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Calls go down, answers come back up</h3></div>
      <div class="w-controls">
        <span class="small text-muted">Factorial of</span>
        @for (v of [1, 2, 3, 4, 5]; track v) {
          <button type="button" class="w-btn mono" [class.on]="n() === v" (click)="setN(v)" [attr.aria-pressed]="n() === v">{{ v }}</button>
        }
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Factorial.cs" [compact]="true" [copyable]="false" [active]="[step().line]" />
        <div>
          <div class="calls">
            @for (c of step().calls; track c.k; let d = $index; let last = $last) {
              <div class="call" [style.margin-left.px]="d * 16" [class.top]="last && c.ret === undefined" [class.done]="c.ret !== undefined">
                <span class="mono">Factorial({{ c.k }})</span>
                <small>
                  @if (c.ret !== undefined) { returns <b class="mono">{{ c.ret }}</b> }
                  @else if (last) { running… }
                  @else { waiting for Factorial({{ c.k - 1 }}) }
                </small>
              </div>
            }
          </div>
          <div class="w-panel mt-2" aria-live="polite">
            <div class="w-label">Step {{ pos() + 1 }} / {{ steps().length }}</div>
            {{ step().text }}
          </div>
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="pos.set(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn" (click)="go(pos() - 1)" [disabled]="pos() === 0"><i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="pos() === steps().length - 1">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .calls { display: flex; flex-direction: column; gap: 6px; min-height: 120px; }
    .call {
      padding: 7px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main);
      display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 0.88rem; transition: all 0.25s; animation: in 0.3s ease-out;
    }
    .call small { color: var(--text-muted); }
    .call.top { border-color: var(--purple); background: rgba(139, 92, 246, 0.12); }
    .call.done { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
    @keyframes in { from { opacity: 0; transform: translateY(-6px); } }
  `]
})
export class RecursionWidget {
  n = signal(4);
  pos = signal(0);

  code = computed(() => [
    'static int Factorial(int n)',
    '{',
    '    if (n <= 1)',
    '        return 1;                 // base case: stop here',
    '    return n * Factorial(n - 1);  // recursive case',
    '}',
    '',
    `Console.WriteLine(Factorial(${this.n()}));`
  ].join('\n'));

  setN(v: number) { this.n.set(v); this.pos.set(0); }

  steps = computed<Step[]>(() => {
    const n = this.n();
    const s: Step[] = [];
    const calls: Call[] = [];
    for (let k = n; k >= 1; k--) {
      calls.push({ k });
      if (k > 1) {
        s.push({ line: 5, calls: structuredClone(calls), text: `Factorial(${k}): is ${k} <= 1? No. So it needs ${k} × Factorial(${k - 1}) and calls itself. This call waits.` });
      } else {
        calls[calls.length - 1].ret = 1;
        s.push({ line: 4, calls: structuredClone(calls), text: 'Factorial(1): 1 <= 1 is true. Base case reached: return 1 without calling again. Now the answers travel back up.' });
      }
    }
    let acc = 1;
    for (let k = 2; k <= n; k++) {
      acc *= k;
      calls.pop();
      calls[calls.length - 1].ret = acc;
      s.push({ line: 5, calls: structuredClone(calls), text: `Factorial(${k}) gets ${acc / k} back, multiplies: ${k} × ${acc / k} = ${acc}, and returns ${acc}.` });
    }
    s.push({ line: 8, calls: [{ k: n, ret: acc }], text: `All calls have returned. Factorial(${n}) = ${acc}. Without the base case, the calls would never stop and the program would crash with a StackOverflowException.` });
    return s;
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);

  go(p: number) {
    this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p)));
  }
}
