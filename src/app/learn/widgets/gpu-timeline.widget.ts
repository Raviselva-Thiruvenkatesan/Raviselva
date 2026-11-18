import { Component, computed, signal } from '@angular/core';

type Probe = 'record' | 'fence' | 'timestamps';
const RECORD = 3, FRAMES = 6, IN_FLIGHT = 2, X0 = 64, SCALE = 9;

/** CPU and GPU lanes for six frames with two in flight, and what each kind of stopwatch would report for frame 3. */
@Component({
  selector: 'w-gpu-timeline',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>What does the stopwatch measure?</h3></div>
      <div class="w-controls" role="group" aria-label="Measurement">
        @for (p of probes; track p.id) { <button type="button" class="w-btn small" [class.on]="probe() === p.id" [attr.aria-pressed]="probe() === p.id" (click)="probe.set(p.id)">{{ p.label }}</button> }
      </div>
      <label class="w-field"><span>GPU work per frame: {{ gpu() }} ms (recording takes {{ record }} ms on the CPU)</span>
        <input type="range" min="1" max="10" step="1" [value]="gpu()" (input)="gpu.set(+$any($event.target).value)" /></label>
      <div class="tw">
        <svg [attr.viewBox]="'0 0 ' + width() + ' 120'" class="lanes" role="img" aria-label="CPU and GPU timelines">
          <text x="4" y="38" class="lane">CPU</text><text x="4" y="88" class="lane">GPU</text>
          @for (f of frames(); track f.n) {
            <rect [attr.x]="x(f.cpuStart)" y="24" [attr.width]="RECORD * SCALE - 2" height="22" rx="4" class="cpu" [class.focus]="f.n === 3" />
            <text [attr.x]="x(f.cpuStart) + 4" y="39" class="fl">F{{ f.n }}</text>
            @if (f.wait > 0.01) { <line [attr.x1]="x(f.cpuStart - f.wait)" y1="35" [attr.x2]="x(f.cpuStart)" y2="35" class="wait" /> }
            <rect [attr.x]="x(f.gpuStart)" y="74" [attr.width]="f.gpuLen * SCALE - 2" height="22" rx="4" class="gpu" [class.focus]="f.n === 3" />
            <text [attr.x]="x(f.gpuStart) + 4" y="89" class="fl">F{{ f.n }}</text>
          }
          <rect [attr.x]="x(span().from)" y="8" [attr.width]="(span().to - span().from) * SCALE" height="104" class="probe" />
        </svg>
      </div>
      <div class="w-msg" [class.ok]="probe() === 'timestamps'" [class.err]="probe() !== 'timestamps'" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; max-width: 360px; margin: 0.3rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .tw { overflow-x: auto; }
    .lanes { min-width: 520px; width: 100%; display: block; margin: 0.4rem 0; }
    .lane { font-size: 11px; font-weight: 700; fill: var(--text-muted); }
    .cpu { fill: #0891b2; opacity: 0.55; } .gpu { fill: #8b5cf6; opacity: 0.55; } .focus { opacity: 1; }
    .fl { font-size: 9px; fill: #fff; font-weight: 700; }
    .wait { stroke: #f59e0b; stroke-width: 2; stroke-dasharray: 3 2; }
    .probe { fill: rgba(245, 158, 11, 0.16); stroke: #f59e0b; stroke-width: 1.2; }
  `]
})
export class GpuTimelineWidget {
  readonly RECORD = RECORD; readonly SCALE = SCALE; readonly record = RECORD;
  readonly probes: { id: Probe; label: string }[] = [
    { id: 'record', label: 'Stopwatch around recording' }, { id: 'fence', label: 'Submit to fence' }, { id: 'timestamps', label: 'GPU timestamps' }
  ];
  probe = signal<Probe>('record');
  gpu = signal(6);

  /** CPU frame n starts when frame n-1 is recorded and frame n-2's fence has signalled; the GPU runs frames in order. */
  frames = computed(() => {
    const g = this.gpu(), out: { n: number; cpuStart: number; wait: number; gpuStart: number; gpuLen: number; gpuEnd: number; submit: number }[] = [];
    for (let n = 0; n < FRAMES; n++) {
      const cpuReady = n === 0 ? 0 : out[n - 1].submit;
      const fence = n >= IN_FLIGHT ? out[n - IN_FLIGHT].gpuEnd : 0;
      const cpuStart = Math.max(cpuReady, fence), submit = cpuStart + RECORD;
      const gpuStart = Math.max(submit, n === 0 ? 0 : out[n - 1].gpuEnd);
      out.push({ n, cpuStart, wait: cpuStart - cpuReady, gpuStart, gpuLen: g, gpuEnd: gpuStart + g, submit });
    }
    return out;
  });
  width = computed(() => X0 + (this.frames()[FRAMES - 1].gpuEnd + 2) * SCALE);
  x(t: number) { return X0 + t * SCALE; }

  span = computed(() => {
    const f = this.frames()[3];
    switch (this.probe()) {
      case 'record': return { from: f.cpuStart, to: f.submit };
      case 'fence': return { from: f.submit, to: f.gpuEnd };
      default: return { from: f.gpuStart, to: f.gpuEnd };
    }
  });
  message = computed(() => {
    const f = this.frames()[3], s = this.span(), measured = s.to - s.from;
    switch (this.probe()) {
      case 'record': return `Reports ${measured} ms for frame 3: only the CPU’s recording. The GPU’s ${this.gpu()} ms happen later, while the CPU records frame 4.`;
      case 'fence': return `Reports ${measured} ms: the GPU work plus ${f.gpuStart - f.submit} ms that frame 3 sat in the queue behind frame 2. And waiting on the fence right away stops the CPU from recording ahead.`;
      default: return `Reports exactly ${measured} ms: the GPU’s own clock, written at the start and end of the frame’s commands, read back two frames later without anyone waiting.`;
    }
  });
}
