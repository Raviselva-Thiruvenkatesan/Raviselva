import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Pick a value and see which case of a switch matches, in statement or expression form. */
@Component({
  selector: 'w-switch-match',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which case matches?</h3></div>
      <p class="w-hint">Choose a day number. switch jumps straight to the matching case. 0 and 8 match no case, so <span class="mono">default</span> runs.</p>

      <div class="w-controls" role="group" aria-label="Day number">
        @for (n of nums; track n) {
          <button type="button" class="w-btn mono num" [class.on]="day() === n" (click)="day.set(n)" [attr.aria-pressed]="day() === n">{{ n }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Form">
        <button type="button" class="w-btn" [class.on]="form() === 'statement'" (click)="form.set('statement')" [attr.aria-pressed]="form() === 'statement'">switch statement</button>
        <button type="button" class="w-btn" [class.on]="form() === 'expression'" (click)="form.set('expression')" [attr.aria-pressed]="form() === 'expression'">switch expression (C# 8+)</button>
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Day.cs" [compact]="true" [copyable]="false" [active]="active()" [output]="output()" />
        <div class="cases" aria-live="polite">
          @for (c of caseList(); track c.label) {
            <div class="case" [class.hit]="c.hit"><span class="mono">{{ c.label }}</span><span>{{ c.result }}</span></div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .num { width: 40px; justify-content: center; }
    .cases { display: grid; gap: 6px; align-content: start; }
    .case {
      display: flex; justify-content: space-between; gap: 10px; padding: 7px 12px; border-radius: 10px; font-size: 0.88rem;
      border: 1.5px solid var(--border-color); background: var(--bg-main); opacity: 0.6; transition: all 0.25s;
    }
    .case.hit { opacity: 1; border-color: #10b981; background: rgba(16, 185, 129, 0.12); font-weight: 700; transform: translateX(4px); }
  `]
})
export class SwitchMatchWidget {
  nums = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  day = signal(3);
  form = signal<'statement' | 'expression'>('statement');

  caseList = computed(() => {
    const d = this.day();
    const list = DAYS.map((name, i) => ({ label: `case ${i + 1}`, result: name, hit: d === i + 1 }));
    list.push({ label: 'default', result: 'Invalid day', hit: d < 1 || d > 7 });
    return list;
  });

  output = computed(() => {
    const d = this.day();
    return d >= 1 && d <= 7 ? DAYS[d - 1] : 'Invalid day';
  });

  code = computed(() => {
    const d = this.day();
    if (this.form() === 'statement') {
      const lines = [`int day = ${d};`, 'string name;', '', 'switch (day)', '{'];
      DAYS.forEach((n, i) => lines.push(`    case ${i + 1}: name = "${n}"; break;`));
      lines.push('    default: name = "Invalid day"; break;', '}', 'Console.WriteLine(name);');
      return lines.join('\n');
    }
    const lines = [`int day = ${d};`, '', 'string name = day switch', '{'];
    DAYS.forEach((n, i) => lines.push(`    ${i + 1} => "${n}",`));
    lines.push('    _ => "Invalid day"', '};', 'Console.WriteLine(name);');
    return lines.join('\n');
  });

  active = computed(() => {
    const d = this.day();
    const first = this.form() === 'statement' ? 6 : 5;
    return [d >= 1 && d <= 7 ? first + d - 1 : first + 7];
  });
}
