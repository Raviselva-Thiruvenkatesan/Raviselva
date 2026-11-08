import { Component, computed, signal } from '@angular/core';
import { SITE_EDGES, SITE_NODES, adjacency, edgeKey, segment } from './graph-data';

interface Frame { cur: string | null; stack: string[]; visited: string[]; finished: string[]; tree: string[]; back: string[]; say: string }

/** Recursive DFS from A (neighbours in alphabetical order), recording tree and back edges. */
function trace(): Frame[] {
  const adj = adjacency(SITE_NODES, SITE_EDGES);
  const f: Frame[] = [], visited: string[] = [], finished: string[] = [], stack: string[] = [], tree: string[] = [], back: string[] = [];
  const snap = (cur: string | null, say: string) => f.push({ cur, stack: [...stack], visited: [...visited], finished: [...finished], tree: [...tree], back: [...back], say });
  snap(null, 'Depth-first search from A. Go to the first unvisited neighbour, and keep going deeper. Only when a place has no unvisited neighbours left, back up.');
  const go = (u: string, parent: string | null) => {
    visited.push(u); stack.push(u);
    if (parent) tree.push(edgeKey(parent, u));
    snap(u, parent ? `Go deeper: ${parent} → ${u}. Visit ${u}.` : `Start at ${u}.`);
    for (const { to } of adj.get(u)!) {
      if (!visited.includes(to)) { go(to, u); snap(u, `Back at ${u}. Look at its next neighbour.`); }
      else if (to !== parent && stack.includes(to) && !back.includes(edgeKey(u, to))) {
        back.push(edgeKey(u, to));
        snap(u, `${u} → ${to}: ${to} is already on the current path. This road closes a loop: a cycle.`);
      }
    }
    stack.pop(); finished.push(u);
    snap(u, `${u} has no unvisited neighbours left: finished. Back up.`);
  };
  go('A', null);
  f.push({ ...f[f.length - 1], cur: null, say: `Done. Visit order: ${visited.join(' ')}. Finish order: ${finished.join(' ')}. The ${tree.length} green roads form a DFS tree; the ${back.length} red ones each close a cycle.` });
  return f;
}

/** Step through a depth-first search on the site graph. */
@Component({
  selector: 'w-dfs-stepper',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Depth-first search, step by step</h3></div>
      <p class="w-hint">Green roads were used to discover a new place (tree edges). Red dashed roads lead back to a place still on the current path (back edges: proof of a cycle).</p>

      <svg viewBox="0 0 340 240" class="gsvg" role="img" [attr.aria-label]="'Visited: ' + (f().visited.join(' ') || 'none')">
        @for (e of edges; track e.key) {
          <line [attr.x1]="e.x1" [attr.y1]="e.y1" [attr.x2]="e.x2" [attr.y2]="e.y2" class="g-edge" [class.ok]="f().tree.includes(e.key)" [class.bad]="f().back.includes(e.key)" />
        }
        @for (n of nodes; track n.id) {
          <g class="g-node" [class.cur]="n.id === f().cur" [class.wait]="f().stack.includes(n.id) && n.id !== f().cur" [class.done]="f().finished.includes(n.id)">
            <circle [attr.cx]="n.x" [attr.cy]="n.y" r="15" />
            <text [attr.x]="n.x" [attr.y]="n.y + 4" text-anchor="middle">{{ n.id }}</text>
            @if (rank(n.id)) { <text [attr.x]="n.x + 16" [attr.y]="n.y - 12" class="g-sub">#{{ rank(n.id) }}</text> }
          </g>
        }
      </svg>

      <div class="w-grid two mt-1">
        <div><div class="w-label">Call stack (current path)</div><div class="chips mono">@for (s of f().stack; track s) { <span class="chip wait">{{ s }}</span> } @empty { <span class="small text-muted">empty</span> }</div></div>
        <div><div class="w-label">Visit order</div><div class="chips mono">@for (s of f().visited; track s) { <span class="chip" [class.ok]="f().finished.includes(s)">{{ s }}</span> } @empty { <span class="small text-muted">none yet</span> }</div></div>
      </div>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames.length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
      </div>
      <div class="w-msg" [class.ok]="atEnd()" [class.info]="!atEnd()" aria-live="polite"><span>{{ f().say }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss']
})
export class DfsStepperWidget {
  readonly nodes = SITE_NODES;
  readonly frames = trace();
  private pos = new Map(SITE_NODES.map(n => [n.id, n]));
  readonly edges = SITE_EDGES.map(e => ({ key: edgeKey(e.a, e.b), ...segment(this.pos.get(e.a)!, this.pos.get(e.b)!, 0) }));
  idx = signal(0);
  f = computed(() => this.frames[Math.min(this.idx(), this.frames.length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames.length - 1);
  rank(id: string) { return this.f().visited.indexOf(id) + 1; }
}
