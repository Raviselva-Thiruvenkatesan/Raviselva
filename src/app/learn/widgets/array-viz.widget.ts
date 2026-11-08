import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** An int array drawn as numbered slots: read, write, go out of range, and loop through it. */
@Component({
  selector: 'w-array-viz',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>An array is a row of numbered slots</h3></div>
      <p class="w-hint">Read or change a slot by its index, try an index that doesn't exist, or loop through all of them.</p>

      <div class="decl mono">int[] scores = new int[] {{ '{' }} {{ values().join(', ') }} {{ '}' }};</div>

      <div class="slots" aria-hidden="true">
        @for (v of values(); track $index; let i = $index) {
          <div class="slot" [class.hl]="hl() === i" [class.done]="visited().includes(i)">
            <span class="v mono">{{ v }}</span>
            <span class="i mono">[{{ i }}]</span>
          </div>
        }
      </div>
      <p class="small text-muted mt-1">scores.Length = {{ values().length }} · first index 0 · last index {{ values().length - 1 }}</p>

      <div class="w-controls">
        <label class="w-field">index <input class="mono" type="number" style="width:5rem" [ngModel]="idx()" (ngModelChange)="idx.set(+$event || 0)"></label>
        <button type="button" class="w-btn" (click)="read()">Read scores[{{ idx() }}]</button>
        <label class="w-field">new value <input class="mono" type="number" style="width:5rem" [ngModel]="newVal()" (ngModelChange)="newVal.set(+$event || 0)"></label>
        <button type="button" class="w-btn" (click)="write()">scores[{{ idx() }}] = {{ newVal() }}</button>
        <button type="button" class="w-btn primary" (click)="loop()" [disabled]="looping()"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> foreach: total</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>

      <div class="w-msg" [class.err]="msg().err" [class.ok]="!msg().err" aria-live="polite">
        <code class="mono">{{ msg().code }}</code><span>{{ msg().text }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .decl { font-size: 0.92rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; overflow-x: auto; white-space: nowrap; margin-bottom: 1rem; }
    .slots { display: flex; flex-wrap: wrap; gap: 0; }
    .slot { display: flex; flex-direction: column; align-items: center; transition: transform 0.25s; }
    .slot .v {
      width: 62px; height: 52px; display: grid; place-items: center; font-size: 1.15rem; font-weight: 700;
      border: 2px solid rgba(139, 92, 246, 0.45); margin-left: -2px; background: var(--bg-main); transition: all 0.25s;
    }
    .slot:first-child .v { border-radius: 10px 0 0 10px; margin-left: 0; }
    .slot:last-child .v { border-radius: 0 10px 10px 0; }
    .slot .i { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }
    .slot.done .v { background: rgba(16, 185, 129, 0.12); }
    .slot.hl { transform: translateY(-5px); }
    .slot.hl .v { background: rgba(139, 92, 246, 0.2); border-color: var(--purple); color: var(--purple); position: relative; z-index: 1; }
    .slot.hl .i { color: var(--purple); font-weight: 700; }
    .w-msg { flex-wrap: wrap; }
    .w-msg code { font-weight: 700; color: var(--text-main); }
  `]
})
export class ArrayVizWidget {
  private readonly start = [45, 80, 62, 90, 73];
  values = signal([...this.start]);
  idx = signal(2);
  newVal = signal(100);
  hl = signal<number>(-1);
  visited = signal<number[]>([]);
  looping = signal(false);
  msg = signal<{ code: string; text: string; err?: boolean }>({ code: 'scores[0]', text: 'is 45: the first element is at index 0, not 1.' });
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  private inRange = computed(() => this.idx() >= 0 && this.idx() < this.values().length);

  read() {
    this.stopLoop();
    const i = this.idx();
    if (!this.inRange()) return this.outOfRange(`scores[${i}]`);
    this.hl.set(i);
    this.msg.set({ code: `scores[${i}]`, text: `is ${this.values()[i]}.` });
  }

  write() {
    this.stopLoop();
    const i = this.idx();
    if (!this.inRange()) return this.outOfRange(`scores[${i}] = ${this.newVal()}`);
    this.values.update(v => v.map((x, j) => (j === i ? this.newVal() : x)));
    this.hl.set(i);
    this.msg.set({ code: `scores[${i}] = ${this.newVal()};`, text: 'replaced the value in that slot. The array size never changes.' });
  }

  loop() {
    this.stopLoop();
    this.looping.set(true);
    let k = 0, total = 0;
    const tick = () => {
      if (k >= this.values().length) {
        this.hl.set(-1);
        this.looping.set(false);
        this.msg.set({ code: 'total', text: `= ${total}. foreach visited all ${this.values().length} elements in order, average = ${(total / this.values().length).toFixed(1)}.` });
        return;
      }
      total += this.values()[k];
      this.hl.set(k);
      this.visited.update(v => [...v, k]);
      this.msg.set({ code: `total += ${this.values()[k]}`, text: `→ total is ${total}` });
      k++;
      this.timer = setTimeout(tick, 700);
    };
    tick();
  }

  reset() {
    this.stopLoop();
    this.values.set([...this.start]);
    this.hl.set(-1);
    this.msg.set({ code: 'scores', text: 'reset to the original values.' });
  }

  private outOfRange(code: string) {
    this.hl.set(-1);
    this.msg.set({ code, text: `throws IndexOutOfRangeException: valid indexes are 0 to ${this.values().length - 1}.`, err: true });
  }

  private stopLoop() {
    clearTimeout(this.timer);
    this.looping.set(false);
    this.visited.set([]);
  }
}
