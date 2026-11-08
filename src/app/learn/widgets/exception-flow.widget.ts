import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Input = '25' | 'abc' | '0';
interface Step { line: number; text: string; out?: string; thrown?: string }

/** Step through try / catch / finally for three different inputs, with or without the catch blocks. */
@Component({
  selector: 'w-exception-flow',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Follow an exception</h3></div>
      <div class="w-controls" role="group" aria-label="Input">
        <span class="small text-muted">input =</span>
        @for (i of inputs; track i) {
          <button type="button" class="w-btn mono" [class.on]="input() === i" (click)="setInput(i)" [attr.aria-pressed]="input() === i">"{{ i }}"</button>
        }
        <label class="small ms-2 d-inline-flex gap-1 align-items-center"><input type="checkbox" [checked]="catches()" (change)="toggleCatches()"> with catch blocks</label>
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Divide.cs" [compact]="true" [copyable]="false" [active]="[step().line]" [marked]="visited()" [output]="output()" />
        <div>
          @if (step().thrown; as t) {
            <div class="thrown"><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> <span class="mono">{{ t }}</span> thrown!</div>
          }
          <div class="w-panel" aria-live="polite">
            <div class="w-label">Step {{ pos() + 1 }} / {{ steps().length }}</div>
            {{ step().text }}
          </div>
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="go(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn" (click)="go(pos() - 1)" [disabled]="pos() === 0"><i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="pos() === steps().length - 1">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .thrown { margin-bottom: 8px; padding: 8px 12px; border-radius: 10px; font-weight: 700; font-size: 0.88rem; color: #dc2626; background: rgba(239, 68, 68, 0.1); border: 1.5px solid rgba(239, 68, 68, 0.4); animation: shake 0.35s; }
    @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  `]
})
export class ExceptionFlowWidget {
  inputs: Input[] = ['25', 'abc', '0'];
  input = signal<Input>('abc');
  catches = signal(true);
  pos = signal(0);

  setInput(i: Input) { this.input.set(i); this.pos.set(0); }
  toggleCatches() { this.catches.update(c => !c); this.pos.set(0); }
  go(p: number) { this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p))); }

  code = computed(() => {
    const head = [
      `string input = "${this.input()}";`,
      'try',
      '{',
      '    int a = int.Parse(input);',
      '    int result = 100 / a;',
      '    Console.WriteLine($"Result: {result}");',
      '}'
    ];
    const c = this.catches() ? [
      'catch (FormatException)',
      '{',
      '    Console.WriteLine("Please type a number.");',
      '}',
      'catch (DivideByZeroException ex)',
      '{',
      '    Console.WriteLine($"Error: {ex.Message}");',
      '}'
    ] : [];
    return [...head, ...c, 'finally', '{', '    Console.WriteLine("Done.");', '}', 'Console.WriteLine("Program continues");'].join('\n');
  });

  steps = computed<Step[]>(() => {
    const c = this.catches();
    const fin = c ? 17 : 9;
    const s: Step[] = [{ line: 4, text: 'Inside try: int.Parse tries to turn the text into a number.' }];
    const end = (out: string[], crash?: string): Step[] => [
      { line: fin + 1, out: [...out, 'Done.'].join('\n'), text: 'finally ALWAYS runs: after success, after a caught exception, and even when the exception is not caught. Perfect for clean-up.' },
      crash
        ? { line: fin + 1, out: [...out, 'Done.', `Unhandled exception. ${crash}`].join('\n'), text: 'No catch matched, so after finally the exception keeps travelling up. Nothing catches it: the program crashes and the last line never runs.' }
        : { line: fin + 3, out: [...out, 'Done.', 'Program continues'].join('\n'), text: 'The exception (if any) was handled, so the program carries on normally after the try statement.' }
    ];
    const inp = this.input();
    if (inp === '25') {
      s.push({ line: 5, text: 'a = 25. 100 / 25 = 4, no problem.' });
      s.push({ line: 6, out: 'Result: 4', text: 'Every line in try ran. All catch blocks are skipped.' });
      return [...s, ...end(['Result: 4'])];
    }
    if (inp === 'abc') {
      s.push({ line: 4, thrown: 'FormatException', text: '"abc" is not a number, so int.Parse throws a FormatException. The rest of the try block is skipped immediately.' });
      if (!c) return [...s, ...end([], 'System.FormatException: The input string \'abc\' was not in a correct format.')];
      s.push({ line: 10, out: 'Please type a number.', text: 'C# checks the catch blocks from top to bottom. catch (FormatException) matches, so its block runs.' });
      return [...s, ...end(['Please type a number.'])];
    }
    s.push({ line: 5, thrown: 'DivideByZeroException', text: 'Parsing worked (a = 0), but 100 / 0 throws DivideByZeroException. Line 6 is skipped.' });
    if (!c) return [...s, ...end([], 'System.DivideByZeroException: Attempted to divide by zero.')];
    s.push({ line: 12, text: 'catch (FormatException) does not match this type, so it is skipped. The next catch matches.' });
    s.push({ line: 14, out: 'Error: Attempted to divide by zero.', text: 'ex holds the exception object; ex.Message describes the problem.' });
    return [...s, ...end(['Error: Attempted to divide by zero.'])];
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);
  visited = computed(() => this.steps().slice(0, this.pos() + 1).map(s => s.line));
  output = computed(() => {
    for (let i = Math.min(this.pos(), this.steps().length - 1); i >= 0; i--) if (this.steps()[i].out !== undefined) return this.steps()[i].out!;
    return '';
  });
}
