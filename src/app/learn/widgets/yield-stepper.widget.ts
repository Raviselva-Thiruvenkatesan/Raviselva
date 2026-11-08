import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Step { line: number; out: string[]; text: string; side: 'producer' | 'consumer' | 'done' }

/** Step through an iterator with yield return: the producer and the consumer take turns. */
@Component({
  selector: 'w-yield-stepper',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>yield return: one value at a time</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn mono" [class.on]="!eager()" (click)="setEager(false)" [attr.aria-pressed]="!eager()">Squares(5).Take(3)</button>
        <button type="button" class="w-btn mono" [class.on]="eager()" (click)="setEager(true)" [attr.aria-pressed]="eager()">Squares(5).ToList().Take(3)</button>
      </div>
      <div class="w-grid two">
        <app-code [code]="code()" title="Iterator.cs" [compact]="true" [copyable]="false" [active]="[step().line]" [output]="step().out.join('\\n')" />
        <div>
          <div class="sides">
            <span class="side" [class.on]="step().side === 'producer'"><i class="bi bi-gear" aria-hidden="true"></i> Squares() running</span>
            <span class="side" [class.on]="step().side === 'consumer'"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> foreach body running</span>
          </div>
          <div class="w-panel mt-2" aria-live="polite">
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
    .sides { display: flex; flex-wrap: wrap; gap: 6px; }
    .side { font-size: 0.8rem; padding: 4px 10px; border-radius: 999px; border: 1.5px solid var(--border-color); color: var(--text-muted); transition: all 0.2s; }
    .side.on { color: #fff; background: var(--gradient-primary); border-color: transparent; }
  `]
})
export class YieldStepperWidget {
  eager = signal(false);
  pos = signal(0);

  setEager(v: boolean) { this.eager.set(v); this.pos.set(0); }
  go(p: number) { this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p))); }

  code = computed(() => [
    'static IEnumerable<int> Squares(int max)',
    '{',
    '    for (int i = 1; i <= max; i++)',
    '    {',
    '        Console.WriteLine($"  making {i * i}");',
    '        yield return i * i;',
    '    }',
    '}',
    '',
    `foreach (int sq in Squares(5)${this.eager() ? '.ToList()' : ''}.Take(3))`,
    '    Console.WriteLine($"got {sq}");'
  ].join('\n'));

  steps = computed<Step[]>(() => {
    const out: string[] = [];
    const s: Step[] = [{ line: 10, out: [], side: 'consumer', text: this.eager()
      ? 'Squares(5) only creates the iterator object; none of its code has run yet. Then ToList() asks it for EVERY value straight away.'
      : 'Calling Squares(5) runs none of its code: it just returns an iterator object. foreach asks it for the first value (MoveNext).' }];
    const make = (i: number) => {
      out.push(`  making ${i * i}`);
      s.push({ line: 5, out: [...out], side: 'producer', text: `The method body runs until it reaches yield return, with i = ${i}.` });
      s.push({ line: 6, out: [...out], side: 'producer', text: `yield return ${i * i}: hand this value out and PAUSE here. All local variables (i = ${i}) are remembered.` });
    };
    const got = (v: number, n: number) => {
      out.push(`got ${v}`);
      s.push({ line: 11, out: [...out], side: 'consumer', text: `The foreach body runs with sq = ${v}${n < 3 ? '. Then it asks for the next value and Squares() resumes right after its yield return.' : '. Take(3) now has 3 values, so it stops asking.'}` });
    };
    if (this.eager()) {
      for (let i = 1; i <= 5; i++) make(i);
      s.push({ line: 8, out: [...out], side: 'done', text: 'ToList() drained the whole iterator: all 5 values were produced and stored, even though we only need 3.' });
      [1, 4, 9].forEach((v, k) => got(v, k + 1));
      s.push({ line: 11, out: [...out], side: 'done', text: 'Same printed values, but 16 and 25 were calculated for nothing. With an expensive source (a big file, a database) that waste matters.' });
    } else {
      for (let i = 1; i <= 3; i++) { make(i); got(i * i, i); }
      s.push({ line: 11, out: [...out], side: 'done', text: 'Done. "making 16" and "making 25" never ran: values are produced only when someone asks for them. This is lazy evaluation, the same idea behind LINQ’s deferred execution.' });
    }
    return s;
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);
}
