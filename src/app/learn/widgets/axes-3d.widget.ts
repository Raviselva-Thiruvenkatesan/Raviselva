import { Component, computed, signal } from '@angular/core';

type V = [number, number, number];
type Conv = 'bim' | 'gltf' | 'unity';

/**
 * Each convention as the world direction of its X, Y and Z axes. The world here is the BIM frame:
 * right-handed, x east, y north, z up, so "world coordinates" are also the BIM coordinates of a point.
 */
const CONVENTIONS: Record<Conv, { label: string; axes: [V, V, V]; up: string; hand: 'right' | 'left'; who: string }> = {
  bim: { label: 'Z-up, right-handed', axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], up: 'Z', hand: 'right', who: 'Revit, IFC, AutoCAD, Rhino' },
  gltf: { label: 'Y-up, right-handed', axes: [[1, 0, 0], [0, 0, 1], [0, -1, 0]], up: 'Y', hand: 'right', who: 'glTF, three.js' },
  unity: { label: 'Y-up, left-handed', axes: [[1, 0, 0], [0, 0, 1], [0, 1, 0]], up: 'Y', hand: 'left', who: 'Unity' }
};
const COLORS = ['#ef4444', '#10b981', '#3b82f6'];
const NAMES = ['X', 'Y', 'Z'];
const S = 34;                       // pixels per unit
const CX = 170, CY = 150;           // pixel position of the origin

