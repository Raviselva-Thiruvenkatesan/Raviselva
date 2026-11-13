import { Component, computed, signal } from '@angular/core';

interface Mistake { id: string; label: string; call: string; without: string; withLayer: string; syncOnly?: boolean }
const MISTAKES: Mistake[] = [
  { id: 'child', label: 'Destroy the device while a command pool is alive', call: 'vkDestroyDevice',
    without: 'Returns normally. The pool’s memory leaks; some drivers crash later.',
    withLayer: 'a CommandPool created from this device has not been destroyed.' },
  { id: 'pending', label: 'Re-record a command buffer the GPU is still running', call: 'vkBeginCommandBuffer',
    without: 'Usually returns Success. The GPU reads half-old, half-new commands: flickering, wrong frames or a lost device, at random.',
    withLayer: 'the command buffer is in the pending state (still in use by the GPU).' },
  { id: 'layout', label: 'Draw into an image still in the Undefined layout', call: 'vkQueueSubmit2',
    without: 'Often looks fine on a desktop GPU, then shows garbage or black on another vendor’s hardware.',
    withLayer: 'the image is in layout Undefined, but rendering expects ColorAttachmentOptimal.' },
  { id: 'feature', label: 'Use wireframe without enabling fillModeNonSolid', call: 'vkCreateGraphicsPipelines',
    without: 'Works on most desktop GPUs, fails or draws filled on some others.',
    withLayer: 'polygonMode is Line, but the fillModeNonSolid feature was not enabled.' },
  { id: 'race', label: 'Forget the barrier between a clear and a copy', call: 'vkCmdCopyImageToBuffer', syncOnly: true,
    without: 'Works nearly always. Now and then the copy reads a half-cleared image: a bug that never shows when you look for it.',
    withLayer: 'Hazard (READ_AFTER_WRITE): the copy reads the image while the clear may still be writing it.' }
];

/** Pick a mistake and see what happens with and without the validation layer. */
@Component({
  selector: 'w-validation-catch',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Would anyone notice?</h3></div>
      <div class="list" role="group" aria-label="Mistakes">
        @for (m of mistakes; track m.id) {
          <button type="button" class="w-btn small item" [class.on]="pick() === m.id" [attr.aria-pressed]="pick() === m.id" (click)="pick.set(m.id)">{{ m.label }}</button>
        }
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn" [class.on]="layer()" [attr.aria-pressed]="layer()" (click)="layer.set(!layer())">
          <i class="bi" [class.bi-shield-check]="layer()" [class.bi-shield-x]="!layer()" aria-hidden="true"></i> Validation layer {{ layer() ? 'on' : 'off' }}
        </button>
        @if (layer() && current().syncOnly) {
          <button type="button" class="w-btn" [class.on]="sync()" [attr.aria-pressed]="sync()" (click)="sync.set(!sync())">Synchronisation checks {{ sync() ? 'on' : 'off' }}</button>
        }
      </div>
      <div class="console mono" aria-live="polite">
        <div class="muted">&gt; {{ current().call }}(...)</div>
        @if (caught()) { <div class="err">[ERROR] {{ current().withLayer }}</div> }
        @else { <div class="ok">returned Success</div> }
      </div>
      <div class="w-msg" [class.ok]="caught()" [class.err]="!caught()"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 0.6rem; }
    .item { text-align: left; }
    .console { background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 0.78rem; margin: 0.4rem 0; }
    .console .muted { color: #94a3b8; }
    .console .err { color: #fca5a5; }
    .console .ok { color: #86efac; }
  `]
})
export class ValidationCatchWidget {
  readonly mistakes = MISTAKES;
  pick = signal('child');
  layer = signal(false);
  sync = signal(false);
  current = computed(() => MISTAKES.find(m => m.id === this.pick())!);
  caught = computed(() => this.layer() && (!this.current().syncOnly || this.sync()));
  note = computed(() => {
    const m = this.current();
    if (this.caught()) return 'Caught at the call that broke the rule, with the objects involved. Messages are paraphrased here; the real ones start with the rule’s VUID.';
    if (this.layer() && m.syncOnly) return 'Still missed: synchronisation checking is a separate, slower part of the layer. Turn it on in vkconfig (or with a layer setting) when hunting barrier bugs.';
    return 'Without the layer: ' + m.without;
  });
}
