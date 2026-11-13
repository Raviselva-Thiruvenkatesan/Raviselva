import { Component, computed, signal } from '@angular/core';

const SLOTS = 12, IN_FLIGHT = 2;
const NAMES = ['Brick', 'Concrete', 'Timber', 'Glass', 'Steel', 'Tiles', 'Plaster', 'Grass', 'Marble', 'Roof felt', 'Carpet', 'Asphalt', 'Copper', 'Stone'];
const COLOURS = ['#b24a34', '#a0a09b', '#96693c', '#78b4d2', '#5a6473', '#c8c0b0', '#e6e0d2', '#5a9a46', '#d8d4cc', '#3c3c44', '#7a4a6a', '#454545', '#b87333', '#8a8378'];

interface Slot { texture: number | null; retiring: number | null }   // retiring: the frame whose completion frees it

/** A bindless texture array: add and remove textures, watch slots wait for frames in flight before reuse. */
@Component({
  selector: 'w-bindless-table',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One array, many textures</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn small" (click)="add()" [disabled]="!canAdd()"><i class="bi bi-plus-lg" aria-hidden="true"></i> Load a texture</button>
        <button type="button" class="w-btn small" (click)="remove()" [disabled]="selected() === null || slots()[selected()!].texture === null">Unload slot {{ selected() ?? '–' }}</button>
        <button type="button" class="w-btn small" (click)="nextFrame()">Next frame <span class="mono">({{ frame() }})</span></button>
      </div>
      <div class="grid" role="list" aria-label="Texture slots">
        @for (s of slots(); track $index; let i = $index) {
          <button type="button" role="listitem" class="slot" [class.sel]="selected() === i" [class.ret]="s.retiring !== null" [class.empty]="s.texture === null && s.retiring === null" (click)="selected.set(i)">
            <span class="idx mono">{{ i }}</span>
            @if (s.texture !== null) { <span class="sw" [style.background]="colours[s.texture]"></span><span class="tn">{{ names[s.texture] }}</span> }
            @else if (s.retiring !== null) { <span class="tn">waiting for frame {{ s.retiring }}</span> }
            @else { <span class="tn">empty</span> }
          </button>
        }
      </div>
      <p class="w-hint">Free slots: <span class="mono">[{{ free().join(', ') }}]</span> (the next load takes the last one freed). {{ inFlight }} frames in flight.</p>
      <div class="cmp">
        <div class="w-panel"><b>Bindless</b><br />1 descriptor set bind per frame; each draw pushes its slot number.</div>
        <div class="w-panel"><b>A set per material</b><br />{{ loaded() }} sets to create and up to {{ loaded() }} binds per frame, more when draws are not sorted.</div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 5px; margin: 0.4rem 0; }
    .slot { display: flex; align-items: center; gap: 5px; padding: 5px 6px; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); cursor: pointer; font-size: 0.74rem; text-align: left; min-height: 34px; }
    .slot.sel { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3); }
    .slot.ret { border-style: dashed; border-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
    .slot.empty { opacity: 0.6; }
    .idx { font-weight: 800; color: var(--text-muted); min-width: 1.2rem; }
    .sw { width: 14px; height: 14px; border-radius: 4px; flex: none; border: 1px solid rgba(0, 0, 0, 0.25); }
    .tn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cmp { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px; font-size: 0.8rem; }
  `]
})
export class BindlessTableWidget {
  readonly names = NAMES;
  readonly colours = COLOURS;
  readonly inFlight = IN_FLIGHT;
  slots = signal<Slot[]>(Array.from({ length: SLOTS }, (_, i): Slot => ({ texture: i < 4 ? i : null, retiring: null })));
  free = signal<number[]>([11, 10, 9, 8, 7, 6, 5, 4]);   // a stack: the end is taken first
  frame = signal(10);
  selected = signal<number | null>(2);
  private nextName = 4;
  private last = signal('Four textures are loaded into slots 0 to 3. Click a slot, then unload it, or load another texture.');

  loaded = computed(() => this.slots().filter(s => s.texture !== null).length);
  canAdd = computed(() => this.free().length > 0);

  add() {
    const free = [...this.free()], slot = free.pop()!;
    const t = this.nextName++ % NAMES.length;
    this.slots.update(s => s.map((x, i) => (i === slot ? { texture: t, retiring: null } : x)));
    this.free.set(free);
    this.selected.set(slot);
    this.last.set(`${NAMES[t]} written into slot ${slot} with one UpdateDescriptorSets call. Objects that use it push ${slot}; nothing else changes.`);
  }

  remove() {
    const i = this.selected()!, done = this.frame();
    this.slots.update(s => s.map((x, k) => (k === i ? { texture: null, retiring: done } : x)));
    this.last.set(`Slot ${i} retired in frame ${done}. Frames up to ${done} may still sample it, so it becomes free when frame ${done + IN_FLIGHT} begins.`);
  }

  nextFrame() {
    const f = this.frame() + 1, completed = f - IN_FLIGHT;
    const freed: number[] = [];
    this.slots.update(s => s.map((x, i) => {
      if (x.retiring !== null && x.retiring <= completed) { freed.push(i); return { texture: null, retiring: null }; }
      return x;
    }));
    this.free.update(list => [...list, ...freed]);
    this.frame.set(f);
    this.last.set(freed.length ? `Frame ${f} begins: frame ${completed} has finished, so slot${freed.length > 1 ? 's' : ''} ${freed.join(', ')} ${freed.length > 1 ? 'are' : 'is'} free again.` : `Frame ${f} begins. The set stays bound; nothing to free.`);
  }

  message = computed(() => this.last());
}
