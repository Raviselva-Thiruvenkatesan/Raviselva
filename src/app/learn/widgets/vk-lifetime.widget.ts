import { Component, computed, signal } from '@angular/core';

interface Obj { id: string; label: string; parent: string | null; usedByGpu?: boolean }
const OBJS: Obj[] = [
  { id: 'instance', label: 'Instance', parent: null },
  { id: 'device', label: 'Device', parent: 'instance' },
  { id: 'pool', label: 'Command pool', parent: 'device', usedByGpu: true },
  { id: 'buffer', label: 'Vertex buffer', parent: 'device', usedByGpu: true },
  { id: 'fence', label: 'Fence', parent: 'device', usedByGpu: true }
];

/** Destroy objects in any order and see which orders break Vulkan's rules. */
@Component({
  selector: 'w-vk-lifetime',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Shutting down</h3></div>
      <p class="w-hint">A frame was just submitted, so the GPU is still using the command pool, the buffer and the fence. Destroy everything without breaking a rule.</p>
      <div class="tree">
        @for (o of objs; track o.id) {
          <div class="row" [style.padding-left.rem]="depth(o) * 1.2">
            <button type="button" class="w-btn small" [disabled]="!alive().has(o.id)" (click)="destroy(o)">
              <i class="bi" [class.bi-trash]="alive().has(o.id)" [class.bi-check2]="!alive().has(o.id)" aria-hidden="true"></i> {{ alive().has(o.id) ? 'Destroy' : 'Destroyed' }}
            </button>
            <span class="name" [class.gone]="!alive().has(o.id)">{{ o.label }}</span>
            @if (o.usedByGpu && busy() && alive().has(o.id)) { <span class="busy">in use by the GPU</span> }
          </div>
        }
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn primary" [disabled]="!busy() || !alive().has('device')" (click)="waitIdle()">DeviceWaitIdle</button>
        <button type="button" class="w-btn" (click)="reset()"><i class="bi bi-arrow-counterclockwise" aria-hidden="true"></i> Start again</button>
        <span class="score">Rules broken: <b [class.bad]="errors() > 0">{{ errors() }}</b></span>
      </div>
      <div class="w-msg" [class.err]="lastErr()" [class.ok]="!lastErr() && done()" [class.info]="!lastErr() && !done()" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 9px; min-width: 6.4rem; }
    .tree { display: flex; flex-direction: column; gap: 5px; margin-bottom: 0.8rem; }
    .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .name { font-weight: 700; font-size: 0.88rem; }
    .name.gone { text-decoration: line-through; color: var(--text-muted); }
    .busy { font-size: 0.7rem; font-weight: 700; color: #d97706; border: 1px solid rgba(217, 119, 6, 0.4); border-radius: 999px; padding: 0 7px; }
    .score { font-size: 0.82rem; }
    .bad { color: #dc2626; }
  `]
})
export class VkLifetimeWidget {
  readonly objs = OBJS;
  alive = signal(new Set(OBJS.map(o => o.id)));
  busy = signal(true);
  errors = signal(0);
  msg = signal('Pick an object to destroy.');
  lastErr = signal(false);
  done = computed(() => this.alive().size === 0);

  depth(o: Obj): number { return o.parent ? 1 + this.depth(OBJS.find(p => p.id === o.parent)!) : 0; }

  destroy(o: Obj) {
    const alive = this.alive();
    const kids = OBJS.filter(c => c.parent === o.id && alive.has(c.id));
    let err = '';
    if (kids.length) err = `${o.label} still has ${kids.map(k => k.label.toLowerCase()).join(', ')} created from it. Children must be destroyed first; the validation layer reports every object left alive.`;
    else if (o.usedByGpu && this.busy()) err = `The GPU may still be using the ${o.label.toLowerCase()} for the frame in flight. Destroying it now is undefined: anything from wrong pixels to a lost device. Wait first.`;
    const next = new Set(alive); next.delete(o.id);
    this.alive.set(next);
    if (o.id === 'device') this.busy.set(false);
    this.lastErr.set(!!err);
    if (err) { this.errors.set(this.errors() + 1); this.msg.set(err); }
    else this.msg.set(next.size === 0
      ? (this.errors() ? `All destroyed, but ${this.errors()} rule(s) were broken. Try again: wait, then go from the bottom up.` : 'All destroyed in a valid order: wait for the GPU, then children before parents.')
      : `${o.label} destroyed.`);
  }
  waitIdle() { this.busy.set(false); this.lastErr.set(false); this.msg.set('DeviceWaitIdle returned: the GPU has finished all submitted work, so nothing is in use any more.'); }
  reset() { this.alive.set(new Set(OBJS.map(o => o.id))); this.busy.set(true); this.errors.set(0); this.lastErr.set(false); this.msg.set('Pick an object to destroy.'); }
}
