import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodeViewComponent } from '../shared/code-view.component';

interface Check { cond: string; limit: number; grade: string; line: number; bodyLine: number }

/** An if / else-if / else chain drawn as a flowchart; the path taken lights up as marks change. */
@Component({
  selector: 'w-if-flow',
  standalone: true,
  imports: [FormsModule, CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Follow the decision path</h3></div>
      <p class="w-hint">Drag the slider. C# checks the conditions <strong>from top to bottom</strong> and runs only the <strong>first</strong> branch that is true.</p>

      <label class="w-field mb-3 w-100">int marks = <span class="mono big">{{ marks() }}</span>
        <input type="range" min="0" max="100" [ngModel]="marks()" (ngModelChange)="marks.set(+$event)" aria-label="Marks">
      </label>

      <div class="w-grid two">
        <div class="flow" aria-live="polite">
          @for (c of checks; track c.cond; let i = $index) {
            <div class="step" [class.skip]="i > taken()" [class.no]="i < taken()" [class.yes]="i === taken()">
              <div class="diamond mono">{{ c.cond }}?</div>
              <div class="ans">
                @if (i < taken()) { <span class="w-err">false ↓</span> }
                @else if (i === taken()) { <span class="w-ok">true →</span> }
                @else { <span class="muted">not checked</span> }
              </div>
              <div class="out mono" [class.lit]="i === taken()">grade = "{{ c.grade }}"</div>
            </div>
          }
          <div class="step else" [class.yes]="taken() === checks.length" [class.skip]="taken() < checks.length">
            <div class="diamond mono">else</div>
            <div class="ans">@if (taken() === checks.length) { <span class="w-ok">→</span> } @else { <span class="muted">skipped</span> }</div>
            <div class="out mono" [class.lit]="taken() === checks.length">grade = "Fail"</div>
          </div>
          <div class="final">Result: <strong class="mono">grade = "{{ grade() }}"</strong> · {{ evaluated() }} condition{{ evaluated() === 1 ? '' : 's' }} checked</div>
        </div>

        <app-code [code]="code()" title="Grade.cs" [compact]="true" [copyable]="false" [active]="activeLines()" [marked]="checkedLines()" />
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .big { font-size: 1rem; color: var(--purple); }
    .flow { display: flex; flex-direction: column; gap: 8px; }
    .step {
      display: grid; grid-template-columns: minmax(0, 1.2fr) 88px minmax(0, 1fr); align-items: center; gap: 8px;
      padding: 6px; border-radius: 12px; border: 1.5px solid var(--border-color); background: var(--bg-main); transition: all 0.25s;
    }
    .diamond { font-size: 0.85rem; font-weight: 600; padding: 6px 8px; border-radius: 8px; background: rgba(139, 92, 246, 0.1); text-align: center; }
    .ans { font-size: 0.82rem; font-weight: 700; text-align: center; }
    .muted { color: var(--text-muted); font-weight: 500; }
    .out { font-size: 0.82rem; padding: 6px 8px; border-radius: 8px; border: 1.5px dashed var(--border-color); text-align: center; opacity: 0.55; transition: all 0.25s; }
    .out.lit { opacity: 1; border-style: solid; border-color: #10b981; background: rgba(16, 185, 129, 0.12); font-weight: 700; }
    .step.yes { border-color: #10b981; box-shadow: 0 6px 18px -10px rgba(16, 185, 129, 0.8); }
    .step.no { opacity: 0.85; }
    .step.skip { opacity: 0.45; }
    .final { margin-top: 4px; font-size: 0.92rem; }
    @media (max-width: 480px) { .step { grid-template-columns: 1fr 70px; } .out { grid-column: 1 / -1; } }
  `]
})
export class IfFlowWidget {
  marks = signal(72);
  checks: Check[] = [
    { cond: 'marks >= 90', limit: 90, grade: 'A', line: 4, bodyLine: 5 },
    { cond: 'marks >= 75', limit: 75, grade: 'B', line: 6, bodyLine: 7 },
    { cond: 'marks >= 50', limit: 50, grade: 'C', line: 8, bodyLine: 9 }
  ];

  /** Index of the branch taken; checks.length means the else branch. */
  taken = computed(() => {
    const i = this.checks.findIndex(c => this.marks() >= c.limit);
    return i < 0 ? this.checks.length : i;
  });
  grade = computed(() => this.taken() < this.checks.length ? this.checks[this.taken()].grade : 'Fail');
  evaluated = computed(() => Math.min(this.taken() + 1, this.checks.length));

  code = computed(() => [
    `int marks = ${this.marks()};`,
    'string grade;',
    '',
    'if (marks >= 90)',
    '    grade = "A";',
    'else if (marks >= 75)',
    '    grade = "B";',
    'else if (marks >= 50)',
    '    grade = "C";',
    'else',
    '    grade = "Fail";',
    '',
    'Console.WriteLine($"Grade: {grade}");'
  ].join('\n'));

  activeLines = computed(() => [this.taken() < this.checks.length ? this.checks[this.taken()].bodyLine : 11]);
  checkedLines = computed(() => this.checks.slice(0, this.evaluated()).map(c => c.line).concat(this.taken() === this.checks.length ? [10] : []));
}
