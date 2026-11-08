import { Component, computed, signal } from '@angular/core';

const DATA = [7, 2, 11, 4, 9, 6, 3, 8];
const TARGETS = [10, 17, 30];
const NESTED = (DATA.length * (DATA.length - 1)) / 2;

interface Frame { i: number; seen: [number, number][]; say: string; pair: [number, number] | null; done: boolean }

function trace(t: number): Frame[] {
  const f: Frame[] = [];
  const seen = new Map<number, number>();
  f.push({ i: -1, seen: [], pair: null, done: false, say: `Goal: two items that add up to ${t}. Walk the list once. For each value, ask the dictionary for its partner ${t} − value; if it is not there, remember the value.` });
  for (let i = 0; i < DATA.length; i++) {
    const v = DATA[i], need = t - v;
    const j = seen.get(need);
    if (j !== undefined) {
      f.push({ i, seen: [...seen], pair: [j, i], done: true, say: `${v}: partner ${t} − ${v} = ${need}. The dictionary has ${need} at index ${j}! Pair found: indices (${j}, ${i}), ${v} + ${need} = ${t}, after looking at ${i + 1} items.` });
      return f;
    }
    seen.set(v, i);
    f.push({ i, seen: [...seen], pair: null, done: false, say: `${v}: partner ${need} is not in the dictionary (one O(1) lookup). Remember ${v} → index ${i}.` });
  }
  f.push({ i: -1, seen: [...seen], pair: null, done: true, say: `End of the list: no two items add up to ${t}. ${DATA.length} lookups, compared with ${NESTED} pair checks for two nested loops.` });
  return f;
}

/** Two-sum with a Dictionary: one pass, one lookup per item. */
@Component({
  selector: 'w-pair-finder',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Find a pair with a dictionary</h3></div>
      <p class="w-hint">Beam offcuts (m). Which two make exactly the target length? Instead of trying every pair, remember what you have seen.</p>
      <div class="w-controls" role="group" aria-label="Target">
        <span class="w-label m-0">Target</span>
        @for (t of targets; track t) { <button type="button" class="w-btn" [class.on]="target() === t" (click)="setTarget(t)" [attr.aria-pressed]="target() === t">{{ t }}</button> }
      </div>

      <div class="w-label">List</div>
      <div class="crow mono">
        @for (v of data; track $index; let i = $index) {
          <span class="c" [class.cur]="i === f().i && !f().pair" [class.pair]="f().pair?.includes(i)" [class.past]="i < f().i && !f().pair?.includes(i)"><small>[{{ i }}]</small>{{ v }}</span>
        }
      </div>
      <div class="w-label mt-2">Dictionary&lt;value, index&gt; (what we have seen)</div>
      <div class="crow mono">
        @for (e of f().seen; track e[0]) { <span class="d" [class.pair]="f().pair && e[1] === f().pair![0]">{{ e[0] }} → {{ e[1] }}</span> }
        @empty { <span class="small text-muted">empty</span> }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small">Items looked at <b>{{ f().i < 0 ? (f().done ? data.length : 0) : f().i + 1 }}</b> · Nested loops, worst case <b>{{ nested }}</b> pairs</span>
      </div>
      <div class="w-msg" [class.ok]="!!f().pair" [class.err]="f().done && !f().pair" [class.info]="!f().done" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .crow { display: flex; flex-wrap: wrap; gap: 4px; min-height: 2rem; align-items: center; }
    .c { min-width: 2.2rem; text-align: center; padding: 2px 6px; border-radius: 7px; border: 1.5px solid rgba(139, 92, 246, 0.45); background: var(--bg-main); font-weight: 700; display: inline-flex; flex-direction: column; align-items: center; transition: all 0.2s; }
    .c small { font-size: 0.6rem; color: var(--text-muted); font-weight: 600; }
    .c.past { opacity: 0.55; }
    .c.cur { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); }
    .c.pair, .d.pair { border-color: #10b981; background: rgba(16, 185, 129, 0.3); }
    .d { padding: 2px 8px; border-radius: 7px; border: 1.5px solid rgba(6, 182, 212, 0.5); background: rgba(6, 182, 212, 0.1); font-size: 0.82rem; font-weight: 700; }
  `]
})
export class PairFinderWidget {
  readonly data = DATA;
  readonly targets = TARGETS;
  readonly nested = NESTED;
  target = signal(10);
  idx = signal(0);
  frames = computed(() => trace(this.target()));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);
  setTarget(t: number) { this.target.set(t); this.idx.set(0); }
}
