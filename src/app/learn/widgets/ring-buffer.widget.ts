import { Component, computed, signal } from '@angular/core';

const CAP = 8;

/** A queue stored in a fixed array that wraps around: head and tail chase each other round the ring. */
@Component({
  selector: 'w-ring-buffer',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A queue in a circular array</h3></div>
      <p class="w-hint">Enqueue writes at <span class="mono">tail</span>, Dequeue reads at <span class="mono">head</span>. Both move forward and wrap from slot 7 back to slot 0. Nothing is ever shifted.</p>

      <div class="ring-wrap">
        <svg viewBox="0 0 240 240" class="ring" role="img" [attr.aria-label]="'Circular buffer with ' + count() + ' of ' + CAP + ' slots used'">
          @for (s of slots(); track s.i) {
            <g>
              <path [attr.d]="s.d" class="seg" [class.used]="s.used" [class.head]="s.i === head() && count() > 0" [class.flash]="s.i === flash()" />
              <text [attr.x]="s.tx" [attr.y]="s.ty" text-anchor="middle" class="val">{{ s.used ? s.v : '' }}</text>
              <text [attr.x]="s.ix" [attr.y]="s.iy" text-anchor="middle" class="idx">{{ s.i }}</text>
            </g>
          }
          <text x="120" y="112" text-anchor="middle" class="mid">head = {{ head() }}</text>
          <text x="120" y="130" text-anchor="middle" class="mid">tail = {{ tail() }}</text>
          <text x="120" y="148" text-anchor="middle" class="mid">count = {{ count() }}</text>
        </svg>
        <div class="flat">
          <div class="w-label">The same array, laid flat</div>
          <div class="crow mono">
            @for (s of slots(); track s.i) {
              <div class="cell" [class.used]="s.used">
                <span class="tag">{{ s.i === head() && count() ? 'H' : '' }}{{ s.i === tail() ? 'T' : '' }}</span>
                <b>{{ s.used ? s.v : '·' }}</b><small>[{{ s.i }}]</small>
              </div>
            }
          </div>
          <div class="w-label mt-2">Queue order (front → back)</div>
          <div class="mono small">{{ order().length ? order().join(', ') : 'empty' }}</div>
        </div>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="enqueue()">Enqueue({{ nextVal() }})</button>
        <button type="button" class="w-btn" (click)="dequeue()">Dequeue()</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>
      <div class="w-msg" [class.err]="msg().err" [class.info]="!msg().err" aria-live="polite"><span>{{ msg().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .ring-wrap { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); align-items: center; }
    @media (min-width: 700px) { .ring-wrap { grid-template-columns: 220px minmax(0, 1fr); } }
    .ring-wrap > * { min-width: 0; }
    .ring { width: 100%; max-width: 230px; margin: 0 auto; display: block; }
    .seg { fill: var(--bg-main); stroke: rgba(139, 92, 246, 0.45); stroke-width: 1.5; transition: fill 0.25s; }
    .seg.used { fill: rgba(139, 92, 246, 0.28); }
    .seg.head { stroke: #f59e0b; stroke-width: 3; }
    .seg.flash { fill: rgba(16, 185, 129, 0.4); }
    .val { font-size: 14px; font-weight: 700; fill: var(--text-main); }
    .idx { font-size: 9px; fill: var(--text-muted); }
    .mid { font-size: 11px; fill: var(--text-muted); font-family: Consolas, monospace; }
    .crow { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 3px; }
    .cell { display: flex; flex-direction: column; align-items: center; border: 1.5px dashed var(--border-color); border-radius: 7px; padding: 2px 0; background: var(--bg-main); min-width: 0; }
    .cell.used { border-style: solid; border-color: rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.12); }
    .cell .tag { font-size: 0.62rem; color: #d97706; font-weight: 700; min-height: 0.9em; }
    .cell small { font-size: 0.62rem; color: var(--text-muted); }
  `]
})
export class RingBufferWidget {
  readonly CAP = CAP;
  buf = signal<(number | null)[]>(Array(CAP).fill(null));
  head = signal(0);
  tail = signal(0);
  count = signal(0);
  nextVal = signal(1);
  flash = signal(-1);
  msg = signal({ text: 'Empty queue: head and tail both start at 0.', err: false });

  slots = computed(() => {
    const b = this.buf(), h = this.head(), c = this.count();
    return b.map((v, i) => {
      const a0 = (i / CAP) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / CAP) * 2 * Math.PI - Math.PI / 2;
      const am = (a0 + a1) / 2;
      const pt = (r: number, a: number) => `${(120 + r * Math.cos(a)).toFixed(1)},${(120 + r * Math.sin(a)).toFixed(1)}`;
      const d = `M${pt(110, a0)} A110,110 0 0 1 ${pt(110, a1)} L${pt(62, a1)} A62,62 0 0 0 ${pt(62, a0)} Z`;
      const used = ((i - h + CAP) % CAP) < c;
      return { i, v, used, d, tx: 120 + 94 * Math.cos(am), ty: 125 + 94 * Math.sin(am), ix: 120 + 72 * Math.cos(am), iy: 123 + 72 * Math.sin(am) };
    });
  });

  order = computed(() => Array.from({ length: this.count() }, (_, k) => this.buf()[(this.head() + k) % CAP]));

  enqueue() {
    if (this.count() === CAP) return this.msg.set({ text: 'The buffer is full (count == capacity). A fixed ring buffer rejects the item; .NET’s Queue<T> instead allocates a bigger array and copies the items over in order.', err: true });
    const t = this.tail(), v = this.nextVal();
    this.buf.update(b => b.map((x, i) => (i === t ? v : x)));
    this.tail.set((t + 1) % CAP);
    this.count.update(c => c + 1);
    this.nextVal.update(n => n + 1);
    this.flash.set(t);
    this.msg.set({ text: t === CAP - 1
      ? `Wrote ${v} into slot ${t}. tail = (${t} + 1) % ${CAP} = 0: it wrapped round to the start. O(1).`
      : `Wrote ${v} into slot ${t}, then tail moved to ${(t + 1) % CAP}. O(1).`, err: false });
  }

  dequeue() {
    if (!this.count()) return this.msg.set({ text: 'The queue is empty. Queue<T>.Dequeue() would throw InvalidOperationException; use TryDequeue to avoid that.', err: true });
    const h = this.head(), v = this.buf()[h];
    this.buf.update(b => b.map((x, i) => (i === h ? null : x)));
    this.head.set((h + 1) % CAP);
    this.count.update(c => c - 1);
    this.flash.set(-1);
    this.msg.set({ text: `Took ${v} from slot ${h} (the oldest item). head moved to ${(h + 1) % CAP}. No other item moved: O(1).`, err: false });
  }

  reset() {
    this.buf.set(Array(CAP).fill(null));
    this.head.set(0); this.tail.set(0); this.count.set(0); this.nextVal.set(1); this.flash.set(-1);
    this.msg.set({ text: 'Reset.', err: false });
  }
}
