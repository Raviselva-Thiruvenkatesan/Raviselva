import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Stop { line: number; locals: [string, string][]; note: string }

/** A tiny simulated debugger: set breakpoints, step through a buggy program and watch the Locals window. */
@Component({
  selector: 'w-debugger',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Find the bug with the debugger</h3></div>
      <p class="w-hint">The average of 120, 80 and 200 should be 133.33, but this program prints something else. Click line numbers to toggle <span class="bp-dot"></span> breakpoints, press <strong>Start</strong>, then step and watch the variables.</p>

      <div class="toolbar" role="toolbar" aria-label="Debugger">
        @if (pos() < 0) {
          <button type="button" class="w-btn primary" (click)="start()"><i class="bi bi-play-fill" aria-hidden="true"></i> Start (F5)</button>
        } @else {
          <button type="button" class="w-btn primary" (click)="cont()" [disabled]="finished()"><i class="bi bi-play-fill" aria-hidden="true"></i> Continue (F5)</button>
          <button type="button" class="w-btn" (click)="stepOver()" [disabled]="finished()"><i class="bi bi-arrow-return-right" aria-hidden="true"></i> Step Over (F10)</button>
          <button type="button" class="w-btn" (click)="stop()"><i class="bi bi-stop-fill" aria-hidden="true"></i> Stop</button>
        }
        <button type="button" class="w-btn ms-auto" [class.on]="fixed()" (click)="toggleFix()" [attr.aria-pressed]="fixed()">
          <i class="bi bi-wrench" aria-hidden="true"></i> {{ fixed() ? 'Showing fixed code' : 'Show the fix' }}</button>
      </div>

      <div class="w-grid two">
        <div>
          <div class="bps" aria-label="Breakpoints">
            Breakpoints:
            @for (l of breakable; track l) {
              <button type="button" class="bp mono" [class.on]="bps().includes(l)" (click)="toggleBp(l)" [attr.aria-pressed]="bps().includes(l)">{{ l }}</button>
            }
          </div>
          <app-code [code]="code()" title="Average.cs" [compact]="true" [copyable]="false" [clickable]="true"
            [marked]="bps()" [active]="current() ? [current()!.line] : []" (lineClick)="toggleBp($event)"
            [output]="finished() ? output() : ''" />
        </div>
        <div>
          <div class="w-label">Locals</div>
          <table class="locals">
            <thead><tr><th>Name</th><th>Value</th></tr></thead>
            <tbody>
              @for (v of current()?.locals ?? []; track v[0]) { <tr><td class="mono">{{ v[0] }}</td><td class="mono">{{ v[1] }}</td></tr> }
              @empty { <tr><td colspan="2" class="text-muted small">{{ pos() < 0 ? 'Not running' : finished() ? 'Program ended' : 'No variables yet' }}</td></tr> }
            </tbody>
          </table>
          <div class="w-panel mt-2" aria-live="polite">
            @if (pos() < 0) { Set at least one breakpoint (try line 6), then press Start. Without breakpoints the program just runs to the end. }
            @else if (finished()) { {{ fixed() ? 'Correct now: 133.33.' : 'It printed ' + output() + '. Did you spot the two bugs? Press "Show the fix".' }} }
            @else { <strong>Paused before line {{ current()!.line }}.</strong> {{ current()!.note }} }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0.8rem; }
    .bp-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; vertical-align: middle; }
    .bps { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; }
    .bp { width: 30px; height: 26px; border-radius: 6px; border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-size: 0.78rem; cursor: pointer; }
    .bp.on { background: #ef4444; border-color: #ef4444; color: #fff; }
    .locals { width: 100%; border-collapse: collapse; font-size: 0.86rem; border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; }
    .locals th, .locals td { padding: 5px 10px; border-bottom: 1px solid var(--border-color); text-align: left; }
    .locals th { background: rgba(139, 92, 246, 0.08); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  `]
})
export class DebuggerWidget {
  breakable = [2, 4, 6, 9, 10];
  bps = signal<number[]>([6]);
  fixed = signal(false);
  pos = signal(-1);

  code = computed(() => [
    'int[] prices = { 120, 80, 200 };',
    'int total = 0;',
    '',
    `for (int i = ${this.fixed() ? 0 : 1}; i < prices.Length; i++)`,
    '{',
    '    total += prices[i];',
    '}',
    '',
    `double average = ${this.fixed() ? '(double)total' : 'total'} / prices.Length;`,
    `Console.WriteLine($"Average: {average${this.fixed() ? ':F2' : ''}}");`
  ].join('\n'));

  /** Every pause point of a full run, with the variables as they are before that line executes. */
  trace = computed<Stop[]>(() => {
    const prices = [120, 80, 200];
    const arr = '{ 120, 80, 200 }';
    const fixed = this.fixed();
    const s: Stop[] = [{ line: 2, locals: [['prices', arr]], note: 'prices has been created with 3 elements.' }];
    let total = 0;
    s.push({ line: 4, locals: [['prices', arr], ['total', '0']], note: 'total starts at 0. The loop is about to begin.' });
    for (let i = fixed ? 0 : 1; i < prices.length; i++) {
      const first = i === (fixed ? 0 : 1);
      s.push({
        line: 6, locals: [['prices', arr], ['total', String(total)], ['i', String(i)]],
        note: first && !fixed ? 'Look at i: it is 1 on the FIRST pass, so prices[0] (120) will never be added. Bug #1!' : `About to add prices[${i}] = ${prices[i]} to total.`
      });
      total += prices[i];
      s.push({ line: 4, locals: [['prices', arr], ['total', String(total)], ['i', String(i)]], note: `total is now ${total}. Next: i++ and check i < 3.` });
    }
    const avg = fixed ? total / prices.length : Math.trunc(total / prices.length);
    s.push({
      line: 9, locals: [['prices', arr], ['total', String(total)]],
      note: fixed ? `total is ${total}. Casting to double keeps the decimals.` : `total is ${total}, but it should be 400 (bug #1). And int / int will drop the decimals (bug #2).`
    });
    s.push({ line: 10, locals: [['prices', arr], ['total', String(total)], ['average', String(avg)]], note: fixed ? 'average is 133.333…' : `average is ${avg}: wrong, and with no decimals.` });
    return s;
  });

  output = computed(() => {
    const t = this.trace();
    const avg = t[t.length - 1].locals.find(l => l[0] === 'average')![1];
    return `Average: ${this.fixed() ? Number(avg).toFixed(2) : avg}`;
  });

  current = computed(() => (this.pos() >= 0 && this.pos() < this.trace().length ? this.trace()[this.pos()] : undefined));
  finished = computed(() => this.pos() >= this.trace().length);

  toggleBp(line: number) {
    if (!this.breakable.includes(line)) return;
    this.bps.update(b => (b.includes(line) ? b.filter(x => x !== line) : [...b, line]));
  }

  start() { this.pos.set(-1); this.runToBreakpoint(); }
  cont() { this.runToBreakpoint(); }
  stepOver() { this.pos.update(p => p + 1); }
  stop() { this.pos.set(-1); }
  toggleFix() { this.fixed.update(f => !f); this.pos.set(-1); }

  private runToBreakpoint() {
    const t = this.trace();
    let p = this.pos() + 1;
    while (p < t.length && !this.bps().includes(t[p].line)) p++;
    this.pos.set(p);
  }
}
