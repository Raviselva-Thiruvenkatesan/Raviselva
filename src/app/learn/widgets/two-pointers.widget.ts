import { Component, computed, signal } from '@angular/core';

type Mode = 'pair' | 'dedupe';
interface Frame { a: number[]; p: number; q: number; say: string; hit: number[]; keep: number; done: boolean; ok: boolean }

const SORTED = [1, 3, 4, 6, 8, 9, 11, 14];
const DUPES = [2, 2, 3, 3, 3, 5, 8, 8, 9];
const TARGETS = [13, 20, 21];

/** Opposite ends: move the pointer that brings the sum closer to the target. */
function pairTrace(t: number): Frame[] {
  const a = SORTED, f: Frame[] = [];
  let l = 0, r = a.length - 1;
  f.push({ a, p: l, q: r, hit: [], keep: -1, done: false, ok: false, say: `Sorted list, target ${t}. Start with left at the smallest value and right at the largest.` });
  while (l < r) {
    const s = a[l] + a[r];
    if (s === t) {
      f.push({ a, p: l, q: r, hit: [l, r], keep: -1, done: true, ok: true, say: `${a[l]} + ${a[r]} = ${t}. Found at indices (${l}, ${r}) after ${f.length} checks.` });
      return f;
    }
    if (s < t) {
      f.push({ a, p: l, q: r, hit: [], keep: -1, done: false, ok: false, say: `${a[l]} + ${a[r]} = ${s} < ${t}: too small. ${a[r]} is already the biggest partner, so ${a[l]} can never work. Move left →.` });
      l++;
    } else {
      f.push({ a, p: l, q: r, hit: [], keep: -1, done: false, ok: false, say: `${a[l]} + ${a[r]} = ${s} > ${t}: too big. ${a[l]} is already the smallest partner, so ${a[r]} can never work. Move right ←.` });
      r--;
    }
  }
  f.push({ a, p: l, q: r, hit: [], keep: -1, done: true, ok: false, say: `The pointers met: no pair adds up to ${t}. At most n − 1 = ${a.length - 1} checks, never n².` });
  return f;
}

/** Same direction: "read" scans every item, "write" marks where the next unique value goes. */
function dedupeTrace(): Frame[] {
  const a = [...DUPES], f: Frame[] = [];
  let w = 1;
  f.push({ a: [...a], p: w, q: 1, hit: [], keep: 1, done: false, ok: false, say: 'Sorted list with repeats. The first value is always kept. write = 1 (where the next new value goes), read scans from index 1.' });
  for (let r = 1; r < a.length; r++) {
    if (a[r] !== a[w - 1]) {
      a[w] = a[r];
      f.push({ a: [...a], p: w, q: r, hit: [w], keep: w + 1, done: false, ok: false, say: `${a[r]} differs from the last kept value ${a[w - 1]}: copy it to index ${w}, then write moves to ${w + 1}.` });
      w++;
    } else {
      f.push({ a: [...a], p: w, q: r, hit: [], keep: w, done: false, ok: false, say: `${a[r]} equals the last kept value: a repeat. Skip it; write stays at ${w}.` });
    }
  }
  f.push({ a: [...a], p: w, q: -1, hit: [], keep: w, done: true, ok: true, say: `Done in one pass, in place, no extra array. The first ${w} slots hold the unique values; the rest is leftover and is ignored.` });
  return f;
}

/** Two classic two-pointer patterns, step by step. */
@Component({
  selector: 'w-two-pointers',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Two pointers</h3></div>
      <div class="w-controls" role="group" aria-label="Pattern">
        <button type="button" class="w-btn" [class.on]="mode() === 'pair'" (click)="setMode('pair')" [attr.aria-pressed]="mode() === 'pair'">Opposite ends: pair with a sum</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'dedupe'" (click)="setMode('dedupe')" [attr.aria-pressed]="mode() === 'dedupe'">Same direction: remove repeats</button>
      </div>
      @if (mode() === 'pair') {
        <div class="w-controls" role="group" aria-label="Target">
          <span class="w-label m-0">Target</span>
          @for (t of targets; track t) { <button type="button" class="w-btn" [class.on]="target() === t" (click)="setTarget(t)" [attr.aria-pressed]="target() === t">{{ t }}</button> }
        </div>
      }

      <div class="cells mono" [style.grid-template-columns]="'repeat(' + f().a.length + ', minmax(0, 1fr))'">
        @for (v of f().a; track $index; let i = $index) {
          <div class="cell">
            <span class="c" [class.hit]="f().hit.includes(i)" [class.out]="isOut(i)" [class.kept]="mode() === 'dedupe' && i < f().keep && !f().hit.includes(i)">{{ v }}</span>
            <small>{{ i }}</small>
            <span class="ptr">
              @if (i === f().p && !(mode() === 'pair' && f().done && !f().ok)) { <b class="pp">{{ mode() === 'pair' ? 'L' : 'W' }}</b> }
              @if (i === f().q) { <b class="qq">R</b> }
            </span>
          </div>
        }
      </div>
      <p class="small text-muted mt-1 mb-0">{{ mode() === 'pair' ? 'L = left, R = right. Faded values have been ruled out.' : 'W = write position, R = read position. Green = kept unique values.' }}</p>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="f().done && f().ok" [class.err]="f().done && !f().ok" [class.info]="!f().done" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: grid; gap: 4px; }
    .cell { display: flex; flex-direction: column; align-items: center; min-width: 0; }
    .c { width: 100%; max-width: 2.6rem; text-align: center; padding: 4px 0; border-radius: 7px; border: 1.5px solid rgba(139, 92, 246, 0.45); background: var(--bg-main); font-weight: 700; transition: all 0.2s; }
    .c.out { opacity: 0.3; }
    .c.kept { border-color: rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.14); }
    .c.hit { border-color: #10b981; background: rgba(16, 185, 129, 0.35); }
    .cell small { font-size: 0.62rem; color: var(--text-muted); }
    .ptr { display: flex; gap: 2px; min-height: 1.3rem; }
    .ptr b { font-size: 0.7rem; padding: 0 4px; border-radius: 4px; color: #fff; }
    .pp { background: #0891b2; }
    .qq { background: #d97706; }
  `]
})
export class TwoPointersWidget {
  readonly targets = TARGETS;
  mode = signal<Mode>('pair');
  target = signal(13);
  idx = signal(0);
  frames = computed(() => (this.mode() === 'pair' ? pairTrace(this.target()) : dedupeTrace()));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);

  isOut(i: number) {
    const f = this.f();
    if (this.mode() === 'pair') return i < f.p || i > f.q;
    return f.done && i >= f.keep;
  }
  setMode(m: Mode) { this.mode.set(m); this.idx.set(0); }
  setTarget(t: number) { this.target.set(t); this.idx.set(0); }
}
