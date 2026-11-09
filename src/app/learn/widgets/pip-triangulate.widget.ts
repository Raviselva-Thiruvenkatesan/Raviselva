import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, cross, minus, num } from './vec-plane';

type K = 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'T';
type Mode = 'pip' | 'ears';

const VERTS: K[] = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5'];

interface Step { tri: [number, number, number]; skipped: { v: number; why: string }[] }

const area2 = (pts: P[]) => pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0);

/** Is p inside triangle abc (counterclockwise), boundary included? */
function inTri(p: P, a: P, b: P, c: P) {
  return cross(minus(b, a), minus(p, a)) >= -1e-9 && cross(minus(c, b), minus(p, b)) >= -1e-9 && cross(minus(a, c), minus(p, c)) >= -1e-9;
}

/** Ear clipping, recording each ear found and the vertices rejected on the way. */
function earClip(pts: P[]): { steps: Step[]; ok: boolean } {
  let idx = pts.map((_, i) => i);
  if (area2(pts) < 0) idx.reverse();                       // work counterclockwise
  const steps: Step[] = [];
  while (idx.length > 3) {
    const skipped: Step['skipped'] = [];
    let found = false;
    for (let k = 0; k < idx.length; k++) {
      const i = idx[(k + idx.length - 1) % idx.length], j = idx[k], l = idx[(k + 1) % idx.length];
      const a = pts[i], b = pts[j], c = pts[l];
      if (cross(minus(b, a), minus(c, b)) <= 1e-9) { skipped.push({ v: j, why: 'reflex (turns right)' }); continue; }
      const blocker = idx.find(m => m !== i && m !== j && m !== l && inTri(pts[m], a, b, c));
      if (blocker !== undefined) { skipped.push({ v: j, why: `V${blocker} is inside its triangle` }); continue; }
      steps.push({ tri: [i, j, l], skipped });
      idx = idx.filter(m => m !== j);
      found = true;
      break;
    }
    if (!found) return { steps, ok: false };
  }
  steps.push({ tri: [idx[0], idx[1], idx[2]], skipped: [] });
  return { steps, ok: true };
}

