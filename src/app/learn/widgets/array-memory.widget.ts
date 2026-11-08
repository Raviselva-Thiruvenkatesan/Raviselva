import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Elem = { name: string; size: number };
const TYPES: Elem[] = [{ name: 'byte', size: 1 }, { name: 'int', size: 4 }, { name: 'double', size: 8 }];
const BASE = 0x1000;
const CAP = 8;

/** An array as a block of memory: address arithmetic for reads, and the shifting cost of inserts and deletes. */
@Component({
  selector: 'w-array-memory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>An array is one block of memory</h3></div>
      <p class="w-hint">Click a slot to see how its address is calculated. Then insert or delete in the middle and count how many elements must move.</p>

      <div class="w-controls" role="group" aria-label="Element type">
        <span class="w-label m-0">Element type</span>
        @for (t of types; track t.name) {
          <button type="button" class="w-btn" [class.on]="type().name === t.name" (click)="type.set(t)" [attr.aria-pressed]="type().name === t.name">{{ t.name }} ({{ t.size }} B)</button>
        }
      </div>

      <div class="mem" role="list" aria-label="Array slots in memory">
        @for (v of slots(); track $index; let i = $index) {
          <button type="button" class="slot" role="listitem" [class.used]="i < len()" [class.sel]="i === sel()" [class.moved]="moved().includes(i)"
                  [class.new]="i === changed()" (click)="sel.set(i)" [attr.aria-label]="'Index ' + i + (i < len() ? ', value ' + v : ', unused')">
            <span class="addr mono">0x{{ addr(i).toString(16).toUpperCase() }}</span>
            <span class="val mono">{{ i < len() ? v : '·' }}</span>
            <span class="idx mono">[{{ i }}]</span>
          </button>
        }
      </div>

      <div class="w-panel mono small mt-2" aria-live="polite">
        address of a[{{ sel() }}] = start + {{ sel() }} × {{ type().size }} = 0x{{ BASE.toString(16).toUpperCase() }} + {{ sel() * type().size }} = <b>0x{{ addr(sel()).toString(16).toUpperCase() }}</b>
        <span class="text-muted"> · one multiplication, whatever the index: O(1)</span>
      </div>

      <div class="w-controls mt-2">
        <label class="w-field">index <input class="mono" type="number" min="0" style="width:4.5rem" [ngModel]="at()" (ngModelChange)="at.set(+$event || 0)" aria-label="Index"></label>
        <label class="w-field">value <input class="mono" type="number" style="width:4.5rem" [ngModel]="value()" (ngModelChange)="value.set(+$event || 0)" aria-label="Value"></label>
        <button type="button" class="w-btn primary" (click)="insert()">Insert at {{ at() }}</button>
        <button type="button" class="w-btn" (click)="remove()" [disabled]="len() === 0">Delete at {{ at() }}</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>
      <div class="w-msg" [class.err]="msg().err" [class.info]="!msg().err" aria-live="polite"><span>{{ msg().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .mem { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
    @media (min-width: 640px) { .mem { grid-template-columns: repeat(8, minmax(0, 1fr)); } }
    .slot { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; align-items: center; padding: 4px 2px;
      border: 1.5px dashed var(--border-color); border-radius: 8px; background: var(--bg-main); transition: all 0.25s; min-width: 0; }
    .slot:focus-visible { outline: 2px solid var(--purple); }
    .slot.used { border-style: solid; border-color: rgba(139, 92, 246, 0.45); }
    .slot.sel { background: rgba(139, 92, 246, 0.18); border-color: var(--purple); }
    .slot.moved { background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; }
    .slot.new { background: rgba(16, 185, 129, 0.2); border-color: #10b981; }
    .addr { font-size: 0.62rem; color: var(--text-muted); }
    .val { font-size: 1.05rem; font-weight: 700; }
    .idx { font-size: 0.7rem; color: var(--text-muted); }
  `]
})
export class ArrayMemoryWidget {
  readonly types = TYPES;
  readonly BASE = BASE;
  readonly CAP = CAP;
  private readonly start = [12, 45, 7, 88, 23, 0, 0, 0];
  type = signal<Elem>(TYPES[1]);
  slots = signal([...this.start]);
  len = signal(5);
  sel = signal(3);
  at = signal(1);
  value = signal(99);
  moved = signal<number[]>([]);
  changed = signal(-1);
  msg = signal({ text: 'Five ints in a block with room for eight. Every slot sits right next to the previous one.', err: false });

  addr(i: number) { return BASE + i * this.type().size; }

  insert() {
    const n = this.len(), i = this.at();
    if (n >= CAP) return this.bad('The block is full. An array can never grow: you must allocate a bigger block and copy everything across. That is exactly what List<T> does for you (next lesson).');
    if (i < 0 || i > n) return this.bad(`Index ${i} is out of range: you can insert at 0 to ${n}.`);
    const a = [...this.slots()];
    for (let k = n; k > i; k--) a[k] = a[k - 1];   // shift right, from the end
    a[i] = this.value();
    this.slots.set(a);
    this.len.set(n + 1);
    this.moved.set(range(i + 1, n + 1));
    this.changed.set(i);
    this.sel.set(i);
    const m = n - i;
    this.msg.set({ text: `Inserted at ${i}: ${m} element${m === 1 ? '' : 's'} had to move one slot right to make room. Inserting at the front moves all n: O(n).`, err: false });
  }

  remove() {
    const n = this.len(), i = this.at();
    if (i < 0 || i >= n) return this.bad(`Index ${i} is out of range: valid indexes are 0 to ${n - 1}.`);
    const a = [...this.slots()];
    for (let k = i; k < n - 1; k++) a[k] = a[k + 1];  // shift left to close the gap
    a[n - 1] = 0;
    this.slots.set(a);
    this.len.set(n - 1);
    this.moved.set(range(i, n - 1));
    this.changed.set(-1);
    const m = n - 1 - i;
    this.msg.set({ text: `Deleted index ${i}: ${m} element${m === 1 ? '' : 's'} moved one slot left to close the gap. Deleting the last element moves nothing: O(1).`, err: false });
  }

  reset() {
    this.slots.set([...this.start]);
    this.len.set(5);
    this.moved.set([]);
    this.changed.set(-1);
    this.msg.set({ text: 'Reset.', err: false });
  }

  private bad(text: string) {
    this.moved.set([]);
    this.changed.set(-1);
    this.msg.set({ text, err: true });
  }
}

function range(a: number, b: number) { return Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k); }