/** Rotatable 3D axes with a point, in three common axis conventions. */
@Component({
  selector: 'w-axes-3d',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Axes, handedness and “up”</h3></div>
      <div class="w-controls" role="group" aria-label="Convention">
        @for (c of convs; track c) {
          <button type="button" class="w-btn" [class.on]="conv() === c" (click)="conv.set(c)" [attr.aria-pressed]="conv() === c">{{ info(c).label }}</button>
        }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 340 250" class="gsvg" role="img" [attr.aria-label]="'Point ' + coords() + ' in a ' + info(conv()).label + ' system'">
          <!-- floor grid on the horizontal plane -->
          @for (g of grid; track g) {
            <line [attr.x1]="sx([g, -1, 0])" [attr.y1]="sy([g, -1, 0])" [attr.x2]="sx([g, 4, 0])" [attr.y2]="sy([g, 4, 0])" class="floor" />
            <line [attr.x1]="sx([-1, g, 0])" [attr.y1]="sy([-1, g, 0])" [attr.x2]="sx([4, g, 0])" [attr.y2]="sy([4, g, 0])" class="floor" />
          }
          <!-- path from the origin to the point: along the first axis, then along the other floor axis, then up -->
          <polyline [attr.points]="path()" class="path" />
          @for (i of idx; track i) {
            <line [attr.x1]="sx([0, 0, 0])" [attr.y1]="sy([0, 0, 0])" [attr.x2]="sx(axisEnd(i))" [attr.y2]="sy(axisEnd(i))" [attr.stroke]="colors[i]" class="axis" />
            <circle [attr.cx]="sx(axisEnd(i))" [attr.cy]="sy(axisEnd(i))" r="3" [attr.fill]="colors[i]" />
            <text [attr.x]="sx(axisLabel(i))" [attr.y]="sy(axisLabel(i)) + 4" text-anchor="middle" [attr.fill]="colors[i]" class="alabel">+{{ names[i] }}</text>
          }
          <line [attr.x1]="sx(floorPt())" [attr.y1]="sy(floorPt())" [attr.x2]="sx(world())" [attr.y2]="sy(world())" class="drop" />
          <circle [attr.cx]="sx(floorPt())" [attr.cy]="sy(floorPt())" r="2.5" class="foot" />
          <circle [attr.cx]="sx(world())" [attr.cy]="sy(world())" r="6" class="pt" />
          <text [attr.x]="sx(world()) + (sx(world()) > 220 ? -9 : 9)" [attr.y]="sy(world()) - 9" [attr.text-anchor]="sx(world()) > 220 ? 'end' : 'start'" class="ptl">P {{ coords() }}</text>
          <!-- positive rotation about "up", seen from above -->
          <path [attr.d]="arc()" class="spin" />
          <text x="12" y="240" class="small-t">{{ info(conv()).hand === 'right' ? '↺' : '↻' }} positive turn about +{{ info(conv()).up }}, seen from above</text>
        </svg>
        <div>
          @for (i of idx; track i) {
            <label class="w-field d-flex mb-2">{{ names[i] }} = {{ p()[i] }}
              <input type="range" min="-1" max="4" step="0.5" [value]="p()[i]" (input)="setP(i, +$any($event.target).value)" [attr.aria-label]="names[i] + ' coordinate'" />
            </label>
          }
          <label class="w-field d-flex mb-2">Turn the view {{ yaw() }}°
            <input type="range" min="-180" max="180" step="5" [value]="yaw()" (input)="yaw.set(+$any($event.target).value)" />
          </label>
          <label class="w-field d-flex mb-2">Look down {{ tilt() }}°
            <input type="range" min="0" max="90" step="5" [value]="tilt()" (input)="tilt.set(+$any($event.target).value)" />
          </label>
        </div>
      </div>
      <div class="w-msg" [class.ok]="info(conv()).hand === 'right'" [class.err]="info(conv()).hand === 'left'" aria-live="polite">
        <span><b>{{ info(conv()).label }}</b> ({{ info(conv()).who }}). Up is +{{ info(conv()).up }}.
          {{ info(conv()).hand === 'right' ? 'Right hand: fingers along +X, curl towards +Y, thumb gives +Z.' : 'Here the LEFT hand gives +Z from +X and +Y: the mirror image of BIM.' }}
          This point is <b>{{ bim() }}</b> in BIM (Z-up, right-handed) coordinates.</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .gsvg { max-width: 440px; }
    .floor { stroke: var(--border-color); stroke-width: 1; opacity: 0.7; }
    .axis { stroke-width: 3; stroke-linecap: round; }
    .alabel { font-size: 12px; font-weight: 800; }
    .path { fill: none; stroke: var(--text-muted); stroke-width: 1.3; stroke-dasharray: 4 3; }
    .drop { stroke: #8b5cf6; stroke-width: 1.5; stroke-dasharray: 3 3; }
    .foot { fill: var(--text-muted); }
    .pt { fill: rgba(139, 92, 246, 0.5); stroke: #8b5cf6; stroke-width: 2; }
    .ptl { font-size: 11px; font-weight: 700; fill: var(--text-main); paint-order: stroke; stroke: var(--bg-secondary); stroke-width: 4px; }
    .spin { fill: none; stroke: #f59e0b; stroke-width: 2; }
    .small-t { font-size: 10px; fill: var(--text-muted); }
    .w-field input { width: 100%; }
  `]
})
export class Axes3dWidget {
  readonly convs: Conv[] = ['bim', 'gltf', 'unity'];
  readonly idx = [0, 1, 2];
  readonly grid = [-1, 0, 1, 2, 3, 4];
  readonly colors = COLORS;
  readonly names = NAMES;

  conv = signal<Conv>('bim');
  p = signal<V>([2, 3, 2.5]);
  yaw = signal(-35);
  tilt = signal(25);

  info(c: Conv) { return CONVENTIONS[c]; }
  coords() { const p = this.p(); return `(${p.join(', ')})`; }

  /** The point in world (= BIM) coordinates. */
  world = computed<V>(() => this.combine(this.p()));
  floorPt = computed<V>(() => { const w = this.world(); return [w[0], w[1], 0]; });
  bim = computed(() => `(${this.world().map(v => +v.toFixed(2) || 0).join(', ')})`);

  path = computed(() => {
    const ax = CONVENTIONS[this.conv()].axes, p = this.p();
    const first: V = [ax[0][0] * p[0], ax[0][1] * p[0], ax[0][2] * p[0]];
    return [[0, 0, 0] as V, first, this.floorPt()].map(v => `${this.sx(v)},${this.sy(v)}`).join(' ');
  });

  /** Small arc around the up axis, drawn counter-clockwise (seen from above) for a right-handed system. */
  arc = computed(() => {
    const right = CONVENTIONS[this.conv()].hand === 'right', pts: string[] = [];
    for (let k = 0; k <= 12; k++) {
      const a = ((right ? 1 : -1) * k * 22.5 * Math.PI) / 180 + 0.3;
      const v: V = [0.8 * Math.cos(a), 0.8 * Math.sin(a), 3.3];
      pts.push(`${k ? 'L' : 'M'}${this.sx(v).toFixed(1)},${this.sy(v).toFixed(1)}`);
    }
    const last = pts[pts.length - 1].slice(1).split(',').map(Number), prev = pts[pts.length - 2].slice(1).split(',').map(Number);
    const dx = last[0] - prev[0], dy = last[1] - prev[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    const head = `M${(last[0] - ux * 6 - uy * 4).toFixed(1)},${(last[1] - uy * 6 + ux * 4).toFixed(1)} L${last[0]},${last[1]} L${(last[0] - ux * 6 + uy * 4).toFixed(1)},${(last[1] - uy * 6 - ux * 4).toFixed(1)}`;
    return pts.join(' ') + ' ' + head;
  });

  axisEnd(i: number): V { return CONVENTIONS[this.conv()].axes[i].map(v => v * 3.5) as V; }
  axisLabel(i: number): V { return CONVENTIONS[this.conv()].axes[i].map(v => v * 4.1) as V; }

  private combine(p: V): V {
    const ax = CONVENTIONS[this.conv()].axes;
    return [0, 1, 2].map(k => ax[0][k] * p[0] + ax[1][k] * p[1] + ax[2][k] * p[2]) as V;
  }

  /** Orthographic view: turn about the vertical, then tilt so we look down a little. */
  private view(v: V) {
    const a = (this.yaw() * Math.PI) / 180, e = (this.tilt() * Math.PI) / 180;
    const rx = v[0] * Math.cos(a) - v[1] * Math.sin(a);
    const depth = v[0] * Math.sin(a) + v[1] * Math.cos(a);
    return { x: rx, y: v[2] * Math.cos(e) + depth * Math.sin(e) };
  }
  sx(v: V) { return CX + this.view(v).x * S; }
  sy(v: V) { return CY - this.view(v).y * S; }

  setP(i: number, v: number) { this.p.update(p => p.map((x, k) => (k === i ? v : x)) as V); }
}