/** Point in polygon by ray casting, and triangulation by ear clipping. */
@Component({
  selector: 'w-pip-triangulate',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside or outside, and cutting into triangles</h3></div>
      <div class="w-controls" role="group" aria-label="Mode">
        <button type="button" class="w-btn" [class.on]="mode() === 'pip'" [attr.aria-pressed]="mode() === 'pip'" (click)="mode.set('pip')">Point in polygon</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'ears'" [attr.aria-pressed]="mode() === 'ears'" (click)="mode.set('ears')">Ear clipping</button>
        @if (mode() === 'ears') {
          <button type="button" class="w-btn" (click)="next()" [disabled]="shown() >= clip().steps.length">Clip the next ear</button>
          <button type="button" class="w-btn" (click)="shown.set(0)">Start again</button>
        }
      </div>
      <p class="w-hint">{{ mode() === 'pip' ? 'Drag the test point T, and the room’s corners.' : 'Clip ears one at a time. Drag a corner to make the room more awkward.' }}</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <polygon [attr.points]="line(poly())" class="room" [class.in]="mode() === 'pip' && inside()" />
          @if (mode() === 'pip') {
            <line [attr.x1]="px(pt('T').x)" [attr.y1]="py(pt('T').y)" [attr.x2]="px(6.5)" [attr.y2]="py(pt('T').y)" class="ray" />
            @for (h of hits(); track $index) { <circle [attr.cx]="px(h.x)" [attr.cy]="py(h.y)" r="5" class="hitp" /> }
          } @else {
            @for (s of clip().steps.slice(0, shown()); track $index) {
              <polygon [attr.points]="line(triPts(s.tri))" class="tri" [style.fill]="colour($index)" />
            }
            @if (current(); as c) {
              <polygon [attr.points]="line(triPts(c.tri))" class="ear" />
              @for (r of c.skipped; track r.v) {
                <circle [attr.cx]="px(poly()[r.v].x)" [attr.cy]="py(poly()[r.v].y)" r="10" class="rej" />
              }
            }
          }
          @for (k of keys(); track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="k === 'T' ? 'Test point T' : 'Corner ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="5.5" class="dot" [class.alt]="k === 'T'" />
              <text [attr.x]="px(pt(k).x)" [attr.y]="py(pt(k).y) - 11" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          @if (mode() === 'pip') {
            <table class="wtable mono"><tbody>
              <tr><th>edges crossed by the ray</th><td>{{ hits().length }}</td></tr>
              <tr><th>odd or even</th><td>{{ hits().length % 2 ? 'odd' : 'even' }}</td></tr>
              <tr><th>T is</th><td [class.ok]="inside()" [class.hl]="!inside()">{{ inside() ? 'inside' : 'outside' }}</td></tr>
            </tbody></table>
          } @else {
            <table class="wtable mono"><tbody>
              <tr><th>corners</th><td>{{ poly().length }}</td></tr>
              <tr><th>triangles so far</th><td>{{ shown() }} of {{ poly().length - 2 }}</td></tr>
              @if (current(); as c) {
                <tr><th>latest ear</th><td class="ok">V{{ c.tri[1] }} (V{{ c.tri[0] }}, V{{ c.tri[1] }}, V{{ c.tri[2] }})</td></tr>
                @for (r of c.skipped; track r.v) { <tr><th>skipped V{{ r.v }}</th><td class="hl">{{ r.why }}</td></tr> }
              }
              <tr><th>area of the triangles</th><td>{{ num(triArea()) }}</td></tr>
              <tr><th>area of the room</th><td>{{ num(Math.abs(area2(poly())) / 2) }}</td></tr>
            </tbody></table>
          }
        </div>
      </div>
      <div class="w-msg" [class.ok]="mode() === 'pip' ? inside() : clip().ok" [class.info]="mode() === 'pip' && !inside()" [class.err]="mode() === 'ears' && !clip().ok" aria-live="polite">
        <span>{{ message() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .room { fill: rgba(148, 163, 184, 0.15); stroke: #3b82f6; stroke-width: 2.5; stroke-linejoin: round; }
    .room.in { fill: rgba(16, 185, 129, 0.18); }
    .ray { stroke: #8b5cf6; stroke-width: 2; stroke-dasharray: 5 3; }
    .hitp { fill: #f59e0b; stroke: var(--bg-main); stroke-width: 1.5; }
    .tri { stroke: var(--bg-main); stroke-width: 1.5; opacity: 0.75; }
    .ear { fill: none; stroke: #10b981; stroke-width: 3; stroke-dasharray: 6 3; }
    .rej { fill: none; stroke: #ef4444; stroke-width: 2; stroke-dasharray: 3 2; }
  `]
})
export class PipTriangulateWidget extends DragPlane<K> {
  readonly num = num;
  readonly Math = Math;
  readonly area2 = area2;

  protected readonly pts = {
    V0: signal<P>({ x: -4.5, y: -4 }), V1: signal<P>({ x: 4.5, y: -4 }), V2: signal<P>({ x: 4.5, y: 0 }),
    V3: signal<P>({ x: 0, y: 0 }), V4: signal<P>({ x: 0, y: 4 }), V5: signal<P>({ x: -4.5, y: 4 }), T: signal<P>({ x: 2, y: 2 })
  };
  mode = signal<Mode>('pip');
  shown = signal(0);

  keys = computed<K[]>(() => (this.mode() === 'pip' ? [...VERTS, 'T'] : VERTS));
  poly = computed(() => VERTS.map(k => this.pt(k)));

  /** Edges that the ray from T to the right crosses, using the half-open rule so vertices count once. */
  hits = computed(() => {
    const t = this.pt('T'), v = this.poly(), out: P[] = [];
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
      const a = v[i], b = v[j];
      if ((a.y > t.y) !== (b.y > t.y)) {
        const x = a.x + ((t.y - a.y) * (b.x - a.x)) / (b.y - a.y);
        if (x > t.x) out.push({ x, y: t.y });
      }
    }
    return out;
  });
  inside = computed(() => this.hits().length % 2 === 1);

  clip = computed(() => earClip(this.poly()));
  current = computed(() => (this.shown() > 0 ? this.clip().steps[this.shown() - 1] : null));
  triArea = computed(() => this.clip().steps.slice(0, this.shown()).reduce((s, st) => s + Math.abs(area2(this.triPts(st.tri))) / 2, 0));

  message = computed(() => {
    if (this.mode() === 'pip') {
      const n = this.hits().length;
      return `The ray from T crosses ${n} edge${n === 1 ? '' : 's'}: ${n % 2 ? 'an odd number, so T is inside' : 'an even number, so T is outside'}. Every crossing switches between outside and inside. Move T level with a corner: the half-open rule (one end counts, the other does not) still counts it once.`;
    }
    if (!this.clip().ok) return 'No ear found: the room’s boundary crosses itself, so it cannot be triangulated as it is. Fix the boundary first.';
    const n = this.poly().length;
    if (this.shown() === 0) return `A simple polygon with ${n} corners always splits into ${n - 2} triangles. An ear is a convex corner whose triangle contains no other corner: cut it off and repeat.`;
    if (this.shown() >= this.clip().steps.length) return `Done: ${n - 2} triangles whose areas add up to the room’s area. This is how slabs, floors and faces become meshes for rendering and analysis.`;
    const c = this.current()!;
    return `V${c.tri[1]} is an ear, so triangle (V${c.tri[0]}, V${c.tri[1]}, V${c.tri[2]}) is cut off.${c.skipped.length ? ' Corners circled in red were tried first and rejected.' : ''}`;
  });

  triPts(t: [number, number, number]) { const v = this.poly(); return t.map(i => v[i]); }
  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
  colour(i: number) { return ['#93c5fd', '#c4b5fd', '#6ee7b7', '#fcd34d', '#f9a8d4', '#a5f3fc'][i % 6]; }
  next() { this.shown.update(s => Math.min(this.clip().steps.length, s + 1)); }

  protected override place(k: K, p: P) {
    super.place(k, p);
    if (k !== 'T') this.shown.set(0);
  }
}
