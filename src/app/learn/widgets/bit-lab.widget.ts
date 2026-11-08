import { Component, computed, signal } from '@angular/core';

type Op = 'and' | 'or' | 'xor' | 'notA' | 'shl' | 'shr' | 'dropLow' | 'lowBit';
const OPS: { id: Op; label: string; code: string; usesB: boolean; note: string }[] = [
  { id: 'and', label: 'A & B', code: 'a & b', usesB: true, note: '1 only where both are 1. Use it to test or keep bits (a mask).' },
  { id: 'or', label: 'A | B', code: 'a | b', usesB: true, note: '1 where either is 1. Use it to switch bits on.' },
  { id: 'xor', label: 'A ^ B', code: 'a ^ b', usesB: true, note: '1 where they differ. Use it to flip bits; x ^ x is always 0.' },
  { id: 'notA', label: '~A', code: '~a', usesB: false, note: 'Flips every bit. (Shown in 8 bits; a real int has 32, so ~a is negative.)' },
  { id: 'shl', label: 'A << 1', code: 'a << 1', usesB: false, note: 'Every bit moves one place left: the same as × 2. The top bit falls off.' },
  { id: 'shr', label: 'A >> 1', code: 'a >> 1', usesB: false, note: 'Every bit moves one place right: the same as ÷ 2, rounding down.' },
  { id: 'dropLow', label: 'A & (A − 1)', code: 'a & (a - 1)', usesB: false, note: 'Clears the lowest 1 bit. If the result is 0, A had exactly one 1 bit: a power of two.' },
  { id: 'lowBit', label: 'A & −A', code: 'a & -a', usesB: false, note: 'Keeps only the lowest 1 bit (used by Fenwick trees).' }
];
const BITS = [7, 6, 5, 4, 3, 2, 1, 0];

function apply(op: Op, a: number, b: number): number {
  switch (op) {
    case 'and': return a & b;
    case 'or': return a | b;
    case 'xor': return a ^ b;
    case 'notA': return ~a & 0xff;
    case 'shl': return (a << 1) & 0xff;
    case 'shr': return a >> 1;
    case 'dropLow': return a & (a - 1) & 0xff;
    case 'lowBit': return a & -a & 0xff;
  }
}

/** Click bits of two 8-bit numbers and watch the bitwise operators work column by column. */
@Component({
  selector: 'w-bit-lab',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Bit lab</h3></div>
      <p class="w-hint">Click any bit to flip it. Each column is a power of two; a number is the sum of the columns that are 1.</p>

      <div class="grid mono">
        <span class="lab"></span>
        @for (k of bits; track k) { <span class="pw">{{ pow(k) }}</span> }
        <span class="lab">dec</span><span class="lab">hex</span>

        <span class="lab name">A</span>
        @for (k of bits; track k) { <button type="button" class="bit" [class.one]="bit(a(), k)" (click)="a.set(flip(a(), k))" [attr.aria-label]="'A bit ' + k + ' is ' + bit(a(), k)">{{ bit(a(), k) }}</button> }
        <span class="num">{{ a() }}</span><span class="num">{{ hex(a()) }}</span>

        <span class="lab name" [class.dim]="!op().usesB">B</span>
        @for (k of bits; track k) { <button type="button" class="bit" [class.dim]="!op().usesB" [class.one]="bit(b(), k)" (click)="b.set(flip(b(), k))" [attr.aria-label]="'B bit ' + k + ' is ' + bit(b(), k)">{{ bit(b(), k) }}</button> }
        <span class="num" [class.dim]="!op().usesB">{{ b() }}</span><span class="num" [class.dim]="!op().usesB">{{ hex(b()) }}</span>

        <span class="lab name res">=</span>
        @for (k of bits; track k) { <span class="bit out" [class.one]="bit(result(), k)">{{ bit(result(), k) }}</span> }
        <span class="num res">{{ result() }}</span><span class="num res">{{ hex(result()) }}</span>
      </div>

      <div class="w-controls mt-2" role="group" aria-label="Operator">
        @for (o of ops; track o.id) { <button type="button" class="w-btn mono" [class.on]="opId() === o.id" (click)="opId.set(o.id)" [attr.aria-pressed]="opId() === o.id">{{ o.label }}</button> }
      </div>
      <div class="w-msg info" aria-live="polite"><span><span class="mono">{{ op().code }}</span> → {{ result() }}. {{ op().note }}</span></div>
      <div class="small mt-2">
        A has <b>{{ popcount() }}</b> one-bit{{ popcount() === 1 ? '' : 's' }} (<span class="mono">BitOperations.PopCount</span>) ·
        power of two: <b [class.w-ok]="isPow2()" [class.w-err]="!isPow2()">{{ isPow2() ? 'yes' : 'no' }}</b> ·
        even: <b>{{ bit(a(), 0) === 0 ? 'yes' : 'no' }}</b>&nbsp;<span class="text-muted">(a &amp; 1) == 0</span>
      </div>
      <div class="w-controls mt-2">
        <button type="button" class="w-btn" (click)="a.set(0); b.set(0)">Clear</button>
        <button type="button" class="w-btn" (click)="a.set(12); b.set(10)">A = 12, B = 10</button>
        <button type="button" class="w-btn" (click)="a.set(64)">A = 64</button>
        <button type="button" class="w-btn" (click)="a.set(255)">A = 255</button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .grid { display: grid; grid-template-columns: 1.6rem repeat(8, minmax(0, 1fr)) 2.4rem 2.2rem; gap: 4px; align-items: center; max-width: 520px; }
    .lab { font-size: 0.68rem; color: var(--text-muted); text-align: center; }
    .lab.name { font-size: 0.9rem; font-weight: 800; color: var(--text-main); }
    .pw { text-align: center; font-size: 0.62rem; color: var(--text-muted); }
    .bit { font: inherit; text-align: center; padding: 6px 0; border-radius: 7px; border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-muted); font-weight: 700; cursor: pointer; min-width: 0; transition: all 0.15s; }
    .bit.one { color: var(--text-main); border-color: rgba(139, 92, 246, 0.7); background: rgba(139, 92, 246, 0.25); }
    .bit.out { cursor: default; }
    .bit.out.one { border-color: #10b981; background: rgba(16, 185, 129, 0.3); }
    .num { text-align: right; font-weight: 700; font-size: 0.85rem; }
    .res { color: #059669; }
    .dim { opacity: 0.35; }
  `]
})
export class BitLabWidget {
  readonly bits = BITS;
  readonly ops = OPS;
  a = signal(12);
  b = signal(10);
  opId = signal<Op>('and');
  op = computed(() => OPS.find(o => o.id === this.opId())!);
  result = computed(() => apply(this.opId(), this.a(), this.b()));
  popcount = computed(() => BITS.filter(k => (this.a() >> k) & 1).length);
  isPow2 = computed(() => this.a() > 0 && (this.a() & (this.a() - 1)) === 0);
  bit(v: number, k: number) { return (v >> k) & 1; }
  flip(v: number, k: number) { return v ^ (1 << k); }
  pow(k: number) { return 1 << k; }
  hex(v: number) { return '0x' + v.toString(16).toUpperCase().padStart(2, '0'); }
}
