import { Component, computed, signal } from '@angular/core';

interface Beam { n: number; name: string; profile: string; length: number; level: string }
type Key = 'profile' | 'length' | 'level';
type Algo = 'stable' | 'unstable';

const BEAMS: Beam[] = [
  { n: 1, name: 'B1', profile: 'IPE300', length: 6.0, level: 'L1' },
  { n: 2, name: 'B2', profile: 'HEA200', length: 4.5, level: 'L2' },
  { n: 3, name: 'B3', profile: 'IPE300', length: 4.5, level: 'L1' },
  { n: 4, name: 'B4', profile: 'HEA200', length: 6.0, level: 'L1' },
  { n: 5, name: 'B5', profile: 'IPE300', length: 3.0, level: 'L2' },
  { n: 6, name: 'B6', profile: 'UB406', length: 4.5, level: 'L2' },
  { n: 7, name: 'B7', profile: 'HEA200', length: 3.0, level: 'L1' },
  { n: 8, name: 'B8', profile: 'IPE300', length: 6.0, level: 'L2' }
];

const NAMES: Record<Key, string> = { profile: 'Profile', length: 'Length', level: 'Level' };

/** Heap sort: a real O(n log n) sort that is NOT stable, used to show what instability looks like. */
function heapSort<T>(items: T[], cmp: (a: T, b: T) => number): T[] {
  const a = [...items];
  const sift = (start: number, end: number) => {
    let root = start;
    while (2 * root + 1 <= end) {
      let child = 2 * root + 1;
      if (child + 1 <= end && cmp(a[child], a[child + 1]) < 0) child++;
      if (cmp(a[root], a[child]) < 0) { [a[root], a[child]] = [a[child], a[root]]; root = child; } else return;
    }
  };
  for (let s = Math.floor((a.length - 2) / 2); s >= 0; s--) sift(s, a.length - 1);
  for (let end = a.length - 1; end > 0; end--) { [a[0], a[end]] = [a[end], a[0]]; sift(0, end - 1); }
  return a;
}

