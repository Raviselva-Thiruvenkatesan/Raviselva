import { Component, computed, signal } from '@angular/core';

type Api = 'gl' | 'vk';
interface Stage { id: string; label: string; title: string; what: string; gl: string; vk: string; cpu?: boolean; fixed?: boolean }

const STAGES: Stage[] = [
  { id: 'app', label: 'Your code', cpu: true, title: 'Your program describes the frame',
    what: 'The CPU decides what to draw: which objects are visible, where the camera is, what changed since the last frame.',
    gl: 'You call glDraw… once per object. The driver checks each call and the current state, and turns it into GPU commands, on this one thread.',
    vk: 'You record draw commands into a command buffer, which is just a list. Several threads can each record their own command buffer at the same time.' },
  { id: 'submit', label: 'Submit', cpu: true, title: 'Work is sent to the GPU',
    what: 'GPU commands are handed to a queue the GPU reads from.',
    gl: 'The driver collects commands and sends them when it decides to. You do not see when.',
    vk: 'You submit the command buffers to a queue yourself, saying what they must wait for (the swapchain image) and what to signal when done.' },
  { id: 'vertex', label: 'Vertex shader', title: 'Vertex shader: where each corner lands',
    what: 'Your vertex shader runs once per vertex and turns its 3D position into a position on the screen, using the camera’s matrices.',
    gl: 'GLSL source is compiled by the driver, sometimes only the first time an object is drawn, which can cause a hitch.',
    vk: 'The shader is SPIR-V you compiled in advance, built into a pipeline object at load time, so nothing compiles mid-frame.' },
  { id: 'raster', label: 'Rasterise', fixed: true, title: 'Rasterisation: which pixels each triangle covers',
    what: 'Fixed hardware assembles vertices into triangles, clips them to the screen and finds every pixel each one covers.',
    gl: 'Settings such as culling and polygon mode are switched one at a time, any time; the driver must re-check the combination.',
    vk: 'These settings are fixed in the pipeline object (or set with a few dynamic-state commands), checked once when it is built.' },
  { id: 'fragment', label: 'Fragment shader', title: 'Fragment shader: the colour of each pixel',
    what: 'Your fragment shader runs once per covered pixel, and works out its colour from lights, materials and textures.',
    gl: 'Textures and buffers are bound to numbered slots; the driver tracks what is bound where.',
    vk: 'Shaders read resources through descriptor sets that you allocate, write and bind.' },
  { id: 'output', label: 'Depth and blend', fixed: true, title: 'Depth test and blending into the image',
    what: 'Hardware keeps the nearest surface (the depth test), mixes transparent colours, and writes the result into an image.',
    gl: 'The default framebuffer, with its depth buffer, is created for you with the window.',
    vk: 'You create the depth image, allocate its memory and say how each image is loaded and stored.' },
  { id: 'present', label: 'Present', title: 'The finished image appears on screen',
    what: 'The finished image is handed to the window system and shown at the next refresh.',
    gl: 'SwapBuffers. The driver makes sure drawing has finished first.',
    vk: 'You present a swapchain image after a semaphore says drawing finished, and a fence tells the CPU when this frame’s resources can be reused.' }
];

/** Step through one frame from the CPU to the screen, and see who does each job in OpenGL and in Vulkan. */
@Component({
  selector: 'w-gpu-frame',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The journey of one frame</h3></div>
      <div class="w-controls" role="group" aria-label="API">
        <button type="button" class="w-btn small" [class.on]="api() === 'gl'" [attr.aria-pressed]="api() === 'gl'" (click)="api.set('gl')">OpenGL</button>
        <button type="button" class="w-btn small" [class.on]="api() === 'vk'" [attr.aria-pressed]="api() === 'vk'" (click)="api.set('vk')">Vulkan</button>
      </div>
      <div class="lane" role="group" aria-label="Stages">
        @for (s of stages; track s.id; let i = $index) {
          <button type="button" class="st" [class.cpu]="s.cpu" [class.fixed]="s.fixed" [class.on]="i === ix()" [attr.aria-pressed]="i === ix()" (click)="ix.set(i)">
            <span class="n">{{ i + 1 }}</span>{{ s.label }}
          </button>
        }
      </div>
      <div class="legend"><span class="k cpu"></span>CPU <span class="k gpu"></span>GPU, your shader <span class="k fixed"></span>GPU, fixed hardware</div>
      <div class="detail">
        <b>{{ cur().title }}</b>
        <p>{{ cur().what }}</p>
        <div class="who" [class.vk]="api() === 'vk'"><span class="tag">{{ api() === 'vk' ? 'In Vulkan' : 'In OpenGL' }}</span> {{ api() === 'vk' ? cur().vk : cur().gl }}</div>
      </div>
      <div class="w-controls nav">
        <button type="button" class="w-btn" [disabled]="ix() === 0" (click)="ix.set(ix() - 1)"><i class="bi bi-arrow-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" [disabled]="ix() === stages.length - 1" (click)="ix.set(ix() + 1)">Next stage <i class="bi bi-arrow-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .lane { display: grid; grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr)); gap: 6px; }
    .st { border: 1px solid var(--border-color); background: rgba(139, 92, 246, 0.1); color: var(--text-main); border-radius: 10px; padding: 6px 8px; font-size: 0.78rem; font-weight: 700; text-align: left; cursor: pointer; }
    .st.cpu { background: rgba(56, 189, 248, 0.1); }
    .st.fixed { background: rgba(148, 163, 184, 0.12); }
    .st.on { outline: 2px solid #8b5cf6; outline-offset: 1px; }
    .st .n { display: inline-block; min-width: 1.2rem; color: var(--text-muted); }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; font-size: 0.74rem; color: var(--text-muted); margin: 0.5rem 0; }
    .k { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 3px; vertical-align: -1px; }
    .k.cpu { background: rgba(56, 189, 248, 0.5); } .k.gpu { background: rgba(139, 92, 246, 0.5); } .k.fixed { background: rgba(148, 163, 184, 0.5); }
    .detail { border: 1px solid var(--border-color); border-radius: 12px; padding: 0.7rem 0.85rem; background: var(--bg-main); font-size: 0.9rem; }
    .detail p { margin: 0.3rem 0 0.5rem; }
    .who { border-left: 3px solid #f59e0b; padding: 0.35rem 0.6rem; background: rgba(245, 158, 11, 0.08); border-radius: 0 8px 8px 0; }
    .who.vk { border-left-color: #8b5cf6; background: rgba(139, 92, 246, 0.08); }
    .tag { font-weight: 800; margin-right: 4px; }
    .nav { margin: 0.75rem 0 0; }
  `]
})
export class GpuFrameWidget {
  readonly stages = STAGES;
  api = signal<Api>('vk');
  ix = signal(0);
  cur = computed(() => STAGES[this.ix()]);
}
