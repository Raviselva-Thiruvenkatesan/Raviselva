import { Component, computed, signal } from '@angular/core';

interface Item { id: string; layer: number; owns: string; uses: string[]; note: string }

const LAYERS = ['Application', 'Rendering', 'Scene', 'Frames', 'Resources', 'Device', 'Platform'];
const ITEMS: Item[] = [
  { id: 'Program', layer: 0, owns: 'GpuContext, FrameLoop, PipelineLibrary, the meshes, the Scene, the DeletionQueue', uses: ['SceneRenderer', 'Scene', 'FrameLoop', 'DeletionQueue', 'PipelineLibrary', 'Mesh<T>', 'GpuContext', 'IWindow'], note: 'Creates every layer in order, connects them (for example FrameCompleted to DeletionQueue.Flush) and disposes of them in reverse.' },
  { id: 'SceneRenderer', layer: 1, owns: 'Nothing: it borrows pipelines, meshes and the frame', uses: ['Scene', 'Material', 'PipelineLibrary', 'Mesh<T>', 'Frame'], note: 'Reads the scene once per frame and records draws into the frame’s command buffer.' },
  { id: 'Scene', layer: 2, owns: 'Its list of SceneObjects', uses: ['Material', 'Mesh<T>'], note: 'Plain C# data. Editing it makes no Vulkan call; objects only refer to meshes.' },
  { id: 'Material', layer: 2, owns: 'A pipeline key and its values', uses: ['PipelineLibrary'], note: 'Names the pipeline variant by key; the library turns the key into a pipeline.' },
  { id: 'OrbitCamera', layer: 2, owns: 'Target, yaw, pitch, distance', uses: [], note: 'Pure maths: produces the view and projection matrices.' },
  { id: 'FrameLoop', layer: 3, owns: 'Swapchain, depth image, command pool, fences, semaphores', uses: ['Swapchain', 'GpuImage', 'GpuContext', 'IWindow'], note: 'Runs frames: wait, acquire, begin, end, submit, present, resize. Knows nothing about what is drawn.' },
  { id: 'Frame', layer: 3, owns: 'Nothing: one frame’s command buffer and image state', uses: [], note: 'Travels from Begin to End so every recorder can write correct barriers.' },
  { id: 'DeletionQueue', layer: 3, owns: 'Objects waiting for their frame to finish', uses: [], note: 'Asks a function for the frame number; FrameLoop.FrameCompleted tells it when to flush. Testable without a GPU.' },
  { id: 'Swapchain', layer: 4, owns: 'Swapchain images and views', uses: ['GpuContext'], note: 'Recreated by FrameLoop when the window size changes.' },
  { id: 'PipelineLibrary', layer: 4, owns: 'Every MeshPipeline variant, the VkPipelineCache', uses: ['MeshPipeline', 'GpuContext'], note: 'Creates each variant once, on first use.' },
  { id: 'MeshPipeline', layer: 4, owns: 'VkPipeline, VkPipelineLayout', uses: ['GpuContext'], note: 'Shaders plus fixed state.' },
  { id: 'Mesh<T>', layer: 4, owns: 'A vertex and an index GpuBuffer', uses: ['GpuBuffer', 'GpuContext'], note: 'Shared by every scene object that uses it.' },
  { id: 'Texture', layer: 4, owns: 'A GpuImage and a sampler', uses: ['GpuImage', 'GpuContext'], note: 'Uploaded once through a staging buffer.' },
  { id: 'GpuBuffer', layer: 4, owns: 'VkBuffer and its memory', uses: ['GpuContext'], note: 'The basic memory-backed resource.' },
  { id: 'GpuImage', layer: 4, owns: 'VkImage, its memory, a view', uses: ['GpuContext'], note: 'Depth buffers, textures, off-screen targets.' },
  { id: 'GpuContext', layer: 5, owns: 'Instance, surface, device, queues', uses: ['IWindow'], note: 'Created first, destroyed last.' },
  { id: 'IWindow', layer: 6, owns: 'The OS window, input devices', uses: [], note: 'Silk.NET: knows nothing of Vulkan beyond creating a surface.' }
];

