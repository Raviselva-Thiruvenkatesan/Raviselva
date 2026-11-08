import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Tab = 'stack' | 'queue' | 'set';

/** Stack (LIFO), Queue (FIFO) and HashSet (unique items) side by side. */
@Component({
  selector: 'w-stack-queue-set',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Stack, Queue and HashSet</h3></div>
      <div class="w-controls" role="group" aria-label="Collection">
        <button type="button" class="w-btn mono" [class.on]="tab() === 'stack'" (click)="tab.set('stack')" [attr.aria-pressed]="tab() === 'stack'">Stack&lt;T&gt;</button>
        <button type="button" class="w-btn mono" [class.on]="tab() === 'queue'" (click)="tab.set('queue')" [attr.aria-pressed]="tab() === 'queue'">Queue&lt;T&gt;</button>
        <button type="button" class="w-btn mono" [class.on]="tab() === 'set'" (click)="tab.set('set')" [attr.aria-pressed]="tab() === 'set'">HashSet&lt;T&gt;</button>
      </div>

      <div class="w-controls">
        <label class="w-field">item <input class="mono" size="9" [ngModel]="item()" (ngModelChange)="item.set($event)" spellcheck="false"></label>
        @switch (tab()) {
          @case ('stack') {
            <button type="button" class="w-btn primary align-self-end mono" (click)="push()" [disabled]="stack().length >= 7">Push</button>
            <button type="button" class="w-btn align-self-end mono" (click)="pop()">Pop</button>
            <button type="button" class="w-btn align-self-end mono" (click)="peek()">Peek</button>
          }
          @case ('queue') {
            <button type="button" class="w-btn primary align-self-end mono" (click)="enqueue()" [disabled]="queue().length >= 7">Enqueue</button>
            <button type="button" class="w-btn align-self-end mono" (click)="dequeue()">Dequeue</button>
            <button type="button" class="w-btn align-self-end mono" (click)="qPeek()">Peek</button>
          }
          @case ('set') {
            <button type="button" class="w-btn primary align-self-end mono" (click)="add()">Add</button>
            <button type="button" class="w-btn align-self-end mono" (click)="has()">Contains</button>
            <button type="button" class="w-btn align-self-end mono" (click)="del()">Remove</button>
          }
        }
      </div>

      @switch (tab()) {
        @case ('stack') {
          <div class="stack-vis">
            <span class="hint-l">top ↓ (last in, first out)</span>
            @for (s of stackTopFirst(); track $index; let first = $first) {
              <div class="plate" [class.top]="first">{{ s }}</div>
            } @empty { <small class="text-muted">empty</small> }
          </div>
        }
        @case ('queue') {
          <div class="queue-vis">
            <span class="end">front →<br><small>Dequeue</small></span>
            @for (q of queue(); track $index; let first = $first) {
              <div class="person" [class.front]="first">{{ q }}</div>
            } @empty { <small class="text-muted">empty</small> }
            <span class="end">← back<br><small>Enqueue</small></span>
          </div>
        }
        @case ('set') {
          <div class="set-vis">
            @for (s of set(); track s) {
              <div class="chip" [class.hit]="hit() === s">{{ s }}</div>
            } @empty { <small class="text-muted">empty</small> }
          </div>
        }
      }

      <div class="w-msg" [class.err]="err()" [class.ok]="!err()" aria-live="polite">
        <code class="mono">{{ code() }}</code><span>{{ msg() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .stack-vis { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px; border: 2px solid var(--border-color); border-top: 0; border-radius: 0 0 14px 14px; max-width: 240px; margin: 0 auto 0.5rem; min-height: 120px; }
    .hint-l { font-size: 0.72rem; color: var(--text-muted); }
    .plate { width: 100%; text-align: center; padding: 6px; border-radius: 8px; font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.85rem; border: 1.5px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.06); animation: drop 0.3s ease-out; }
    .plate.top { border-color: var(--purple); background: rgba(139, 92, 246, 0.2); font-weight: 700; }
    .queue-vis { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); margin-bottom: 0.5rem; min-height: 64px; }
    .end { font-size: 0.72rem; color: var(--text-muted); text-align: center; line-height: 1.2; }
    .person { padding: 6px 10px; border-radius: 999px; font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.82rem; border: 1.5px solid rgba(14, 165, 233, 0.5); background: rgba(14, 165, 233, 0.08); animation: slide 0.3s ease-out; }
    .person.front { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.25); font-weight: 700; }
    .set-vis { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px; border-radius: 50px; border: 2px dashed rgba(16, 185, 129, 0.5); min-height: 56px; align-items: center; margin-bottom: 0.5rem; }
    .chip { padding: 5px 12px; border-radius: 999px; font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.82rem; background: rgba(16, 185, 129, 0.12); border: 1.5px solid rgba(16, 185, 129, 0.4); }
    .chip.hit { background: #10b981; color: #fff; }
    .w-msg { flex-wrap: wrap; }
    .w-msg code { font-weight: 700; color: var(--text-main); }
    @keyframes drop { from { transform: translateY(-12px); opacity: 0; } }
    @keyframes slide { from { transform: translateX(12px); opacity: 0; } }
  `]
})
export class StackQueueSetWidget {
  tab = signal<Tab>('stack');
  item = signal('Redo');
  stack = signal<string[]>(['Draw beam', 'Add bolt', 'Move column']);
  queue = signal<string[]>(['Print #1', 'Print #2']);
  set = signal<string[]>(['IPE200', 'IPE300', 'HEA200']);
  hit = signal('');
  code = signal('var undo = new Stack<string>();');
  msg = signal('Like a pile of plates: you only ever touch the top one.');
  err = signal(false);

  stackTopFirst() { return [...this.stack()].reverse(); }
  private say(code: string, msg: string, err = false) { this.code.set(code); this.msg.set(msg); this.err.set(err); }

  push() { const v = this.item() || '?'; this.stack.update(s => [...s, v]); this.say(`undo.Push("${v}");`, 'placed on top. Push and Pop are O(1).'); }
  pop() {
    if (!this.stack().length) return this.say('undo.Pop()', 'InvalidOperationException: Stack empty. Check Count or use TryPop.', true);
    const v = this.stack()[this.stack().length - 1];
    this.stack.update(s => s.slice(0, -1));
    this.say('undo.Pop()', `returned "${v}": the LAST item pushed comes out FIRST. That is how Undo works.`);
  }
  peek() {
    if (!this.stack().length) return this.say('undo.Peek()', 'InvalidOperationException: Stack empty.', true);
    this.say('undo.Peek()', `= "${this.stack()[this.stack().length - 1]}" (looked at the top without removing it).`);
  }

  enqueue() { const v = this.item() || '?'; this.queue.update(q => [...q, v]); this.say(`jobs.Enqueue("${v}");`, 'joined at the back of the line.'); }
  dequeue() {
    if (!this.queue().length) return this.say('jobs.Dequeue()', 'InvalidOperationException: Queue empty. Use TryDequeue to avoid this.', true);
    const v = this.queue()[0];
    this.queue.update(q => q.slice(1));
    this.say('jobs.Dequeue()', `returned "${v}": FIRST in, FIRST out, like a print queue or a ticket counter.`);
  }
  qPeek() {
    if (!this.queue().length) return this.say('jobs.Peek()', 'InvalidOperationException: Queue empty.', true);
    this.say('jobs.Peek()', `= "${this.queue()[0]}" (the next one to be served).`);
  }

  add() {
    const v = this.item();
    if (!v) return;
    if (this.set().includes(v)) { this.hit.set(v); return this.say(`profiles.Add("${v}")`, '= false: already in the set, so nothing changes. A HashSet never holds duplicates.'); }
    this.set.update(s => [...s, v]); this.hit.set(v);
    this.say(`profiles.Add("${v}")`, '= true: added.');
  }
  has() {
    const v = this.item();
    const yes = this.set().includes(v);
    this.hit.set(yes ? v : '');
    this.say(`profiles.Contains("${v}")`, `= ${yes}. Uses the hash code like a Dictionary: O(1), much faster than List.Contains on big data.`);
  }
  del() {
    const v = this.item();
    const yes = this.set().includes(v);
    if (yes) this.set.update(s => s.filter(x => x !== v));
    this.hit.set('');
    this.say(`profiles.Remove("${v}")`, `= ${yes}.`);
  }
}
