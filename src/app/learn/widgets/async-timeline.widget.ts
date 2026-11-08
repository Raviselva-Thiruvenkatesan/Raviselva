import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Mode = 'sync' | 'await' | 'whenall';
const DUR = [1.2, 0.8, 1.0];   // seconds per download
const FILES = ['steel.ifc', 'drawings.pdf', 'report.csv'];

/** Three downloads: blocking, awaited one by one, or awaited together. Watch the UI thread and the clock. */
@Component({
  selector: 'w-async-timeline',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Blocking vs async</h3></div>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="mode() === 'sync'" (click)="setMode('sync')" [attr.aria-pressed]="mode() === 'sync'">Synchronous (.Result)</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'await'" (click)="setMode('await')" [attr.aria-pressed]="mode() === 'await'">await one by one</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'whenall'" (click)="setMode('whenall')" [attr.aria-pressed]="mode() === 'whenall'">await Task.WhenAll</button>
        <button type="button" class="w-btn primary" (click)="run()" [disabled]="running()"><i class="bi bi-play-fill" aria-hidden="true"></i> Run</button>
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Download.cs" [compact]="true" [copyable]="false" />
        <div>
          <div class="app" [class.frozen]="frozen()">
            <div class="bar"><span>My BIM App</span><span class="mono small">{{ frozen() ? '(Not Responding)' : '' }}</span></div>
            <div class="body">
              <button type="button" class="w-btn" (click)="clickUi()">Click me while it runs</button>
              <small>clicks handled: <strong>{{ clicks() }}</strong>{{ missed() ? ' · queued while frozen (handled late): ' + missed() : '' }}</small>
            </div>
          </div>
          <div class="lanes">
            @for (f of files; track f; let i = $index) {
              <div class="lane">
                <span class="mono small">{{ f }}</span>
                <div class="track"><div class="fill" [style.left.%]="startPct(i)" [style.width.%]="progressPct(i)"></div></div>
              </div>
            }
            <div class="clock mono">t = {{ t().toFixed(1) }} s / {{ total().toFixed(1) }} s</div>
          </div>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><i class="bi bi-lightbulb" aria-hidden="true"></i><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .app { border-radius: 12px; border: 1.5px solid var(--border-color); overflow: hidden; transition: filter 0.2s; }
    .app.frozen { filter: grayscale(1) opacity(0.6); }
    .bar { display: flex; justify-content: space-between; padding: 5px 10px; font-size: 0.78rem; font-weight: 700; background: rgba(139, 92, 246, 0.12); }
    .body { padding: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .body small { color: var(--text-muted); }
    .lanes { margin-top: 10px; display: grid; gap: 6px; }
    .lane { display: grid; grid-template-columns: 96px 1fr; gap: 8px; align-items: center; }
    .track { position: relative; height: 14px; border-radius: 999px; background: rgba(148, 163, 184, 0.15); overflow: hidden; }
    .fill { position: absolute; top: 0; bottom: 0; background: var(--gradient-primary); border-radius: 999px; }
    .clock { font-size: 0.8rem; color: var(--text-muted); text-align: right; }
  `]
})
export class AsyncTimelineWidget {
  files = FILES;
  mode = signal<Mode>('await');
  t = signal(0);
  running = signal(false);
  clicks = signal(0);
  missed = signal(0);
  private raf = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => { if (this.raf) cancelAnimationFrame(this.raf); });   // raf is 0 during server rendering
  }

  setMode(m: Mode) { if (!this.running()) { this.mode.set(m); this.t.set(0); this.missed.set(0); } }

  /** Start time of each download in seconds. */
  private starts = computed(() => this.mode() === 'whenall' ? [0, 0, 0] : [0, DUR[0], DUR[0] + DUR[1]]);
  total = computed(() => this.mode() === 'whenall' ? Math.max(...DUR) : DUR.reduce((a, b) => a + b, 0));
  frozen = computed(() => this.running() && this.mode() === 'sync');

  startPct(i: number) { return (100 * this.starts()[i]) / 3; }
  progressPct(i: number) {
    const done = Math.min(Math.max(this.t() - this.starts()[i], 0), DUR[i]);
    return (100 * done) / 3;
  }

  code = computed(() => {
    switch (this.mode()) {
      case 'sync': return ['void LoadAll()   // runs on the UI thread', '{', '    var a = client.GetStringAsync(urlA).Result;   // blocks!', '    var b = client.GetStringAsync(urlB).Result;', '    var c = client.GetStringAsync(urlC).Result;', '}'].join('\n');
      case 'await': return ['async Task LoadAllAsync()', '{', '    var a = await client.GetStringAsync(urlA);', '    var b = await client.GetStringAsync(urlB);', '    var c = await client.GetStringAsync(urlC);', '}'].join('\n');
      default: return ['async Task LoadAllAsync()', '{', '    Task<string> a = client.GetStringAsync(urlA);   // all three start now', '    Task<string> b = client.GetStringAsync(urlB);', '    Task<string> c = client.GetStringAsync(urlC);', '    await Task.WhenAll(a, b, c);', '}'].join('\n');
    }
  });

  note = computed(() => ({
    sync: '.Result blocks the UI thread until each download finishes. The window can’t repaint or react: Windows shows "Not Responding". Clicks during that time are queued, not handled.',
    await: 'await frees the UI thread while waiting for the network, so the app stays responsive. The downloads still happen one after another, so the total time is the sum.',
    whenall: 'Starting all three first and then awaiting Task.WhenAll lets the waits overlap. Total time ≈ the slowest download, and the UI stays responsive.'
  }[this.mode()]));

  clickUi() {
    if (this.frozen()) this.missed.update(m => m + 1);
    else this.clicks.update(c => c + 1);
  }

  run() {
    this.running.set(true);
    this.t.set(0);
    this.missed.set(0);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / 1000, this.total());
      this.t.set(t);
      if (t < this.total()) this.raf = requestAnimationFrame(tick);
      else {
        this.running.set(false);
        if (this.mode() === 'sync' && this.missed()) {
          this.clicks.update(c => c + this.missed());   // queued clicks all arrive at once
        }
      }
    };
    this.raf = requestAnimationFrame(tick);
  }
}
