import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Frame { name: string; vars: [string, string][] }
interface Step { line: number; frames: Frame[]; text: string; out?: string }

const main = (total = '?'): Frame => ({ name: 'Main()', vars: [['total', total]] });
const sos = (s = '?'): Frame => ({ name: 'SumOfSquares(3, 4)', vars: [['a', '3'], ['b', '4'], ['s', s]] });
const sq = (x: string, r = '?'): Frame => ({ name: `Square(${x})`, vars: [['x', x], ['result', r]] });

/** Step through method calls and watch stack frames being pushed and popped. */
@Component({
  selector: 'w-call-stack',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Watch the call stack</h3></div>
      <p class="w-hint">Each method call gets its own <strong>frame</strong> with its own variables, stacked on top. When the method returns, its frame is removed.</p>

      <div class="w-grid two">
        <app-code [code]="code" title="Program.cs" [compact]="true" [copyable]="false" [active]="[step().line]" [output]="step().out ?? ''" />
        <div>
          <div class="w-label">Call stack (top = running now)</div>
          <div class="stack">
            @for (f of framesTopFirst(); track f.name + $index; let first = $first) {
              <div class="frame" [class.top]="first">
                <div class="fname mono">{{ f.name }}</div>
                <div class="fvars">
                  @for (v of f.vars; track v[0]) { <span class="mono">{{ v[0] }} = <b>{{ v[1] }}</b></span> }
                </div>
              </div>
            } @empty {
              <div class="empty">Stack is empty: the program has finished.</div>
            }
          </div>
          <div class="w-panel mt-2" aria-live="polite">
            <div class="w-label">Step {{ pos() + 1 }} / {{ steps.length }}</div>
            {{ step().text }}
          </div>
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="pos.set(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn" (click)="go(pos() - 1)" [disabled]="pos() === 0"><i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="pos() === steps.length - 1">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .stack { display: flex; flex-direction: column; gap: 6px; min-height: 150px; padding: 8px; border-radius: 12px; border: 2px dashed var(--border-color); justify-content: flex-start; }
    .frame { padding: 8px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); opacity: 0.7; animation: push 0.3s ease-out; }
    .frame.top { opacity: 1; border-color: var(--purple); background: rgba(139, 92, 246, 0.1); box-shadow: 0 6px 16px -10px rgba(139, 92, 246, 0.8); }
    .fname { font-weight: 700; font-size: 0.88rem; }
    .fvars { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
    .fvars b { color: var(--text-main); }
    .empty { color: var(--text-muted); font-size: 0.88rem; margin: auto; text-align: center; }
    @keyframes push { from { transform: translateY(-10px); opacity: 0; } }
  `]
})
export class CallStackWidget {
  code = [
    'static int Square(int x)',
    '{',
    '    int result = x * x;',
    '    return result;',
    '}',
    '',
    'static int SumOfSquares(int a, int b)',
    '{',
    '    int s = Square(a) + Square(b);',
    '    return s;',
    '}',
    '',
    'static void Main()',
    '{',
    '    int total = SumOfSquares(3, 4);',
    '    Console.WriteLine(total);',
    '}'
  ].join('\n');

  steps: Step[] = [
    { line: 15, frames: [main()], text: 'The program starts in Main. Main gets the first frame on the stack. It needs SumOfSquares(3, 4) to set total.' },
    { line: 9, frames: [main(), sos()], text: 'Calling SumOfSquares pushes a new frame. Its parameters a = 3 and b = 4 are copies of the arguments. Main waits.' },
    { line: 3, frames: [main(), sos(), sq('3')], text: 'To work out s, it first calls Square(a). A third frame is pushed with x = 3.' },
    { line: 4, frames: [main(), sos(), sq('3', '9')], text: 'result = 3 * 3 = 9. Now Square returns result.' },
    { line: 9, frames: [main(), sos('9 + …')], text: 'Square(3) returned 9: its frame is popped and its variables are gone. Next, Square(b) is called.' },
    { line: 3, frames: [main(), sos('9 + …'), sq('4')], text: 'A fresh Square frame is pushed with x = 4. It is a new frame, with nothing left over from the last call.' },
    { line: 4, frames: [main(), sos('9 + …'), sq('4', '16')], text: 'result = 4 * 4 = 16. Square returns 16.' },
    { line: 10, frames: [main(), sos('25')], text: 'Square(4)’s frame is popped. s = 9 + 16 = 25, and SumOfSquares returns s.' },
    { line: 15, frames: [main('25')], text: 'SumOfSquares’s frame is popped. Back in Main, total receives the returned value 25.' },
    { line: 16, frames: [main('25')], text: 'Console.WriteLine is called (it gets its own short frame too) and prints 25.', out: '25' },
    { line: 17, frames: [], text: 'Main reaches its closing brace and returns. The stack is empty and the program ends.', out: '25' }
  ];

  pos = signal(0);
  step = computed(() => this.steps[this.pos()]);
  framesTopFirst = computed(() => [...this.step().frames].reverse());

  go(p: number) {
    this.pos.set(Math.max(0, Math.min(this.steps.length - 1, p)));
  }
}
