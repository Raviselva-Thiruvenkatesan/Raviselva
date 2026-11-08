import { Component, computed, signal } from '@angular/core';
import { SITE_EDGES, SITE_NODES, segment } from './graph-data';

/** The same graph as a drawing, an adjacency list and an adjacency matrix. */
@Component({
  selector: 'w-graph-store',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>One graph, two ways to store it</h3></div>
      <p class="w-hint">Seven places on a site (A = gate, B = store, C = crane, D = office, E = yard, F = batching plant, G = workshop) and the roads between them. Click a place.</p>
      <div class="w-controls" role="group" aria-label="Graph type">
        <button type="button" class="w-btn" [class.on]="!directed()" (click)="directed.set(false)" [attr.aria-pressed]="!directed()">Undirected</button>
        <button type="button" class="w-btn" [class.on]="directed()" (click)="directed.set(true)" [attr.aria-pressed]="directed()">Directed (one-way)</button>
        <button type="button" class="w-btn" [class.on]="weighted()" (click)="weighted.set(!weighted())" [attr.aria-pressed]="weighted()">Weights (minutes)</button>
      </div>

      <svg viewBox="0 0 340 240" class="gsvg" role="group" aria-label="Site graph">
        <defs><marker id="gs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrow" /></marker></defs>
        @for (e of edges(); track e.key) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="g-edge" [class.on]="e.hl" [attr.marker-end]="directed() ? 'url(#gs-arrow)' : null" />
          @if (weighted()) { <text [attr.x]="e.mx" [attr.y]="e.my + 4" text-anchor="middle" class="g-w">{{ e.w }}</text> }
        }
        @for (n of nodes; track n.id) {
          <g class="g-node" [class.cur]="n.id === sel()" [class.on]="isNeighbour(n.id)" (click)="sel.set(n.id)" (keydown.enter)="sel.set(n.id)" tabindex="0" role="button" [attr.aria-label]="n.id + ' ' + n.name">
            <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.id }}</text>
          </g>
        }
      </svg>

      <div class="w-grid two mt-2">
        <div class="min0">
          <div class="w-label">Adjacency list</div>
          <div class="mono small list">
            @for (row of lists(); track row.id) {
              <div [class.hl]="row.id === sel()"><b>{{ row.id }}</b> → {{ row.text || '(none)' }}</div>
            }
          </div>
        </div>
        <div class="min0">
          <div class="w-label">Adjacency matrix ({{ weighted() ? 'weight' : '1 = road' }}, · = none)</div>
          <div class="tscroll">
            <table class="wtable mono"><tbody>
              <tr><th></th>@for (c of ids; track c) { <th>{{ c }}</th> }</tr>
              @for (r of ids; track r; let i = $index) {
                <tr [class.hl]="r === sel()"><th>{{ r }}</th>@for (c of ids; track c; let j = $index) { <td>{{ cell(i, j) }}</td> }</tr>
              }
            </tbody></table>
          </div>
        </div>
      </div>
      <div class="w-msg info mt-2" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .arrow { fill: var(--text-muted); }
    .g-node { cursor: pointer; outline: none; }
    .list > div { padding: 1px 4px; border-radius: 5px; }
    .list > div.hl { background: rgba(245, 158, 11, 0.2); }
    .min0 { min-width: 0; }
  `]
})
export class GraphStoreWidget {
  readonly nodes = SITE_NODES;
  readonly ids = SITE_NODES.map(n => n.id);
  directed = signal(false);
  weighted = signal(true);
  sel = signal('E');

  private pos = new Map(SITE_NODES.map(n => [n.id, n]));

  edges = computed(() => SITE_EDGES.map(e => {
    const s = segment(this.pos.get(e.a)!, this.pos.get(e.b)!, this.directed() ? 16 : 0);
    const hl = e.a === this.sel() || (!this.directed() && e.b === this.sel());
    return { key: e.a + e.b, w: e.w, hl, ...s };
  }));

  /** Outgoing neighbours (both directions when undirected). */
  out = computed(() => {
    const m = new Map<string, { to: string; w: number }[]>(this.ids.map(id => [id, []]));
    for (const e of SITE_EDGES) {
      m.get(e.a)!.push({ to: e.b, w: e.w });
      if (!this.directed()) m.get(e.b)!.push({ to: e.a, w: e.w });
    }
    for (const l of m.values()) l.sort((x, y) => x.to.localeCompare(y.to));
    return m;
  });

  lists = computed(() => this.ids.map(id => ({
    id, text: this.out().get(id)!.map(x => (this.weighted() ? `${x.to} (${x.w})` : x.to)).join(', ')
  })));

  isNeighbour(id: string) { return this.out().get(this.sel())!.some(x => x.to === id); }

  cell(i: number, j: number) {
    const hit = this.out().get(this.ids[i])!.find(x => x.to === this.ids[j]);
    return hit ? (this.weighted() ? hit.w : 1) : '·';
  }

  message = computed(() => {
    const s = this.sel(), outs = this.out().get(s)!.length, V = this.ids.length, E = SITE_EDGES.length;
    const ins = SITE_EDGES.filter(e => e.b === s).length;
    const deg = this.directed() ? `out-degree ${outs}, in-degree ${ins}` : `degree ${outs}`;
    const entries = this.directed() ? E : 2 * E;
    return `${s} (${this.pos.get(s)!.name}): ${deg}. In the list, its neighbours are ready to read: ${outs} entr${outs === 1 ? 'y' : 'ies'}. In the matrix you scan a row of ${V} cells, but “is there a road ${s}→X?” is one cell lookup. Storage: the list holds ${entries} entries (${this.directed() ? 'E' : '2E'}), the matrix ${V * V} cells (V²).`;
  });
}