/** The engine's layers: click a class to see what it owns, what it uses and what uses it. */
@Component({
  selector: 'w-engine-layers',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Who may use whom</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn small" [class.on]="bad()" [attr.aria-pressed]="bad()" (click)="bad.set(!bad())">Add a bad dependency: Mesh&lt;T&gt; uses SceneRenderer</button>
      </div>
      <div class="layers">
        @for (layer of layers; track layer; let i = $index) {
          <div class="layer">
            <span class="lname">{{ layer }}</span>
            <div class="chips">
              @for (it of itemsIn(i); track it.id) {
                <button type="button" class="chip cls" [class.cur]="it.id === sel()" [class.ok]="usesSel().has(it.id)" [class.wait]="usedBySel().has(it.id)"
                        [class.bad]="bad() && (it.id === 'Mesh<T>' || it.id === 'SceneRenderer')" (click)="sel.set(it.id)">{{ it.id }}</button>
              }
            </div>
          </div>
        }
      </div>
      <p class="w-hint"><span class="key ok"></span> used by the selected class <span class="key wait"></span> uses the selected class</p>
      <div class="w-panel">
        <div><b class="mono">{{ item().id }}</b> · {{ layers[item().layer] }} layer</div>
        <div><b>Owns:</b> {{ item().owns }}</div>
        <div><b>Uses:</b> {{ item().uses.length ? item().uses.join(', ') : 'nothing in the engine' }}</div>
        <div class="note">{{ item().note }}</div>
      </div>
      <div class="w-msg" [class.ok]="!bad()" [class.err]="bad()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .layers { display: flex; flex-direction: column; gap: 4px; margin: 0.4rem 0; }
    .layer { display: grid; grid-template-columns: 6.6rem 1fr; gap: 8px; align-items: center; padding: 4px 6px; border-radius: 8px; background: var(--bg-main); border: 1px solid var(--border-color); }
    @media (max-width: 520px) { .layer { grid-template-columns: 1fr; } }
    .lname { font-size: 0.74rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .cls { cursor: pointer; font-family: monospace; font-size: 0.76rem; color: var(--text-main); }
    .w-panel { display: flex; flex-direction: column; gap: 3px; font-size: 0.84rem; }
    .note { color: var(--text-muted); }
    .key { display: inline-block; width: 12px; height: 12px; border-radius: 3px; vertical-align: -1px; margin: 0 2px 0 8px; border: 1.5px solid; }
    .key.ok { border-color: #10b981; background: rgba(16, 185, 129, 0.2); }
    .key.wait { border-color: #0891b2; background: rgba(6, 182, 212, 0.12); }
  `]
})
export class EngineLayersWidget {
  readonly layers = LAYERS;
  sel = signal('SceneRenderer');
  bad = signal(false);

  item = computed(() => ITEMS.find(i => i.id === this.sel())!);
  itemsIn(layer: number) { return ITEMS.filter(i => i.layer === layer); }
  private uses(id: string) { const it = ITEMS.find(i => i.id === id)!; return this.bad() && id === 'Mesh<T>' ? [...it.uses, 'SceneRenderer'] : it.uses; }
  usesSel = computed(() => new Set(this.uses(this.sel())));
  usedBySel = computed(() => new Set(ITEMS.filter(i => this.uses(i.id).includes(this.sel())).map(i => i.id)));

  message = computed(() => {
    if (this.bad()) return 'Mesh<T> is in the Resources layer and SceneRenderer is in Rendering, above it. Now each needs the other: a cycle. Neither can be tested or reused alone, and disposing of a mesh drags the renderer in. Let the application remove the objects that use the mesh, or raise an event.';
    const it = this.item(), up = it.uses.map(u => ITEMS.find(i => i.id === u)!).filter(u => u.layer < it.layer);
    return up.length ? `${it.id} uses a class above it.` :
      `Every class ${it.id} uses is in its own layer or below (${it.uses.length} dependencies). Dependencies only point down, so each layer can be built and tested on top of the ones beneath it.`;
  });
}
