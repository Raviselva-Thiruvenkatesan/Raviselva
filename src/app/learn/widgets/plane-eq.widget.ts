import { Component, computed, signal } from '@angular/core';
import { Iso, V3, add3, cross3, dot3, f3, len3, mul3, rad, sub3, unit3, v3 } from './iso';
import { arrowHead, num } from './vec-plane';

const PRESETS = [
  { label: 'Floor level', tilt: 0, az: 0, d: -3 },
  { label: 'Wall face', tilt: 90, az: 90, d: -3 },
  { label: 'Roof slope', tilt: 35, az: 45, d: -3 },
  { label: 'Section cut', tilt: 90, az: 0, d: -2 }
];

/** A plane from a unit normal and d: n·X + d = 0, drawn in 3D. */
@Component({
  selector: 'w-plane-eq',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A plane: normal and d</h3></div>
      <div class="w-controls" role="group" aria-label="Examples">
        @for (pr of presets; track pr.label) { <button type="button" class="w-btn" (click)="load(pr)">{{ pr.label }}</button> }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 280" class="view" role="img" [attr.aria-label]="'Plane ' + equation()">
          <polygon [attr.points]="cam.pts(ground)" class="ground" />
          @for (ax of axes; track ax.name) {
            <line [attr.x1]="o.x" [attr.y1]="o.y" [attr.x2]="cam.p(ax.to).x" [attr.y2]="cam.p(ax.to).y" class="axis" />
            <text [attr.x]="cam.p(ax.to).x + ax.dx" [attr.y]="cam.p(ax.to).y + ax.dy" class="axl">{{ ax.name }}</text>
          }
          <polygon [attr.points]="cam.pts(patch())" class="patch" />
          @for (g of gridLines(); track $index) { <polyline [attr.points]="cam.pts(g)" class="pgrid" /> }
          <!-- the foot of the perpendicular from the origin: |d| away -->
          <line [attr.x1]="o.x" [attr.y1]="o.y" [attr.x2]="cam.p(foot()).x" [attr.y2]="cam.p(foot()).y" class="dline" />
          <circle [attr.cx]="cam.p(foot()).x" [attr.cy]="cam.p(foot()).y" r="4" class="foot" />
          <text [attr.x]="cam.p(foot()).x - 22" [attr.y]="cam.p(foot()).y + 4" class="lbl">P0</text>
          <line [attr.x1]="cam.p(centre()).x" [attr.y1]="cam.p(centre()).y" [attr.x2]="cam.p(tip()).x" [attr.y2]="cam.p(tip()).y" class="normal" />
          <polygon [attr.points]="head()" class="nhead" />
          <text [attr.x]="cam.p(tip()).x + 6" [attr.y]="cam.p(tip()).y" class="nl">n</text>
          <circle [attr.cx]="o.x" [attr.cy]="o.y" r="3" class="origin" />
        </svg>
        <div>
          <label class="w-field mb-2">tilt of n from vertical = {{ tilt() }}°
            <input type="range" min="0" max="90" step="1" [value]="tilt()" (input)="tilt.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">direction of n in plan = {{ az() }}°
            <input type="range" min="0" max="345" step="15" [value]="az()" (input)="az.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">d = {{ num(d()) }}
            <input type="range" min="-4" max="4" step="0.25" [value]="d()" (input)="d.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            <tr><th>n = (a, b, c)</th><td>{{ f3(n(), 3) }}</td></tr>
            <tr><th>|n|</th><td>{{ num(len3(n()), 3) }}</td></tr>
            <tr><th>equation</th><td class="ok">{{ equation() }}</td></tr>
            <tr><th>P0 = −d × n</th><td>{{ f3(foot()) }}</td></tr>
            <tr><th>n·P0 + d</th><td>{{ num(dot3(n(), foot()) + d(), 3) }}</td></tr>
            <tr><th>distance from origin</th><td>|d| = {{ num(Math.abs(d())) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .ground { fill: rgba(148, 163, 184, 0.12); stroke: var(--border-color); stroke-width: 1; }
    .axis { stroke: var(--text-muted); stroke-width: 1.5; }
    .axl { font-size: 11px; font-weight: 800; fill: var(--text-muted); }
    .patch { fill: rgba(59, 130, 246, 0.22); stroke: #3b82f6; stroke-width: 2; }
    .pgrid { fill: none; stroke: #3b82f6; stroke-width: 0.8; opacity: 0.45; }
    .dline { stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 4 3; }
    .foot { fill: #f59e0b; }
    .normal { stroke: #10b981; stroke-width: 3; }
    .nhead { fill: #10b981; }
    .nl { font-size: 13px; font-weight: 800; font-style: italic; fill: #059669; }
    .origin { fill: var(--text-main); }
  `]
})
export class PlaneEqWidget {
  readonly cam = new Iso(20, 150, 175);
  readonly o = this.cam.p(v3(0, 0, 0));
  readonly presets = PRESETS;
  readonly ground: V3[] = [v3(0, 0, 0), v3(5, 0, 0), v3(5, 5, 0), v3(0, 5, 0)];
  readonly axes = [
    { name: 'X', to: v3(5.6, 0, 0), dx: 4, dy: 10 },
    { name: 'Y', to: v3(0, 5.6, 0), dx: -12, dy: 10 },
    { name: 'Z', to: v3(0, 0, 5), dx: 5, dy: 4 }
  ];
  readonly num = num;
  readonly f3 = f3;
  readonly dot3 = dot3;
  readonly len3 = len3;
  readonly Math = Math;

  tilt = signal(0);
  az = signal(0);
  d = signal(-3);

  n = computed(() => {
    const t = rad(this.tilt()), a = rad(this.az());
    const r = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x);
    return v3(r(Math.sin(t) * Math.cos(a)), r(Math.sin(t) * Math.sin(a)), r(Math.cos(t)));
  });
  foot = computed(() => mul3(this.n(), -this.d()));
  /** The patch is centred where the plane passes closest to the middle of the scene, so it stays in view. */
  centre = computed(() => { const c = v3(2.5, 2.5, 1.5); return sub3(c, mul3(this.n(), dot3(this.n(), c) + this.d())); });
  axesInPlane = computed(() => {
    const n = this.n();
    const u = Math.abs(n.z) > 0.999 ? v3(1, 0, 0) : unit3(cross3(v3(0, 0, 1), n));
    return { u, v: cross3(n, u) };
  });
  patch = computed(() => {
    const { u, v } = this.axesInPlane(), c = this.centre(), s = 2.4;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => add3(c, add3(mul3(u, i * s), mul3(v, j * s))));
  });
  gridLines = computed(() => {
    const { u, v } = this.axesInPlane(), c = this.centre(), s = 2.4, out: V3[][] = [];
    for (const k of [-1.2, 0, 1.2]) {
      out.push([add3(c, add3(mul3(u, k), mul3(v, -s))), add3(c, add3(mul3(u, k), mul3(v, s)))]);
      out.push([add3(c, add3(mul3(v, k), mul3(u, -s))), add3(c, add3(mul3(v, k), mul3(u, s)))]);
    }
    return out;
  });
  tip = computed(() => add3(this.centre(), mul3(this.n(), 1.8)));
  head = computed(() => {
    const a = this.cam.p(this.centre()), b = this.cam.p(this.tip());
    return arrowHead(a.x, a.y, b.x, b.y, 10);
  });

  equation = computed(() => {
    const n = this.n(), parts: string[] = [];
    const term = (k: number, s: string) => {
      if (Math.abs(k) < 5e-4) return;
      const v = num(Math.abs(k), 3).replace(/\.?0+$/, '');
      const sign = k < 0 ? (parts.length ? '− ' : '−') : parts.length ? '+ ' : '';
      parts.push(`${sign}${v === '1' ? '' : v}${s}`);
    };
    term(n.x, 'x'); term(n.y, 'y'); term(n.z, 'z');
    const dv = this.d();
    const dpart = Math.abs(dv) < 1e-9 ? '' : ` ${dv < 0 ? '−' : '+'} ${num(Math.abs(dv)).replace(/\.?0+$/, '')}`;
    return `${parts.join(' ')}${dpart} = 0`;
  });

  message = computed(() => {
    const t = this.tilt();
    const kind = t === 0 ? 'horizontal: a floor, ceiling or level' : t === 90 ? 'vertical: a wall face or a section cut' : `sloping at ${t}°, like a roof or a ramp`;
    return `This plane is ${kind}. Every point X on it satisfies n·X + d = 0. Because n is a unit vector, |d| = ${num(Math.abs(this.d()))} is the plane’s distance from the origin, and P0 = −d × n is its closest point to the origin.`;
  });

  load(p: { tilt: number; az: number; d: number }) {
    this.tilt.set(p.tilt);
    this.az.set(p.az);
    this.d.set(p.d);
  }
}
