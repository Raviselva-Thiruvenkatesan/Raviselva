import { Component, computed, signal } from '@angular/core';

/** The 13 instance extensions reported on the course’s test PC (Intel Iris Xe, no Vulkan SDK). */
const EXTS = ['VK_KHR_surface', 'VK_KHR_win32_surface', 'VK_KHR_external_memory_capabilities', 'VK_KHR_external_semaphore_capabilities',
  'VK_KHR_external_fence_capabilities', 'VK_KHR_get_physical_device_properties2', 'VK_KHR_get_surface_capabilities2', 'VK_KHR_device_group_creation',
  'VK_EXT_swapchain_colorspace', 'VK_EXT_debug_utils', 'VK_EXT_debug_report', 'VK_KHR_portability_enumeration', 'VK_LUNARG_direct_driver_loading'];

interface Step { code: string; count: number; size: number | null; filled: number; result?: string; note: string }
type Mode = 'two' | 'small';
const SCRIPTS: Record<Mode, Step[]> = {
  two: [
    { code: 'uint count = 0;', count: 0, size: null, filled: 0, note: 'A count variable. No array yet.' },
    { code: 'EnumerateInstanceExtensionProperties(null, &count, null);', count: 13, size: null, filled: 0, result: 'Success', note: 'Call 1. The array pointer is null, so Vulkan only writes how many there are: 13.' },
    { code: 'var props = new ExtensionProperties[count];', count: 13, size: 13, filled: 0, note: 'You allocate an array of exactly that size. Vulkan never allocates memory you have to free.' },
    { code: 'EnumerateInstanceExtensionProperties(null, &count, p);', count: 13, size: 13, filled: 13, result: 'Success', note: 'Call 2. count says how big the array is; Vulkan fills it and leaves in count how many it wrote.' }
  ],
  small: [
    { code: 'uint count = 2;', count: 2, size: null, filled: 0, note: 'Suppose you guessed a size instead of asking first.' },
    { code: 'var props = new ExtensionProperties[2];', count: 2, size: 2, filled: 0, note: 'Room for only two entries.' },
    { code: 'EnumerateInstanceExtensionProperties(null, &count, p);', count: 2, size: 2, filled: 2, result: 'Incomplete', note: 'Vulkan writes the two that fit, leaves count at 2 and returns Incomplete (5), a success code. Nothing is written past the end.' }
  ]
};

/** Step through the two-call enumeration pattern, and see what happens with too small an array. */
@Component({
  selector: 'w-enumerate-twice',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Getting a list from Vulkan</h3></div>
      <div class="w-controls" role="group" aria-label="Scenario">
        <button type="button" class="w-btn small" [class.on]="mode() === 'two'" [attr.aria-pressed]="mode() === 'two'" (click)="pick('two')">Two calls</button>
        <button type="button" class="w-btn small" [class.on]="mode() === 'small'" [attr.aria-pressed]="mode() === 'small'" (click)="pick('small')">Array too small</button>
      </div>
      <ol class="script mono" aria-label="Code">
        @for (s of steps(); track $index; let i = $index) { <li [class.done]="i < pos()" [class.cur]="i === pos() - 1">{{ s.code }}</li> }
      </ol>
      <div class="state">
        <div class="var mono">count = <b>{{ cur()?.count ?? '–' }}</b></div>
        @if (cur()?.result) { <div class="var mono">returned <b [class.warn]="cur()!.result !== 'Success'">{{ cur()!.result }}</b></div> }
      </div>
      <div class="arr" aria-label="Your array">
        @if (cur()?.size) {
          @for (slot of slots(); track $index) { <div class="slot mono" [class.full]="slot">{{ slot || 'empty' }}</div> }
        } @else { <div class="none">No array allocated</div> }
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn primary" [disabled]="pos() >= steps().length" (click)="pos.set(pos() + 1)">Run next line</button>
        <button type="button" class="w-btn" [disabled]="pos() === 0" (click)="pos.set(0)"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Start again</button>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ cur()?.note ?? 'Press “Run next line” to start.' }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.8rem; padding: 4px 10px; }
    .script { list-style: none; margin: 0.4rem 0; padding: 8px 10px; background: #0b1020; color: #94a3b8; border-radius: 10px; font-size: 0.74rem; overflow-x: auto; }
    .script li { white-space: pre; padding: 1px 4px; border-radius: 4px; }
    .script li.done { color: #e2e8f0; }
    .script li.cur { background: rgba(139, 92, 246, 0.35); }
    .state { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.85rem; margin: 0.3rem 0; }
    .warn { color: #d97706; }
    .arr { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 4px; margin: 0.4rem 0 0.8rem; }
    .slot { border: 1px dashed var(--border-color); border-radius: 6px; padding: 3px 6px; font-size: 0.68rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slot.full { border-style: solid; border-color: rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.1); color: var(--text-main); }
    .none { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }
  `]
})
export class EnumerateTwiceWidget {
  mode = signal<Mode>('two');
  pos = signal(0);
  steps = computed(() => SCRIPTS[this.mode()]);
  cur = computed(() => (this.pos() === 0 ? null : this.steps()[this.pos() - 1]));
  slots = computed(() => { const c = this.cur(); return c?.size ? Array.from({ length: c.size }, (_, i) => (i < c.filled ? EXTS[i] : '')) : []; });
  pick(m: Mode) { this.mode.set(m); this.pos.set(0); }
}
