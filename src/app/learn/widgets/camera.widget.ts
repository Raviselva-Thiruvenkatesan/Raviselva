import { Component, computed, signal } from '@angular/core';
import { V3, cross3, dot3, sub3, unit3, v3, add3, mul3 } from './iso';
import { P, num } from './vec-plane';

interface Box { lo: V3; hi: V3 }
/** A small frame building: floor slab, four columns, a roof slab and one wall. */
const BOXES: Box[] = [
  { lo: v3(0, 0, 0), hi: v3(6, 4, 0.2) },
  { lo: v3(0, 0, 0.2), hi: v3(0.3, 0.3, 3) }, { lo: v3(5.7, 0, 0.2), hi: v3(6, 0.3, 3) },
  { lo: v3(0, 3.7, 0.2), hi: v3(0.3, 4, 3) }, { lo: v3(5.7, 3.7, 0.2), hi: v3(6, 4, 3) },
  { lo: v3(0, 0, 3), hi: v3(6, 4, 3.25) },
  { lo: v3(2.9, 0.3, 0.2), hi: v3(3.1, 3.7, 3) }
];
const TARGET = v3(3, 2, 1.5);
const NEAR = 0.1, W = 300, H = 200, ASPECT = W / H;

function edges(b: Box): [V3, V3][] {
  const c = (i: number) => v3(i & 1 ? b.hi.x : b.lo.x, i & 2 ? b.hi.y : b.lo.y, i & 4 ? b.hi.z : b.lo.z);
  const out: [V3, V3][] = [];
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) out.push([c(i), c(i | bit)]);
  return out;
}

/** Liang–Barsky: the part of segment a→b inside an axis-aligned box, or null. */
function clipBox(a: V3, b: V3, box: Box): [V3, V3] | null {
  let t0 = 0, t1 = 1;
  const d = sub3(b, a);
  for (const k of ['x', 'y', 'z'] as const) {
    for (const [lim, sgn] of [[box.lo[k], -1], [box.hi[k], 1]] as [number, number][]) {
      const p = sgn * d[k], q = sgn * (lim - a[k]);
      if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      if (t0 > t1) return null;
    }
  }
  return [add3(a, mul3(d, t0)), add3(a, mul3(d, t1))];
}

