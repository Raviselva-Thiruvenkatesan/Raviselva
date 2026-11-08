import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Obj { id: number; profile: string; length: number }
interface Ref { name: string; target: number | null }

/** A class is a blueprint; `new` builds objects on the heap; variables hold references to them. */
@Component({
  selector: 'w-class-objects',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One blueprint, many objects</h3></div>
      <p class="w-hint">Create objects with <span class="mono">new</span>, change their fields, and copy a reference to see two variables pointing at the same object.</p>

      <div class="layout">
        <div class="blueprint">
          <div class="w-label">Class (blueprint)</div>
          <pre class="mono">class Beam
  string Profile
  double Length
  double Weight()</pre>
        </div>

        <div class="mem">
          <div class="area">
            <div class="w-label">Stack: variables</div>
            @for (r of refs(); track r.name) {
              <div class="var" [class.sel]="sel() === r.target && r.target !== null">
                <span class="mono">Beam {{ r.name }}</span>
                <span class="ptr mono">{{ r.target === null ? 'null' : '→ #' + r.target }}</span>
              </div>
            } @empty { <small class="text-muted">none yet</small> }
          </div>
          <div class="area">
            <div class="w-label">Heap: objects</div>
            <div class="objs">
              @for (o of objs(); track o.id) {
                <button type="button" class="obj" [class.sel]="sel() === o.id" [class.orphan]="!isReferenced(o.id)" (click)="sel.set(o.id)">
                  <span class="oid mono">#{{ o.id }}</span>
                  <span class="mono">Profile = "{{ o.profile }}"</span>
                  <span class="mono">Length = {{ o.length }}</span>
                  <small>{{ isReferenced(o.id) ? refCount(o.id) + ' reference' + (refCount(o.id) > 1 ? 's' : '') : 'no references: garbage' }}</small>
                </button>
              } @empty { <small class="text-muted">empty</small> }
            </div>
          </div>
        </div>
      </div>

      <div class="w-controls mt-3">
        <button type="button" class="w-btn primary" (click)="create()" [disabled]="refs().length >= 4"><i class="bi bi-plus-lg" aria-hidden="true"></i> {{ nextName() }} = new Beam()</button>
        <button type="button" class="w-btn" (click)="copyRef()" [disabled]="refs().length === 0 || refs().length >= 4">{{ nextName() }} = {{ refs()[0]?.name ?? 'b1' }}</button>
        <button type="button" class="w-btn" (click)="nullFirst()" [disabled]="!refs().length || refs()[0].target === null">{{ refs()[0]?.name ?? 'b1' }} = null</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>

      @if (selected(); as o) {
        <div class="w-controls edit">
          <span class="small text-muted">Edit object #{{ o.id }}:</span>
          <label class="w-field">Profile
            <select [ngModel]="o.profile" (ngModelChange)="edit(o.id, 'profile', $event)">
              @for (p of profiles; track p) { <option [value]="p">{{ p }}</option> }
            </select>
          </label>
          <label class="w-field">Length (m)
            <input class="mono" type="number" min="1" max="20" style="width:5.5rem" [ngModel]="o.length" (ngModelChange)="edit(o.id, 'length', +$event || 1)">
          </label>
        </div>
      }
      <div class="w-msg info" aria-live="polite"><i class="bi bi-info-circle" aria-hidden="true"></i><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .layout { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 760px) { .layout { grid-template-columns: 190px minmax(0, 1fr); } }
    .blueprint { border: 2px dashed rgba(14, 165, 233, 0.6); border-radius: 12px; padding: 10px; background: rgba(14, 165, 233, 0.06); }
    .blueprint pre { margin: 0; font-size: 0.82rem; white-space: pre; overflow-x: auto; }
    .mem { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 560px) { .mem { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); } }
    .area { border: 1px solid var(--border-color); border-radius: 12px; padding: 8px; background: var(--bg-main); }
    .var { display: flex; justify-content: space-between; gap: 6px; padding: 6px 8px; margin-bottom: 5px; border-radius: 8px; border: 1.5px solid var(--border-color); font-size: 0.82rem; }
    .var.sel { border-color: var(--purple); background: rgba(139, 92, 246, 0.1); }
    .ptr { color: var(--purple); font-weight: 700; }
    .objs { display: flex; flex-wrap: wrap; gap: 8px; }
    .obj {
      display: flex; flex-direction: column; align-items: flex-start; gap: 1px; text-align: left; font-size: 0.8rem; cursor: pointer;
      padding: 7px 10px; border-radius: 10px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.06); color: var(--text-main);
      animation: pop 0.3s ease-out;
    }
    .obj.sel { border-color: var(--purple); box-shadow: 0 6px 16px -10px rgba(139, 92, 246, 0.9); }
    .obj.orphan { opacity: 0.45; border-style: dashed; }
    .oid { font-weight: 700; color: var(--purple); }
    .obj small { color: var(--text-muted); font-size: 0.7rem; }
    .edit { margin-top: -0.25rem; }
    @keyframes pop { from { transform: scale(0.8); opacity: 0; } }
  `]
})
export class ClassObjectsWidget {
  profiles = ['IPE200', 'IPE300', 'HEA200', 'UB305'];
  objs = signal<Obj[]>([]);
  refs = signal<Ref[]>([]);
  sel = signal<number | null>(null);
  msg = signal('The class only describes what a Beam has. No Beam exists until you call new.');
  private nextId = 1;

  nextName = computed(() => 'b' + (this.refs().length + 1));
  selected = computed(() => this.objs().find(o => o.id === this.sel()));

  isReferenced(id: number) { return this.refs().some(r => r.target === id); }
  refCount(id: number) { return this.refs().filter(r => r.target === id).length; }

  create() {
    const id = this.nextId++;
    const name = this.nextName();
    this.objs.update(o => [...o, { id, profile: this.profiles[(id - 1) % this.profiles.length], length: 6 }]);
    this.refs.update(r => [...r, { name, target: id }]);
    this.sel.set(id);
    this.msg.set(`new Beam() built object #${id} on the heap with its own fields. ${name} holds a reference (its address), not the object itself.`);
  }

  copyRef() {
    const src = this.refs()[0];
    const name = this.nextName();
    this.refs.update(r => [...r, { name, target: src.target }]);
    this.sel.set(src.target);
    this.msg.set(src.target === null
      ? `${name} = ${src.name} copies null: neither variable points at an object.`
      : `${name} = ${src.name} copies the REFERENCE. No new object: both point at #${src.target}. Edit it and both "see" the change.`);
  }

  nullFirst() {
    const first = this.refs()[0];
    const old = first.target!;
    this.refs.update(r => r.map((x, i) => (i === 0 ? { ...x, target: null } : x)));
    this.msg.set(this.isReferenced(old)
      ? `${first.name} no longer points anywhere, but object #${old} is still used by another variable, so it stays.`
      : `Nothing references object #${old} any more. The garbage collector will free that memory automatically.`);
  }

  edit(id: number, key: 'profile' | 'length', value: string | number) {
    this.objs.update(o => o.map(x => (x.id === id ? { ...x, [key]: value } : x)));
    const names = this.refs().filter(r => r.target === id).map(r => r.name);
    this.msg.set(`Changed object #${id}. Seen through: ${names.join(' and ') || 'no variable'}.`);
  }

  reset() {
    this.objs.set([]);
    this.refs.set([]);
    this.sel.set(null);
    this.nextId = 1;
    this.msg.set('The class only describes what a Beam has. No Beam exists until you call new.');
  }
}
