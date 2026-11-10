import { Component, computed, signal } from '@angular/core';

type Call = 'enum' | 'queues' | 'draw';
const CALLS: { id: Call; label: string }[] = [
  { id: 'enum', label: 'EnumeratePhysicalDevices' },
  { id: 'queues', label: 'CreateDevice asking for 2 queues from a 1-queue family' },
  { id: 'draw', label: 'CmdDraw' }
];

/** The loader passes each call through the enabled layers to the driver of each GPU. */
@Component({
  selector: 'w-vk-loader',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From your call to the driver</h3></div>
      <div class="w-controls" role="group" aria-label="Set-up">
        <button type="button" class="w-btn small" [class.on]="validation()" [attr.aria-pressed]="validation()" (click)="validation.set(!validation())">Validation layer enabled</button>
        <button type="button" class="w-btn small" [class.on]="second()" [attr.aria-pressed]="second()" (click)="second.set(!second())">A second GPU is installed</button>
      </div>
      <div class="w-controls" role="group" aria-label="Call">
        @for (c of calls; track c.id) {
          <button type="button" class="w-btn small" [class.on]="call() === c.id" [attr.aria-pressed]="call() === c.id" (click)="call.set(c.id)">{{ c.label }}</button>
        }
      </div>
      <svg viewBox="0 0 360 250" class="stack" role="img" [attr.aria-label]="summary()">
        <rect x="110" y="8" width="140" height="34" rx="8" class="box app on" /><text x="180" y="30" class="t">Your program</text>
        <line x1="180" y1="42" x2="180" y2="62" class="ln on" />
        <rect x="110" y="62" width="140" height="34" rx="8" class="box" [class.on]="call() !== 'draw'" /><text x="180" y="84" class="t">Loader (vulkan-1.dll)</text>
        <line x1="180" y1="96" x2="180" y2="116" class="ln on" />
        <rect x="80" y="116" width="200" height="34" rx="8" class="box layer" [class.off]="!validation()" [class.on]="validation()" [class.hit]="validation() && call() === 'queues'" />
        <text x="180" y="138" class="t">{{ validation() ? 'VK_LAYER_KHRONOS_validation' : '(no layers enabled)' }}</text>
        <line x1="180" y1="150" [attr.x2]="second() ? 100 : 180" y2="190" class="ln on" />
        @if (second()) { <line x1="180" y1="150" x2="260" y2="190" class="ln" [class.on]="call() === 'enum'" /> }
        <rect [attr.x]="second() ? 30 : 110" y="190" width="140" height="44" rx="8" class="box drv on" />
        <text [attr.x]="second() ? 100 : 180" y="209" class="t">Intel driver (ICD)</text><text [attr.x]="second() ? 100 : 180" y="224" class="s">Iris Xe</text>
        @if (second()) {
          <rect x="190" y="190" width="140" height="44" rx="8" class="box drv" [class.on]="call() === 'enum'" />
          <text x="260" y="209" class="t">NVIDIA driver (ICD)</text><text x="260" y="224" class="s">a discrete GPU</text>
        }
      </svg>
      <div class="w-msg" [class.err]="call() === 'queues' && !validation()" [class.ok]="call() === 'queues' && validation()" [class.info]="call() !== 'queues'" aria-live="polite"><span>{{ summary() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .stack { width: 100%; max-width: 460px; display: block; margin: 0.3rem auto; }
    .box { fill: var(--bg-main); stroke: var(--border-color); stroke-width: 1.5; }
    .box.on { stroke: #8b5cf6; fill: rgba(139, 92, 246, 0.1); }
    .box.off { stroke-dasharray: 4 3; fill: none; }
    .box.hit { stroke: #10b981; fill: rgba(16, 185, 129, 0.15); stroke-width: 2.5; }
    .t { font-size: 10.5px; font-weight: 700; text-anchor: middle; fill: var(--text-main); }
    .s { font-size: 9px; text-anchor: middle; fill: var(--text-muted); }
    .ln { stroke: var(--border-color); stroke-width: 2; }
    .ln.on { stroke: #8b5cf6; }
  `]
})
export class VkLoaderWidget {
  readonly calls = CALLS;
  validation = signal(false);
  second = signal(false);
  call = signal<Call>('enum');

  summary = computed(() => {
    const v = this.validation(), two = this.second();
    switch (this.call()) {
      case 'enum': return two
        ? 'The loader asks every driver for its GPUs and returns one combined list: 2 physical devices.' + (v ? ' The validation layer checks the call on the way through.' : '')
        : 'The loader asks the only driver for its GPUs: 1 physical device.' + (v ? ' The validation layer checks the call on the way through.' : '');
      case 'queues': return v
        ? 'The validation layer catches it before the driver sees it, and prints an error: the queue count must not exceed the family’s queueCount.'
        : 'Nothing checks it. The call goes straight to the driver, and what happens is undefined: it may work here and crash on another PC.';
      default: return 'Commands for a device go to that device’s driver only, through any enabled layers. The loader steps out of the way, which is why layers you do not enable cost nothing.';
    }
  });
}
