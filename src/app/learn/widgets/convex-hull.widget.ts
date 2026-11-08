import { Component, computed, signal } from '@angular/core';

interface P { x: number; y: number; id: number }
type Kind = 'start' | 'push' | 'pop' | 'half' | 'done';
interface Frame { lower: P[]; chain: P[]; cand: P | null; kind: Kind; say: string }

const SIZE = 300;
/** Survey pegs, in metres east (x) and north (y). */
const START: [number, number][] = [
  [30, 60], [70, 230], [120, 140], [150, 40], [160, 260], [200, 120],
  [230, 210], [260, 70], [270, 170], [100, 90], [190, 190], [60, 150]
];

/** Cross product of OA × OB: positive = left (counter-clockwise) turn, negative = right turn, 0 = straight. */
export const cross = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Andrew’s monotone chain, one frame per decision. */
function hullFrames(pts: P[]): Frame[] {
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y), f: Frame[] = [];
  if (s.length < 3) return [{ lower: [], chain: s, cand: null, kind: 'done', say: 'Add at least three pegs.' }];
  f.push({ lower: [], chain: [], cand: null, kind: 'start', say: `Sort the ${s.length} pegs from west to east (numbers show the order). Build the lower edge first, walking left to right.` });
  const half = (order: P[], lowerDone: P[], name: string) => {
    const h: P[] = [];
    for (const p of order) {
      while (h.length >= 2) {
        const c = cross(h[h.length - 2], h[h.length - 1], p);
        if (c > 0) break;
        f.push({ lower: lowerDone, chain: [...h], cand: p, kind: 'pop', say: `${h[h.length - 2].id} → ${h[h.length - 1].id} → ${p.id} ${c === 0 ? 'is a straight line' : 'turns right'} (cross product ${c} ≤ 0), so peg ${h[h.length - 1].id} cannot be on the ${name} edge. Remove it.` });
        h.pop();
      }
      const turn = h.length >= 2 ? `${h[h.length - 2].id} → ${h[h.length - 1].id} → ${p.id} turns left (cross product ${cross(h[h.length - 2], h[h.length - 1], p)} > 0). ` : '';
      h.push(p);
      f.push({ lower: lowerDone, chain: [...h], cand: null, kind: 'push', say: `${turn}Add peg ${p.id} to the ${name} edge.` });
    }
    return h;
  };
  const lower = half(s, [], 'lower');
  f.push({ lower, chain: [], cand: null, kind: 'half', say: 'Lower edge done. Now walk back from east to west to build the upper edge the same way.' });
  const upper = half([...s].reverse(), lower, 'upper');
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  f.push({ lower: hull, chain: [], cand: null, kind: 'done', say: '' });
  return f;
}

