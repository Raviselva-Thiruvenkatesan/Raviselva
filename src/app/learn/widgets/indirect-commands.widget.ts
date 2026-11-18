import { Component, computed, signal } from '@angular/core';

type Mode = 'flags' | 'compact';
const OBJECTS = Array.from({ length: 10 }, (_, i) => ({ id: i, round: i % 3 === 1 }));
const BOX = { firstIndex: 0, indexCount: 36, vertexOffset: 0 }, CYLINDER = { firstIndex: 36, indexCount: 192, vertexOffset: 24 };

/** Ten objects, a visibility switch each, and the indirect command buffer a culling shader would write for them. */
@Component({
  selector: 'w-indirect-commands',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Writing the command buffer</h3></div>
      <p class="w-hint">Click objects to move them in or out of view. Square ones use the box (36 indices), round ones the cylinder (192).</p>
      <div class="objs" role="group" aria-label="Objects">
        @for (o of objects; track o.id) {
          <button type="button" class="obj" [class.round]="o.round" [class.off]="!visible()[o.id]" [attr.aria-pressed]="visible()[o.id]" (click)="toggle(o.id)">{{ o.id }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Output">
        <button type="button" class="w-btn small" [class.on]="mode() === 'compact'" (click)="mode.set('compact')">Compacted with atomicAdd</button>
        <button type="button" class="w-btn small" [class.on]="mode() === 'flags'" (click)="mode.set('flags')">One per object, InstanceCount 0 or 1</button>
        @if (mode() === 'compact') { <button type="button" class="w-btn small" (click)="run.set(run() + 1)">Run the shader again</button> }
      </div>
      <div class="tscroll"><table class="wtable mono">
        <thead><tr><th scope="col">Slot</th><th scope="col">IndexCount</th><th scope="col">InstanceCount</th><th scope="col">FirstIndex</th><th scope="col">VertexOffset</th><th scope="col">FirstInstance</th></tr></thead>
        <tbody>@for (c of commands(); track $index) { <tr [class.skip]="c.instances === 0"><td>{{ $index }}</td><td>{{ c.indexCount }}</td><td>{{ c.instances }}</td><td>{{ c.firstIndex }}</td><td>{{ c.vertexOffset }}</td><td>{{ c.id }}</td></tr> }</tbody>
      </table></div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .objs { display: flex; flex-wrap: wrap; gap: 6px; margin: 0.3rem 0 0.7rem; }
    .obj { width: 34px; height: 34px; border-radius: 6px; border: 2px solid #8b5cf6; background: rgba(139, 92, 246, 0.25); color: var(--text-main); font-weight: 700; cursor: pointer; }
    .obj.round { border-radius: 50%; border-color: #f59e0b; background: rgba(245, 158, 11, 0.25); }
    .obj.off { opacity: 0.3; border-style: dashed; }
    .wtable { font-size: 0.74rem; }
    tr.skip td { color: var(--text-muted); }
  `]
})
export class IndirectCommandsWidget {
  readonly objects = OBJECTS;
  visible = signal<boolean[]>(OBJECTS.map(o => o.id !== 2 && o.id !== 5 && o.id !== 6));
  mode = signal<Mode>('compact');
  run = signal(0);

  toggle(id: number) { this.visible.update(v => v.map((x, i) => i === id ? !x : x)); }

  commands = computed(() => {
    const vis = this.visible(), toCommand = (o: { id: number; round: boolean }, instances: number) => ({ ...(o.round ? CYLINDER : BOX), instances, id: o.id });
    if (this.mode() === 'flags') return OBJECTS.map(o => toCommand(o, vis[o.id] ? 1 : 0));
    // Invocations reach the atomic in no particular order: shuffle the visible ones, differently on each run
    let seed = 17 + this.run() * 7919;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const shown = OBJECTS.filter(o => vis[o.id]).map(o => ({ o, k: rand() })).sort((a, b) => a.k - b.k).map(x => x.o);
    return shown.map(o => toCommand(o, 1));
  });
  message = computed(() => {
    const n = this.visible().filter(v => v).length;
    return this.mode() === 'compact'
      ? `drawCount = ${n}: the counter after ${n} atomicAdd calls. The draw reads it with CmdDrawIndexedIndirectCount; the slots come out in whatever order invocations reached the atomic, and FirstInstance still tells each command which object it is.`
      : `${OBJECTS.length} commands, always: the CPU draws them all with CmdDrawIndexedIndirect, and the GPU skips the ${OBJECTS.length - n} with InstanceCount 0. No counter is needed, at the cost of reading skipped commands.`;
  });
}
