import { Component, computed, signal } from '@angular/core';

interface Use { id: string; label: string; stage: string; access: string; write: boolean; image?: string }
const USES: Use[] = [
  { id: 'compute-write', label: 'Compute shader writes a storage buffer', stage: 'ComputeShaderBit', access: 'ShaderStorageWriteBit', write: true },
  { id: 'compute-read', label: 'Compute shader reads a storage buffer', stage: 'ComputeShaderBit', access: 'ShaderStorageReadBit', write: false },
  { id: 'indirect', label: 'Indirect draw reads commands', stage: 'DrawIndirectBit', access: 'IndirectCommandReadBit', write: false },
  { id: 'vertex-read', label: 'Vertex shader reads a storage buffer', stage: 'VertexShaderBit', access: 'ShaderStorageReadBit', write: false },
  { id: 'fill', label: 'Fill, copy or clear writes a buffer', stage: 'AllTransferBit', access: 'TransferWriteBit', write: true },
  { id: 'color', label: 'Draw writes a colour attachment', stage: 'ColorAttachmentOutputBit', access: 'ColorAttachmentWriteBit', write: true, image: 'ColorAttachmentOptimal' },
  { id: 'sample', label: 'Fragment shader samples the image', stage: 'FragmentShaderBit', access: 'ShaderSampledReadBit', write: false, image: 'ShaderReadOnlyOptimal' },
  { id: 'host-read', label: 'CPU reads the buffer after the fence', stage: 'HostBit', access: 'HostReadBit', write: false }
];

/** Pick what happens first and what happens next; see the hazard and the barrier that orders them. */
@Component({
  selector: 'w-barrier-builder',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which barrier?</h3></div>
      <div class="pick">
        <label class="w-field"><span>First (before the barrier)</span>
          <select [value]="first()" (change)="first.set($any($event.target).value)">@for (u of uses; track u.id) { <option [value]="u.id">{{ u.label }}</option> }</select></label>
        <label class="w-field"><span>Then (after it), on the same buffer or image</span>
          <select [value]="then()" (change)="then.set($any($event.target).value)">@for (u of uses; track u.id) { <option [value]="u.id">{{ u.label }}</option> }</select></label>
      </div>
      <div class="hazard" [class]="'hazard ' + result().kind"><b>{{ result().hazard }}</b> {{ result().why }}</div>
      @if (result().code) { <pre class="code">{{ result().code }}</pre> }
      <div class="w-msg info" aria-live="polite"><span>{{ result().note }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .pick { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 14px; margin-bottom: 0.6rem; }
    .w-field { display: flex; flex-direction: column; gap: 3px; font-size: 0.8rem; font-weight: 600; }
    select { padding: 5px 6px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-size: 0.8rem; }
    .hazard { padding: 8px 10px; border-radius: 10px; font-size: 0.84rem; margin-bottom: 0.5rem; }
    .hazard.raw, .hazard.waw { background: rgba(239, 68, 68, 0.12); } .hazard.war { background: rgba(245, 158, 11, 0.14); } .hazard.none { background: rgba(34, 197, 94, 0.12); }
    .code { font-size: 0.74rem; background: #0b0f17; color: #e2e8f0; padding: 10px 12px; border-radius: 10px; overflow-x: auto; margin: 0 0 0.5rem; white-space: pre; }
  `]
})
export class BarrierBuilderWidget {
  readonly uses = USES;
  first = signal('compute-write');
  then = signal('indirect');

  result = computed(() => {
    const a = USES.find(u => u.id === this.first())!, b = USES.find(u => u.id === this.then())!;
    const kind = a.write ? (b.write ? 'waw' : 'raw') : (b.write ? 'war' : 'none');
    if (kind === 'none')
      return { kind, hazard: 'Read after read: no hazard.', why: 'Two reads never conflict, in any order.', code: '', note: this.layoutNote(a, b) || 'No barrier needed (unless an image must change layout between the two).' };
    const memory = kind !== 'war';
    const code =
      `Barriers.Memory(vk, cmd,\n` +
      `    PipelineStageFlags2.${a.stage}, AccessFlags2.${memory ? a.access : 'None'},\n` +
      `    PipelineStageFlags2.${b.stage}, AccessFlags2.${memory ? b.access : 'None'});`;
    const hazard = kind === 'raw' ? 'Read after write.' : kind === 'waw' ? 'Write after write.' : 'Write after read.';
    const why = kind === 'raw' ? 'The read must wait for the write to finish, and see its data: an execution and a memory dependency.'
      : kind === 'waw' ? 'The second write must happen after the first and land on top of it: an execution and a memory dependency.'
      : 'The write must not start until the read has finished. A read leaves nothing to flush, so the accesses can be None.';
    const imageNote = this.layoutNote(a, b);
    const hostNote = b.stage === 'HostBit' ? ' The CPU must also wait for the fence or semaphore before reading; the barrier only makes the data visible to the host once the work is done.' : '';
    const general = kind === 'war'
      ? `The source half names the reads that must finish (${a.stage}); the destination half names the work that waits for them (${b.stage}). Nothing is flushed or invalidated.`
      : `The source half names what must finish (${a.stage}) and which writes to flush; the destination half names what waits (${b.stage}) and which caches must see the data.`;
    return { kind, hazard, why, code, note: (imageNote || general) + hostNote };
  });

  private layoutNote(a: Use, b: Use) {
    if (a.image && b.image && a.image !== b.image)
      return `This is an image, so use an ImageMemoryBarrier2 with the same stages and accesses, and OldLayout ${a.image}, NewLayout ${b.image}: the layout changes in the same barrier.`;
    if ((a.image && !b.image) || (!a.image && b.image)) return 'One side uses an image and the other treats it as a buffer: pick two uses of the same kind of resource.';
    return '';
  }
}
