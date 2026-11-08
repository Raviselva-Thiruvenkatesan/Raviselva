import { Component, computed, signal } from '@angular/core';
import { GNode, layoutGeneral } from './tree-layout';

const N = 10;

/** Union-find on 10 items: click two items, union them, find roots, and see the forest. */
@Component({
  selector: 'w-union-find',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Union-find</h3></div>
      <p class="w-hint">Ten beams, each in its own group. Click two beams, then Union to merge their groups. Each group is a tree; its root is the group’s name. <span class="mono">parent[i]</span> is all that is stored.</p>
      <div class="w-controls" role="group" aria-label="Options">
        <button type="button" class="w-btn" [class.on]="byRank()" (click)="byRank.set(!byRank())" [attr.aria-pressed]="byRank()">Union by rank</button>
        <button type="button" class="w-btn" [class.on]="compress()" (click)="compress.set(!compress())" [attr.aria-pressed]="compress()">Path compression</button>
      </div>

      <div class="tscroll">
        <table class="wtable mono"><tbody>
          <tr><th>i</th>@for (i of items; track i) { <td><button type="button" class="pick" [class.a]="i === a()" [class.b]="i === b()" (click)="pick(i)" [attr.aria-pressed]="i === a() || i === b()">{{ i }}</button></td> }</tr>
          <tr><th>parent</th>@for (i of items; track i) { <td [class.hl]="changed().includes(i)" [class.ok]="parent()[i] === i">{{ parent()[i] }}</td> }</tr>
          @if (byRank()) { <tr><th>rank</th>@for (i of items; track i) { <td>{{ parent()[i] === i ? rank()[i] : '' }}</td> }</tr> }
        </tbody></table>
      </div>

      <svg [attr.viewBox]="'0 0 ' + svgW() + ' ' + svgH()" class="forest" role="img" [attr.aria-label]="groups() + ' groups'">
        @for (e of lay().edges; track e.id) { @if (e.from !== '^') { <line [attr.x1]="e.x1" [attr.y1]="e.y1 - dy" [attr.x2]="e.x2" [attr.y2]="e.y2 - dy" class="g-edge" [class.hot]="path().includes(+e.to)" /> } }
        @for (n of lay().nodes; track n.id) {
          @if (n.id !== '^') {
            <g class="g-node" [class.done]="parent()[+n.id] === +n.id" [class.cur]="+n.id === a() || +n.id === b()" [class.on]="path().includes(+n.id)">
              <circle [attr.cx]="n.x" [attr.cy]="n.y - dy" r="13" /><text [attr.x]="n.x" [attr.y]="n.y - dy + 4" text-anchor="middle">{{ n.label }}</text>
            </g>
          }
        }
      </svg>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="union()" [disabled]="a() < 0 || b() < 0">Union({{ a() < 0 ? '?' : a() }}, {{ b() < 0 ? '?' : b() }})</button>
        <button type="button" class="w-btn" (click)="findA()" [disabled]="a() < 0">Find({{ a() < 0 ? '?' : a() }})</button>
        <button type="button" class="w-btn" (click)="chain()">Chain demo: Union(0,1), Union(1,2) … Union(8,9)</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>
      <div class="small">Groups <b>{{ groups() }}</b> · Tallest tree <b>{{ tallest() }}</b> link{{ tallest() === 1 ? '' : 's' }}</div>
      <div class="w-msg mt-2" [class.info]="true" aria-live="polite"><span>{{ msg() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .pick { font: inherit; font-weight: 800; border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); border-radius: 6px; width: 100%; min-width: 1.6rem; padding: 2px 0; cursor: pointer; }
    .pick.a { border-color: #f59e0b; background: rgba(245, 158, 11, 0.3); }
    .pick.b { border-color: #0891b2; background: rgba(6, 182, 212, 0.25); }
    .forest { width: 100%; max-width: 460px; max-height: 300px; display: block; margin: 8px auto 0; }
  `]
})
export class UnionFindWidget {
  readonly items = Array.from({ length: N }, (_, i) => i);
  readonly dy = 40;
  byRank = signal(true);
  compress = signal(true);
  parent = signal<number[]>(this.items.map(i => i));
  rank = signal<number[]>(Array(N).fill(0));
  a = signal(-1);
  b = signal(-1);
  path = signal<number[]>([]);
  changed = signal<number[]>([]);
  msg = signal('Click one beam (amber), then another (blue), then press Union.');

  /** The forest under a hidden extra root, so the shared tree layout can draw all groups side by side. */
  lay = computed(() => {
    const p = this.parent();
    const kids = (r: number): GNode[] => this.items.filter(i => p[i] === r && i !== r).map(i => ({ id: String(i), label: String(i), children: kids(i) }));
    const roots = this.items.filter(i => p[i] === i).map(r => ({ id: String(r), label: String(r), children: kids(r) }));
    return layoutGeneral({ id: '^', label: '', children: roots }, 36, 46, 20);
  });
  svgW = computed(() => Math.max(this.lay().width, 200));
  svgH = computed(() => Math.max(this.lay().height - this.dy, 60));
  groups = computed(() => this.items.filter(i => this.parent()[i] === i).length);
  tallest = computed(() => Math.max(...this.items.map(i => this.depth(i))));

  private depth(i: number) { let d = 0; const p = this.parent(); while (p[i] !== i) { i = p[i]; d++; } return d; }

  pick(i: number) {
    if (this.a() < 0 || this.b() >= 0) { this.a.set(i); this.b.set(-1); }
    else if (i !== this.a()) this.b.set(i);
    this.path.set([]);
  }

  /** Find with optional path compression; records the path walked. */
  private find(x: number, record = true): number {
    const p = [...this.parent()], walked = [x];
    while (p[walked[walked.length - 1]] !== walked[walked.length - 1]) walked.push(p[walked[walked.length - 1]]);
    const root = walked[walked.length - 1];
    if (record) this.path.set(walked);
    if (this.compress()) {
      const ch = walked.slice(0, -1).filter(v => p[v] !== root);
      for (const v of ch) p[v] = root;
      if (ch.length) { this.parent.set(p); this.changed.set(ch); }
    }
    return root;
  }

  findA() {
    const x = this.a();
    this.changed.set([]);
    const before = this.depth(x);
    const r = this.find(x);
    const walked = this.path();
    this.msg.set(`Find(${x}): follow parents ${walked.join(' → ')}. The root is ${r}, so ${x} is in group ${r} (${before} step${before === 1 ? '' : 's'}).` +
      (this.compress() && before > 1 ? ` Path compression then pointed every node on that path straight at ${r}, so next time it is 1 step.` : ''));
  }

  union() {
    const x = this.a(), y = this.b();
    this.changed.set([]);
    const rx = this.find(x, false), ry = this.find(y, false);
    this.path.set([]);
    if (rx === ry) { this.msg.set(`${x} and ${y} are already in the same group (root ${rx}). Nothing to do: this is how Kruskal detects a loop.`); return; }
    const p = [...this.parent()], rk = [...this.rank()];
    let child = rx, root = ry, why = `attach root ${rx} under root ${ry}`;
    if (this.byRank()) {
      if (rk[rx] > rk[ry]) { child = ry; root = rx; }
      why = rk[rx] === rk[ry] ? `equal ranks: attach ${child} under ${root}, and ${root}’s rank grows to ${rk[root] + 1}` : `attach the shorter tree (root ${child}) under the taller one (root ${root})`;
      if (rk[rx] === rk[ry]) rk[root]++;
    }
    p[child] = root;
    this.parent.set(p); this.rank.set(rk); this.changed.set([child]);
    this.msg.set(`Union(${x}, ${y}): roots are ${rx} and ${ry}; ${why}. One parent entry changed.`);
    this.a.set(-1); this.b.set(-1);
  }

  chain() {
    this.reset(false);
    for (let i = 0; i < N - 1; i++) { this.a.set(i); this.b.set(i + 1); this.union(); }
    this.path.set([]);
    this.msg.set(this.byRank()
      ? `Nine unions in a row. With union by rank every new item joins under the existing root, so the tree has height ${this.tallest()}. Find stays fast.`
      : `Nine unions in a row without union by rank: each root is attached under the next item, building a chain of height ${this.tallest()}. Find(0) would walk all of it. Try Find(0) with path compression on.`);
  }

  reset(clearMsg = true) {
    this.parent.set(this.items.map(i => i)); this.rank.set(Array(N).fill(0));
    this.a.set(-1); this.b.set(-1); this.path.set([]); this.changed.set([]);
    if (clearMsg) this.msg.set('Reset: ten separate groups.');
  }
}
