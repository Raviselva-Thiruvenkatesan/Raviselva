import { Component, computed, signal } from '@angular/core';

type Gpu = 'discrete' | 'integrated';
const PCIE = 25, VRAM = 450, RAM = 50;      // GB/s, rough figures
const BUDGET = 1000 / 60;                   // ms per frame at 60 fps

/** Compare reading a mesh from host memory every frame with copying it to device-local memory once. */
@Component({
  selector: 'w-staging-flow',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where should the mesh live?</h3></div>
      <div class="w-controls" role="group" aria-label="GPU">
        <button type="button" class="w-btn small" [class.on]="gpu() === 'discrete'" [attr.aria-pressed]="gpu() === 'discrete'" (click)="gpu.set('discrete')">Discrete card (PCIe)</button>
        <button type="button" class="w-btn small" [class.on]="gpu() === 'integrated'" [attr.aria-pressed]="gpu() === 'integrated'" (click)="gpu.set('integrated')">Integrated (shared RAM)</button>
      </div>
      <label class="w-field"><span>Vertex and index data drawn each frame: {{ mb() }} MB</span>
        <input type="range" min="10" max="1500" step="10" [value]="mb()" (input)="mb.set(+$any($event.target).value)" /></label>
      <div class="flow mono" aria-hidden="true">
        <span class="box cpu">C# array</span><i class="bi bi-arrow-right"></i>
        <span class="box host">staging (HostVisible)</span><i class="bi bi-arrow-right"></i>
        <span class="box dev">{{ gpu() === 'discrete' ? 'VRAM (DeviceLocal)' : 'RAM (DeviceLocal)' }}</span><i class="bi bi-arrow-right"></i>
        <span class="box gpu">vertex shader</span>
      </div>
      <div class="bars">
        @for (r of rows(); track r.label) {
          <div class="row">
            <span class="name">{{ r.label }}</span>
            <div class="track"><div class="bar" [class.over]="r.ms > budget" [style.width.%]="pct(r.ms)"></div><div class="limit" [style.left.%]="pct(budget)"></div></div>
            <span class="ms mono">{{ r.ms.toFixed(1) }} ms</span>
          </div>
        }
      </div>
      <p class="w-hint">Time per frame just to read the data, against a 60 fps budget of 16.7 ms (the line). Rough speeds: PCIe 4.0 ×16 about {{ pcie }} GB/s, graphics-card VRAM about {{ vram }} GB/s, laptop RAM about {{ ram }} GB/s.</p>
      <div class="w-msg" [class.ok]="!bad()" [class.err]="bad()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; margin: 0.3rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .flow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 0.72rem; margin: 0.4rem 0; }
    .box { padding: 3px 7px; border-radius: 7px; border: 1.5px solid var(--border-color); }
    .box.host { border-color: #f59e0b; }
    .box.dev { border-color: #10b981; }
    .box.gpu { border-color: #8b5cf6; }
    .bars { display: flex; flex-direction: column; gap: 6px; margin: 0.4rem 0; }
    .row { display: grid; grid-template-columns: minmax(7rem, 11rem) 1fr 4.2rem; gap: 8px; align-items: center; font-size: 0.78rem; }
    .name { font-weight: 700; }
    .track { position: relative; height: 14px; background: var(--bg-main); border-radius: 7px; border: 1px solid var(--border-color); overflow: hidden; }
    .bar { height: 100%; background: #10b981; border-radius: 7px; }
    .bar.over { background: #ef4444; }
    .limit { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--text-main); }
    .ms { text-align: right; }
    @media (max-width: 480px) { .row { grid-template-columns: 1fr 4rem; } .row .track { grid-column: 1 / -1; grid-row: 2; } }
  `]
})
export class StagingFlowWidget {
  readonly pcie = PCIE; readonly vram = VRAM; readonly ram = RAM;
  readonly budget = BUDGET;
  gpu = signal<Gpu>('discrete');
  mb = signal(300);

  rows = computed(() => {
    const gb = this.mb() / 1000;
    if (this.gpu() === 'integrated') {
      return [
        { label: 'Left in HostVisible memory', ms: gb / RAM * 1000 },
        { label: 'Copied to DeviceLocal once', ms: gb / RAM * 1000 }
      ];
    }
    return [
      { label: 'Left in system RAM, read over PCIe', ms: gb / PCIE * 1000 },
      { label: 'Staged into VRAM once', ms: gb / VRAM * 1000 }
    ];
  });
  upload = computed(() => this.mb() / 1000 / (this.gpu() === 'discrete' ? PCIE : RAM) * 1000);
  bad = computed(() => this.rows()[0].ms > BUDGET && this.gpu() === 'discrete');
  pct(ms: number) { return Math.min(100, ms / (BUDGET * 2) * 100); }
  message = computed(() => {
    const [a, b] = this.rows();
    if (this.gpu() === 'integrated')
      return `Both read the same RAM at the same speed (${a.ms.toFixed(1)} ms), so on an integrated GPU staging gains nothing per frame. It only adds a one-time copy of ${this.upload().toFixed(0)} ms at load time, a small price for one code path that suits every GPU.`;
    return `Reading over PCIe costs ${a.ms.toFixed(1)} ms every frame${a.ms > BUDGET ? ', more than the whole frame budget' : ''}. A one-time staging copy of about ${this.upload().toFixed(0)} ms puts the data in VRAM, where reading it takes ${b.ms.toFixed(1)} ms.`;
  });
}
