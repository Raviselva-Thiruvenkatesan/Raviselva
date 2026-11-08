import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Cls { name: string; base: string | null; members: string[] }

const CLASSES: Cls[] = [
  { name: 'object', base: null, members: ['ToString()', 'Equals(object)', 'GetHashCode()', 'GetType()'] },
  { name: 'StructuralMember', base: 'object', members: ['Mark', 'Material', 'Length', 'Describe()'] },
  { name: 'Beam', base: 'StructuralMember', members: ['Profile', 'SpanLoadKn'] },
  { name: 'Column', base: 'StructuralMember', members: ['BasePlate', 'IsBraced'] },
  { name: 'Brace', base: 'StructuralMember', members: ['AngleDeg'] }
];
const byName = (n: string) => CLASSES.find(c => c.name === n)!;

/** Explore a class hierarchy: inherited vs own members, constructor order and "is-a" assignments. */
@Component({
  selector: 'w-inheritance-tree',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Explore a class family</h3></div>
      <p class="w-hint">Click a class to see everything it has: what it inherits and what it adds.</p>

      <div class="tree" role="group" aria-label="Class hierarchy">
        <button type="button" class="node top mono" [class.on]="sel() === 'object'" (click)="sel.set('object')">object</button>
        <span class="line" aria-hidden="true"></span>
        <button type="button" class="node mono" [class.on]="sel() === 'StructuralMember'" [class.anc]="isAncestor('StructuralMember')" (click)="sel.set('StructuralMember')">StructuralMember</button>
        <span class="line" aria-hidden="true"></span>
        <div class="kids">
          @for (k of ['Beam', 'Column', 'Brace']; track k) {
            <button type="button" class="node mono" [class.on]="sel() === k" (click)="sel.set(k)">{{ k }}</button>
          }
        </div>
      </div>

      <div class="w-grid two mt-3">
        <div>
          <div class="w-label">Members of {{ sel() }}</div>
          <ul class="members">
            @for (m of members(); track m.name + m.from) {
              <li [class.own]="m.from === sel()"><span class="mono">{{ m.name }}</span><small>{{ m.from === sel() ? 'declared here' : 'inherited from ' + m.from }}</small></li>
            }
          </ul>
        </div>
        <div>
          <div class="w-label">new {{ sel() }}() runs constructors in this order</div>
          <ol class="order">
            @for (c of chain(); track c) { <li class="mono">{{ c }}()</li> }
          </ol>

          <div class="w-label mt-3">“Is-a” check</div>
          <div class="isa mono">
            <select [ngModel]="varType()" (ngModelChange)="varType.set($event)" aria-label="Variable type">
              @for (c of names; track c) { <option [value]="c">{{ c }}</option> }
            </select>
            x = new
            <select [ngModel]="objType()" (ngModelChange)="objType.set($event)" aria-label="Object type">
              @for (c of names.slice(1); track c) { <option [value]="c">{{ c }}</option> }
            </select>();
          </div>
          <div class="w-msg" [class.ok]="isA()" [class.err]="!isA()" aria-live="polite">
            <i class="bi" [class.bi-check-circle]="isA()" [class.bi-x-octagon]="!isA()" aria-hidden="true"></i>
            <span>{{ isA() ? 'Compiles: a ' + objType() + ' IS-A ' + varType() + '. Through x you can only use ' + varType() + ' members.' : 'error CS0029: a ' + objType() + ' is not a ' + varType() + '. Only up the family tree, never sideways or down.' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tree { display: flex; flex-direction: column; align-items: center; }
    .line { width: 2px; height: 14px; background: var(--border-color); }
    .kids { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; padding-top: 6px; border-top: 2px solid var(--border-color); }
    .node { padding: 6px 14px; border-radius: 10px; border: 2px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
    .node.top { opacity: 0.75; }
    .node.on { border-color: var(--purple); background: rgba(139, 92, 246, 0.14); color: var(--purple); opacity: 1; }
    .members { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
    .members li { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; opacity: 0.75; }
    .members li.own { opacity: 1; border-color: var(--purple); background: rgba(139, 92, 246, 0.08); font-weight: 600; }
    .members small { color: var(--text-muted); font-weight: 400; }
    .order { padding-left: 1.3rem; margin: 0; font-size: 0.88rem; }
    .isa { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 0.88rem; }
    .isa select { font: inherit; color: var(--text-main); background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 6px; }
  `]
})
export class InheritanceTreeWidget {
  names = CLASSES.map(c => c.name);
  sel = signal('Beam');
  varType = signal('StructuralMember');
  objType = signal('Beam');

  private ancestors(name: string): string[] {
    const out: string[] = [];
    for (let c: Cls | undefined = byName(name); c; c = c.base ? byName(c.base) : undefined) out.push(c.name);
    return out;   // [self, parent, …, object]
  }

  isAncestor(n: string) { return this.ancestors(this.sel()).includes(n) && n !== this.sel(); }

  /** Own members first, then each ancestor's, nearest first. */
  members = computed(() => this.ancestors(this.sel()).flatMap(c => byName(c).members.map(m => ({ name: m, from: c }))));

  chain = computed(() => this.ancestors(this.sel()).reverse());

  isA = computed(() => this.ancestors(this.objType()).includes(this.varType()));
}
