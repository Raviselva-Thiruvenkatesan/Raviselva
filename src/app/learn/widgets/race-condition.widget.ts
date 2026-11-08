import { Component, computed, signal } from '@angular/core';

type Mode = 'none' | 'lock' | 'interlocked';
interface Step { who: 'A' | 'B' | '-'; action: string; counter: number; a: string; b: string; lockOwner?: string; note: string }

/** Two threads do counter++ at the same time: watch an update get lost, then fix it with lock or Interlocked. */
@Component({
  selector: 'w-race-condition',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Two threads, one counter</h3></div>
      <p class="w-hint"><span class="mono">counter++</span> looks like one step, but the CPU does three: <strong>read</strong> the value, <strong>add 1</strong>, <strong>write</strong> it back. Threads A and B each do it once. The answer should be 2.</p>
      <div class="w-controls" role="group" aria-label="Protection">
        <button type="button" class="w-btn mono" [class.on]="mode() === 'none'" (click)="setMode('none')" [attr.aria-pressed]="mode() === 'none'">counter++</button>
        <button type="button" class="w-btn mono" [class.on]="mode() === 'lock'" (click)="setMode('lock')" [attr.aria-pressed]="mode() === 'lock'">lock (_gate) {{ '{' }} counter++; {{ '}' }}</button>
        <button type="button" class="w-btn mono" [class.on]="mode() === 'interlocked'" (click)="setMode('interlocked')" [attr.aria-pressed]="mode() === 'interlocked'">Interlocked.Increment(ref counter)</button>
      </div>

      <div class="threads">
        <div class="th" [class.on]="step().who === 'A'"><strong>Thread A</strong><small class="mono">local: {{ step().a }}</small></div>
        <div class="shared">
          <small>shared memory</small>
          <strong class="mono">counter = {{ step().counter }}</strong>
          @if (mode() === 'lock') { <small class="mono">lock held by: {{ step().lockOwner ?? 'nobody' }}</small> }
        </div>
        <div class="th" [class.on]="step().who === 'B'"><strong>Thread B</strong><small class="mono">local: {{ step().b }}</small></div>
      </div>

      <ol class="log">
        @for (s of steps().slice(0, pos() + 1); track $index) {
          <li [class.a]="s.who === 'A'" [class.b]="s.who === 'B'"><span class="mono">{{ s.who === '-' ? '' : s.who + ':' }} {{ s.action }}</span></li>
        }
      </ol>
      <div class="w-msg" [class.err]="isLost()" [class.ok]="done() && !isLost()" [class.info]="!done()" aria-live="polite"><span>{{ step().note }}</span></div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="go(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="done()">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        <button type="button" class="w-btn" (click)="bigRun()">Run 1,000,000 × 2 threads</button>
        @if (big(); as b) { <span class="mono small">counter = {{ b }}</span> }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .threads { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 8px; align-items: stretch; }
    .th, .shared { padding: 8px; border-radius: 12px; border: 1.5px solid var(--border-color); display: grid; gap: 2px; text-align: center; align-content: center; }
    .th small, .shared small { font-size: 0.72rem; color: var(--text-muted); }
    .th.on { border-color: var(--purple); background: rgba(139, 92, 246, 0.12); }
    .shared { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.08); }
    .shared strong { font-size: 1.15rem; }
    .log { margin: 0.7rem 0 0; padding-left: 1.4rem; font-size: 0.82rem; display: grid; gap: 2px; }
    .log li.a { color: var(--purple); }
    .log li.b { color: #0284c7; }
  `]
})
export class RaceConditionWidget {
  mode = signal<Mode>('none');
  pos = signal(0);
  big = signal('');

  setMode(m: Mode) { this.mode.set(m); this.pos.set(0); this.big.set(''); }
  go(p: number) { this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p))); }

  steps = computed<Step[]>(() => {
    const start: Step = { who: '-', action: 'start: counter = 0', counter: 0, a: '–', b: '–', note: 'Both threads are about to run counter++. Press Step.' };
    switch (this.mode()) {
      case 'none': return [start,
        { who: 'A', action: 'read counter (0)', counter: 0, a: '0', b: '–', note: 'A copies counter into its CPU register.' },
        { who: 'B', action: 'read counter (0)', counter: 0, a: '0', b: '0', note: 'Before A writes back, the OS switches to B. B reads the SAME old value, 0.' },
        { who: 'A', action: 'add 1 → 1', counter: 0, a: '1', b: '0', note: 'A computes 1 in its own register.' },
        { who: 'B', action: 'add 1 → 1', counter: 0, a: '1', b: '1', note: 'B also computes 1.' },
        { who: 'A', action: 'write 1', counter: 1, a: '1', b: '1', note: 'A stores 1.' },
        { who: 'B', action: 'write 1', counter: 1, a: '1', b: '1', note: 'Lost update! B overwrote A’s result with its own 1. Two increments, counter = 1. This is a race condition: the result depends on timing, so it happens only sometimes, which makes it very hard to debug.' }];
      case 'lock': return [start,
        { who: 'A', action: 'lock(_gate) acquired', counter: 0, a: '–', b: '–', lockOwner: 'A', note: 'A enters the lock. Only one thread can hold it at a time.' },
        { who: 'A', action: 'read 0, add 1', counter: 0, a: '1', b: '–', lockOwner: 'A', note: 'A works on the counter.' },
        { who: 'B', action: 'lock(_gate) … waiting', counter: 0, a: '1', b: '–', lockOwner: 'A', note: 'B tries to enter but must WAIT: A holds the lock.' },
        { who: 'A', action: 'write 1, release lock', counter: 1, a: '1', b: '–', note: 'A finishes and releases the lock.' },
        { who: 'B', action: 'lock acquired, read 1, add 1', counter: 1, a: '1', b: '2', lockOwner: 'B', note: 'Now B enters and reads the up-to-date value, 1.' },
        { who: 'B', action: 'write 2, release lock', counter: 2, a: '1', b: '2', note: 'Correct: counter = 2. The lock made read-add-write happen as one unit.' }];
      default: return [start,
        { who: 'A', action: 'Interlocked.Increment → 1', counter: 1, a: '1', b: '–', note: 'The CPU performs read-add-write as ONE atomic instruction. No other thread can get in between.' },
        { who: 'B', action: 'Interlocked.Increment → 2', counter: 2, a: '1', b: '2', note: 'Correct: counter = 2. For a single number, Interlocked is simpler and faster than a lock.' }];
    }
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);
  done = computed(() => this.pos() >= this.steps().length - 1);
  isLost = computed(() => this.done() && this.mode() === 'none');

  bigRun() {
    if (this.mode() === 'none') {
      const n = 1_000_000 + Math.floor(Math.random() * 600_000);
      this.big.set(n.toLocaleString('en-US') + '  (expected 2,000,000; different every run!)');
    } else {
      this.big.set('2,000,000  ✓');
    }
  }
}
