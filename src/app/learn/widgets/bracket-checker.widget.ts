import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const PRESETS = ['if (a[i] > 0) { f(x); }', 'Math.Max(a[0], b[1)]', '{ (x + y) * z', 'list[(i + 1)]'];

interface Frame { pos: number; stack: string[]; say: string; result?: 'ok' | 'bad' }

/** Check brackets with a stack, one character at a time. */
@Component({
  selector: 'w-bracket-checker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Balanced brackets with a stack</h3></div>
      <p class="w-hint">Opening brackets are pushed. A closing bracket must match the one on top, which is popped. Step through, or type your own code.</p>
      <div class="w-controls" role="group" aria-label="Examples">
        @for (p of presets; track p) { <button type="button" class="w-btn mono" [class.on]="text() === p" (click)="load(p)">{{ p }}</button> }
      </div>
      <label class="w-field mb-2 d-flex">Code to check
        <input class="mono" [ngModel]="text()" (ngModelChange)="load($event)" maxlength="40" aria-label="Code to check">
      </label>

      <div class="w-grid two">
        <div>
          <div class="w-label">Input</div>
          <div class="chars mono" aria-hidden="true">
            @for (c of chars(); track $index; let i = $index) {
              <span class="ch" [class.cur]="i === frame().pos" [class.done]="i < frame().pos" [class.br]="isBracket(c)">{{ c === ' ' ? '·' : c }}</span>
            }
          </div>
        </div>
        <div>
          <div class="w-label">Stack (top first)</div>
          <div class="stack mono">
            @for (s of frame().stack.slice().reverse(); track $index; let i = $index) { <span class="item" [class.top]="i === 0">{{ s }}</span> }
            @if (!frame().stack.length) { <span class="small text-muted">empty</span> }
          </div>
        </div>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="step()" [disabled]="!!frame().result">Step</button>
        <button type="button" class="w-btn" (click)="runAll()" [disabled]="!!frame().result">Run to the end</button>
        <button type="button" class="w-btn" (click)="load(text())">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="frame().result === 'ok'" [class.err]="frame().result === 'bad'" [class.info]="!frame().result" aria-live="polite"><span>{{ frame().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .chars { display: flex; flex-wrap: wrap; gap: 2px; }
    .ch { min-width: 1.35em; text-align: center; padding: 3px 2px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-main); font-size: 0.9rem; color: var(--text-muted); }
    .ch.br { color: var(--text-main); font-weight: 700; }
    .ch.done { opacity: 0.5; }
    .ch.cur { background: rgba(245, 158, 11, 0.3); border-color: #f59e0b; opacity: 1; }
    .stack { display: flex; flex-direction: column; gap: 3px; min-height: 40px; align-items: flex-start; }
    .item { padding: 2px 16px; border-radius: 6px; border: 1.5px solid rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.1); font-weight: 700; }
    .item.top { border-color: var(--purple); background: rgba(139, 92, 246, 0.25); }
  `]
})
export class BracketCheckerWidget {
  readonly presets = PRESETS;
  text = signal(PRESETS[0]);
  frames = signal<Frame[]>([]);
  idx = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    this.load(PRESETS[0]);
  }

  chars = computed(() => [...this.text()]);
  frame = computed(() => this.frames()[this.idx()]);

  isBracket(c: string) { return '()[]{}'.includes(c); }

  load(t: string) {
    clearTimeout(this.timer);
    this.text.set(t);
    this.frames.set(trace(t));
    this.idx.set(0);
  }

  step() { this.idx.update(i => Math.min(i + 1, this.frames().length - 1)); }

  runAll() {
    clearTimeout(this.timer);
    const tick = () => {
      this.step();
      if (!this.frame().result) this.timer = setTimeout(tick, 280);
    };
    tick();
  }
}

/** Pre-compute every state of the algorithm, one per bracket (other characters are skipped in the same step). */
function trace(t: string): Frame[] {
  const out: Frame[] = [{ pos: -1, stack: [], say: 'Start with an empty stack. Press Step.' }];
  const stack: string[] = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ('([{'.includes(c)) {
      stack.push(c);
      out.push({ pos: i, stack: [...stack], say: `'${c}' opens: Push('${c}').` });
    } else if (c in PAIRS) {
      if (!stack.length) {
        out.push({ pos: i, stack: [], say: `'${c}' closes, but the stack is empty: nothing was opened. Not balanced.`, result: 'bad' });
        return out;
      }
      const top = stack[stack.length - 1];
      if (top !== PAIRS[c]) {
        out.push({ pos: i, stack: [...stack], say: `'${c}' closes, but the top is '${top}'. They do not match: not balanced.`, result: 'bad' });
        return out;
      }
      stack.pop();
      out.push({ pos: i, stack: [...stack], say: `'${c}' matches the top '${top}': Pop().` });
    }
  }
  out.push(stack.length
    ? { pos: t.length, stack: [...stack], say: `End of input, but the stack still holds ${stack.join(' ')}: something was never closed. Not balanced.`, result: 'bad' }
    : { pos: t.length, stack: [], say: 'End of input and the stack is empty: every bracket was closed in the right order. Balanced! Each character was handled once: O(n).', result: 'ok' });
  return out;
}