/** A camera looking at a small building: plan of the view cone, and the picture it makes. */
@Component({
  selector: 'w-camera',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From camera to picture</h3></div>
      <div class="w-controls" role="group" aria-label="Projection">
        <button type="button" class="w-btn" [class.on]="persp()" [attr.aria-pressed]="persp()" (click)="persp.set(true)">Perspective</button>
        <button type="button" class="w-btn" [class.on]="!persp()" [attr.aria-pressed]="!persp()" (click)="persp.set(false)">Orthographic</button>
        <button type="button" class="w-btn" [class.on]="boxOn()" [attr.aria-pressed]="boxOn()" (click)="boxOn.set(!boxOn())">Section box</button>
      </div>
      <div class="w-grid two">
        <div>
          <svg viewBox="0 0 300 200" class="pic" role="img" [attr.aria-label]="message()">
            <rect x="0.5" y="0.5" width="299" height="199" class="frame" />
            @for (s of image(); track $index) {
              <line [attr.x1]="s[0].x" [attr.y1]="s[0].y" [attr.x2]="s[1].x" [attr.y2]="s[1].y" [class]="'e ' + s[2]" />
            }
          </svg>
          <svg viewBox="0 0 300 170" class="plan" role="img" aria-label="Plan of the camera and its view cone">
            @for (b of boxes; track $index) {
              <rect [attr.x]="px(b.lo.x)" [attr.y]="py(b.hi.y)" [attr.width]="(b.hi.x - b.lo.x) * PS" [attr.height]="(b.hi.y - b.lo.y) * PS" class="fp" />
            }
            <polygon [attr.points]="cone()" class="cone" />
            <circle [attr.cx]="px(eye().x)" [attr.cy]="py(eye().y)" r="5" class="eye" />
            <circle [attr.cx]="px(target.x)" [attr.cy]="py(target.y)" r="3" class="tgt" />
            <text [attr.x]="px(eye().x) + 8" [attr.y]="py(eye().y) + 4" class="hl-t">eye</text>
          </svg>
        </div>
        <div>
          <label class="w-field mb-1">orbit = {{ orbit() }}°
            <input type="range" min="-180" max="180" step="5" [value]="orbit()" (input)="orbit.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-1">distance = {{ dist() }} m
            <input type="range" min="4" max="16" step="0.5" [value]="dist()" (input)="dist.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-1">vertical field of view = {{ fov() }}°
            <input type="range" min="20" max="100" step="5" [value]="fov()" (input)="fov.set(+$any($event.target).value)" />
          </label>
          @if (boxOn()) {
            <label class="w-field mb-1">section box top = {{ top() }} m
              <input type="range" min="0.4" max="3.4" step="0.1" [value]="top()" (input)="top.set(+$any($event.target).value)" />
            </label>
          }
          <table class="wtable mono mt-2"><tbody>
            <tr><th>eye</th><td>{{ f(eye()) }}</td></tr>
            <tr><th>forward</th><td>{{ f(basis().f) }}</td></tr>
            <tr><th>right</th><td>{{ f(basis().r) }}</td></tr>
            <tr><th>up</th><td>{{ f(basis().u) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .pic { width: 100%; max-width: 360px; display: block; margin: 0 auto 8px; background: var(--bg-main); border-radius: 6px; }
    .plan { width: 100%; max-width: 300px; display: block; margin: 0 auto; }
    .frame { fill: none; stroke: var(--border-color); }
    .e { stroke: #3b82f6; stroke-width: 1.4; stroke-linecap: round; }
    .e.cut { stroke: #ef4444; stroke-width: 2.4; }
    .e.box { stroke: #f59e0b; stroke-width: 1; stroke-dasharray: 4 3; }
    .fp { fill: rgba(148, 163, 184, 0.25); stroke: var(--text-muted); stroke-width: 1; }
    .cone { fill: rgba(245, 158, 11, 0.15); stroke: #f59e0b; stroke-width: 1.2; }
    .eye { fill: #f59e0b; }
    .tgt { fill: var(--text-main); }
  `]
})
export class CameraWidget {
  readonly boxes = BOXES;
  readonly target = TARGET;
  readonly PS = 5.5;

  persp = signal(true);
  boxOn = signal(false);
  orbit = signal(-60);
  dist = signal(10);
  fov = signal(50);
  top = signal(1.6);

  /** The eye circles the target at a fixed height above it. */
  eye = computed(() => {
    const a = (this.orbit() * Math.PI) / 180, d = this.dist();
    return v3(TARGET.x + d * Math.cos(a) * 0.9, TARGET.y + d * Math.sin(a) * 0.9, TARGET.z + d * 0.42);
  });
  /** forward f, right r = f × up, true up u = r × f: the three rows of the view matrix. */
  basis = computed(() => {
    const f = unit3(sub3(TARGET, this.eye())), r = unit3(cross3(f, v3(0, 0, 1))), u = cross3(r, f);
    return { f, r, u };
  });
  section = computed<Box>(() => ({ lo: v3(-0.01, -0.01, -0.01), hi: v3(6.01, 4.01, this.top()) }));

  /** Every edge: clipped by the section box, moved into camera space, clipped at the near plane and projected. */
  image = computed(() => {
    const out: [P, P, string][] = [];
    const lines: [V3, V3, string][] = [];
    for (const b of BOXES) {
      for (const [a, c] of edges(b)) {
        if (!this.boxOn()) { lines.push([a, c, '']); continue; }
        const k = clipBox(a, c, this.section());
        if (k) lines.push([k[0], k[1], '']);
      }
      if (this.boxOn() && b.lo.z < this.top() && b.hi.z > this.top()) {
        const z = this.top(), q = [v3(b.lo.x, b.lo.y, z), v3(b.hi.x, b.lo.y, z), v3(b.hi.x, b.hi.y, z), v3(b.lo.x, b.hi.y, z)];
        for (let i = 0; i < 4; i++) lines.push([q[i], q[(i + 1) % 4], 'cut']);
      }
    }
    if (this.boxOn()) for (const [a, c] of edges(this.section())) lines.push([a, c, 'box']);
    for (const [a, c, cls] of lines) {
      let p = this.toCam(a), q = this.toCam(c);
      if (this.persp()) {
        if (p.z < NEAR && q.z < NEAR) continue;
        if (p.z < NEAR) p = add3(p, mul3(sub3(q, p), (NEAR - p.z) / (q.z - p.z)));
        else if (q.z < NEAR) q = add3(q, mul3(sub3(p, q), (NEAR - q.z) / (p.z - q.z)));
      }
      out.push([this.project(p), this.project(q), cls]);
    }
    return out;
  });

  cone = computed(() => {
    const e = this.eye(), f = this.basis().f, r = this.basis().r, h = Math.tan((this.fov() * Math.PI) / 360) * ASPECT;
    const L = 30, a = add3(e, mul3(add3(f, mul3(r, h)), L)), b = add3(e, mul3(sub3(f, mul3(r, h)), L));
    return [e, a, b].map(p => `${this.px(p.x)},${this.py(p.y)}`).join(' ');
  });

  message = computed(() => {
    const how = this.persp()
      ? `Perspective divides x and y by the depth, so the far columns come out smaller and parallel edges meet towards vanishing points. Widen the field of view and more fits in, but everything shrinks.`
      : `Orthographic drops the division by depth: parallel edges stay parallel and sizes do not depend on distance, which is what plans, sections and elevations need. Changing the distance now changes nothing; only the size of the view box matters.`;
    const box = this.boxOn() ? ` The section box cuts every edge at z = ${num(this.top(), 1)} m; the red outlines are where it slices through columns and walls.` : '';
    return how + box;
  });

  toCam(p: V3): V3 {
    const d = sub3(p, this.eye()), { f, r, u } = this.basis();
    return v3(dot3(d, r), dot3(d, u), dot3(d, f));
  }
  project(c: V3): P {
    const t = Math.tan((this.fov() * Math.PI) / 360);
    const s = this.persp() ? c.z * t : this.dist() * t;
    return { x: W / 2 + (c.x / (s * ASPECT)) * (W / 2), y: H / 2 - (c.y / s) * (H / 2) };
  }
  px(x: number) { return 150 + (x - TARGET.x) * this.PS; }
  py(y: number) { return 85 - (y - TARGET.y) * this.PS; }
  f(v: V3) { return `(${num(v.x, 2)}, ${num(v.y, 2)}, ${num(v.z, 2)})`; }
}
