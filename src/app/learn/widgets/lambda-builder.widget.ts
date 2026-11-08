import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodeViewComponent } from '../shared/code-view.component';
import { BEAMS } from './beam-data';

const STAGES = [
  { code: 'static bool IsLong(Beam b)\n{\n    return b.Length > 6;\n}\n\nvar longOnes = beams.Where(IsLong);', note: 'A normal named method, passed to Where.' },
  { code: '(Beam b) =>\n{\n    return b.Length > 6;\n}', note: 'Drop "static", the return type and the name. Add => between the parameters and the body. This is already a lambda.' },
  { code: '(Beam b) => b.Length > 6', note: 'When the body is a single expression, remove the braces and "return": the expression’s value is returned.' },
  { code: '(b) => b.Length > 6', note: 'The compiler knows Where needs a Func<Beam, bool>, so it infers that b is a Beam. Drop the type.' },
  { code: 'b => b.Length > 6\n\nvar longOnes = beams.Where(b => b.Length > 6);', note: 'With exactly one parameter, the brackets are optional too. Read it as "b goes to b.Length > 6".' }
];

/** Shrink a method into a lambda step by step, then see a lambda capture an outside variable. */
@Component({
  selector: 'w-lambda-builder',
  standalone: true,
  imports: [FormsModule, CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From method to lambda</h3></div>
      <div class="w-controls" role="group" aria-label="Stage">
        @for (s of stages; track $index; let i = $index) {
          <button type="button" class="w-btn" [class.on]="stage() === i" (click)="stage.set(i)" [attr.aria-pressed]="stage() === i">{{ i + 1 }}</button>
        }
        <button type="button" class="w-btn primary" (click)="stage.set((stage() + 1) % stages.length)">{{ stage() === stages.length - 1 ? 'Start again' : 'Shorten' }} <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
      <app-code [code]="stages[stage()].code" title="Lambda.cs" [compact]="true" [copyable]="false" />
      <div class="w-msg info" aria-live="polite"><i class="bi bi-scissors" aria-hidden="true"></i><span>{{ stages[stage()].note }}</span></div>

      <div class="w-label mt-4">Closures: a lambda can use variables from outside</div>
      <label class="w-field w-100 mb-2"><span class="mono">double minLength = {{ min() }};</span>
        <input type="range" min="2" max="10" step="0.5" [ngModel]="min()" (ngModelChange)="min.set(+$event)" aria-label="minLength">
      </label>
      <div class="code mono">Func&lt;Beam, bool&gt; isLong = b =&gt; b.Length &gt; <span class="hl">minLength</span>;   <span class="c">// captures minLength, not a copy</span></div>
      <div class="beams">
        @for (b of beams; track b.Mark) {
          <div class="bm" [class.on]="b.Length > min()"><span class="mono">{{ b.Mark }}</span><small>{{ b.Length }} m</small></div>
        }
      </div>
      <p class="small mt-2 mb-0">beams.Count(isLong) = <strong>{{ count() }}</strong>. Moving the slider changes minLength, and the same lambda sees the new value the next time it runs.</p>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; margin-bottom: 0.7rem; }
    .hl { color: #ffcb6b; } .c { color: #64748b; }
    .beams { display: flex; flex-wrap: wrap; gap: 6px; }
    .bm { display: flex; flex-direction: column; align-items: center; min-width: 56px; padding: 5px 8px; border-radius: 10px; border: 1.5px solid var(--border-color); opacity: 0.5; transition: all 0.2s; }
    .bm small { font-size: 0.7rem; color: var(--text-muted); }
    .bm.on { opacity: 1; border-color: #10b981; background: rgba(16, 185, 129, 0.12); }
  `]
})
export class LambdaBuilderWidget {
  stages = STAGES;
  stage = signal(0);
  beams = BEAMS;
  min = signal(6);
  count = computed(() => BEAMS.filter(b => b.Length > this.min()).length);
}
