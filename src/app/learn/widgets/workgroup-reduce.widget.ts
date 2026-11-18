import { Component, computed, signal } from '@angular/core';

const VALUES = [42, 17, 63, 8, 25, 91, 36, 11, 54, 3, 77, 29, 60, 14, 48, 22];
const ROUNDS = [8, 4, 2, 1];
/** Without barriers, these lanes are one round late: their writes land after the next round has read. */
const SLOW = new Set([1]);

/** A tree reduction (minimum) of 16 values in shared memory, round by round, with or without barrier(). */
@Component({
  selector: 'w-workgroup-reduce',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A reduction in shared memory</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn small" (click)="step.set(Math.max(0, step() - 1))" [disabled]="step() === 0">Back</button>
        <button type="button" class="w-btn small" (click)="step.set(Math.min(4, step() + 1))" [disabled]="step() === 4">Next round</button>
        <button type="button" class="w-btn small" [class.on]="!barriers()" [attr.aria-pressed]="!barriers()" (click)="barriers.set(!barriers()); step.set(0)">Remove the barriers</button>
      </div>
      <p class="w-hint">shared int lo[16]; round {{ step() }} of 4{{ step() > 0 ? ': lanes 0 to ' + (ROUNDS[step() - 1] - 1) + ' do lo[l] = min(lo[l], lo[l + ' + ROUNDS[step() - 1] + '])' : ': every lane has written its value' }}</p>
      <div class="lanes" role="img" [attr.aria-label]="'Shared memory after round ' + step()">
        @for (v of state(); track $index) {
          <div class="cell" [class.active]="step() > 0 && $index < ROUNDS[step() - 1]" [class.src]="step() > 0 && $index >= ROUNDS[step() - 1] && $index < 2 * ROUNDS[step() - 1]" [class.slow]="!barriers() && slow.has($index)">
            <span class="lane">{{ $index }}</span><span class="val">{{ v }}</span>
          </div>
        }
      </div>
      <div class="w-msg" [class.ok]="step() < 4 || state()[0] === 3" [class.err]="step() === 4 && state()[0] !== 3" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .lanes { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; margin: 0.4rem 0 0.7rem; max-width: 520px; }
    .cell { border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 0; display: flex; flex-direction: column; align-items: center; background: var(--bg-main); }
    .cell.active { border-color: #22c55e; background: rgba(34, 197, 94, 0.15); }
    .cell.src { border-color: #0891b2; background: rgba(8, 145, 178, 0.12); }
    .cell.slow { box-shadow: inset 0 -3px 0 #ef4444; }
    .lane { font-size: 0.62rem; color: var(--text-muted); } .val { font-weight: 700; font-variant-numeric: tabular-nums; }
  `]
})
export class WorkgroupReduceWidget {
  readonly ROUNDS = ROUNDS; readonly slow = SLOW; readonly Math = Math;
  step = signal(0);
  barriers = signal(true);

  /** The shared array after `step` rounds. Without barriers, a slow lane's write from round r is only visible from round r + 2. */
  state = computed(() => {
    let mem = [...VALUES];
    const pending: { lane: number; value: number; visibleFrom: number }[] = [];
    for (let r = 0; r < this.step(); r++) {
      pending.filter(p => p.visibleFrom === r).forEach(p => mem[p.lane] = p.value);
      const s = ROUNDS[r], next = [...mem];
      for (let l = 0; l < s; l++) {
        const v = Math.min(mem[l], mem[l + s]);
        if (!this.barriers() && SLOW.has(l)) pending.push({ lane: l, value: v, visibleFrom: r + 2 });
        else next[l] = v;
      }
      mem = next;
    }
    pending.filter(p => p.visibleFrom <= this.step()).forEach(p => mem[p.lane] = p.value);
    return mem;
  });
  message = computed(() => {
    const st = this.step(), v = this.state()[0];
    if (st === 0) return `16 values, one per lane, written to shared memory. ${this.barriers() ? 'barrier() makes sure all are written before round 1 reads them.' : 'No barriers: lane 1 (marked red) runs late, so its writes land a round after the others read them.'}`;
    if (st < 4) return `Round ${st}: ${ROUNDS[st - 1]} lanes each combine two values; the others wait${this.barriers() ? ' at the barrier' : '... or would, with a barrier'}. Half as many values remain.`;
    return v === 3
      ? 'Four rounds for 16 values (log₂ 16): lo[0] holds the minimum, 3. One lane now does one atomic for the whole workgroup.'
      : `lo[0] is ${v}, but the minimum is 3. Without barriers, lanes read values the slow lanes had not written yet, and the 3 was lost on the way. Nothing reports the error: it is just a wrong number, sometimes.`;
  });
}
