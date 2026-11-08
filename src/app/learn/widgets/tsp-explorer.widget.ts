import { Component, computed, signal } from '@angular/core';

interface Site { x: number; y: number; name: string }
type Method = 'none' | 'nearest' | 'twoopt' | 'exact';

const START: Site[] = [
  { x: 40, y: 150, name: 'Yard' }, { x: 200, y: 210, name: 'A' }, { x: 100, y: 140, name: 'B' },
  { x: 140, y: 80, name: 'C' }, { x: 40, y: 240, name: 'D' }, { x: 300, y: 120, name: 'E' },
  { x: 60, y: 70, name: 'F' }
];
const NAMES = 'ABCDEFGHIJ';
const MAX = 9;

const dist = (a: Site, b: Site) => Math.hypot(a.x - b.x, a.y - b.y);
export function tourLength(s: Site[], t: number[]) { let d = 0; for (let i = 0; i < t.length; i++) d += dist(s[t[i]], s[t[(i + 1) % t.length]]); return d; }

/** Greedy: always drive to the closest site not yet visited. */
export function nearestNeighbour(s: Site[]): number[] {
  const t = [0], left = new Set(s.map((_, i) => i).slice(1));
  while (left.size) {
    const here = s[t[t.length - 1]];
    let best = -1;
    for (const i of left) if (best < 0 || dist(here, s[i]) < dist(here, s[best])) best = i;
    t.push(best); left.delete(best);
  }
  return t;
}

/** Local search: reverse a stretch of the tour whenever that shortens it, until no reversal helps. */
export function twoOpt(s: Site[], start: number[]): { tour: number[]; moves: number } {
  let t = [...start], moves = 0, better = true;
  while (better) {
    better = false;
    for (let i = 1; i < t.length - 1; i++)
      for (let j = i + 1; j < t.length; j++) {
        const cand = [...t.slice(0, i), ...t.slice(i, j + 1).reverse(), ...t.slice(j + 1)];
        if (tourLength(s, cand) < tourLength(s, t) - 1e-9) { t = cand; moves++; better = true; }
      }
  }
  return { tour: t, moves };
}

/** Exact: try every tour that starts at the yard. (n − 1)! orders. */
export function bruteForce(s: Site[]): { tour: number[]; tried: number } {
  const rest = s.map((_, i) => i).slice(1);
  let best: number[] = [0, ...rest], bestLen = tourLength(s, best), tried = 0;
  const perm = (k: number) => {
    if (k === rest.length) { tried++; const t = [0, ...rest], d = tourLength(s, t); if (d < bestLen - 1e-9) { bestLen = d; best = t; } return; }
    for (let i = k; i < rest.length; i++) {
      [rest[k], rest[i]] = [rest[i], rest[k]];
      perm(k + 1);
      [rest[k], rest[i]] = [rest[i], rest[k]];
    }
  };
  perm(0);
  return { tour: best, tried };
}

const fact = (n: number) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };

