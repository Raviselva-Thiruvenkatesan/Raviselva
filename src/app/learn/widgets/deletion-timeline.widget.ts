import { Component, computed, signal } from '@angular/core';

type Mode = 'now' | 'queue' | 'idle';
const FRAMES = 8, CPU = 0.55, GPU = 1, SCALE = 62, X0 = 46;

interface Span { frame: number; start: number; end: number }

/** CPU and GPU timelines with frames in flight: what happens to a mesh deleted while recording a given frame. */
@Component({
  selector: 'w-deletion-timeline',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>When is it safe to destroy?</h3></div>
      <div class="w-controls" role="group" aria-label="How to destroy">
        @for (m of modes; track m.id) { <button type="button" class="w-btn small" [class.on]="mode() === m.id" [attr.aria-pressed]="mode() === m.id" (click)="mode.set(m.id)">{{ m.label }}</button> }
      </div>
      <div class="sliders">
        <label class="w-field"><span>Frames in flight: {{ inFlight() }}</span>
          <input type="range" min="1" max="3" step="1" [value]="inFlight()" (input)="inFlight.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Mesh deleted while recording frame {{ del() }}</span>
          <input type="range" min="1" max="4" step="1" [value]="del()" (input)="del.set(+$any($event.target).value)" /></label>
      </div>
      <div class="tw">
        <svg [attr.viewBox]="'0 0 ' + width() + ' 128'" class="tl" role="img" [attr.aria-label]="message()">
          <text x="4" y="36" class="lane">CPU</text><text x="4" y="86" class="lane">GPU</text>
          @for (s of plan().cpu; track s.frame) {
            <rect [attr.x]="X(s.start)" y="20" [attr.width]="(s.end - s.start) * scale - 2" height="24" rx="4" class="cpu" [class.del]="s.frame === del()" />
            <text [attr.x]="X(s.start) + 4" y="36" class="fl">{{ s.frame }}</text>
          }
          @for (s of plan().gpu; track s.frame) {
            <rect [attr.x]="X(s.start)" y="70" [attr.width]="(s.end - s.start) * scale - 2" height="24" rx="4" class="gpu"
                  [class.uses]="s.frame < del()" [class.bad]="s.frame < del() && s.end > plan().destroyAt" />
            <text [attr.x]="X(s.start) + 4" y="86" class="fl">{{ s.frame }}</text>
          }
          @if (plan().stall) { <rect [attr.x]="X(plan().stall!.start)" y="18" [attr.width]="(plan().stall!.end - plan().stall!.start) * scale" height="28" class="stall" /> }
          <line [attr.x1]="X(plan().destroyAt)" y1="10" [attr.x2]="X(plan().destroyAt)" y2="104" class="kill" />
          <text [attr.x]="X(plan().destroyAt)" y="120" class="kl">destroy</text>
        </svg>
      </div>
      <p class="w-hint">Numbers are frame numbers. Purple GPU blocks draw the mesh; red ones are still drawing it after it was destroyed. Grey: the CPU waiting.</p>
      <div class="w-msg" [class.ok]="plan().safe" [class.err]="!plan().safe" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 4px 14px; margin: 0.3rem 0; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .tw { overflow-x: auto; }
    .tl { width: 100%; min-width: 460px; display: block; margin: 0.3rem 0; }
    .lane { font-size: 11px; font-weight: 800; fill: var(--text-muted); }
    .fl { font-size: 11px; font-weight: 700; fill: #fff; font-family: monospace; }
    .cpu { fill: #0891b2; } .cpu.del { fill: #f59e0b; }
    .gpu { fill: #64748b; } .gpu.uses { fill: #8b5cf6; } .gpu.bad { fill: #ef4444; }
    .stall { fill: rgba(148, 163, 184, 0.35); stroke: #94a3b8; stroke-dasharray: 3 3; }
    .kill { stroke: #ef4444; stroke-width: 2.5; stroke-dasharray: 5 3; }
    .kl { font-size: 10px; font-weight: 800; fill: #ef4444; text-anchor: middle; }
  `]
})
export class DeletionTimelineWidget {
  readonly modes: { id: Mode; label: string }[] = [
    { id: 'now', label: 'Dispose immediately' }, { id: 'queue', label: 'Deletion queue' }, { id: 'idle', label: 'DeviceWaitIdle, then dispose' }
  ];
  readonly scale = SCALE;
  mode = signal<Mode>('now');
  inFlight = signal(2);
  del = signal(2);

  X(t: number) { return X0 + t * SCALE; }

  /** Schedule: the CPU may run at most inFlight frames ahead of the GPU; the GPU is the slower side. */
  plan = computed(() => {
    const F = this.inFlight(), D = this.del(), mode = this.mode();
    const cpu: Span[] = [], gpu: Span[] = [];
    let destroyAt = 0, stall: { start: number; end: number } | null = null;
    for (let n = 0; n < FRAMES; n++) {
      let start = Math.max(n > 0 ? cpu[n - 1].end : 0, n - F >= 0 ? gpu[n - F].end : 0);    // Begin waits for this slot's fence
      if (n === D && mode === 'idle') { const idle = gpu[n - 1].end; if (idle > start) stall = { start, end: idle }; start = Math.max(start, idle); }
      if (n === D) destroyAt = start + 0.05;
      if (mode === 'queue' && n === D + F) destroyAt = start;                                    // flushed after frame D's fence
      cpu.push({ frame: n, start, end: start + CPU });
      const g0 = Math.max(cpu[n].end, n > 0 ? gpu[n - 1].end : 0);
      gpu.push({ frame: n, start: g0, end: g0 + GPU });
    }
    const unsafe = gpu.filter(s => s.frame < D && s.end > destroyAt).length;
    return { cpu, gpu, destroyAt, stall, safe: unsafe === 0, unsafe };
  });

  width = computed(() => Math.ceil(X0 + (this.plan().gpu[FRAMES - 1].end + 0.3) * SCALE));

  message = computed(() => {
    const p = this.plan(), D = this.del(), F = this.inFlight();
    if (this.mode() === 'now') return p.safe
      ? 'With one frame in flight the GPU has finished before the CPU records the next frame, so destroying at once happens to be safe, at the cost of the CPU and GPU never working at the same time.'
      : `Use after free: ${p.unsafe} GPU frame${p.unsafe > 1 ? 's' : ''} still draw the mesh after it was destroyed. The CPU is up to ${F - 1} frame${F > 2 ? 's' : ''} ahead of the GPU.`;
    if (this.mode() === 'queue') return `Retired in frame ${D}, destroyed when frame ${D + F} begins: Begin has just waited for frame ${D}’s fence, so every frame that drew the mesh is finished. Nothing waits.`;
    return `Safe, but the CPU sat idle for ${((p.stall?.end ?? 0) - (p.stall?.start ?? 0)).toFixed(2)} frame-times while the GPU drained, and then the GPU sat idle while the CPU recorded the next frame. Fine when closing a model; a stutter if done every frame.`;
  });
}
