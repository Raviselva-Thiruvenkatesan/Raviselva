import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Kw = 'none' | 'continue' | 'break';
type State = 'ran' | 'skipped' | 'stopped' | 'never';

/** A 1..10 loop drawn as boxes: see which iterations run, get skipped by continue, or never happen after break. */
@Component({
  selector: 'w-loop-control',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>break vs continue</h3></div>
      <p class="w-hint">Choose a keyword and the number that triggers it. Each box is one iteration of the loop.</p>

      <div class="w-controls" role="group" aria-label="Keyword">
        <button type="button" class="w-btn mono" [class.on]="kw() === 'none'" (click)="kw.set('none')" [attr.aria-pressed]="kw() === 'none'">normal</button>
        <button type="button" class="w-btn mono" [class.on]="kw() === 'continue'" (click)="kw.set('continue')" [attr.aria-pressed]="kw() === 'continue'">continue</button>
        <button type="button" class="w-btn mono" [class.on]="kw() === 'break'" (click)="kw.set('break')" [attr.aria-pressed]="kw() === 'break'">break</button>
      </div>
      @if (kw() !== 'none') {
        <div class="w-controls" role="group" aria-label="Trigger">
          <span class="small text-muted">Trigger when:</span>
          @for (r of rules; track r.id) {
            <button type="button" class="w-btn mono" [class.on]="rule() === r.id" (click)="rule.set(r.id)" [attr.aria-pressed]="rule() === r.id">{{ r.label }}</button>
          }
        </div>
      }

      <div class="iters" aria-live="polite">
        @for (it of iterations(); track it.i) {
          <div class="it {{ it.state }}">
            <span class="mono">i = {{ it.i }}</span>
            <small>{{ labels[it.state] }}</small>
          </div>
        }
      </div>
      <p class="small mt-2 mb-3">Printed: <strong class="mono">{{ printed() || '(nothing)' }}</strong></p>

      <app-code [code]="code()" title="LoopControl.cs" [compact]="true" [copyable]="false" [marked]="kw() === 'none' ? [] : [3, 4]" />
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .iters { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
    @media (min-width: 640px) { .iters { grid-template-columns: repeat(10, minmax(0, 1fr)); } }
    .it { text-align: center; padding: 6px 2px; border-radius: 10px; border: 2px solid var(--border-color); transition: all 0.25s; }
    .it span { display: block; font-weight: 700; font-size: 0.82rem; }
    .it small { font-size: 0.68rem; color: var(--text-muted); }
    .it.ran { border-color: #10b981; background: rgba(16, 185, 129, 0.12); }
    .it.skipped { border-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
    .it.stopped { border-color: #ef4444; background: rgba(239, 68, 68, 0.12); }
    .it.never { opacity: 0.35; border-style: dashed; }
  `]
})
export class LoopControlWidget {
  kw = signal<Kw>('continue');
  rule = signal<'mod3' | 'eq7' | 'even'>('mod3');
  rules = [
    { id: 'mod3' as const, label: 'i % 3 == 0', test: (i: number) => i % 3 === 0 },
    { id: 'eq7' as const, label: 'i == 7', test: (i: number) => i === 7 },
    { id: 'even' as const, label: 'i % 2 == 0', test: (i: number) => i % 2 === 0 }
  ];
  labels: Record<State, string> = { ran: 'printed', skipped: 'skipped', stopped: 'break!', never: 'never runs' };

  iterations = computed(() => {
    const test = this.rules.find(r => r.id === this.rule())!.test;
    const out: { i: number; state: State }[] = [];
    let stopped = false;
    for (let i = 1; i <= 10; i++) {
      if (stopped) { out.push({ i, state: 'never' }); continue; }
      if (this.kw() !== 'none' && test(i)) {
        if (this.kw() === 'continue') out.push({ i, state: 'skipped' });
        else { out.push({ i, state: 'stopped' }); stopped = true; }
      } else out.push({ i, state: 'ran' });
    }
    return out;
  });

  printed = computed(() => this.iterations().filter(x => x.state === 'ran').map(x => x.i).join(' '));

  code = computed(() => {
    const cond = this.rules.find(r => r.id === this.rule())!.label;
    const lines = ['for (int i = 1; i <= 10; i++)', '{'];
    if (this.kw() === 'none') lines.push('    // no break or continue', '');
    else lines.push(`    if (${cond})`, `        ${this.kw()};${this.kw() === 'continue' ? '   // skip the rest, go to i++' : '      // leave the loop now'}`);
    lines.push('    Console.Write(i + " ");', '}');
    return lines.join('\n');
  });
}
