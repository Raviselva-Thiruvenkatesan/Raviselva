import { Component, DestroyRef, inject, signal } from '@angular/core';

interface Stage { icon: string; title: string; sub: string; phase: 'build' | 'run'; text: string }

/** How C# code becomes a running program: source → compiler → IL → CLR/JIT → machine code. */
@Component({
  selector: 'w-dotnet-pipeline',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From your code to a running program</h3></div>
      <p class="w-hint">Press <strong>Play</strong>, or click any step to see what happens there.</p>

      <div class="phases" aria-hidden="true">
        <span class="phase build">Build time (when you compile)</span>
        <span class="phase run">Run time (when you start the app)</span>
      </div>

      <ol class="flow">
        @for (s of stages; track s.title; let i = $index) {
          <li>
            <button type="button" class="node" [class.on]="i === active()" [class.past]="i < active()"
              [class.run]="s.phase === 'run'" (click)="select(i)" [attr.aria-pressed]="i === active()">
              <i class="bi {{ s.icon }}" aria-hidden="true"></i>
              <strong>{{ s.title }}</strong>
              <small class="mono">{{ s.sub }}</small>
            </button>
          </li>
        }
      </ol>

      <div class="w-panel detail" aria-live="polite">
        <div class="w-label">Step {{ active() + 1 }} of {{ stages.length }} · {{ stages[active()].phase === 'build' ? 'Build time' : 'Run time' }}</div>
        <strong>{{ stages[active()].title }}</strong>
        <p class="mb-0">{{ stages[active()].text }}</p>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="select(active() - 1)" [disabled]="active() === 0">
          <i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="togglePlay()">
          <i class="bi" [class.bi-play-fill]="!playing()" [class.bi-pause-fill]="playing()" aria-hidden="true"></i>
          {{ playing() ? 'Pause' : 'Play' }}</button>
        <button type="button" class="w-btn" (click)="select(active() + 1)" [disabled]="active() === stages.length - 1">
          Next <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .phases { display: grid; grid-template-columns: 3fr 2fr; gap: 8px; margin-bottom: 6px; }
    .phase { font-size: 0.72rem; font-weight: 700; text-align: center; padding: 3px; border-radius: 6px; }
    .phase.build { color: var(--purple); background: rgba(139, 92, 246, 0.1); }
    .phase.run { color: #0284c7; background: rgba(56, 189, 248, 0.12); }
    .flow { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    .flow li { position: relative; }
    .flow li:not(:last-child)::after {
      content: '\\203A'; position: absolute; right: -9px; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); font-size: 1.2rem; z-index: 1;
    }
    .node {
      width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center;
      padding: 0.75rem 0.4rem; border-radius: 12px; cursor: pointer;
      border: 2px solid var(--border-color); background: var(--bg-main); color: var(--text-main);
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s, opacity 0.25s;
      opacity: 0.6;
    }
    .node i { font-size: 1.5rem; color: var(--purple); }
    .node.run i { color: #0ea5e9; }
    .node strong { font-size: 0.82rem; line-height: 1.2; }
    .node small { font-size: 0.7rem; color: var(--text-muted); word-break: break-word; }
    .node.past { opacity: 0.9; }
    .node.on { opacity: 1; border-color: var(--purple); transform: translateY(-3px); box-shadow: 0 8px 20px -8px rgba(139, 92, 246, 0.6); }
    .node.run.on { border-color: #0ea5e9; box-shadow: 0 8px 20px -8px rgba(14, 165, 233, 0.6); }
    .detail p { margin-top: 0.3rem; }
    @media (max-width: 640px) {
      .phases { display: none; }
      .flow { grid-template-columns: 1fr; }
      .flow li:not(:last-child)::after { content: '\\2193'; right: auto; left: 50%; top: auto; bottom: -15px; transform: translateX(-50%); font-size: 0.9rem; }
      .node { flex-direction: row; justify-content: flex-start; gap: 10px; text-align: left; padding: 0.55rem 0.8rem; }
      .node small { margin-left: auto; }
    }
  `]
})
export class PipelineWidget {
  stages: Stage[] = [
    { icon: 'bi-file-earmark-code', title: 'Your C# code', sub: 'Program.cs', phase: 'build',
      text: 'You write instructions in plain text files that end in .cs. Humans can read this, but the computer cannot run it directly.' },
    { icon: 'bi-gear-wide-connected', title: 'C# compiler', sub: 'Roslyn', phase: 'build',
      text: 'The compiler checks your code for mistakes (missing semicolons, wrong types…). If all is good, it translates C# into IL. If not, you get compile errors and nothing runs.' },
    { icon: 'bi-box-seam', title: 'IL in an assembly', sub: 'MyApp.dll', phase: 'build',
      text: 'IL (Intermediate Language) is a CPU-independent set of instructions, saved in a .dll file called an assembly. The same .dll can run on Windows, Linux or macOS.' },
    { icon: 'bi-cpu', title: 'CLR + JIT compiler', sub: '.NET runtime', phase: 'run',
      text: 'When you start the app, the CLR (Common Language Runtime) loads the .dll. Its JIT (Just-In-Time) compiler turns each method’s IL into real machine code for your CPU the first time that method runs. The CLR also manages memory for you with the garbage collector.' },
    { icon: 'bi-display', title: 'Running program', sub: 'Machine code', phase: 'run',
      text: 'Your CPU executes the machine code and you see the result, for example "Hello, World!" printed in the console.' }
  ];

  active = signal(0);
  playing = signal(false);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  select(i: number) {
    this.stop();
    this.active.set(Math.max(0, Math.min(this.stages.length - 1, i)));
  }

  togglePlay() {
    if (this.playing()) return this.stop();
    if (this.active() === this.stages.length - 1) this.active.set(0);
    this.playing.set(true);
    this.timer = setInterval(() => {
      if (this.active() >= this.stages.length - 1) return this.stop();
      this.active.update(i => i + 1);
    }, 1800);
  }

  private stop() {
    clearInterval(this.timer);
    this.playing.set(false);
  }
}
