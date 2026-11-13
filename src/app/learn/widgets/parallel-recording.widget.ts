import { Component, computed, signal } from '@angular/core';

const DRAWS = [100, 1_000, 5_000, 20_000, 50_000, 100_000, 200_000];
const EXECUTE = 5, BUDGET = 16_667;   // µs per secondary on the main thread; one frame at 60 Hz

/** A frame's recording time on 1 to 16 threads: workers record ranges in parallel, the main thread starts, waits and executes. */
@Component({
  selector: 'w-parallel-recording',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>How many recording threads?</h3></div>
      <div class="sliders">
        <label class="w-field"><span>Draws: {{ draws().toLocaleString('en-GB') }}</span>
          <input type="range" min="0" [attr.max]="drawSteps.length - 1" step="1" [value]="drawIndex()" (input)="drawIndex.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Worker threads: {{ workers() }}</span>
          <input type="range" min="1" max="16" step="1" [value]="workers()" (input)="workers.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Recording one draw: {{ perDraw().toFixed(1) }} µs</span>
          <input type="range" min="0.5" max="5" step="0.5" [value]="perDraw()" (input)="perDraw.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Starting a worker: {{ perWorker() }} µs</span>
          <input type="range" min="5" max="100" step="5" [value]="perWorker()" (input)="perWorker.set(+$any($event.target).value)" /></label>
      </div>
      <div class="lanes">
        <div class="lane"><span class="ln">Main</span>
          <div class="track"><div class="seg start" [style.width.%]="pct(t().start)"></div><div class="seg wait" [style.width.%]="pct(t().record)"></div><div class="seg exec" [style.width.%]="pct(t().execute)"></div></div>
        </div>
        @for (w of shown(); track w) {
          <div class="lane"><span class="ln">Worker {{ w + 1 }}</span>
            <div class="track"><div class="seg gap" [style.width.%]="pct(t().start)"></div><div class="seg rec" [style.width.%]="pct(t().record)"></div></div>
          </div>
        }
        @if (workers() > shown().length) { <p class="w-hint">… and {{ workers() - shown().length }} more workers, each recording {{ perWorkerDraws().toLocaleString('en-GB') }} draws.</p> }
      </div>
      <p class="w-hint"><span class="key start"></span>starting workers <span class="key rec"></span>recording <span class="key wait"></span>main thread waiting <span class="key exec"></span>CmdExecuteCommands</p>
      <div class="w-msg" [class.ok]="t().total <= BUDGET" [class.err]="t().total > BUDGET" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 4px 14px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .lanes { display: flex; flex-direction: column; gap: 3px; margin: 0.5rem 0; }
    .lane { display: grid; grid-template-columns: 4.6rem 1fr; gap: 6px; align-items: center; }
    .ln { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
    .track { display: flex; height: 16px; background: var(--bg-main); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color); }
    .seg { height: 100%; }
    .start, .key.start { background: #f59e0b; } .rec, .key.rec { background: #8b5cf6; }
    .wait, .key.wait { background: rgba(148, 163, 184, 0.45); } .exec, .key.exec { background: #10b981; } .gap { background: transparent; }
    .key { display: inline-block; width: 11px; height: 11px; border-radius: 3px; vertical-align: -1px; margin: 0 3px 0 8px; }
  `]
})
export class ParallelRecordingWidget {
  readonly drawSteps = DRAWS;
  readonly BUDGET = BUDGET;
  drawIndex = signal(2);
  workers = signal(4);
  perDraw = signal(1.5);
  perWorker = signal(40);

  draws = computed(() => DRAWS[this.drawIndex()]);
  perWorkerDraws = computed(() => Math.ceil(this.draws() / this.workers()));
  shown = computed(() => Array.from({ length: Math.min(this.workers(), 6) }, (_, i) => i));

  private time(workers: number) {
    const start = workers === 1 ? 0 : workers * this.perWorker(), record = Math.ceil(this.draws() / workers) * this.perDraw(), execute = workers === 1 ? 0 : workers * EXECUTE;
    return { start, record, execute, total: start + record + execute };
  }
  t = computed(() => this.time(this.workers()));
  best = computed(() => Array.from({ length: 16 }, (_, i) => i + 1).reduce((b, w) => (this.time(w).total < this.time(b).total ? w : b), 1));
  single = computed(() => this.time(1).total);
  pct(us: number) { return (us / Math.max(this.single(), this.t().total)) * 100; }

  message = computed(() => {
    const t = this.t(), best = this.best(), ms = (us: number) => (us / 1000).toFixed(2);
    const speed = this.single() / t.total;
    const head = `${this.workers()} worker${this.workers() > 1 ? 's' : ''}: ${ms(t.total)} ms (${speed >= 1 ? speed.toFixed(1) + '× faster than' : (1 / speed).toFixed(1) + '× slower than'} one thread, ${ms(this.single())} ms).`;
    const budget = t.total > BUDGET ? ' That alone is over a 60 Hz frame (16.7 ms).' : '';
    return `${head} Best here: ${best} worker${best > 1 ? 's' : ''}, ${ms(this.time(best).total)} ms.${budget}${this.draws() <= 1000 ? ' With few draws, starting threads costs more than it saves.' : ''}`;
  });
}
