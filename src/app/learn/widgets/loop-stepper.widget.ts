import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Phase = 'init' | 'check' | 'body' | 'update' | 'exit' | 'print';
interface Step { phase: Phase; i: number; sum: number; ok?: boolean; text: string }

/** Step through a for / while loop one action at a time, watching i and sum change. */
@Component({
  selector: 'w-loop-stepper',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Run a loop step by step</h3></div>
      <p class="w-hint">This loop adds 1 + 2 + … + n. Press <strong>Step</strong> to watch the computer do one thing at a time.</p>

      <div class="w-controls">
        <div role="group" aria-label="Loop type" class="d-flex gap-2">
          <button type="button" class="w-btn mono" [class.on]="kind() === 'for'" (click)="setKind('for')" [attr.aria-pressed]="kind() === 'for'">for</button>
          <button type="button" class="w-btn mono" [class.on]="kind() === 'while'" (click)="setKind('while')" [attr.aria-pressed]="kind() === 'while'">while</button>
        </div>
        <label class="w-field">n
          <select [value]="n()" (change)="setN($any($event.target).value)">
            @for (v of [1, 2, 3, 4, 5]; track v) { <option [value]="v" [selected]="v === n()">{{ v }}</option> }
          </select>
        </label>
      </div>

      <div class="phases" aria-hidden="true">
        @for (p of phaseChips; track p.id) {
          <span class="chip" [class.on]="step().phase === p.id">{{ p.label }}</span>
        }
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" [title]="kind() === 'for' ? 'ForLoop.cs' : 'WhileLoop.cs'" [compact]="true" [copyable]="false"
          [active]="line()" [output]="step().phase === 'print' ? 'Sum = ' + step().sum : ''" />
        <div>
          <div class="vars">
            <div class="var"><small>i</small><strong class="mono">{{ step().phase === 'init' && pos() === 0 ? '?' : step().i }}</strong></div>
            <div class="var"><small>sum</small><strong class="mono">{{ step().sum }}</strong></div>
            <div class="var"><small>i &lt;= n</small><strong class="mono" [class.w-ok]="step().ok === true" [class.w-err]="step().ok === false">{{ step().ok === undefined ? '–' : step().ok }}</strong></div>
          </div>
          <div class="w-panel mt-2" aria-live="polite">
            <div class="w-label">Step {{ pos() + 1 }} / {{ steps().length }}</div>
            {{ step().text }}
          </div>
          <div class="w-label mt-3">Iterations so far</div>
          <div class="trace">
            @for (t of trace(); track $index) { <span class="mono">i={{ t.i }} → sum={{ t.sum }}</span> } @empty { <span class="text-muted small">none yet</span> }
          </div>
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="go(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn" (click)="go(pos() - 1)" [disabled]="pos() === 0"><i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="pos() === steps().length - 1">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        <button type="button" class="w-btn" (click)="togglePlay()"><i class="bi" [class.bi-play-fill]="!playing()" [class.bi-pause-fill]="playing()" aria-hidden="true"></i> {{ playing() ? 'Pause' : 'Auto' }}</button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .phases { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.8rem; }
    .chip { font-size: 0.76rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1.5px solid var(--border-color); color: var(--text-muted); transition: all 0.2s; }
    .chip.on { color: #fff; background: var(--gradient-primary); border-color: transparent; }
    .vars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .var { text-align: center; padding: 0.5rem; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.06); }
    .var small { display: block; color: var(--text-muted); font-size: 0.75rem; font-family: 'Cascadia Code', Consolas, monospace; }
    .var strong { font-size: 1.3rem; }
    .trace { display: flex; flex-wrap: wrap; gap: 6px; }
    .trace span { font-size: 0.78rem; padding: 3px 8px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); }
  `]
})
export class LoopStepperWidget {
  kind = signal<'for' | 'while'>('for');
  n = signal(3);
  pos = signal(0);
  playing = signal(false);
  private timer?: ReturnType<typeof setInterval>;

  phaseChips = [
    { id: 'init', label: '1 · start: i = 1' },
    { id: 'check', label: '2 · check: i <= n' },
    { id: 'body', label: '3 · body: sum += i' },
    { id: 'update', label: '4 · update: i++' },
    { id: 'exit', label: '5 · exit loop' }
  ];

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  steps = computed<Step[]>(() => {
    const n = this.n();
    const s: Step[] = [{ phase: 'init', i: 1, sum: 0, text: 'Before the loop: sum starts at 0. The loop variable i is created and set to 1. This happens only once.' }];
    let i = 1, sum = 0;
    while (true) {
      const ok = i <= n;
      s.push({ phase: 'check', i, sum, ok, text: ok ? `Is ${i} <= ${n}? Yes (true), so the body runs.` : `Is ${i} <= ${n}? No (false), so the loop stops.` });
      if (!ok) break;
      sum += i;
      s.push({ phase: 'body', i, sum, ok, text: `sum += i adds ${i}: sum is now ${sum}.` });
      i++;
      s.push({ phase: 'update', i, sum, text: `i++ adds 1 to i: i is now ${i}. Back to the check.` });
    }
    s.push({ phase: 'exit', i, sum, ok: false, text: `The loop ran ${n} time${n === 1 ? '' : 's'}. Execution continues after the closing brace.` });
    s.push({ phase: 'print', i, sum, text: `The program prints the result: Sum = ${sum}.` });
    return s;
  });

  step = computed(() => this.steps()[this.pos()]);

  trace = computed(() => this.steps().slice(0, this.pos() + 1).filter(s => s.phase === 'body'));

  code = computed(() => this.kind() === 'for'
    ? [`int n = ${this.n()};`, 'int sum = 0;', '', 'for (int i = 1; i <= n; i++)', '{', '    sum += i;', '}', '', 'Console.WriteLine($"Sum = {sum}");'].join('\n')
    : [`int n = ${this.n()};`, 'int sum = 0;', 'int i = 1;', '', 'while (i <= n)', '{', '    sum += i;', '    i++;', '}', 'Console.WriteLine($"Sum = {sum}");'].join('\n'));

  line = computed(() => {
    const p = this.step().phase;
    if (this.kind() === 'for') return [{ init: 4, check: 4, body: 6, update: 4, exit: 7, print: 9 }[p]];
    return [{ init: 3, check: 5, body: 7, update: 8, exit: 9, print: 10 }[p]];
  });

  setKind(k: 'for' | 'while') { this.kind.set(k); this.go(0); }
  setN(v: string) { this.n.set(+v); this.go(0); }

  go(p: number) {
    if (p !== this.pos() + 1) this.stopPlay();
    this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p)));
  }

  togglePlay() {
    if (this.playing()) return this.stopPlay();
    if (this.pos() === this.steps().length - 1) this.pos.set(0);
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (this.pos() >= this.steps().length - 1) return this.stopPlay();
      this.pos.update(p => p + 1);
    }, 900);
  }

  private stopPlay() {
    clearInterval(this.timer);
    this.playing.set(false);
  }
}
