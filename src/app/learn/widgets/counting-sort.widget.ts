import { Component, computed, signal } from '@angular/core';

const INPUT = [4, 1, 3, 4, 0, 2, 1, 4, 3, 1];
const K = 5; // values 0..4
const RADIX_INPUT = [170, 45, 75, 90, 802, 24, 2, 66];

interface Frame { phase: 'count' | 'prefix' | 'place' | 'done'; read: number; counts: number[]; out: (number | null)[]; say: string; hlCount: number; hlOut: number }

function trace(a: number[]): Frame[] {
  const f: Frame[] = [];
  const counts = Array(K).fill(0);
  const out: (number | null)[] = Array(a.length).fill(null);
  f.push({ phase: 'count', read: -1, counts: [...counts], out: [...out], hlCount: -1, hlOut: -1, say: `Values are small whole numbers 0..${K - 1}. Make one counter per possible value.` });
  a.forEach((v, i) => {
    counts[v]++;
    f.push({ phase: 'count', read: i, counts: [...counts], out: [...out], hlCount: v, hlOut: -1, say: `Read ${v}: count[${v}]++ → ${counts[v]}.` });
  });
  for (let v = 1; v < K; v++) {
    counts[v] += counts[v - 1];
    f.push({ phase: 'prefix', read: -1, counts: [...counts], out: [...out], hlCount: v, hlOut: -1, say: `Running total: count[${v}] = ${counts[v]}, so values ≤ ${v} fill the first ${counts[v]} slots.` });
  }
  for (let i = a.length - 1; i >= 0; i--) {
    const v = a[i];
    counts[v]--;
    out[counts[v]] = v;
    f.push({ phase: 'place', read: i, counts: [...counts], out: [...out], hlCount: v, hlOut: counts[v], say: `Read a[${i}] = ${v} (walking right to left keeps equal values in their original order). count[${v}]-- → put it at index ${counts[v]}.` });
  }
  f.push({ phase: 'done', read: -1, counts: [...counts], out: [...out], hlCount: -1, hlOut: -1, say: `Sorted without a single comparison: one pass to count, one over the ${K} counters, one to place. O(n + k).` });
  return f;
}

/** LSD radix sort: stable passes on the ones, tens and hundreds digit. */
function radixPasses(a: number[]) {
  const passes: { digit: string; values: number[]; pos: number }[] = [{ digit: 'input', values: [...a], pos: -1 }];
  let cur = [...a];
  for (const [p, name, pos] of [[1, 'ones', 2], [10, 'tens', 1], [100, 'hundreds', 0]] as const) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    for (const v of cur) buckets[Math.floor(v / p) % 10].push(v);
    cur = buckets.flat();
    passes.push({ digit: `by ${name}`, values: cur, pos });
  }
  return passes;
}

/** Counting sort step by step, plus the passes of a radix sort. */
@Component({
  selector: 'w-counting-sort',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Sorting by counting</h3></div>
      <p class="w-hint">No comparisons at all: count how often each value appears, turn the counts into positions, then place every item.</p>

      <div class="w-label">Input</div>
      <div class="crow mono">@for (v of input; track $index; let i = $index) { <span class="c" [class.hl]="i === f().read">{{ v }}</span> }</div>

      <div class="w-label mt-2">{{ f().phase === 'count' ? 'count[value]' : 'count[value] (running total)' }}</div>
      <div class="crow mono">
        @for (c of f().counts; track $index; let v = $index) {
          <span class="c cnt" [class.hl]="v === f().hlCount"><small>{{ v }}</small>{{ c }}</span>
        }
      </div>

      <div class="w-label mt-2">Output</div>
      <div class="crow mono">@for (v of f().out; track $index; let i = $index) { <span class="c" [class.new]="i === f().hlOut" [class.empty]="v === null">{{ v ?? '·' }}</span> }</div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="idx() >= frames.length - 1">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames.length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small text-muted">Phase: {{ f().phase }}</span>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ f().say }}</span></div>

      <div class="w-label mt-3">Radix sort: a stable pass per digit, starting from the ones</div>
      <div class="radix mono">
        @for (p of radix; track p.digit; let pi = $index) {
          <div class="pass" [class.last]="pi === radix.length - 1"><span class="d">{{ p.digit }}</span>
            @for (v of p.values; track $index) {
              <span class="rv">@for (ch of pad(v); track $index; let ci = $index) {<b [class.dg]="ci === p.pos" [class.lead]="isLead(v, ci)">{{ ch }}</b>}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .crow { display: flex; flex-wrap: wrap; gap: 4px; }
    .c { min-width: 2rem; text-align: center; padding: 3px 6px; border-radius: 7px; border: 1.5px solid rgba(139, 92, 246, 0.45); background: var(--bg-main); font-weight: 700; transition: all 0.2s; display: inline-flex; flex-direction: column; align-items: center; }
    .c small { font-size: 0.6rem; color: var(--text-muted); font-weight: 600; }
    .c.hl { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); }
    .c.new { border-color: #10b981; background: rgba(16, 185, 129, 0.3); }
    .c.empty { border-style: dashed; color: var(--text-muted); font-weight: 400; }
    .radix { display: grid; gap: 4px; }
    .pass { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .pass .d { width: 6.3rem; font-size: 0.72rem; color: var(--text-muted); }
    .rv { padding: 2px 6px; border-radius: 6px; border: 1.5px solid rgba(139, 92, 246, 0.4); background: var(--bg-main); font-size: 0.82rem; }
    .rv b { font-weight: 500; }
    .rv b.lead { color: var(--text-muted); opacity: 0.45; }
    .rv b.dg { color: #d97706; font-weight: 800; opacity: 1; }
    .pass.last .rv { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
  `]
})
export class CountingSortWidget {
  readonly input = INPUT;
  readonly frames = trace(INPUT);
  readonly radix = radixPasses(RADIX_INPUT);
  idx = signal(0);
  f = computed(() => this.frames[Math.min(this.idx(), this.frames.length - 1)]);

  /** Show every number with 3 digits so the digit being sorted on lines up. */
  pad(v: number) { return [...String(v).padStart(3, '0')]; }
  isLead(v: number, ci: number) { return ci < 3 - String(v).length; }
}