/** Sort a beam schedule by one or two keys, stable vs unstable, and see the matching C#. */
@Component({
  selector: 'w-sort-keys',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Sort keys and stability</h3></div>
      <p class="w-hint">The <b>#</b> column is each beam’s original position. A <b>stable</b> sort keeps that order among beams with equal keys.</p>
      <div class="w-controls" role="group" aria-label="Sort by">
        <span class="w-label m-0">Sort by</span>
        @for (k of keys; track k) { <button type="button" class="w-btn" [class.on]="primary() === k" (click)="setPrimary(k)">{{ names[k] }}</button> }
        <button type="button" class="w-btn" [class.on]="desc()" (click)="desc.set(!desc())">{{ desc() ? 'descending' : 'ascending' }}</button>
      </div>
      <div class="w-controls" role="group" aria-label="Then by">
        <span class="w-label m-0">Then by</span>
        <button type="button" class="w-btn" [class.on]="secondary() === null" (click)="secondary.set(null)">nothing</button>
        @for (k of keys; track k) {
          @if (k !== primary()) { <button type="button" class="w-btn" [class.on]="secondary() === k" (click)="secondary.set(k)">{{ names[k] }}</button> }
        }
      </div>
      <div class="w-controls" role="group" aria-label="Algorithm">
        <span class="w-label m-0">Algorithm</span>
        <button type="button" class="w-btn" [class.on]="algo() === 'stable'" (click)="algo.set('stable')">stable (LINQ OrderBy)</button>
        <button type="button" class="w-btn" [class.on]="algo() === 'unstable'" (click)="algo.set('unstable')">unstable (heap sort)</button>
      </div>

      <div class="w-grid two">
        <div class="table-wrap">
          <table class="mono">
            <thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Profile</th><th scope="col">Length</th><th scope="col">Level</th></tr></thead>
            <tbody>
              @for (b of sorted(); track b.n; let i = $index) {
                <tr [class.band]="band(i)" [class.broken]="broken().has(b.n)">
                  <td>{{ b.n }}</td><td>{{ b.name }}</td>
                  <td [class.k]="isKey('profile')">{{ b.profile }}</td>
                  <td [class.k]="isKey('length')">{{ b.length.toFixed(1) }}</td>
                  <td [class.k]="isKey('level')">{{ b.level }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <pre class="code mono">{{ code() }}</pre>
      </div>
      <div class="w-msg" [class.err]="broken().size > 0" [class.ok]="broken().size === 0" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { padding: 4px 7px; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
    th { color: var(--text-muted); font-weight: 600; }
    tr.band td { background: rgba(139, 92, 246, 0.06); }
    tr.broken td:first-child { color: #dc2626; font-weight: 800; }
    td.k { font-weight: 700; color: var(--purple); }
    .code { margin: 0; padding: 10px 12px; border-radius: 12px; background: #0b1020; color: #e2e8f0; font-size: 0.78rem; white-space: pre-wrap; word-break: break-word; }
  `]
})
export class SortKeysWidget {
  readonly keys: Key[] = ['profile', 'length', 'level'];
  readonly names = NAMES;
  primary = signal<Key>('profile');
  secondary = signal<Key | null>(null);
  desc = signal(false);
  algo = signal<Algo>('stable');

  setPrimary(k: Key) { this.primary.set(k); if (this.secondary() === k) this.secondary.set(null); }
  isKey(k: Key) { return k === this.primary() || k === this.secondary(); }

  private cmp = computed(() => {
    const p = this.primary(), s = this.secondary(), d = this.desc() ? -1 : 1;
    const by = (k: Key) => (a: Beam, b: Beam) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0);
    return (a: Beam, b: Beam) => d * by(p)(a, b) || (s ? by(s)(a, b) : 0);
  });

  sorted = computed(() => this.algo() === 'stable'
    ? [...BEAMS].sort(this.cmp())                // Array.prototype.sort is stable, like LINQ OrderBy
    : heapSort(BEAMS, this.cmp()));

  /** Beams whose original order was reversed relative to an equal-keyed neighbour. */
  broken = computed(() => {
    const out = new Set<number>(), list = this.sorted(), cmp = this.cmp();
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++)
        if (cmp(list[i], list[j]) === 0 && list[i].n > list[j].n) { out.add(list[i].n); out.add(list[j].n); }
    return out;
  });

  band(i: number) {
    const list = this.sorted(), cmp = this.cmp();
    let groups = 0;
    for (let k = 1; k <= i; k++) if (cmp(list[k - 1], list[k]) !== 0) groups++;
    return groups % 2 === 1;
  }

  code = computed(() => {
    const p = NAMES[this.primary()], s = this.secondary();
    const first = `beams.${this.desc() ? 'OrderByDescending' : 'OrderBy'}(b => b.${p})`;
    const linq = s ? `${first}\n     .ThenBy(b => b.${NAMES[s]})` : first;
    const cmpLine = s
      ? `int c = ${this.desc() ? 'y' : 'x'}.${p}.CompareTo(${this.desc() ? 'x' : 'y'}.${p});\n    return c != 0 ? c : x.${NAMES[s]}.CompareTo(y.${NAMES[s]});`
      : `return ${this.desc() ? 'y' : 'x'}.${p}.CompareTo(${this.desc() ? 'x' : 'y'}.${p});`;
    return `// Stable, returns a new sequence\nvar sorted = ${linq}\n     .ToList();\n\n// In place, NOT guaranteed stable\nlist.Sort((x, y) =>\n{\n    ${cmpLine}\n});`;
  });

  note = computed(() => {
    if (this.broken().size) return `Beams with equal keys came out in a different order from the input (red #). That is what “unstable” means. If the original order mattered, the result is wrong.`;
    if (this.algo() === 'unstable') return 'This time no equal keys were reordered, but an unstable sort gives no promise. Try sorting by Length or Level only.';
    return 'Stable: within each group of equal keys, the beams keep their original order (look at the # column).';
  });
}
