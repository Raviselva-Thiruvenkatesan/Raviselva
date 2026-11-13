import { Component, computed, signal } from '@angular/core';

const SPAN = 60;                        // ms shown
const COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
interface Bar { frame: number; start: number; end: number }

/**
 * CPU records a frame in cpuMs, GPU draws it in gpuMs. With N frames in flight the CPU may start frame f
 * only when frame f - N has finished on the GPU (its fence). The GPU runs frames in order.
 */
function simulate(n: number, cpuMs: number, gpuMs: number) {
  const cpu: Bar[] = [], gpu: Bar[] = [], waits: Bar[] = [];
  let cpuFree = 0, gpuFree = 0;
  for (let f = 0; ; f++) {
    const fence = f - n >= 0 ? gpu[f - n].end : 0;
    const start = Math.max(cpuFree, fence);
    if (start > cpuFree + 0.01) waits.push({ frame: f, start: cpuFree, end: start });
    const recorded = start + cpuMs;
    if (start >= SPAN) break;
    cpu.push({ frame: f, start, end: recorded });
    const gs = Math.max(recorded, gpuFree), ge = gs + gpuMs;
    gpu.push({ frame: f, start: gs, end: ge });
    cpuFree = recorded; gpuFree = ge;
  }
  const done = gpu.filter(g => g.end <= SPAN).length;
  const busy = gpu.reduce((s, g) => s + Math.max(0, Math.min(g.end, SPAN) - Math.min(g.start, SPAN)), 0);
  const latency = gpu.length > 3 ? gpu[3].end - cpu[3].start : 0;
  return { cpu, gpu, waits, done, gpuBusy: Math.round(busy / SPAN * 100), latency };
}

/** CPU and GPU timelines for 1, 2 or 3 frames in flight. */
@Component({
  selector: 'w-frames-in-flight',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Frames in flight</h3></div>
      <div class="w-controls" role="group" aria-label="Frames in flight">
        @for (k of counts; track k) { <button type="button" class="w-btn small" [class.on]="n() === k" [attr.aria-pressed]="n() === k" (click)="n.set(k)">{{ k }} in flight</button> }
      </div>
      <div class="sliders">
        <label class="w-field"><span>CPU recording: {{ cpuMs() }} ms</span><input type="range" min="2" max="12" [value]="cpuMs()" (input)="cpuMs.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>GPU drawing: {{ gpuMs() }} ms</span><input type="range" min="2" max="12" [value]="gpuMs()" (input)="gpuMs.set(+$any($event.target).value)" /></label>
      </div>
      <svg viewBox="0 0 600 84" class="tl" role="img" [attr.aria-label]="summary()">
        <text x="4" y="26" class="lbl">CPU</text><text x="4" y="64" class="lbl">GPU</text>
        @for (w of sim().waits; track w.frame) { @if (w.start < span) { <rect [attr.x]="x(w.start)" y="14" [attr.width]="x(clip(w.end)) - x(w.start)" height="18" class="wait" /> } }
        @for (b of sim().cpu; track b.frame) {
          <rect [attr.x]="x(b.start) + 0.5" y="14" [attr.width]="bw(b)" height="18" rx="3" [attr.fill]="color(b.frame)" />
          @if (bw(b) > 12) { <text [attr.x]="x(b.start) + bw(b) / 2" y="27" class="num">{{ b.frame }}</text> }
        }
        @for (b of sim().gpu; track b.frame) {
          @if (b.start < span) {
            <rect [attr.x]="x(b.start) + 0.5" y="52" [attr.width]="bw(b)" height="18" rx="3" [attr.fill]="color(b.frame)" />
            @if (bw(b) > 12) { <text [attr.x]="x(b.start) + bw(b) / 2" y="65" class="num">{{ b.frame }}</text> }
          }
        }
      </svg>
      <div class="legend"><span class="sw wait"></span> CPU waiting at a fence</div>
      <div class="w-msg info" aria-live="polite"><span>{{ summary() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .tl { width: 100%; height: auto; margin: 0.4rem 0 0.2rem; }
    .lbl { font-size: 11px; font-weight: 700; fill: var(--text-muted); }
    .num { font-size: 10px; fill: #fff; font-weight: 800; text-anchor: middle; }
    .wait { fill: rgba(220, 38, 38, 0.25); }
    .legend { font-size: 0.74rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
    .sw { display: inline-block; width: 14px; height: 10px; border-radius: 2px; }
  `]
})
export class FramesInFlightWidget {
  readonly counts = [1, 2, 3];
  readonly span = SPAN;
  n = signal(1);
  cpuMs = signal(5);
  gpuMs = signal(6);
  sim = computed(() => simulate(this.n(), this.cpuMs(), this.gpuMs()));
  x(t: number) { return 40 + (t / SPAN) * 555; }
  clip(t: number) { return Math.min(t, SPAN); }
  bw(b: Bar) { return Math.max(0, this.x(this.clip(b.end)) - this.x(b.start) - 1); }
  color(f: number) { return COLORS[f % COLORS.length]; }
  summary = computed(() => {
    const s = this.sim();
    const base = `${s.done} frames finished in ${SPAN} ms; the GPU was busy ${s.gpuBusy}% of the time; a frame takes ${s.latency.toFixed(0)} ms from recording to finished.`;
    if (this.n() === 1) return `${base} With one frame in flight the CPU and GPU take turns: each waits while the other works.`;
    if (this.n() === 2) return `${base} The CPU records the next frame while the GPU draws this one, so the slower of the two sets the pace.`;
    return `${base} A third slot only lets the CPU run further ahead. It rarely adds frames, but each frame waits longer before it is drawn (latency).`;
  });
}