/** Convex hull of survey pegs, built step by step with cross products. */
@Component({
  selector: 'w-convex-hull',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Fencing the site: convex hull</h3></div>
      <p class="w-hint">Find the shortest fence around all the survey pegs. Every step asks one question: do these three pegs turn left or right? Click the plan to add pegs.</p>

      <svg viewBox="0 0 300 300" class="plan" (click)="add($event)" role="img" [attr.aria-label]="'Hull pegs: ' + (done() ? hullIds() : 'not finished')">
        <rect x="0" y="0" width="300" height="300" class="bg" />
        @if (f().kind === 'done' && f().lower.length > 2) { <polygon [attr.points]="poly(f().lower)" class="hull" /> }
        @else if (f().lower.length > 1) { <polyline [attr.points]="poly(f().lower)" class="lower" /> }
        @if (f().chain.length > 1) { <polyline [attr.points]="poly(f().chain)" class="chain" /> }
        @if (f().cand && f().chain.length) {
          <line [attr.x1]="last().x" [attr.y1]="sy(last().y)" [attr.x2]="f().cand!.x" [attr.y2]="sy(f().cand!.y)" class="cand" />
        }
        @for (p of pts(); track p.id) {
          <g class="peg" [class.in]="inChain(p)" [class.cur]="p === f().cand" [class.bad]="f().kind === 'pop' && p === last()">
            <circle [attr.cx]="p.x" [attr.cy]="sy(p.y)" r="8" />
            <text [attr.x]="p.x" [attr.y]="sy(p.y) + 3.5" text-anchor="middle">{{ p.id }}</text>
          </g>
        }
      </svg>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="done()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(fr().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <button type="button" class="w-btn" (click)="reset()">Reset pegs</button>
        <span class="small">Pegs <b>{{ pts().length }}</b> · step {{ idx() + 1 }} of {{ fr().length }}</span>
      </div>
      <div class="w-msg" [class.ok]="done()" [class.err]="f().kind === 'pop'" [class.info]="!done() && f().kind !== 'pop'" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plan { width: 100%; max-width: 340px; display: block; margin: 0 auto; cursor: crosshair; touch-action: manipulation; }
    .bg { fill: var(--bg-main); stroke: var(--border-color); }
    .hull { fill: rgba(16, 185, 129, 0.12); stroke: #10b981; stroke-width: 3; stroke-linejoin: round; }
    .lower { fill: none; stroke: #10b981; stroke-width: 3; }
    .chain { fill: none; stroke: #8b5cf6; stroke-width: 3; stroke-linejoin: round; }
    .cand { stroke: #ef4444; stroke-width: 2.5; stroke-dasharray: 5 4; }
    .peg circle { fill: var(--bg-secondary); stroke: rgba(139, 92, 246, 0.55); stroke-width: 1.5; }
    .peg text { font-size: 9px; font-weight: 700; fill: var(--text-main); }
    .peg.in circle { fill: rgba(139, 92, 246, 0.3); stroke: #8b5cf6; }
    .peg.cur circle { fill: rgba(245, 158, 11, 0.45); stroke: #f59e0b; stroke-width: 2.5; }
    .peg.bad circle { fill: rgba(239, 68, 68, 0.35); stroke: #ef4444; stroke-width: 2.5; }
  `]
})
export class ConvexHullWidget {
  pts = signal<P[]>(this.numbered(START));
  idx = signal(0);

  fr = computed(() => hullFrames(this.pts()));
  f = computed(() => this.fr()[Math.min(this.idx(), this.fr().length - 1)]);
  done = computed(() => this.idx() >= this.fr().length - 1);
  last = computed(() => this.f().chain[this.f().chain.length - 1]);
  hullIds = computed(() => this.f().lower.map(p => p.id).join(', '));

  message = computed(() => {
    const f = this.f();
    if (f.kind !== 'done' || f.lower.length < 3) return f.say;
    const h = f.lower;
    let area = 0, len = 0;
    for (let i = 0; i < h.length; i++) {
      const a = h[i], b = h[(i + 1) % h.length];
      area += a.x * b.y - b.x * a.y;
      len += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return `Fence posts at pegs ${this.hullIds()}: ${h.length} of ${this.pts().length} pegs. Fence length ${Math.round(len)} m, enclosed area ${Math.abs(area / 2).toLocaleString('en-US')} m² (shoelace formula). Sorting is O(n log n); each peg is added and removed at most once, so the walk is O(n).`;
  });

  /** Number pegs by their west-to-east order so the labels match the algorithm’s order. */
  private numbered(raw: [number, number][]): P[] {
    return raw.map(([x, y]) => ({ x, y })).sort((a, b) => a.x - b.x || a.y - b.y).map((p, i) => ({ ...p, id: i + 1 }));
  }
  sy(y: number) { return SIZE - y; }
  poly(ps: P[]) { return ps.map(p => `${p.x},${this.sy(p.y)}`).join(' '); }
  inChain(p: P) { return this.f().chain.includes(p) || this.f().lower.includes(p); }

  add(e: MouseEvent) {
    const r = (e.currentTarget as Element).getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * SIZE), y = Math.round(SIZE - ((e.clientY - r.top) / r.height) * SIZE);
    if (x < 8 || y < 8 || x > SIZE - 8 || y > SIZE - 8 || this.pts().length >= 24) return;
    if (this.pts().some(p => Math.hypot(p.x - x, p.y - y) < 14)) return;
    this.pts.set(this.numbered([...this.pts().map(p => [p.x, p.y] as [number, number]), [x, y]]));
    this.idx.set(0);
  }
  reset() { this.pts.set(this.numbered(START)); this.idx.set(0); }
}
