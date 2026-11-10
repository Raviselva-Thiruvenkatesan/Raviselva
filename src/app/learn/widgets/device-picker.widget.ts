import { Component, computed, signal } from '@angular/core';

interface Gpu { name: string; type: 'DiscreteGpu' | 'IntegratedGpu' | 'Cpu'; api: string; api13: boolean; heapGiB: number; has: Record<Req, boolean>; measured?: boolean }
type Req = 'dynamicRendering' | 'samplerAnisotropy' | 'geometryShader' | 'shaderFloat64';
const REQS: { id: Req; label: string }[] = [
  { id: 'dynamicRendering', label: 'dynamicRendering' },
  { id: 'samplerAnisotropy', label: 'samplerAnisotropy' },
  { id: 'geometryShader', label: 'geometryShader' },
  { id: 'shaderFloat64', label: 'shaderFloat64' }
];

/** The Intel GPU is the measured one from the lessons; the other two are example data for comparison. */
const GPUS: Gpu[] = [
  { name: 'Intel(R) Iris(R) Xe Graphics', type: 'IntegratedGpu', api: '1.4', api13: true, heapGiB: 3.87, measured: true,
    has: { dynamicRendering: true, samplerAnisotropy: true, geometryShader: true, shaderFloat64: false } },
  { name: 'Example discrete GPU', type: 'DiscreteGpu', api: '1.3', api13: true, heapGiB: 8,
    has: { dynamicRendering: true, samplerAnisotropy: true, geometryShader: true, shaderFloat64: true } },
  { name: 'Example old discrete GPU', type: 'DiscreteGpu', api: '1.2', api13: false, heapGiB: 4,
    has: { dynamicRendering: false, samplerAnisotropy: true, geometryShader: true, shaderFloat64: true } },
  { name: 'Example software renderer', type: 'Cpu', api: '1.3', api13: true, heapGiB: 0,
    has: { dynamicRendering: true, samplerAnisotropy: true, geometryShader: true, shaderFloat64: true } }
];

/** Choose requirements and watch the GPU-scoring rule from the lesson's exercise pick a device. */
@Component({
  selector: 'w-device-picker',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Picking a GPU</h3></div>
      <div class="w-controls" role="group" aria-label="Required">
        <span class="lbl">Require</span>
        <button type="button" class="w-btn small" [class.on]="need13()" [attr.aria-pressed]="need13()" (click)="need13.set(!need13())">Vulkan 1.3</button>
        @for (r of reqs; track r.id) {
          <button type="button" class="w-btn small" [class.on]="need().has(r.id)" [attr.aria-pressed]="need().has(r.id)" (click)="toggle(r.id)">{{ r.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Installed GPUs">
        <span class="lbl">Installed</span>
        @for (g of gpus; track g.name; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="present()[i]" [attr.aria-pressed]="present()[i]" [disabled]="g.measured" (click)="flip(i)">{{ g.measured ? 'Intel Iris Xe (measured)' : g.name }}</button>
        }
      </div>
      <div class="table-wrap">
        <table class="wtable">
          <thead><tr><th scope="col">GPU</th><th scope="col">Type</th><th scope="col">Vulkan</th><th scope="col">Device-local</th><th scope="col">Result</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.g.name) {
              <tr [class.hl]="r.g.name === winner()">
                <td>{{ r.g.name }}</td><td class="mono">{{ r.g.type }}</td><td>{{ r.g.api }}</td><td>{{ r.g.heapGiB }} GiB</td>
                <td [class.ok]="r.score !== null">{{ r.score !== null ? 'score ' + r.score.toFixed(1) : r.why }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="w-msg" [class.ok]="winner()" [class.err]="!winner()" aria-live="polite"><span>{{ winner() ? 'Picked: ' + winner() + '.' : 'No installed GPU meets the requirements: the engine must tell the user, or fall back to fewer features.' }} Score: 1000 for discrete, 100 for integrated, 0 otherwise, plus GiB of device-local memory.</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .lbl { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); min-width: 4.5rem; }
    .table-wrap { overflow-x: auto; }
    .wtable td { font-size: 0.8rem; }
  `]
})
export class DevicePickerWidget {
  readonly reqs = REQS;
  readonly gpus = GPUS;
  need13 = signal(true);
  need = signal(new Set<Req>(['dynamicRendering', 'samplerAnisotropy']));
  present = signal([true, false, false, false]);

  toggle(r: Req) { const s = new Set(this.need()); if (s.has(r)) s.delete(r); else s.add(r); this.need.set(s); }
  flip(i: number) { const p = this.present().slice(); p[i] = !p[i]; this.present.set(p); }

  rows = computed(() => GPUS.filter((_, i) => this.present()[i]).map(g => {
    if (this.need13() && !g.api13) return { g, score: null, why: 'skipped: older than 1.3' };
    const missing = [...this.need()].filter(r => !g.has[r]);
    if (missing.length) return { g, score: null, why: 'skipped: no ' + missing.join(', ') };
    return { g, score: (g.type === 'DiscreteGpu' ? 1000 : g.type === 'IntegratedGpu' ? 100 : 0) + g.heapGiB, why: '' };
  }));
  winner = computed(() => {
    let best: string | null = null, top = -1;
    for (const r of this.rows()) if (r.score !== null && r.score > top) { top = r.score; best = r.g.name; }
    return best;
  });
}
