import { Component, computed, signal } from '@angular/core';

const ITEMS = 12;

/** Spread 12 equal CPU-bound jobs over 1–8 cores and see the speed-up (and its limits). */
@Component({
  selector: 'w-parallel-cores',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Using more CPU cores</h3></div>
      <p class="w-hint">12 independent jobs (say, checking 12 connections), each taking 1 second of pure calculation. Choose how many cores <span class="mono">Parallel.For</span> can use.</p>
      <div class="w-controls" role="group" aria-label="Cores">
        <span class="small text-muted">Cores:</span>
        @for (c of [1, 2, 4, 6, 8]; track c) {
          <button type="button" class="w-btn mono" [class.on]="cores() === c" (click)="cores.set(c)" [attr.aria-pressed]="cores() === c">{{ c }}</button>
        }
      </div>
      <div class="code mono">{{ codeLine() }}</div>
      <div class="cores">
        @for (lane of lanes(); track $index; let c = $index) {
          <div class="core">
            <span class="mono small">core {{ c }}</span>
            <div class="jobs">
              @for (j of lane; track j) { <span class="job mono">{{ j }}</span> }
            </div>
          </div>
        }
      </div>
      <div class="stats">
        <div><small>Total time</small><strong class="mono">{{ time() }} s</strong></div>
        <div><small>Speed-up</small><strong class="mono">{{ speedup() }}×</strong></div>
        <div><small>Idle core-seconds</small><strong class="mono">{{ idle() }}</strong></div>
      </div>
      <div class="w-msg info"><i class="bi bi-cpu" aria-hidden="true"></i><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; margin-bottom: 0.8rem; }
    .cores { display: grid; gap: 4px; }
    .core { display: grid; grid-template-columns: 56px 1fr; gap: 8px; align-items: center; }
    .jobs { display: flex; gap: 3px; }
    .job { width: 30px; height: 24px; display: grid; place-items: center; font-size: 0.72rem; border-radius: 6px; background: var(--gradient-primary); color: #fff; animation: pop 0.25s ease-out; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 0.8rem; }
    .stats div { text-align: center; padding: 6px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .stats small { display: block; font-size: 0.7rem; color: var(--text-muted); }
    .stats strong { color: var(--purple); font-size: 1.1rem; }
    @keyframes pop { from { transform: scale(0.6); opacity: 0; } }
  `]
})
export class ParallelCoresWidget {
  cores = signal(4);
  codeLine = computed(() => this.cores() === 1
    ? 'for (int i = 0; i < 12; i++) Check(i);'
    : `Parallel.For(0, 12, i => Check(i));   // ${this.cores()} cores`);
  lanes = computed(() => {
    const n = this.cores();
    const l: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < ITEMS; i++) l[i % n].push(i);
    return l;
  });
  time = computed(() => Math.ceil(ITEMS / this.cores()));
  speedup = computed(() => +(ITEMS / this.time()).toFixed(2));
  idle = computed(() => this.time() * this.cores() - ITEMS);
  note = computed(() => {
    const n = this.cores();
    if (n === 1) return 'One core does all 12 jobs in a row: 12 seconds.';
    if (this.idle() > 0) return `With ${n} cores the last round isn’t full, so some cores sit idle. 12 jobs don’t divide evenly by ${n}: the speed-up is ${this.speedup()}×, not ${n}×.`;
    return `${n} cores finish in ${this.time()} s, a ${this.speedup()}× speed-up. Real code gains a bit less: starting work items, sharing memory and any locks all cost time.`;
  });
}
