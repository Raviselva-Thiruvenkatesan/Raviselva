import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Mode = 'value' | 'ref' | 'out';
interface Step { line: number; caller: string; param: string | null; linked: boolean; text: string }

/** Step through a method call to compare passing by value, ref and out. */
@Component({
  selector: 'w-param-passing',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Copy or the same box?</h3></div>
      <div class="w-controls" role="group" aria-label="Passing mode">
        @for (m of modes; track m) {
          <button type="button" class="w-btn mono" [class.on]="mode() === m" (click)="setMode(m)" [attr.aria-pressed]="mode() === m">{{ m === 'value' ? 'by value' : m }}</button>
        }
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Params.cs" [compact]="true" [copyable]="false" [active]="[step().line]" [output]="pos() === steps().length - 1 ? 'score = ' + step().caller : ''" />
        <div>
          <div class="boxes">
            <div class="frame"><div class="w-label">Main</div>
              <div class="box" [class.link]="step().linked"><small class="mono">score</small><strong class="mono">{{ step().caller }}</strong></div>
            </div>
            <div class="arrow" aria-hidden="true">
              @if (step().param !== null) { <i class="bi" [class.bi-link-45deg]="step().linked" [class.bi-files]="!step().linked"></i><small>{{ step().linked ? 'same variable' : 'copy' }}</small> }
            </div>
            <div class="frame"><div class="w-label">AddBonus</div>
              @if (step().param !== null) {
                <div class="box" [class.link]="step().linked" [class.alias]="step().linked"><small class="mono">x</small><strong class="mono">{{ step().linked ? step().caller : step().param }}</strong></div>
              } @else { <div class="box empty"><small>not called</small></div> }
            </div>
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
    .boxes { display: grid; grid-template-columns: 1fr 70px 1fr; align-items: center; gap: 6px; }
    .frame { padding: 8px; border-radius: 12px; border: 2px dashed var(--border-color); text-align: center; }
    .box { margin-top: 4px; padding: 8px; border-radius: 10px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.06); transition: all 0.25s; }
    .box small { display: block; color: var(--text-muted); font-size: 0.75rem; }
    .box strong { font-size: 1.4rem; }
    .box.link { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.1); }
    .box.empty { border-style: dashed; opacity: 0.5; padding: 18px 8px; }
    .arrow { text-align: center; color: var(--text-muted); }
    .arrow i { font-size: 1.5rem; display: block; color: var(--purple); }
    .arrow small { font-size: 0.7rem; }
  `]
})
export class ParamPassingWidget {
  modes: Mode[] = ['value', 'ref', 'out'];
  mode = signal<Mode>('value');
  pos = signal(0);

  setMode(m: Mode) { this.mode.set(m); this.pos.set(0); }

  code = computed(() => {
    const m = this.mode();
    if (m === 'out') return [
      'static void AddBonus(out int x)',
      '{',
      '    x = 100;   // out: MUST assign before returning',
      '}',
      '',
      'int score;            // no value needed',
      'AddBonus(out score);',
      'Console.WriteLine($"score = {score}");'
    ].join('\n');
    const kw = m === 'ref' ? 'ref ' : '';
    return [
      `static void AddBonus(${kw}int x)`,
      '{',
      '    x = x + 10;',
      '}',
      '',
      'int score = 50;',
      `AddBonus(${kw}score);`,
      'Console.WriteLine($"score = {score}");'
    ].join('\n');
  });

  steps = computed<Step[]>(() => {
    switch (this.mode()) {
      case 'value': return [
        { line: 6, caller: '50', param: null, linked: false, text: 'score is created in Main with the value 50.' },
        { line: 1, caller: '50', param: '50', linked: false, text: 'AddBonus(score) is called. By default C# passes a COPY of the value: x is a new, separate box holding 50.' },
        { line: 3, caller: '50', param: '60', linked: false, text: 'x = x + 10 changes only the copy. x is 60, score in Main is still 50.' },
        { line: 8, caller: '50', param: null, linked: false, text: 'The method returns and x disappears with its frame. score was never touched: it prints 50.' }
      ];
      case 'ref': return [
        { line: 6, caller: '50', param: null, linked: false, text: 'score is created in Main with the value 50. ref needs the variable to have a value first.' },
        { line: 1, caller: '50', param: '50', linked: true, text: 'AddBonus(ref score): no copy is made. x is another name for the SAME box as score.' },
        { line: 3, caller: '60', param: '60', linked: true, text: 'x = x + 10 writes into that shared box, so score becomes 60 too.' },
        { line: 8, caller: '60', param: null, linked: false, text: 'After the call, score keeps the change and prints 60.' }
      ];
      default: return [
        { line: 6, caller: '?', param: null, linked: false, text: 'score is declared without a value. That is allowed for out, because the method promises to fill it.' },
        { line: 1, caller: '?', param: '?', linked: true, text: 'AddBonus(out score): x is linked to score, like ref. The method may not read x before assigning it.' },
        { line: 3, caller: '100', param: '100', linked: true, text: 'x = 100 assigns the shared box. If the method forgot this line, the code would not compile.' },
        { line: 8, caller: '100', param: null, linked: false, text: 'score now holds the value produced by the method: 100. This is how int.TryParse gives you its number.' }
      ];
    }
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);

  go(p: number) {
    this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p)));
  }
}