/** Travelling salesman: exact search versus greedy and local-search approximations. */
@Component({
  selector: 'w-tsp-explorer',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>The delivery round: exact vs good enough</h3></div>
      <p class="w-hint">One truck leaves the yard, visits every site once and returns. Find the shortest round. Click the plan to add sites (up to {{ max }}), click a site to remove it.</p>

      <svg viewBox="0 0 340 290" class="plan" (click)="add($event)" role="img" [attr.aria-label]="'Tour length ' + (tour().length ? round(len()) : 'none')">
        <rect x="0" y="0" width="340" height="290" class="bg" />
        @if (tour().length) { <polygon [attr.points]="poly()" class="tour" [class.exact]="method() === 'exact'" /> }
        @for (s of sites(); track $index; let i = $index) {
          <g class="site" [class.yard]="i === 0" (click)="remove(i, $event)">
            <circle [attr.cx]="s.x" [attr.cy]="s.y" [attr.r]="i === 0 ? 13 : 10" />
            <text [attr.x]="s.x" [attr.y]="s.y + 3.5" text-anchor="middle">{{ i === 0 ? 'Yard' : s.name }}</text>
          </g>
        }
      </svg>

      <div class="w-controls mt-2" role="group" aria-label="Method">
        <button type="button" class="w-btn" [class.on]="method() === 'nearest'" (click)="method.set('nearest')">Nearest neighbour</button>
        <button type="button" class="w-btn" [class.on]="method() === 'twoopt'" (click)="method.set('twoopt')">+ 2-opt fixes</button>
        <button type="button" class="w-btn primary" [class.on]="method() === 'exact'" (click)="method.set('exact')">Exact (try all)</button>
        <button type="button" class="w-btn" (click)="reset()">Reset</button>
      </div>

      <div class="tscroll">
        <table class="wtable"><tbody>
          <tr><th>Method</th><th>Length</th><th>vs best</th><th>Work</th></tr>
          <tr [class.hl]="method() === 'nearest'"><td>Nearest neighbour</td><td>{{ round(results().nn) }}</td><td>{{ pct(results().nn) }}</td><td>~n² = {{ n() * n() }}</td></tr>
          <tr [class.hl]="method() === 'twoopt'"><td>+ 2-opt</td><td>{{ round(results().two) }}</td><td>{{ pct(results().two) }}</td><td>{{ results().moves }} reversals</td></tr>
          <tr [class.hl]="method() === 'exact'"><td>Exact</td><td>{{ round(results().best) }}</td><td>best</td><td>{{ results().tried.toLocaleString('en-US') }} tours</td></tr>
        </tbody></table>
      </div>
      <div class="w-msg mt-2" [class.ok]="method() === 'exact'" [class.info]="method() !== 'exact'" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .plan { width: 100%; max-width: 400px; display: block; margin: 0 auto; cursor: crosshair; touch-action: manipulation; }
    .bg { fill: var(--bg-main); stroke: var(--border-color); }
    .tour { fill: rgba(139, 92, 246, 0.06); stroke: #8b5cf6; stroke-width: 2.5; stroke-linejoin: round; }
    .tour.exact { stroke: #10b981; fill: rgba(16, 185, 129, 0.08); }
    .site { cursor: pointer; }
    .site circle { fill: var(--bg-secondary); stroke: rgba(139, 92, 246, 0.6); stroke-width: 1.5; }
    .site.yard circle { fill: rgba(245, 158, 11, 0.35); stroke: #f59e0b; stroke-width: 2; }
    .site text { font-size: 9px; font-weight: 700; fill: var(--text-main); }
  `]
})
export class TspExplorerWidget {
  readonly max = MAX;
  sites = signal<Site[]>(START.map(s => ({ ...s })));
  method = signal<Method>('nearest');

  n = computed(() => this.sites().length);
  results = computed(() => {
    const s = this.sites(), nnTour = nearestNeighbour(s), two = twoOpt(s, nnTour), ex = bruteForce(s);
    return { nnTour, twoTour: two.tour, bestTour: ex.tour, nn: tourLength(s, nnTour), two: tourLength(s, two.tour), best: tourLength(s, ex.tour), moves: two.moves, tried: ex.tried };
  });
  tour = computed(() => {
    const r = this.results();
    return this.method() === 'exact' ? r.bestTour : this.method() === 'twoopt' ? r.twoTour : r.nnTour;
  });
  len = computed(() => tourLength(this.sites(), this.tour()));

  message = computed(() => {
    const n = this.n(), r = this.results();
    if (this.method() === 'nearest') return this.pct(r.nn) === 'best'
      ? 'Greedy: always drive to the closest unvisited site. On this layout it happens to find the best round; add or remove sites and it soon stops doing so.'
      : `Greedy: always drive to the closest unvisited site. Fast, but early choices force long drives later: this round is ${this.pct(r.nn).slice(1)} longer than the best.`;
    if (this.method() === 'twoopt') return `2-opt looks for two crossing or wasteful legs and reverses the stretch between them, until no reversal helps. ${r.moves} reversal${r.moves === 1 ? '' : 's'}: ${this.pct(r.two) === 'best' ? 'now it matches the best round' : `now ${this.pct(r.two).slice(1)} longer than the best, a local optimum it cannot escape`}. Local search like this is what real routing software does.`;
    return `The exact answer tried all ${r.tried.toLocaleString('en-US')} orders, (n − 1)! for ${n} sites. With 15 sites that is ${fact(14).toLocaleString('en-US')}; with 25 sites, about 6 × 10²³: no computer finishes. No polynomial-time exact method is known.`;
  });

  round(v: number) { return Math.round(v); }
  pct(v: number) { const b = this.results().best; return v - b < 0.5 ? 'best' : `+${(((v - b) / b) * 100).toFixed(1)}%`; }
  poly() { const s = this.sites(); return this.tour().map(i => `${s[i].x},${s[i].y}`).join(' '); }

  add(e: MouseEvent) {
    if (this.sites().length >= MAX) return;
    const r = (e.currentTarget as Element).getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 340), y = Math.round(((e.clientY - r.top) / r.height) * 290);
    if (x < 12 || y < 12 || x > 328 || y > 278 || this.sites().some(s => Math.hypot(s.x - x, s.y - y) < 24)) return;
    const used = new Set(this.sites().map(s => s.name));
    this.sites.update(s => [...s, { x, y, name: [...NAMES].find(c => !used.has(c)) ?? '?' }]);
  }
  remove(i: number, e: MouseEvent) {
    e.stopPropagation();
    if (i === 0 || this.sites().length <= 4) return;
    this.sites.update(s => s.filter((_, k) => k !== i));
  }
  reset() { this.sites.set(START.map(s => ({ ...s }))); this.method.set('nearest'); }
}
