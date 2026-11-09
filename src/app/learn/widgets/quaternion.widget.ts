import { Component, computed, signal } from '@angular/core';
import { Iso, V3, f3, unit3, v3 } from './iso';
import { mApply3, noseBox, qAxisAngle, qLen, qNeg, qToM } from './quat';
import { num } from './vec-plane';

type Axis = 'x' | 'y' | 'z' | 'diag';

const AXES: { k: Axis; label: string; v: V3 }[] = [
  { k: 'x', label: 'X axis', v: v3(1, 0, 0) },
  { k: 'y', label: 'Y axis', v: v3(0, 1, 0) },
  { k: 'z', label: 'Z axis', v: v3(0, 0, 1) },
  { k: 'diag', label: 'Diagonal (1, 1, 1)', v: unit3(v3(1, 1, 1)) }
];
const BODY = noseBox(1.3, 0.55, 0.3);

/** An axis and an angle become four numbers: q = (cos θ/2, sin θ/2 · k). */
@Component({
  selector: 'w-quaternion',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A quaternion is an axis and half an angle</h3></div>
      <div class="w-controls" role="group" aria-label="Rotation axis">
        @for (a of axes; track a.k) {
          <button type="button" class="w-btn" [class.on]="axis() === a.k" [attr.aria-pressed]="axis() === a.k" (click)="axis.set(a.k)">{{ a.label }}</button>
        }
      </div>
      <div class="w-controls">
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="neg()" (change)="neg.set(!neg())" /> Use −q instead of q</label>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 270" class="view" role="img" [attr.aria-label]="message()">
          @for (a of frame; track a.l) {
            <line [attr.x1]="cam.p(o).x" [attr.y1]="cam.p(o).y" [attr.x2]="cam.p(a.v).x" [attr.y2]="cam.p(a.v).y" class="ax" />
            <text [attr.x]="cam.p(a.v).x + 3" [attr.y]="cam.p(a.v).y + 4" class="lbl">{{ a.l }}</text>
          }
          @for (e of edges; track $index) {
            <line [attr.x1]="cam.p(start[e[0]]).x" [attr.y1]="cam.p(start[e[0]]).y" [attr.x2]="cam.p(start[e[1]]).x" [attr.y2]="cam.p(start[e[1]]).y" class="ghost3" />
          }
          <line [attr.x1]="cam.p(axLine()[0]).x" [attr.y1]="cam.p(axLine()[0]).y" [attr.x2]="cam.p(axLine()[1]).x" [attr.y2]="cam.p(axLine()[1]).y" class="rot-ax" />
          <polygon [attr.points]="cam.pts(top())" class="top" />
          @for (e of edges; track $index) {
            <line [attr.x1]="cam.p(body()[e[0]]).x" [attr.y1]="cam.p(body()[e[0]]).y" [attr.x2]="cam.p(body()[e[1]]).x" [attr.y2]="cam.p(body()[e[1]]).y" class="edge" />
          }
        </svg>
        <div>
          <label class="w-field mb-2">angle θ = {{ angle() }}°
            <input type="range" min="-360" max="360" step="10" [value]="angle()" (input)="angle.set(+$any($event.target).value)" />
          </label>
          <div class="bars" role="img" [attr.aria-label]="'q = ' + qText()">
            @for (c of comps(); track c.k) {
              <div class="bar-row">
                <span class="mono k">{{ c.k }}</span>
                <span class="track"><span class="zero"></span><span class="fill" [class.neg]="c.v < 0" [style.left.%]="c.v < 0 ? 50 + c.v * 50 : 50" [style.width.%]="abs(c.v) * 50"></span></span>
                <span class="mono v">{{ num(c.v, 3) }}</span>
              </div>
            }
          </div>
          <table class="wtable mono mt-2"><tbody>
            <tr><th>θ / 2</th><td>{{ angle() / 2 }}°</td></tr>
            <tr><th>w = cos θ/2</th><td>{{ num(q().w, 3) }}</td></tr>
            <tr><th>(x, y, z) = sin θ/2 · k</th><td>{{ f3(vec(), 3) }}</td></tr>
            <tr><th>|q|</th><td class="ok">{{ num(len(), 3) }}</td></tr>
            <tr><th>nose (1, 0, 0) →</th><td>{{ f3(nose(), 2) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.info]="!special()" [class.ok]="special()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .ax { stroke: var(--text-muted); stroke-width: 1.2; }
    .rot-ax { stroke: #f59e0b; stroke-width: 2.5; stroke-dasharray: 6 4; }
    .ghost3 { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.8; }
    .edge { stroke: #3b82f6; stroke-width: 2; stroke-linecap: round; }
    .top { fill: rgba(59, 130, 246, 0.25); stroke: none; }
    .bars { display: grid; gap: 6px; }
    .bar-row { display: grid; grid-template-columns: 1.2rem 1fr 3.6rem; align-items: center; gap: 8px; }
    .bar-row .k { font-weight: 800; }
    .bar-row .v { text-align: right; }
    .track { position: relative; height: 14px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color); }
    .zero { position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: var(--text-muted); }
    .fill { position: absolute; top: 2px; bottom: 2px; background: #3b82f6; border-radius: 2px; }
    .fill.neg { background: #f59e0b; }
  `]
})
export class QuaternionWidget {
  readonly num = num;
  readonly f3 = f3;
  readonly axes = AXES;
  readonly cam = new Iso(30, 150, 145, 'se');
  readonly o = v3(0, 0, 0);
  readonly frame = [{ l: 'X', v: v3(3.4, 0, 0) }, { l: 'Y', v: v3(0, 3.4, 0) }, { l: 'Z', v: v3(0, 0, 3.1) }];
  readonly edges = BODY.edges;
  readonly start = BODY.corners;

  axis = signal<Axis>('z');
  angle = signal(90);
  neg = signal(false);

  k = computed(() => AXES.find(a => a.k === this.axis())!.v);
  q = computed(() => { const q = qAxisAngle(this.k(), this.angle()); return this.neg() ? qNeg(q) : q; });
  vec = computed(() => v3(this.q().x, this.q().y, this.q().z));
  len = computed(() => qLen(this.q()));
  comps = computed(() => { const q = this.q(); return [{ k: 'w', v: q.w }, { k: 'x', v: q.x }, { k: 'y', v: q.y }, { k: 'z', v: q.z }]; });
  m = computed(() => qToM(this.q()));
  body = computed(() => BODY.corners.map(p => mApply3(this.m(), p)));
  top = computed(() => BODY.top.map(i => this.body()[i]));
  nose = computed(() => mApply3(this.m(), v3(1, 0, 0)));
  axLine = computed(() => { const k = this.k(); return [v3(-2.6 * k.x, -2.6 * k.y, -2.6 * k.z), v3(3 * k.x, 3 * k.y, 3 * k.z)]; });
  /** w = ±1: no turn at all, whatever the signs say. */
  special = computed(() => Math.abs(Math.abs(this.q().w) - 1) < 1e-9);
  qText = computed(() => { const q = this.q(); return `(${num(q.w, 3)}, ${num(q.x, 3)}, ${num(q.y, 3)}, ${num(q.z, 3)})`; });

  message = computed(() => {
    const t = this.angle(), q = this.q();
    if (this.special()) {
      return q.w > 0
        ? `θ = ${t}°: q = (1, 0, 0, 0), the identity. The box has not moved.`
        : `θ = ${t}°: q = (−1, 0, 0, 0), yet the box is back where it started. A full turn only takes the half-angle to 180°, so q and −q are the same rotation. The object has to turn twice, through 720°, before q is back to (1, 0, 0, 0).`;
    }
    const n = this.neg() ? ' Every sign has flipped, but the box has not moved: −q is the same rotation as q.' : '';
    return `${this.neg() ? '−q = −' : 'q = '}(cos ${t / 2}°, sin ${t / 2}° · k). The axis sits in x, y, z, scaled by sin θ/2, and w = cos θ/2 says how far to turn. All four squared add up to 1, which is why the length stays 1.${n}`;
  });

  abs(v: number) { return Math.abs(v); }
}
