import { Component, computed, signal } from '@angular/core';
import { SITE_EDGES, SITE_NODES, adjacency, edgeKey, segment } from './graph-data';

const IDS = SITE_NODES.map(n => n.id);
interface Frame { dist: Record<string, number>; prev: Record<string, string>; done: string[]; cur: string | null; hot: string | null; changed: string | null; say: string }

/** Dijkstra from A; one frame per "take the closest" and per edge relaxation. */
function trace(): Frame[] {
  const adj = adjacency(SITE_NODES, SITE_EDGES);
  const dist: Record<string, number> = Object.fromEntries(IDS.map(id => [id, Infinity]));
  const prev: Record<string, string> = {};
  const done: string[] = [], f: Frame[] = [];
  dist['A'] = 0;
  const snap = (cur: string | null, hot: string | null, changed: string | null, say: string) =>
    f.push({ dist: { ...dist }, prev: { ...prev }, done: [...done], cur, hot, changed, say });
  snap(null, null, null, 'Start: the gate A is 0 minutes away; everything else is ∞ (not reached yet).');
  for (;;) {
    const open = IDS.filter(id => !done.includes(id) && dist[id] < Infinity);
    if (!open.length) break;
    const u = open.reduce((m, id) => (dist[id] < dist[m] ? id : m));
    done.push(u);
    snap(u, null, null, `Take ${u}: at ${dist[u]} min it is the closest place not yet final. No other route can beat it later (all times are ≥ 0), so ${dist[u]} is final.`);
    for (const { to, w } of adj.get(u)!) {
      if (done.includes(to)) continue;
      const nd = dist[u] + w;
      if (nd < dist[to]) {
        const old = dist[to];
        dist[to] = nd; prev[to] = u;
        snap(u, edgeKey(u, to), to, `Road ${u}–${to} (${w}): ${dist[u]} + ${w} = ${nd} < ${old === Infinity ? '∞' : old}. Better: ${to} is now ${nd}, via ${u}.`);
      } else {
        snap(u, edgeKey(u, to), null, `Road ${u}–${to} (${w}): ${dist[u]} + ${w} = ${nd}, not better than ${dist[to]}. Keep it.`);
      }
    }
  }
  return f;
}

/** Dijkstra's shortest paths from the gate to every place on the site. */
@Component({
  selector: 'w-dijkstra-viz',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Dijkstra’s shortest paths</h3></div>
      <p class="w-hint">Driving times in minutes. Find the quickest route from the gate A to every place. Then pick a destination to see its route.</p>

      <svg viewBox="0 0 340 240" class="gsvg" role="img" aria-label="Site graph with driving times">
        @for (e of edges; track e.key) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="g-edge" [class.hot]="e.key === f().hot" [class.ok]="onRoute(e.key)" [class.on]="!onRoute(e.key) && isTreeEdge(e.key)" />
          <text [attr.x]="e.mx" [attr.y]="e.my + 4" text-anchor="middle" class="g-w">{{ e.w }}</text>
        }
        @for (n of nodes; track n.id) {
          <g class="g-node" [class.cur]="n.id === f().cur" [class.done]="f().done.includes(n.id) && n.id !== f().cur" [class.wait]="!f().done.includes(n.id) && f().dist[n.id] < inf">
            <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.id }}</text>
            <text [attr.x]="n.x" [attr.y]="n.y - 19" text-anchor="middle" class="g-sub">{{ show(f().dist[n.id]) }}</text>
          </g>
        }
      </svg>

      <div class="tscroll mt-1">
        <table class="wtable mono"><tbody>
          <tr><th>Place</th>@for (id of ids; track id) { <th>{{ id }}</th> }</tr>
          <tr><th>Minutes</th>@for (id of ids; track id) { <td [class.hl]="id === f().changed" [class.ok]="f().done.includes(id)">{{ show(f().dist[id]) }}</td> }</tr>
          <tr><th>Via</th>@for (id of ids; track id) { <td [class.hl]="id === f().changed">{{ via(id) }}</td> }</tr>
        </tbody></table>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames.length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
      </div>
      <div class="w-controls" role="group" aria-label="Destination">
        <span class="w-label m-0">Route to</span>
        @for (id of ids.slice(1); track id) { <button type="button" class="w-btn" [class.on]="target() === id" (click)="target.set(id)" [attr.aria-pressed]="target() === id">{{ id }}</button> }
      </div>
      <div class="w-msg" [class.ok]="atEnd()" [class.info]="!atEnd()" aria-live="polite"><span>{{ atEnd() ? routeText() : f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss']
})
export class DijkstraVizWidget {
  readonly nodes = SITE_NODES;
  readonly ids = IDS;
  readonly inf = Infinity;
  readonly frames = trace();
  private pos = new Map(SITE_NODES.map(n => [n.id, n]));
  readonly edges = SITE_EDGES.map(e => ({ key: edgeKey(e.a, e.b), w: e.w, ...segment(this.pos.get(e.a)!, this.pos.get(e.b)!, 0) }));
  idx = signal(0);
  target = signal('F');

  f = computed(() => this.frames[Math.min(this.idx(), this.frames.length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames.length - 1);
  route = computed(() => {
    const prev = this.frames[this.frames.length - 1].prev, path = [this.target()];
    while (prev[path[0]]) path.unshift(prev[path[0]]);
    return path;
  });
  routeKeys = computed(() => new Set(this.route().slice(1).map((id, i) => edgeKey(this.route()[i], id))));
  routeText = computed(() => {
    const d = this.frames[this.frames.length - 1].dist[this.target()];
    return `All places are final. Quickest route A → ${this.target()}: ${this.route().join(' → ')}, ${d} minutes. Purple roads form the shortest-path tree: every place’s best route from A.`;
  });

  show(d: number) { return d === Infinity ? '∞' : String(d); }
  via(id: string) { return this.f().prev[id] || '–'; }
  onRoute(key: string) { return this.atEnd() && this.routeKeys().has(key); }
  isTreeEdge(key: string) { const p = this.f().prev; return Object.entries(p).some(([a, b]) => edgeKey(a, b) === key); }
}
