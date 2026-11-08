import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Bug = 'none' | 'plus' | 'round0' | 'lessThan' | 'noCheck' | 'max24';
interface Result { name: string; pass: boolean; msg: string }

/** The code changes on offer; the edited source itself is built in `code()`. */
const BUGS: { id: Bug; label: string }[] = [
  { id: 'none', label: 'Correct code' },
  { id: 'plus', label: 'Typo: + instead of *' },
  { id: 'round0', label: 'Round to 0 decimals' },
  { id: 'lessThan', label: '< instead of <=' },
  { id: 'noCheck', label: 'Delete the guard' },
  { id: 'max24', label: 'New rule: reject > 24 m' }
];

/** Run a small xUnit test suite against a method, then break the method and watch which tests catch it. */
@Component({
  selector: 'w-test-runner',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Tests catch mistakes</h3></div>
      <p class="w-hint">Pick a change to the method (some are bugs), then run the tests.</p>
      <div class="w-controls" role="group" aria-label="Code change">
        @for (b of bugs; track b.id) {
          <button type="button" class="w-btn" [class.on]="bug() === b.id" (click)="setBug(b.id)" [attr.aria-pressed]="bug() === b.id">{{ b.label }}</button>
        }
      </div>
      <div class="w-grid two">
        <app-code [code]="code()" title="BeamMath.cs" [compact]="true" [copyable]="false" [marked]="markedLines()" />
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <button type="button" class="w-btn primary" (click)="run()"><i class="bi bi-play-fill" aria-hidden="true"></i> dotnet test</button>
            @if (ran()) {
              <span class="small mono" [class.w-ok]="failed() === 0" [class.w-err]="failed() > 0">Passed: {{ results().length - failed() }}, Failed: {{ failed() }}</span>
            }
          </div>
          <ul class="tests" aria-live="polite">
            @for (r of results(); track r.name) {
              <li [class.pass]="ran() && r.pass" [class.fail]="ran() && !r.pass">
                <i class="bi" [class.bi-circle]="!ran()" [class.bi-check-circle-fill]="ran() && r.pass" [class.bi-x-circle-fill]="ran() && !r.pass" aria-hidden="true"></i>
                <div><span class="mono">{{ r.name }}</span>@if (ran() && !r.pass) { <small class="d-block mono">{{ r.msg }}</small> }</div>
              </li>
            }
          </ul>
        </div>
      </div>
      @if (ran()) {
        <div class="w-msg" [class.ok]="bug() === 'none'" [class.err]="bug() !== 'none' && failed() > 0" [class.info]="bug() !== 'none' && failed() === 0"><span>{{ verdict() }}</span></div>
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tests { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .tests li { display: flex; gap: 8px; align-items: flex-start; padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); font-size: 0.76rem; }
    .tests li small { color: #dc2626; font-size: 0.7rem; word-break: break-word; }
    .tests li > div { min-width: 0; word-break: break-word; }
    .tests li.pass i { color: #10b981; } .tests li.fail i { color: #ef4444; }
    .tests li.fail { border-color: rgba(239, 68, 68, 0.4); }
  `]
})
export class TestRunnerWidget {
  readonly bugs = BUGS;
  bug = signal<Bug>('none');
  ran = signal(false);

  setBug(b: Bug) { this.bug.set(b); this.ran.set(false); }
  run() { this.ran.set(true); }

  code = computed(() => {
    const b = this.bug();
    const lines = ['public static double MemberWeightKg(double lengthM, double kgPerM)', '{'];
    if (b === 'lessThan') lines.push('    if (lengthM < 0)');
    else if (b !== 'noCheck') lines.push('    if (lengthM <= 0)');
    if (b !== 'noCheck') lines.push('        throw new ArgumentOutOfRangeException(nameof(lengthM));');
    if (b === 'max24') lines.push('    if (lengthM > 24)', '        throw new ArgumentOutOfRangeException(nameof(lengthM));');
    lines.push(b === 'plus' ? '    return Math.Round(lengthM + kgPerM, 1);' : b === 'round0' ? '    return Math.Round(lengthM * kgPerM);' : '    return Math.Round(lengthM * kgPerM, 1);');
    lines.push('}');
    return lines.join('\n');
  });

  markedLines = computed(() => {
    const b = this.bug();
    if (b === 'none' || b === 'noCheck') return [];
    if (b === 'lessThan') return [3];
    if (b === 'max24') return [5, 6];
    return [5];
  });

  /** The method under test, with the selected change applied. Returns a number or the string 'throws'. */
  private call(len: number, kg: number): number | 'throws' {
    const b = this.bug();
    if (b === 'lessThan' ? len < 0 : b !== 'noCheck' && len <= 0) return 'throws';
    if (b === 'max24' && len > 24) return 'throws';
    const raw = b === 'plus' ? len + kg : len * kg;
    return b === 'round0' ? Math.round(raw) : Math.round(raw * 10) / 10;
  }

  results = computed<Result[]>(() => {
    const eq = (name: string, len: number, kg: number, exp: number): Result => {
      const got = this.call(len, kg);
      return got === 'throws'
        ? { name, pass: false, msg: 'ArgumentOutOfRangeException was thrown' }
        : { name, pass: Math.abs(got - exp) < 1e-9, msg: `Assert.Equal() Failure: Expected ${exp}, Actual ${got}` };
    };
    const throws = (name: string, len: number): Result => {
      const got = this.call(len, 42.2);
      return { name, pass: got === 'throws', msg: `Assert.Throws() Failure: No exception was thrown (returned ${got})` };
    };
    return [
      eq('Weight_of_6_5m_IPE300_is_274_3', 6.5, 42.2, 274.3),
      eq('Weight_is_length_times_mass(1, 42.2, 42.2)', 1, 42.2, 42.2),
      eq('Weight_is_length_times_mass(10, 36.1, 361)', 10, 36.1, 361),
      eq('Weight_is_length_times_mass(0.5, 10, 5)', 0.5, 10, 5),
      throws('Throws_for_zero_length', 0),
      throws('Throws_for_negative_length', -2)
    ];
  });

  failed = computed(() => this.results().filter(r => !r.pass).length);

  verdict = computed(() => {
    const f = this.failed();
    switch (this.bug()) {
      case 'none': return 'All green. Now you can refactor freely: if you break something, a test turns red within seconds.';
      case 'max24': return 'All tests still pass, but the behaviour changed: a 30 m member now throws. No test covers lengths over 24 m. Passing tests only prove what they check, so add a test for every rule.';
      default: return `${f} test${f === 1 ? '' : 's'} caught the bug before it reached a user. The failure message shows the expected and actual values, so you know exactly what broke.`;
    }
  });
}
