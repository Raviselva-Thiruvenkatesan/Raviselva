import { Component, computed, signal } from '@angular/core';

interface Obj { id: number; name: string; gen: 0 | 1 | 2; rooted: boolean }

/** A simplified generational garbage collector: allocate, drop references, collect, and watch survivors get promoted. */
@Component({
  selector: 'w-gc-sim',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Garbage collection, step by step</h3></div>
      <p class="w-hint"><span class="dot live"></span> reachable from a root (a variable or field still using it) · <span class="dot dead"></span> unreachable (garbage). New objects start in generation 0.</p>

      <div class="w-controls">
        <button type="button" class="w-btn primary" (click)="alloc(false)"><i class="bi bi-plus-lg" aria-hidden="true"></i> Temporary object</button>
        <button type="button" class="w-btn" (click)="alloc(true)"><i class="bi bi-pin-angle" aria-hidden="true"></i> Long-lived object</button>
        <button type="button" class="w-btn" (click)="drop()" [disabled]="!anyRooted()"><i class="bi bi-scissors" aria-hidden="true"></i> Drop a reference</button>
        <button type="button" class="w-btn mono" (click)="collect(0)">GC.Collect(0)</button>
        <button type="button" class="w-btn mono" (click)="collect(2)">GC.Collect()  <span class="small">(full)</span></button>
      </div>

      <div class="gens">
        @for (g of [0, 1, 2]; track g) {
          <div class="gen">
            <div class="gh"><strong>Gen {{ g }}</strong><small>{{ ['new, collected often', 'survived once', 'long-lived, collected rarely'][g] }}</small></div>
            <div class="objs">
              @for (o of byGen()[g]; track o.id) {
                <span class="o mono" [class.live]="o.rooted" [class.dead]="!o.rooted">{{ o.name }}</span>
              } @empty { <small class="text-muted">empty</small> }
            </div>
            <small class="cnt">collections: {{ counts()[g] }}</small>
          </div>
        }
      </div>
      <div class="w-msg info" aria-live="polite"><i class="bi bi-recycle" aria-hidden="true"></i><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; }
    .dot.live { background: #10b981; } .dot.dead { background: #ef4444; }
    .gens { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 640px) { .gens { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .gen { padding: 8px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); display: grid; gap: 6px; align-content: start; min-height: 110px; }
    .gh { display: grid; } .gh small { font-size: 0.7rem; color: var(--text-muted); }
    .objs { display: flex; flex-wrap: wrap; gap: 4px; }
    .o { font-size: 0.72rem; padding: 2px 7px; border-radius: 6px; border: 1.5px solid; animation: pop 0.25s ease-out; }
    .o.live { border-color: #10b981; background: rgba(16, 185, 129, 0.12); }
    .o.dead { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); text-decoration: line-through; }
    .cnt { font-size: 0.7rem; color: var(--text-muted); }
    @keyframes pop { from { transform: scale(0.7); opacity: 0; } }
  `]
})
export class GcSimWidget {
  private next = 1;
  objs = signal<Obj[]>([
    { id: 100, name: 'Model', gen: 2, rooted: true },
    { id: 101, name: 'Settings', gen: 2, rooted: true },
    { id: 102, name: 'Viewport', gen: 1, rooted: true }
  ]);
  counts = signal([0, 0, 0]);
  msg = signal('Add some temporary objects (like strings built in a loop) and run GC.Collect(0).');

  byGen = computed(() => [0, 1, 2].map(g => this.objs().filter(o => o.gen === g)));
  anyRooted = computed(() => this.objs().some(o => o.rooted && o.id < 100));

  alloc(longLived: boolean) {
    const id = this.next++;
    const name = longLived ? `Beam#${id}` : `tmp#${id}`;
    this.objs.update(l => [...l, { id, name, gen: 0, rooted: longLived }]);
    this.msg.set(longLived
      ? `${name} is stored in a list field, so it stays reachable.`
      : `${name} was used once (e.g. a string in a calculation) and nothing references it any more. It is garbage, but memory isn’t freed until a GC runs.`);
  }

  drop() {
    const victim = [...this.objs()].reverse().find(o => o.rooted && o.id < 100);
    if (!victim) return;
    this.objs.update(l => l.map(o => (o.id === victim.id ? { ...o, rooted: false } : o)));
    this.msg.set(`The list removed ${victim.name}. With no references left, it became garbage, even though it lives in generation ${victim.gen}.`);
  }

  collect(maxGen: 0 | 2) {
    const before = this.objs();
    const inScope = (o: Obj) => o.gen <= maxGen;
    const freed = before.filter(o => inScope(o) && !o.rooted);
    const promoted = before.filter(o => inScope(o) && o.rooted && o.gen < 2);
    this.objs.set(before
      .filter(o => !(inScope(o) && !o.rooted))
      .map(o => (inScope(o) && o.gen < 2 ? { ...o, gen: (o.gen + 1) as 1 | 2 } : o)));
    this.counts.update(c => c.map((n, g) => (g <= maxGen ? n + 1 : n)));
    const missed = before.filter(o => !inScope(o) && !o.rooted).length;
    this.msg.set(`${maxGen === 0 ? 'Gen 0 collection' : 'Full collection'}: marked everything reachable from the roots, freed ${freed.length} unreachable object(s) and promoted ${promoted.length} survivor(s) one generation up.`
      + (missed ? ` ${missed} garbage object(s) in older generations wait for a bigger collection.` : '')
      + (maxGen === 0 ? ' Gen 0 collections are cheap because they only look at young objects, and most objects die young.' : ''));
  }
}
