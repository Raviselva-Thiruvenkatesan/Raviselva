import { Component, computed, signal } from '@angular/core';

type HashKind = 'good' | 'bad';

const KEYS = ['B-12', 'C-7', 'S-301', 'B-205', 'P-44', 'C-19', 'S-8', 'B-77', 'P-150', 'C-3', 'S-56', 'B-9'];
const START_CAP = 4;

/** Simplified string hash. "good" mixes every character (h = h * 31 + c); "bad" only uses the length. */
function hashOf(key: string, kind: HashKind): number {
  if (kind === 'bad') return key.length;
  let h = 0;
  for (const ch of key) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** A chained hash table: keys go into buckets by hash % bucketCount; the table doubles when it gets full. */
@Component({
  selector: 'w-hash-buckets',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside a hash table</h3></div>
      <p class="w-hint">Every key is turned into a number, its <strong>hash</strong>. <span class="mono">hash % buckets</span> picks the bucket. Keys that land in the same bucket share it as a short chain.</p>

      <div class="w-controls" role="group" aria-label="Hash function">
        <span class="w-label m-0">Hash function</span>
        <button type="button" class="w-btn" [class.on]="kind() === 'good'" (click)="setKind('good')" [attr.aria-pressed]="kind() === 'good'">good: mixes every character</button>
        <button type="button" class="w-btn" [class.on]="kind() === 'bad'" (click)="setKind('bad')" [attr.aria-pressed]="kind() === 'bad'">bad: just the length</button>
      </div>

      <div class="buckets mono">
        @for (b of buckets(); track $index; let i = $index) {
          <div class="bucket" [class.hl]="i === hlBucket()">
            <span class="bidx">[{{ i }}]</span>
            @for (k of b; track k) { <span class="key" [class.found]="k === hlKey()" [class.cmp]="cmp().includes(k) && k !== hlKey()">{{ k }}</span> }
            @empty { <span class="none">empty</span> }
          </div>
        }
      </div>
      <div class="small mt-2">Keys <b>{{ count() }}</b> · Buckets <b>{{ cap() }}</b> · Load factor <b>{{ load() }}</b> · Longest chain <b [class.w-err]="longest() > 3">{{ longest() }}</b></div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="add()" [disabled]="count() >= keys.length">{{ count() < keys.length ? 'Add ' + keys[count()] : 'All keys added' }}</button>
        <button type="button" class="w-btn" (click)="addAll()" [disabled]="count() >= keys.length">Add all</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>
      <div class="w-controls">
        <label class="w-label m-0" for="hb-find">Find key</label>
        <input id="hb-find" class="w-field mono find" [value]="query()" (input)="query.set($any($event.target).value)" (keydown.enter)="find()" placeholder="e.g. C-19" />
        <button type="button" class="w-btn" (click)="find()">Find</button>
      </div>
      <div class="w-msg" [class.ok]="msg().kind === 'ok'" [class.err]="msg().kind === 'err'" [class.info]="msg().kind === 'info'" aria-live="polite"><span>{{ msg().text }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .buckets { display: grid; gap: 4px; }
    .bucket { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); transition: all 0.2s; min-width: 0; }
    .bucket.hl { border-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
    .bidx { width: 2.4rem; font-size: 0.75rem; color: var(--text-muted); }
    .key { padding: 1px 7px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; border: 1.5px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.12); }
    .key + .key::before { content: '→ '; color: var(--text-muted); font-weight: 400; margin-left: -2px; }
    .key.cmp { border-color: #f59e0b; }
    .key.found { border-color: #10b981; background: rgba(16, 185, 129, 0.3); }
    .none { font-size: 0.72rem; color: var(--text-muted); }
    .find { width: 8rem; }
  `]
})
export class HashBucketsWidget {
  readonly keys = KEYS;
  kind = signal<HashKind>('good');
  count = signal(0);
  cap = signal(START_CAP);
  query = signal('');
  hlBucket = signal(-1);
  hlKey = signal('');
  cmp = signal<string[]>([]);
  msg = signal<{ text: string; kind: 'ok' | 'err' | 'info' }>({ text: `Empty table with ${START_CAP} buckets. Add keys one at a time.`, kind: 'info' });

  buckets = computed(() => {
    const cap = this.cap(), kind = this.kind();
    const b: string[][] = Array.from({ length: cap }, () => []);
    for (const k of KEYS.slice(0, this.count())) b[hashOf(k, kind) % cap].push(k);
    return b;
  });
  load = computed(() => (this.count() / this.cap()).toFixed(2));
  longest = computed(() => Math.max(0, ...this.buckets().map(b => b.length)));

  setKind(k: HashKind) {
    this.kind.set(k);
    this.clearHighlight();
    this.msg.set({ text: k === 'bad'
      ? 'Same keys, a poor hash: many keys have the same length, so they pile into the same few buckets however many buckets there are.'
      : 'A good hash spreads the keys across the buckets, so chains stay short.', kind: 'info' });
  }

  add() {
    const n = this.count();
    if (n >= KEYS.length) return;
    const key = KEYS[n];
    let resized = '';
    if (n + 1 > this.cap()) {
      this.cap.set(this.cap() * 2);
      resized = `The table was full (load factor 1.0), so it doubled to ${this.cap()} buckets and re-inserted every key: each key’s bucket is recomputed with the new count. `;
    }
    this.count.set(n + 1);
    const h = hashOf(key, this.kind()), b = h % this.cap();
    this.clearHighlight();
    this.hlBucket.set(b);
    this.hlKey.set(key);
    const chain = this.buckets()[b].length;
    this.msg.set({ text: `${resized}hash("${key}") = ${h}; ${h} % ${this.cap()} = ${b}, so it goes into bucket ${b}${chain > 1 ? `, which already held ${chain - 1} key${chain > 2 ? 's' : ''} (a collision)` : ''}.`, kind: 'info' });
  }

  addAll() { while (this.count() < KEYS.length) this.add(); }

  find() {
    const q = this.query().trim().toUpperCase();
    this.clearHighlight();
    if (!q) return this.msg.set({ text: 'Type a key such as C-19 first.', kind: 'info' });
    const h = hashOf(q, this.kind()), b = h % this.cap();
    const chain = this.buckets()[b];
    const at = chain.indexOf(q);
    const compared = at >= 0 ? chain.slice(0, at + 1) : chain;
    this.hlBucket.set(b);
    this.cmp.set(compared);
    if (at >= 0) {
      this.hlKey.set(q);
      this.msg.set({ text: `hash("${q}") % ${this.cap()} = ${b}. Go straight to bucket ${b} and compare along its chain: found after ${compared.length} comparison${compared.length > 1 ? 's' : ''}. The other ${this.count() - compared.length} keys were never looked at.`, kind: 'ok' });
    } else {
      this.msg.set({ text: `hash("${q}") % ${this.cap()} = ${b}. Bucket ${b} ${chain.length ? `holds ${chain.join(', ')}; none match` : 'is empty'}, so "${q}" is not in the table (${compared.length} comparison${compared.length === 1 ? '' : 's'}).`, kind: 'err' });
    }
  }

  reset() {
    this.count.set(0);
    this.cap.set(START_CAP);
    this.clearHighlight();
    this.msg.set({ text: 'Reset.', kind: 'info' });
  }

  private clearHighlight() { this.hlBucket.set(-1); this.hlKey.set(''); this.cmp.set([]); }
}
