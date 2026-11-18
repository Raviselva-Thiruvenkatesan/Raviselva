import { Component, computed, signal } from '@angular/core';

/**
 * A cost model built from lesson 3's measurements on the course PC (Intel Iris Xe, validation layer on):
 * 10,000 separate draws took 64 ms to record and 7.4 ms on the GPU; one instanced draw 0.09 ms and 0.59 ms.
 */
const CPU_PER_DRAW = 64 / 10000, GPU_PER_DRAW = (7.42 - 0.59) / 10000, GPU_PER_OBJECT = 0.59 / 10000, CPU_FIXED = 0.09;
const BUDGET = 16.7;
const STEPS = [100, 300, 1000, 3000, 10000, 30000, 100000];

@Component({
  selector: 'w-instancing-cost',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The price of a draw call</h3></div>
      <label class="w-field"><span>Copies of the column: {{ count().toLocaleString('en-GB') }}</span>
        <input type="range" min="0" [attr.max]="steps.length - 1" step="1" [value]="step()" (input)="step.set(+$any($event.target).value)" /></label>
      <div class="bars">
        @for (b of bars(); track b.label) {
          <div class="row"><span class="lbl">{{ b.label }}</span>
            <div class="track"><div class="bar" [class]="'bar ' + b.kind" [style.width.%]="b.width"></div><div class="budget" [style.left.%]="budgetAt()"></div></div>
            <span class="val">{{ b.ms.toFixed(b.ms < 1 ? 2 : 1) }} ms</span></div>
        }
      </div>
      <p class="w-hint">The orange line is one frame at 60 Hz ({{ budget }} ms). Bars are scaled to the largest value; numbers are from this lesson’s runs.</p>
      <div class="w-msg" [class.ok]="bars()[0].ms < budget" [class.err]="bars()[0].ms >= budget" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; max-width: 360px; margin: 0.3rem 0 0.6rem; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .bars { display: flex; flex-direction: column; gap: 6px; }
    .row { display: grid; grid-template-columns: 150px 1fr 70px; gap: 8px; align-items: center; font-size: 0.78rem; }
    .lbl { font-weight: 600; } .val { text-align: right; font-variant-numeric: tabular-nums; }
    .track { position: relative; height: 16px; background: var(--bg-main); border-radius: 6px; overflow: hidden; }
    .bar { height: 100%; border-radius: 6px; } .bar.cpu { background: #0891b2; } .bar.gpu { background: #8b5cf6; }
    .budget { position: absolute; top: 0; bottom: 0; width: 2px; background: #f59e0b; }
    @media (max-width: 520px) { .row { grid-template-columns: 96px 1fr 58px; } }
  `]
})
export class InstancingCostWidget {
  readonly steps = STEPS; readonly budget = BUDGET;
  step = signal(4);
  count = computed(() => STEPS[this.step()]);
  bars = computed(() => {
    const n = this.count();
    const list = [
      { label: 'Separate: CPU', kind: 'cpu', ms: n * CPU_PER_DRAW },
      { label: 'Separate: GPU', kind: 'gpu', ms: n * (GPU_PER_DRAW + GPU_PER_OBJECT) },
      { label: 'Instanced: CPU', kind: 'cpu', ms: CPU_FIXED },
      { label: 'Instanced: GPU', kind: 'gpu', ms: n * GPU_PER_OBJECT }
    ];
    const top = Math.max(BUDGET * 1.1, ...list.map(b => b.ms));
    return list.map(b => ({ ...b, width: Math.max(0.6, b.ms / top * 100) }));
  });
  budgetAt = computed(() => BUDGET / Math.max(BUDGET * 1.1, ...this.bars().map(b => b.ms)) * 100);
  message = computed(() => {
    const [cpu, , , gpu] = this.bars(), n = this.count().toLocaleString('en-GB');
    return cpu.ms >= BUDGET
      ? `${n} separate draws cost ${cpu.ms.toFixed(0)} ms just to record: no frame budget survives that. Instanced, recording stays at ${CPU_FIXED} ms, and the GPU needs ${gpu.ms.toFixed(2)} ms.`
      : `${n} separate draws still fit in a frame, but they cost ${(cpu.ms / CPU_FIXED).toFixed(0)} times the CPU time of one instanced draw.`;
  });
}
