import { Component, computed, signal } from '@angular/core';

interface Cell { addr: number; label: string; value: number; owned: boolean }

const BASE = 0x1000;

/** Move a pointer through memory and write through it, then compare with safe array indexing. */
@Component({
  selector: 'w-pointer-memory',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Pointers walk through memory</h3></div>
      <p class="w-hint"><span class="mono">int[] arr = {{ '{' }} 10, 20, 30, 40 {{ '}' }};</span> sits in memory right before another variable, <span class="mono">limit</span>. Each <span class="mono">int</span> is 4 bytes.</p>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="unsafe()" (click)="setMode(true)" [attr.aria-pressed]="unsafe()">unsafe: int* p</button>
        <button type="button" class="w-btn" [class.on]="!unsafe()" (click)="setMode(false)" [attr.aria-pressed]="!unsafe()">safe: arr[i]</button>
      </div>
      <div class="w-controls">
        <button type="button" class="w-btn mono" (click)="move(-1)" [disabled]="idx() <= -1">{{ unsafe() ? 'p--' : 'i--' }}</button>
        <button type="button" class="w-btn mono" (click)="move(1)" [disabled]="idx() >= 5">{{ unsafe() ? 'p++' : 'i++' }}</button>
        <button type="button" class="w-btn primary mono" (click)="write()">{{ unsafe() ? '*p = 7' : 'arr[i] = 7' }}</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>

      <div class="mem" aria-hidden="true">
        @for (c of cells(); track c.addr; let k = $index) {
          <div class="cell" [class.here]="k - 1 === idx()" [class.other]="c.label === 'limit'" [class.foreign]="!c.owned" [class.hit]="hit() === k - 1">
            <span class="ptr mono">{{ k - 1 === idx() ? (unsafe() ? 'p ▼' : 'i ▼') : '' }}</span>
            <span class="v mono">{{ c.owned ? c.value : '??' }}</span>
            <span class="lbl mono">{{ c.label }}</span>
            <span class="ad mono">0x{{ c.addr.toString(16).toUpperCase() }}</span>
          </div>
        }
      </div>
      <div class="code mono">{{ status() }}</div>
      <div class="w-msg" [class.err]="msgKind() === 'err'" [class.ok]="msgKind() === 'ok'" [class.info]="msgKind() === 'info'" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .mem { display: flex; flex-wrap: wrap; gap: 4px; }
    .cell { width: 64px; display: flex; flex-direction: column; align-items: center; }
    .ptr { height: 16px; font-size: 0.72rem; color: var(--purple); font-weight: 700; }
    .v { width: 64px; height: 40px; display: grid; place-items: center; font-weight: 700; border-radius: 8px; border: 1.5px solid #0ea5e9; background: rgba(14, 165, 233, 0.12); transition: all 0.2s; }
    .other .v { border-color: #10b981; background: rgba(16, 185, 129, 0.12); }
    .foreign .v { border-style: dashed; border-color: var(--border-color); background: transparent; color: var(--text-muted); }
    .here .v { box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.45); }
    .hit .v { border-color: #f59e0b; background: rgba(245, 158, 11, 0.3); }
    .lbl { font-size: 0.68rem; }
    .ad { font-size: 0.62rem; color: var(--text-muted); }
    .code { margin-top: 0.7rem; padding: 0.5rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; }
  `]
})
export class PointerMemoryWidget {
  private readonly initial = [10, 20, 30, 40, 99];
  values = signal([...this.initial]);
  unsafe = signal(true);
  /** Index relative to arr[0]: -1 is before the array, 4 is `limit`, 5 is past everything. */
  idx = signal(0);
  hit = signal<number | null>(null);
  last = signal<'none' | 'ok' | 'overrun' | 'crash' | 'ioor'>('none');

  cells = computed<Cell[]>(() => {
    const v = this.values();
    const out: Cell[] = [{ addr: BASE - 4, label: '(other)', value: 0, owned: false }];
    for (let i = 0; i < 4; i++) out.push({ addr: BASE + i * 4, label: `arr[${i}]`, value: v[i], owned: true });
    out.push({ addr: BASE + 16, label: 'limit', value: v[4], owned: true });
    out.push({ addr: BASE + 20, label: '(other)', value: 0, owned: false });
    return out;
  });

  setMode(u: boolean) { this.unsafe.set(u); this.reset(); }
  move(d: number) { this.idx.update(i => Math.max(-1, Math.min(5, i + d))); this.hit.set(null); this.last.set('none'); }

  reset() {
    this.values.set([...this.initial]);
    this.idx.set(0);
    this.hit.set(null);
    this.last.set('none');
  }

  write() {
    const i = this.idx();
    if (!this.unsafe() && (i < 0 || i > 3)) { this.last.set('ioor'); this.hit.set(null); return; }
    if (i < 0 || i > 4) { this.last.set('crash'); this.hit.set(null); return; }
    this.values.update(v => v.map((x, k) => (k === i ? 7 : x)));
    this.hit.set(i);
    this.last.set(i === 4 ? 'overrun' : 'ok');
  }

  status = computed(() => {
    const i = this.idx();
    const addr = '0x' + (BASE + i * 4).toString(16).toUpperCase();
    const val = i >= 0 && i <= 4 ? String(this.values()[i]) : '??';
    return this.unsafe()
      ? `p = ${addr}   *p = ${val}   // p = arr + ${i}  (${i * 4} bytes after arr[0])`
      : `i = ${i}   arr[i] ${i >= 0 && i <= 3 ? '= ' + val : '→ out of range (arr.Length is 4)'}`;
  });

  msgKind = computed(() => {
    const l = this.last();
    return l === 'ok' ? 'ok' : l === 'none' ? 'info' : 'err';
  });

  msg = computed(() => {
    switch (this.last()) {
      case 'ok': return `Wrote 7 at ${this.unsafe() ? 'address 0x' + (BASE + this.idx() * 4).toString(16).toUpperCase() : 'arr[' + this.idx() + ']'}. Inside the array, both styles do the same thing.`;
      case 'overrun': return 'Buffer overrun! *p = 7 silently overwrote limit (99 → 7). No exception, no warning. The bug shows up later, somewhere else. This is exactly why C# checks array bounds and keeps pointers behind the unsafe keyword.';
      case 'crash': return 'p points at memory this program doesn’t own. Writing here may corrupt the runtime or crash the whole process with an AccessViolationException, which you can’t reliably catch.';
      case 'ioor': return 'IndexOutOfRangeException: the safe array checked the index and refused. limit is untouched, and the error points at the exact line.';
      default: return this.unsafe()
        ? 'p++ moves the pointer by sizeof(int) = 4 bytes, not by 1. Nothing stops it from walking past the end of the array.'
        : 'Safe indexing: every arr[i] is checked against arr.Length.';
    }
  });
}
