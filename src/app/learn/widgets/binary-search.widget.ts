import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const DATA = [3, 7, 11, 15, 18, 22, 27, 31, 36, 40, 44, 51, 57, 63, 70, 78];

interface Frame { lo: number; hi: number; mid: number; say: string; found?: number; done?: boolean }

function trace(a: number[], target: number): Frame[] {
  const out: Frame[] = [{ lo: 0, hi: a.length - 1, mid: -1, say: `Looking for ${target}. The whole array (index 0 to ${a.length - 1}) is still possible.` }];
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (a[mid] === target) {
      out.push({ lo, hi, mid, found: mid, done: true, say: `mid = ${mid}, a[${mid}] = ${a[mid]}. Found it!` });
      return out;
    }
    if (a[mid] < target) {
      out.push({ lo, hi, mid, say: `mid = ${mid}, a[${mid}] = ${a[mid]} < ${target}, so the target can only be on the right. lo = ${mid + 1}.` });
      lo = mid + 1;
    } else {
      out.push({ lo, hi, mid, say: `mid = ${mid}, a[${mid}] = ${a[mid]} > ${target}, so the target can only be on the left. hi = ${mid - 1}.` });
      hi = mid - 1;
    }
  }
  out.push({ lo, hi, mid: -1, done: true, say: `lo (${lo}) passed hi (${hi}): no positions left, so ${target} is not in the array. It would belong at index ${lo}.` });
  return out;
}

/** Step through binary search on a sorted array and compare its checks with linear search. */
@Component({
  selector: 'w-binary-search',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Binary search, step by step</h3></div>
      <p class="w-hint">Each check looks at the middle of the range that is still possible and throws away the half that cannot contain the target.</p>
      <div class="w-controls">
        <label class="w-field">target <input class="mono" type="number" style="width:5rem" [ngModel]="target()" (ngModelChange)="setTarget(+$event || 0)" aria-label="Target"></label>
        @for (t of quick; track t) { <button type="button" class="w-btn mono" [class.on]="target() === t" (click)="setTarget(t)">{{ t }}</button> }
      </div>

      <div class="cells" aria-hidden="true">
        @for (v of data; track $index; let i = $index) {
          <div class="cell" [class.out]="i < f().lo || i > f().hi" [class.mid]="i === f().mid" [class.found]="i === f().found">
            <span class="v mono">{{ v }}</span><span class="i mono">{{ i }}</span>
            <span class="tag mono">{{ i === f().lo && !f().done ? 'lo' : '' }}{{ i === f().hi && !f().done ? (i === f().lo ? '·hi' : 'hi') : '' }}</span>
          </div>
        }
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="!!f().done">Step</button>
        <button type="button" class="w-btn" (click)="run()" [disabled]="!!f().done">Run</button>
        <button type="button" class="w-btn" (click)="restart()">Restart</button>
        <span class="small">Checks: <b>{{ checks() }}</b> · linear search would need <b>{{ linear() }}</b></span>
      </div>
      <div class="w-msg" [class.ok]="f().found !== undefined" [class.err]="f().done && f().found === undefined" [class.info]="!f().done" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cells { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 3px; }
    @media (min-width: 700px) { .cells { grid-template-columns: repeat(16, minmax(0, 1fr)); } }
    .cell { display: flex; flex-direction: column; align-items: center; border: 1.5px solid rgba(139, 92, 246, 0.45); border-radius: 7px; padding: 3px 0; background: var(--bg-main); transition: all 0.25s; min-width: 0; }
    .cell .v { font-weight: 700; font-size: 0.9rem; }
    .cell .i { font-size: 0.62rem; color: var(--text-muted); }
    .cell .tag { font-size: 0.6rem; color: #d97706; font-weight: 700; min-height: 0.9em; }
    .cell.out { opacity: 0.25; }
    .cell.mid { border-color: #f59e0b; background: rgba(245, 158, 11, 0.22); transform: translateY(-3px); }
    .cell.found { border-color: #10b981; background: rgba(16, 185, 129, 0.25); }
  `]
})
export class BinarySearchWidget {
  readonly data = DATA;
  readonly quick = [51, 7, 78, 30];
  target = signal(51);
  frames = signal(trace(DATA, 51));
  idx = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() { inject(DestroyRef).onDestroy(() => clearTimeout(this.timer)); }

  f = computed(() => this.frames()[this.idx()]);
  checks = computed(() => this.frames().slice(1, this.idx() + 1).filter(x => x.mid >= 0).length);
  linear = computed(() => { const i = DATA.indexOf(this.target()); return i < 0 ? DATA.length : i + 1; });

  setTarget(t: number) { clearTimeout(this.timer); this.target.set(t); this.frames.set(trace(DATA, t)); this.idx.set(0); }
  restart() { this.setTarget(this.target()); }
  step() { this.idx.update(i => Math.min(i + 1, this.frames().length - 1)); }
  run() {
    clearTimeout(this.timer);
    const tick = () => { this.step(); if (!this.f().done) this.timer = setTimeout(tick, 700); };
    tick();
  }
}
