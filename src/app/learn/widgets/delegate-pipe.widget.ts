import { Component, DestroyRef, inject, signal } from '@angular/core';

interface Fn { name: string; code: string; f: (x: number) => number }

const FNS: Fn[] = [
  { name: 'Square', code: 'Square', f: x => x * x },
  { name: 'Half', code: 'x => x / 2', f: x => x / 2 },
  { name: 'AddGst', code: 'x => Math.Round(x * 1.18, 2)', f: x => +(x * 1.18).toFixed(2) },
  { name: 'Negate', code: 'x => -x', f: x => -x },
  { name: 'RoundUp', code: 'Math.Ceiling', f: x => Math.ceil(x) }
];

const HANDLERS = ['SaveToDisk', 'UpdateViewport', 'WriteLog'];

/** A delegate variable holds a method: swap it, pass it to another method, and combine several. */
@Component({
  selector: 'w-delegate-pipe',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Methods as values</h3></div>

      <div class="w-label">Func&lt;double, double&gt; op = …;</div>
      <div class="w-controls" role="group" aria-label="Function">
        @for (f of fns; track f.name) {
          <button type="button" class="w-btn mono" [class.on]="op().name === f.name" (click)="op.set(f)" [attr.aria-pressed]="op().name === f.name">{{ f.code }}</button>
        }
      </div>
      <div class="pipe" aria-live="polite">
        @for (x of input; track $index) {
          <div class="cell"><span class="mono in">{{ x }}</span><i class="bi bi-arrow-down" aria-hidden="true"></i><span class="mono out">{{ op().f(x) }}</span></div>
        }
      </div>
      <div class="code mono">double[] result = Transform(values, <span class="hl">{{ op().code }}</span>);   <span class="c">// Transform calls op(x) for every x</span></div>

      <div class="w-label mt-4">Action onSaved = null;  (multicast: += adds, -= removes)</div>
      <div class="w-controls" role="group" aria-label="Handlers">
        @for (h of handlers; track h) {
          <button type="button" class="w-btn mono" [class.on]="list().includes(h)" (click)="toggle(h)" [attr.aria-pressed]="list().includes(h)">onSaved {{ list().includes(h) ? '-=' : '+=' }} {{ h }}</button>
        }
        <button type="button" class="w-btn primary mono" (click)="invoke()">onSaved?.Invoke()</button>
      </div>
      <div class="inv">
        <span class="small text-muted">Invocation list:</span>
        @for (h of list(); track h) { <span class="chip mono" [class.ran]="ran().includes(h)">{{ h }}()</span> } @empty { <span class="small text-muted">empty (onSaved is null)</span> }
      </div>
      <div class="w-msg info" aria-live="polite"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .pipe { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0.8rem; }
    .cell { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 64px; padding: 6px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); }
    .cell .in { color: var(--text-muted); }
    .cell .out { font-weight: 700; color: var(--purple); }
    .cell i { color: var(--text-muted); font-size: 0.8rem; }
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; }
    .hl { color: #ffcb6b; } .c { color: #64748b; }
    .inv { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .chip { font-size: 0.8rem; padding: 3px 10px; border-radius: 999px; border: 1.5px solid rgba(14, 165, 233, 0.5); background: rgba(14, 165, 233, 0.08); transition: all 0.2s; }
    .chip.ran { background: #10b981; border-color: #10b981; color: #fff; }
  `]
})
export class DelegatePipeWidget {
  fns = FNS;
  handlers = HANDLERS;
  input = [3, 10, 2.5, -4];
  op = signal<Fn>(FNS[0]);
  list = signal<string[]>(['SaveToDisk', 'WriteLog']);
  ran = signal<string[]>([]);
  msg = signal('A multicast delegate calls every method in its list, in the order they were added.');
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timers.forEach(clearTimeout));
  }

  toggle(h: string) {
    this.ran.set([]);
    this.list.update(l => (l.includes(h) ? l.filter(x => x !== h) : [...l, h]));
    this.msg.set(this.list().includes(h) ? `${h} subscribed.` : `${h} unsubscribed.`);
  }

  invoke() {
    this.timers.forEach(clearTimeout);
    this.ran.set([]);
    const l = this.list();
    if (!l.length) {
      this.msg.set('onSaved is null, so ?.Invoke() does nothing. Without ?. this would throw NullReferenceException.');
      return;
    }
    l.forEach((h, i) => this.timers.push(setTimeout(() => this.ran.update(r => [...r, h]), 350 * (i + 1))));
    this.msg.set(`One call ran ${l.length} method${l.length > 1 ? 's' : ''}: ${l.join(' → ')}.`);
  }

}
