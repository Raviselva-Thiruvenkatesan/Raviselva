import { Component, computed, signal } from '@angular/core';

type Gpu = 'integrated' | 'discrete' | 'rebar';
type Use = 'mesh' | 'uniform' | 'staging' | 'readback';
type Flag = 'DeviceLocal' | 'HostVisible' | 'HostCoherent' | 'HostCached';
interface Heap { name: string; size: string }
interface MemType { flags: Flag[]; heap: number }

const DISCRETE_TYPES: MemType[] = [
  { flags: ['DeviceLocal'], heap: 0 },
  { flags: ['HostVisible', 'HostCoherent'], heap: 1 },
  { flags: ['HostVisible', 'HostCoherent', 'HostCached'], heap: 1 },
  { flags: ['DeviceLocal', 'HostVisible', 'HostCoherent'], heap: 2 }
];
const GPUS: Record<Gpu, { label: string; heaps: Heap[]; types: MemType[] }> = {
  integrated: {
    label: 'Integrated (this PC)',
    heaps: [{ name: 'Shared system RAM, DeviceLocal', size: '3.87 GiB' }],
    types: [
      { flags: ['DeviceLocal'], heap: 0 },
      { flags: ['DeviceLocal', 'HostVisible', 'HostCoherent'], heap: 0 },
      { flags: ['DeviceLocal', 'HostVisible', 'HostCoherent', 'HostCached'], heap: 0 }
    ]
  },
  discrete: {
    label: 'Discrete card',
    heaps: [{ name: 'VRAM, DeviceLocal', size: '8 GiB' }, { name: 'System RAM', size: '16 GiB' }, { name: 'BAR window into VRAM, DeviceLocal', size: '256 MiB' }],
    types: DISCRETE_TYPES
  },
  rebar: {
    label: 'Discrete, Resizable BAR',
    heaps: [{ name: 'VRAM, DeviceLocal', size: '8 GiB' }, { name: 'System RAM', size: '16 GiB' }, { name: 'All of VRAM, mappable, DeviceLocal', size: '8 GiB' }],
    types: DISCRETE_TYPES
  }
};
const USES: Record<Use, { label: string; wishes: Flag[][] }> = {
  mesh: { label: 'Static mesh', wishes: [['DeviceLocal']] },
  uniform: { label: 'Per-frame uniforms', wishes: [['DeviceLocal', 'HostVisible', 'HostCoherent'], ['HostVisible', 'HostCoherent']] },
  staging: { label: 'Staging upload', wishes: [['HostVisible', 'HostCoherent']] },
  readback: { label: 'Read back to the CPU', wishes: [['HostVisible', 'HostCached']] }
};
const NOTES: Record<Use, Record<Gpu, string>> = {
  mesh: {
    integrated: 'The CPU cannot map it, so the mesh goes in through a staging copy. Here type 1 is DeviceLocal too, so writing into it directly would be just as fast for the GPU.',
    discrete: 'VRAM: the fastest for the GPU, and the CPU cannot map it. Upload through a staging buffer.',
    rebar: 'Still the usual choice. With Resizable BAR the CPU could also write the mesh straight into VRAM through type 3 and skip the staging copy.'
  },
  uniform: {
    integrated: 'It is device-local and the CPU can write it, so it suits data rewritten every frame.',
    discrete: 'That is the small BAR window into VRAM: only 256 MiB, but plenty for per-frame data. Without it, the fallback is type 1 in system RAM, read over PCIe every frame.',
    rebar: 'With Resizable BAR it maps all of VRAM, so even large per-frame data can be written directly.'
  },
  staging: {
    integrated: 'The CPU writes it front to back, then the GPU copies it. On an integrated GPU the copy stays within the same RAM.',
    discrete: 'System RAM the CPU writes quickly; the GPU pulls it into VRAM over PCIe, once.',
    rebar: 'The same as without Resizable BAR. Many engines skip staging on such systems and write into type 3 directly.'
  },
  readback: {
    integrated: 'It is cached, so the CPU reads it quickly. Uncached type 1 was over 10 times slower to read in the lesson’s test.',
    discrete: 'Cached system RAM: the GPU copies results into it, and the CPU reads them at full speed.',
    rebar: 'Cached system RAM. Never read back from the BAR type 3: reads across PCIe from uncached memory are very slow.'
  }
};

/** Pick a GPU and a use; see which memory type an engine should ask for. */
@Component({
  selector: 'w-memory-types',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which memory type?</h3></div>
      <div class="w-controls" role="group" aria-label="GPU">
        @for (g of gpuIds; track g) { <button type="button" class="w-btn small" [class.on]="gpu() === g" [attr.aria-pressed]="gpu() === g" (click)="gpu.set(g)">{{ gpus[g].label }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Use">
        @for (u of useIds; track u) { <button type="button" class="w-btn small" [class.on]="use() === u" [attr.aria-pressed]="use() === u" (click)="use.set(u)">{{ uses[u].label }}</button> }
      </div>
      <p class="w-hint">Ask for: <b class="mono">{{ askText() }}</b></p>
      <div class="heaps">
        @for (h of gpus[gpu()].heaps; track $index; let hi = $index) {
          <div class="heap">
            <div class="hname">Heap {{ hi }}: {{ h.name }} <span class="muted">({{ h.size }})</span></div>
            @for (t of gpus[gpu()].types; track $index; let ti = $index) {
              @if (t.heap === hi) {
                <div class="type" [class.pick]="ti === choice().type">
                  <span class="mono tn">Type {{ ti }}</span>
                  <span class="chips">@for (f of t.flags; track f) { <span class="chip mono">{{ f }}</span> }</span>
                  @if (ti === choice().type) { <i class="bi bi-check-circle-fill ok" aria-label="chosen"></i> }
                </div>
              }
            }
          </div>
        }
      </div>
      <div class="w-msg ok" aria-live="polite"><span><b>Type {{ choice().type }}{{ choice().fallback ? ' (the fallback)' : '' }}.</b> {{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .heaps { display: flex; flex-direction: column; gap: 8px; margin: 0.4rem 0; }
    .heap { border: 1.5px solid var(--border-color); border-radius: 10px; padding: 6px 8px; }
    .hname { font-weight: 700; font-size: 0.82rem; margin-bottom: 4px; }
    .muted { color: var(--text-muted); font-weight: 400; }
    .type { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 4px 6px; border-radius: 8px; margin: 2px 0; }
    .type.pick { background: rgba(16, 185, 129, 0.15); outline: 1.5px solid #10b981; }
    .tn { font-size: 0.78rem; font-weight: 700; min-width: 3.6rem; }
    .chip { font-size: 0.7rem; }
    .ok { color: #10b981; margin-left: auto; }
  `]
})
export class MemoryTypesWidget {
  readonly gpus = GPUS;
  readonly uses = USES;
  readonly gpuIds: Gpu[] = ['integrated', 'discrete', 'rebar'];
  readonly useIds: Use[] = ['mesh', 'uniform', 'staging', 'readback'];
  gpu = signal<Gpu>('integrated');
  use = signal<Use>('mesh');

  choice = computed(() => {
    const types = GPUS[this.gpu()].types;
    const wishes = USES[this.use()].wishes;
    for (let w = 0; w < wishes.length; w++) {
      const type = types.findIndex(t => wishes[w].every(f => t.flags.includes(f)));
      if (type >= 0) return { type, fallback: w > 0 };
    }
    return { type: -1, fallback: false };
  });
  askText = computed(() => USES[this.use()].wishes.map(w => w.join(' | ')).join(', else '));
  note = computed(() => NOTES[this.use()][this.gpu()]);
}
