import { Component, computed, signal } from '@angular/core';

type Mode = 'fifo' | 'mailbox' | 'immediate';
const REFRESH = 1000 / 60;       // ms between vblanks at 60 Hz
const SPAN = 100;                // ms shown
const W = 600, X = (t: number) => 70 + (t / SPAN) * (W - 80);
const COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

interface Bar { frame: number; start: number; end: number }
interface Shown { frame: number; start: number; end: number; tear?: boolean }

/** Simulate 100 ms of a 60 Hz display with three swapchain images and a chosen GPU frame time. */
function simulate(mode: Mode, gpuMs: number) {
  const gpu: Bar[] = [], screen: Shown[] = [];
  let discarded = 0, tears = 0;
  if (mode === 'immediate') {
    let t = 0, f = 0, showing = -1, since = 0;
    while (t < SPAN) {
      const done = t + gpuMs; gpu.push({ frame: f, start: t, end: done });
      if (done < SPAN) {
        if (showing >= 0) screen.push({ frame: showing, start: since, end: done });
        const phase = done % REFRESH;
        if (phase > 0.5 && phase < REFRESH - 0.5) { tears++; screen.push({ frame: f, start: done, end: done, tear: true }); }
        showing = f; since = done;
      }
      t = done; f++;
    }
    if (showing >= 0) screen.push({ frame: showing, start: since, end: SPAN });
    return { gpu, screen, discarded, tears, shownCount: new Set(screen.filter(s => !s.tear).map(s => s.frame)).size, rendered: gpu.filter(g => g.end <= SPAN).length };
  }
  // Fifo and Mailbox: three images. One is on screen, the GPU draws into one, and finished ones wait to be shown.
  const queue: number[] = [];
  let t = 0, f = 0, onScreen = -1, since = 0, v = 1;
  let rendering: Bar | null = null;
  while (v * REFRESH <= SPAN + 0.001) {
    const vb = v * REFRESH;
    if (!rendering && 3 - queue.length - (onScreen >= 0 ? 1 : 0) > 0) { rendering = { frame: f++, start: t, end: t + gpuMs }; }
    if (rendering && rendering.end <= vb) {
      gpu.push(rendering); t = rendering.end;
      if (mode === 'mailbox' && queue.length) { discarded += queue.length; queue.length = 0; }
      queue.push(rendering.frame); rendering = null;
      continue;
    }
    if (queue.length) {
      if (onScreen >= 0) screen.push({ frame: onScreen, start: since, end: vb });
      onScreen = queue.shift()!; since = vb;
    }
    if (!rendering) t = Math.max(t, vb);   // the GPU was waiting for a free image
    v++;
  }
  if (onScreen >= 0) screen.push({ frame: onScreen, start: since, end: SPAN });
  return { gpu, screen, discarded, tears, shownCount: new Set(screen.map(s => s.frame)).size, rendered: gpu.length };
}

/** Timeline of GPU work and what the screen shows, for Fifo, Mailbox and Immediate. */
@Component({
  selector: 'w-present-modes',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Present modes on a 60 Hz screen</h3></div>
      <div class="w-controls" role="group" aria-label="Present mode">
        @for (m of modes; track m.id) {
          <button type="button" class="w-btn small" [class.on]="mode() === m.id" [attr.aria-pressed]="mode() === m.id" (click)="mode.set(m.id)">{{ m.label }}</button>
        }
      </div>
      <label class="w-field"><span>GPU time per frame: <b>{{ gpuMs() }} ms</b> <span class="muted">({{ gpuMs() < 16.7 ? 'faster' : 'slower' }} than one refresh, 16.7 ms)</span></span>
        <input type="range" min="4" max="30" step="1" [value]="gpuMs()" (input)="gpuMs.set(+$any($event.target).value)" />
      </label>
      <svg [attr.viewBox]="'0 0 ' + width + ' 96'" class="tl" role="img" [attr.aria-label]="summary()">
        <text x="4" y="30" class="lbl">GPU</text><text x="4" y="72" class="lbl">Screen</text>
        @for (v of vblanks; track v) { <line [attr.x1]="x(v)" [attr.x2]="x(v)" y1="8" y2="92" class="vb" /> }
        @for (g of sim().gpu; track g.frame) {
          <rect [attr.x]="x(g.start) + 1" y="18" [attr.width]="x(g.end) - x(g.start) - 2" height="18" rx="3" [attr.fill]="color(g.frame)" />
          @if (x(g.end) - x(g.start) > 14) { <text [attr.x]="(x(g.start) + x(g.end)) / 2" y="31" class="num">{{ g.frame }}</text> }
        }
        @for (s of sim().screen; track $index) {
          @if (s.tear) { <line [attr.x1]="x(s.start)" [attr.x2]="x(s.start)" y1="54" y2="88" class="tear" /> }
          @else {
            <rect [attr.x]="x(s.start)" y="58" [attr.width]="x(s.end) - x(s.start)" height="26" [attr.fill]="color(s.frame)" opacity="0.8" />
            @if (x(s.end) - x(s.start) > 14) { <text [attr.x]="(x(s.start) + x(s.end)) / 2" y="75" class="num">{{ s.frame }}</text> }
          }
        }
      </svg>
      <div class="w-msg" [class.err]="sim().tears > 0" [class.info]="!sim().tears" aria-live="polite"><span>{{ summary() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; margin: 0.25rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .muted { color: var(--text-muted); font-weight: 400; }
    .tl { width: 100%; height: auto; margin: 0.4rem 0; }
    .lbl { font-size: 11px; font-weight: 700; fill: var(--text-muted); }
    .vb { stroke: var(--border-color); stroke-dasharray: 3 3; }
    .num { font-size: 10px; fill: #fff; font-weight: 800; text-anchor: middle; }
    .tear { stroke: #dc2626; stroke-width: 3; }
  `]
})
export class PresentModesWidget {
  readonly modes: { id: Mode; label: string }[] = [{ id: 'fifo', label: 'Fifo (vsync)' }, { id: 'mailbox', label: 'Mailbox' }, { id: 'immediate', label: 'Immediate' }];
  readonly width = W;
  readonly vblanks = Array.from({ length: Math.floor(SPAN / REFRESH) + 1 }, (_, i) => i * REFRESH);
  mode = signal<Mode>('fifo');
  gpuMs = signal(6);
  sim = computed(() => simulate(this.mode(), this.gpuMs()));
  x = X;
  color(f: number) { return COLORS[f % COLORS.length]; }
  summary = computed(() => {
    const s = this.sim(), m = this.mode();
    const head = `In 100 ms the GPU finished ${s.rendered} frames and the screen showed ${s.shownCount}.`;
    if (m === 'fifo') return `${head} The GPU waits whenever the queue is full, so it never runs ahead of the screen: no tearing, no wasted work. ${this.gpuMs() > REFRESH ? 'Frames slower than a refresh are shown twice (stutter).' : ''}`;
    if (m === 'mailbox') return `${head} ${s.discarded} finished frames were replaced before being shown: the newest one wins at each vblank. Low latency, no tearing, but the GPU works flat out.`;
    return `${head} Each frame is shown the moment it is done; ${s.tears} times that was mid-refresh, so the screen showed parts of two frames (the red lines are tears).`;
  });
}
