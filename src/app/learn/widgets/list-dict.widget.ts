import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const BUCKETS = 7;

/** List<T> with Count vs Capacity, and Dictionary<TKey, TValue> with hash buckets. */
@Component({
  selector: 'w-list-dict',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside List and Dictionary</h3></div>
      <div class="w-controls" role="group" aria-label="Collection">
        <button type="button" class="w-btn mono" [class.on]="tab() === 'list'" (click)="tab.set('list')" [attr.aria-pressed]="tab() === 'list'">List&lt;string&gt;</button>
        <button type="button" class="w-btn mono" [class.on]="tab() === 'dict'" (click)="tab.set('dict')" [attr.aria-pressed]="tab() === 'dict'">Dictionary&lt;string, double&gt;</button>
      </div>

      @if (tab() === 'list') {
        <div class="w-controls">
          <label class="w-field">item <input class="mono" size="8" [ngModel]="item()" (ngModelChange)="item.set($event)" spellcheck="false"></label>
          <label class="w-field">index <input class="mono" type="number" min="0" style="width:4.5rem" [ngModel]="idx()" (ngModelChange)="idx.set(+$event || 0)"></label>
          <button type="button" class="w-btn primary align-self-end mono" (click)="lAdd()">Add</button>
          <button type="button" class="w-btn align-self-end mono" (click)="lInsert()">Insert(i)</button>
          <button type="button" class="w-btn align-self-end mono" (click)="lRemoveAt()">RemoveAt(i)</button>
          <button type="button" class="w-btn align-self-end mono" (click)="lRemove()">Remove(item)</button>
          <button type="button" class="w-btn align-self-end mono" (click)="lContains()">Contains</button>
        </div>
        <div class="slots" aria-label="List contents">
          @for (s of slots(); track $index; let i = $index) {
            <div class="slot" [class.used]="i < list().length" [class.hl]="hl() === i">
              <span class="mono v">{{ i < list().length ? list()[i] : '' }}</span><span class="mono i">{{ i }}</span>
            </div>
          }
        </div>
        <p class="small mt-2 mb-0">Count = <strong>{{ list().length }}</strong> · Capacity = <strong>{{ cap() }}</strong> <span class="text-muted">(grey slots are reserved but empty; when full, the list allocates double the space and copies the items across)</span></p>
      } @else {
        <div class="w-controls">
          <label class="w-field">key <input class="mono" size="8" [ngModel]="key()" (ngModelChange)="key.set($event)" spellcheck="false"></label>
          <label class="w-field">value <input class="mono" type="number" step="0.1" style="width:5rem" [ngModel]="val()" (ngModelChange)="val.set(+$event || 0)"></label>
          <button type="button" class="w-btn primary align-self-end mono" (click)="dAdd()">Add</button>
          <button type="button" class="w-btn align-self-end mono" (click)="dSet()">dict[key] = value</button>
          <button type="button" class="w-btn align-self-end mono" (click)="dGet()">TryGetValue</button>
          <button type="button" class="w-btn align-self-end mono" (click)="dRemove()">Remove</button>
        </div>
        <div class="buckets">
          @for (b of buckets(); track $index; let i = $index) {
            <div class="bucket" [class.hl]="hb() === i">
              <span class="bkt-n mono">bucket {{ i }}</span>
              @for (e of b; track e[0]) { <span class="entry mono" [class.hit]="hk() === e[0]">{{ e[0] }} → {{ e[1] }}</span> }
            </div>
          }
        </div>
        <p class="small mt-2 mb-0">Count = <strong>{{ dict().size }}</strong> · <span class="text-muted">The key’s hash code picks a bucket, so a lookup jumps straight to it instead of scanning everything.</span></p>
      }

      <div class="w-msg" [class.err]="err()" [class.ok]="!err()" aria-live="polite">
        <code class="mono">{{ code() }}</code><span>{{ msg() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .slots { display: flex; flex-wrap: wrap; gap: 4px; }
    .slot { width: 64px; display: flex; flex-direction: column; align-items: center; }
    .slot .v { width: 64px; height: 38px; display: grid; place-items: center; font-size: 0.78rem; border-radius: 8px; border: 1.5px dashed var(--border-color); overflow: hidden; }
    .slot.used .v { border-style: solid; border-color: rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.07); font-weight: 600; }
    .slot.hl .v { border-color: var(--purple); background: rgba(139, 92, 246, 0.22); }
    .slot .i { font-size: 0.68rem; color: var(--text-muted); }
    .buckets { display: grid; gap: 4px; }
    .bucket { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 5px 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); min-height: 34px; }
    .bucket.hl { border-color: var(--purple); background: rgba(139, 92, 246, 0.08); }
    .bkt-n { font-size: 0.7rem; color: var(--text-muted); width: 62px; }
    .entry { font-size: 0.8rem; padding: 2px 8px; border-radius: 6px; background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.35); }
    .entry.hit { background: #10b981; border-color: #10b981; color: #fff; }
    .w-msg { flex-wrap: wrap; }
    .w-msg code { font-weight: 700; color: var(--text-main); }
  `]
})
export class ListDictWidget {
  tab = signal<'list' | 'dict'>('list');
  err = signal(false);
  code = signal('var list = new List<string>();');
  msg = signal('Try Add a few times and watch Capacity jump from 4 to 8.');

  // ---- list
  list = signal<string[]>(['B1', 'B2', 'C1']);
  cap = signal(4);
  item = signal('B3');
  idx = signal(1);
  hl = signal(-1);
  slots = computed(() => Array.from({ length: this.cap() }));

  private grow(n: number) {
    if (n > this.cap()) {
      const c = Math.max(4, this.cap() * 2);
      this.cap.set(c);
      return ` Count reached Capacity, so the list allocated a new array of ${c} slots and copied the items.`;
    }
    return '';
  }
  private say(code: string, msg: string, err = false) { this.code.set(code); this.msg.set(msg); this.err.set(err); }

  lAdd() {
    const it = this.item() || '?';
    const g = this.grow(this.list().length + 1);
    this.list.update(l => [...l, it]);
    this.hl.set(this.list().length - 1);
    this.say(`list.Add("${it}");`, `added at the end (index ${this.list().length - 1}).${g}`);
  }
  lInsert() {
    const i = this.idx(), it = this.item() || '?';
    if (i < 0 || i > this.list().length) return this.say(`list.Insert(${i}, "${it}");`, `ArgumentOutOfRangeException: index must be 0..${this.list().length}.`, true);
    const g = this.grow(this.list().length + 1);
    this.list.update(l => [...l.slice(0, i), it, ...l.slice(i)]);
    this.hl.set(i);
    this.say(`list.Insert(${i}, "${it}");`, `every item from index ${i} moved one place right to make room.${g}`);
  }
  lRemoveAt() {
    const i = this.idx();
    if (i < 0 || i >= this.list().length) return this.say(`list.RemoveAt(${i});`, `ArgumentOutOfRangeException: valid indexes are 0..${this.list().length - 1}.`, true);
    const gone = this.list()[i];
    this.list.update(l => l.filter((_, j) => j !== i));
    this.hl.set(-1);
    this.say(`list.RemoveAt(${i});`, `removed "${gone}"; later items shifted left. Capacity stays ${this.cap()}.`);
  }
  lRemove() {
    const it = this.item();
    const i = this.list().indexOf(it);
    if (i < 0) return this.say(`list.Remove("${it}");`, 'returned false: not found, nothing removed.');
    this.list.update(l => l.filter((_, j) => j !== i));
    this.hl.set(-1);
    this.say(`list.Remove("${it}");`, `returned true: removed the first "${it}" (it had to search from the start).`);
  }
  lContains() {
    const it = this.item();
    const i = this.list().indexOf(it);
    this.hl.set(i);
    this.say(`list.Contains("${it}")`, `= ${i >= 0 ? 'true' : 'false'}. It checked ${i >= 0 ? i + 1 : this.list().length} item(s) one by one: O(n).`);
  }

  // ---- dictionary
  dict = signal(new Map<string, number>([['IPE200', 22.4], ['IPE300', 42.2], ['HEA200', 42.3]]));
  key = signal('UB305');
  val = signal(54);
  hb = signal(-1);
  hk = signal('');

  private bucketOf(k: string) {
    let h = 0;
    for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % BUCKETS;
  }
  buckets = computed(() => {
    const b: [string, number][][] = Array.from({ length: BUCKETS }, () => []);
    for (const [k, v] of this.dict()) b[this.bucketOf(k)].push([k, v]);
    return b;
  });

  dAdd() {
    const k = this.key();
    if (!k) return;
    if (this.dict().has(k)) return this.say(`dict.Add("${k}", ${this.val()});`, `ArgumentException: an item with the key "${k}" already exists. Keys must be unique.`, true);
    this.dict.update(d => new Map(d).set(k, this.val()));
    this.hb.set(this.bucketOf(k)); this.hk.set(k);
    this.say(`dict.Add("${k}", ${this.val()});`, `hash("${k}") picked bucket ${this.bucketOf(k)}; the pair is stored there.`);
  }
  dSet() {
    const k = this.key();
    if (!k) return;
    const existed = this.dict().has(k);
    this.dict.update(d => new Map(d).set(k, this.val()));
    this.hb.set(this.bucketOf(k)); this.hk.set(k);
    this.say(`dict["${k}"] = ${this.val()};`, existed ? 'the key existed, so its value was replaced (no error).' : 'the key was new, so it was added.');
  }
  dGet() {
    const k = this.key();
    this.hb.set(this.bucketOf(k)); this.hk.set(this.dict().has(k) ? k : '');
    this.say(`dict.TryGetValue("${k}", out var kg)`, this.dict().has(k)
      ? `= true, kg = ${this.dict().get(k)}. It went straight to bucket ${this.bucketOf(k)}: O(1), however big the dictionary is.`
      : `= false: bucket ${this.bucketOf(k)} has no such key. (dict["${k}"] would throw KeyNotFoundException.)`);
  }
  dRemove() {
    const k = this.key();
    const had = this.dict().has(k);
    if (had) this.dict.update(d => { const n = new Map(d); n.delete(k); return n; });
    this.hk.set(''); this.hb.set(this.bucketOf(k));
    this.say(`dict.Remove("${k}")`, had ? '= true: the pair was removed.' : '= false: the key was not there.');
  }
}
