import { Component, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

/** Instance fields live in each object; a static field lives once, in the class itself. */
@Component({
  selector: 'w-static-counter',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Static: one copy shared by all</h3></div>

      <div class="w-grid two">
        <app-code [code]="code" title="Beam.cs" [compact]="true" [copyable]="false" [active]="active()" />
        <div>
          <div class="cls">
            <div class="w-label">The Beam class itself (one, always)</div>
            <div class="static-box"><span class="mono">static int Count</span><strong class="mono">{{ count() }}</strong></div>
          </div>
          <div class="w-label mt-2">Objects (one per new)</div>
          <div class="objs">
            @for (m of marks(); track m) {
              <div class="obj"><small class="mono">Mark</small><strong class="mono">"{{ m }}"</strong></div>
            } @empty { <small class="text-muted">No objects yet, but Count already exists: it belongs to the class.</small> }
          </div>
        </div>
      </div>

      <div class="w-controls mt-3">
        <button type="button" class="w-btn primary" (click)="add()" [disabled]="marks().length >= 6"><i class="bi bi-plus-lg" aria-hidden="true"></i> new Beam("B{{ marks().length + 1 }}")</button>
        <button type="button" class="w-btn mono" (click)="read()">Beam.Count</button>
        <button type="button" class="w-btn mono" (click)="wrong()">b1.Count</button>
        <button type="button" class="w-btn mono" (click)="reset()">Beam.Reset()</button>
      </div>
      <div class="w-msg" [class.err]="err()" [class.info]="!err()" aria-live="polite">
        <i class="bi" [class.bi-x-octagon]="err()" [class.bi-info-circle]="!err()" aria-hidden="true"></i><span>{{ msg() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cls { padding: 10px; border-radius: 12px; border: 2px dashed rgba(14, 165, 233, 0.6); background: rgba(14, 165, 233, 0.06); }
    .static-box { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 10px; background: var(--bg-main); border: 2px solid #0ea5e9; }
    .static-box strong { font-size: 1.4rem; color: #0ea5e9; }
    .objs { display: flex; flex-wrap: wrap; gap: 8px; }
    .obj { padding: 6px 12px; border-radius: 10px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.06); text-align: center; animation: pop 0.3s ease-out; }
    .obj small { display: block; color: var(--text-muted); font-size: 0.7rem; }
    @keyframes pop { from { transform: scale(0.8); opacity: 0; } }
  `]
})
export class StaticCounterWidget {
  code = [
    'class Beam',
    '{',
    '    public static int Count;      // ONE copy, shared',
    '    public string Mark;           // one copy PER object',
    '',
    '    public Beam(string mark)',
    '    {',
    '        Mark = mark;',
    '        Count++;                  // same Count for every Beam',
    '    }',
    '',
    '    public static void Reset() => Count = 0;',
    '}'
  ].join('\n');

  marks = signal<string[]>([]);
  count = signal(0);
  active = signal<number[]>([3]);
  err = signal(false);
  msg = signal('Count exists once, in the class, even before any Beam is created. Mark is created fresh inside each object.');

  add() {
    const m = 'B' + (this.marks().length + 1);
    this.marks.update(x => [...x, m]);
    this.count.update(c => c + 1);
    this.active.set([8, 9]);
    this.err.set(false);
    this.msg.set(`new Beam("${m}") gave the new object its own Mark, then Count++ updated the single shared Count to ${this.count()}.`);
  }

  read() {
    this.active.set([3]);
    this.err.set(false);
    this.msg.set(`Beam.Count is ${this.count()}. Static members are used through the class name, not through an object.`);
  }

  wrong() {
    this.err.set(true);
    this.msg.set('error CS0176: Member \'Beam.Count\' cannot be accessed with an instance reference; qualify it with a type name instead. Write Beam.Count.');
  }

  reset() {
    this.active.set([12]);
    this.err.set(false);
    this.msg.set('Beam.Reset() is a static method: it is called on the class and can only use static members (it has no "this" object). Count is 0; existing objects keep their Mark.');
    this.count.set(0);
  }
}
