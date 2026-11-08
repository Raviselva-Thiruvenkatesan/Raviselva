import { Component, computed, signal } from '@angular/core';
import { SITE_EDGES, SITE_NODES, edgeKey, segment } from './graph-data';

type Algo = 'kruskal' | 'prim';
type Status = 'pending' | 'taken' | 'cycle' | 'unused';
interface Frame { taken: string[]; status: Record<string, Status>; cur: string | null; inTree: string[]; cands: string[]; total: number; say: string }

/** Cheapest first; equal weights in reverse name order (the same order as the lesson’s C# list). */
const SORTED = [...SITE_EDGES].sort((x, y) => x.w - y.w || edgeKey(y.a, y.b).localeCompare(edgeKey(x.a, x.b)));
const V = SITE_NODES.length;

function kruskal(): Frame[] {
  const parent: Record<string, string> = Object.fromEntries(SITE_NODES.map(n => [n.id, n.id]));
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const status: Record<string, Status> = Object.fromEntries(SORTED.map(e => [edgeKey(e.a, e.b), 'pending' as Status]));
  const taken: string[] = [], f: Frame[] = [];
  let total = 0;
  f.push({ taken: [], status: { ...status }, cur: null, inTree: [], cands: [], total, say: 'Kruskal: sort all roads from cheapest to most expensive. Take each one unless it would close a loop.' });
  for (const e of SORTED) {
    const k = edgeKey(e.a, e.b);
    if (taken.length === V - 1) { status[k] = 'unused'; continue; }
    const ra = find(e.a), rb = find(e.b);
    if (ra === rb) {
      status[k] = 'cycle';
      f.push({ taken: [...taken], status: { ...status }, cur: k, inTree: [], cands: [], total, say: `${k} (${e.w}): ${e.a} and ${e.b} are already connected, so this road would close a loop. Skip it.` });
    } else {
      parent[ra] = rb; taken.push(k); total += e.w; status[k] = 'taken';
      f.push({ taken: [...taken], status: { ...status }, cur: k, inTree: [], cands: [], total, say: `${k} (${e.w}): connects two separate groups. Take it. ${taken.length} of ${V - 1} roads, total ${total}.` });
    }
  }
  f.push({ ...f[f.length - 1], status: { ...status }, cur: null, say: `${V - 1} roads connect all ${V} places, so stop; the rest are not needed. Minimum total: ${total} minutes of road.` });
  return f;
}

function prim(): Frame[] {
  const inTree = ['A'], taken: string[] = [], f: Frame[] = [];
  const status: Record<string, Status> = Object.fromEntries(SORTED.map(e => [edgeKey(e.a, e.b), 'pending' as Status]));
  let total = 0;
  const crossing = () => SITE_EDGES.filter(e => inTree.includes(e.a) !== inTree.includes(e.b));
  f.push({ taken: [], status: { ...status }, cur: null, inTree: [...inTree], cands: crossing().map(e => edgeKey(e.a, e.b)), total, say: 'Prim: grow one tree from A. At every step, take the cheapest road leaving the tree (amber roads are the candidates).' });
  while (inTree.length < V) {
    const cands = crossing().sort((x, y) => x.w - y.w || edgeKey(x.a, x.b).localeCompare(edgeKey(y.a, y.b)));
    const e = cands[0], k = edgeKey(e.a, e.b), added = inTree.includes(e.a) ? e.b : e.a;
    inTree.push(added); taken.push(k); total += e.w; status[k] = 'taken';
    f.push({ taken: [...taken], status: { ...status }, cur: k, inTree: [...inTree], cands: crossing().map(c => edgeKey(c.a, c.b)), total,
      say: `Cheapest road out of the tree: ${k} (${e.w}). Add ${added}. Total ${total}.` });
  }
  f.push({ ...f[f.length - 1], cur: null, cands: [], say: `All ${V} places are in the tree. Total ${total}: the same minimum as Kruskal (here even the same roads).` });
  return f;
}

/** Kruskal and Prim building a minimum spanning tree of the site roads. */
@Component({
  selector: 'w-mst-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Minimum spanning tree</h3></div>
      <p class="w-hint">Connect all seven places with the least total length of temporary road (weights). Any set of roads that connects everything without loops is a spanning tree; we want the cheapest.</p>
      <div class="w-controls" role="group" aria-label="Algorithm">
        <button type="button" class="w-btn" [class.on]="algo() === 'kruskal'" (click)="setAlgo('kruskal')" [attr.aria-pressed]="algo() === 'kruskal'">Kruskal</button>
        <button type="button" class="w-btn" [class.on]="algo() === 'prim'" (click)="setAlgo('prim')" [attr.aria-pressed]="algo() === 'prim'">Prim</button>
      </div>

      <svg viewBox="0 0 340 240" class="gsvg" role="img" [attr.aria-label]="'Roads taken: ' + (f().taken.join(', ') || 'none')">
        @for (e of edges; track e.key) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="g-edge"
                [class.ok]="f().status[e.key] === 'taken'" [class.bad]="f().status[e.key] === 'cycle'" [class.hot]="e.key === f().cur || (f().cands.includes(e.key) && f().status[e.key] !== 'taken')" [class.dim]="f().status[e.key] === 'unused'" />
          <text [attr.x]="e.mx" [attr.y]="e.my + 4" text-anchor="middle" class="g-w">{{ e.w }}</text>
        }
        @for (n of nodes; track n.id) {
          <g class="g-node" [class.done]="algo() === 'prim' ? f().inTree.includes(n.id) : touched(n.id)"><circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" /><text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.id }}</text></g>
        }
      </svg>

      @if (algo() === 'kruskal') {
        <div class="w-label mt-1">Roads, cheapest first</div>
        <div class="chips mono">
          @for (e of sorted; track $index) { <span class="chip" [class.ok]="f().status[key(e)] === 'taken'" [class.bad]="f().status[key(e)] === 'cycle'" [class.cur]="key(e) === f().cur" [class.dim]="f().status[key(e)] === 'unused'">{{ key(e) }} {{ e.w }}</span> }
        </div>
      }

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small">Roads <b>{{ f().taken.length }}</b> / {{ v - 1 }} · Total <b>{{ f().total }}</b></span>
      </div>
      <div class="w-msg" [class.ok]="atEnd()" [class.info]="!atEnd()" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`.chip.dim { opacity: 0.4; }`]
})
export class MstVizWidget {
  readonly nodes = SITE_NODES;
  readonly sorted = SORTED;
  readonly v = V;
  private pos = new Map(SITE_NODES.map(n => [n.id, n]));
  readonly edges = SITE_EDGES.map(e => ({ key: edgeKey(e.a, e.b), w: e.w, ...segment(this.pos.get(e.a)!, this.pos.get(e.b)!, 0) }));
  private readonly all = { kruskal: kruskal(), prim: prim() };
  algo = signal<Algo>('kruskal');
  idx = signal(0);
  frames = computed(() => this.all[this.algo()]);
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);

  key(e: { a: string; b: string }) { return edgeKey(e.a, e.b); }
  touched(id: string) { return this.f().taken.some(k => k.split('-').includes(id)); }
  setAlgo(a: Algo) { this.algo.set(a); this.idx.set(0); }
}
