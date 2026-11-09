import { Component, computed, signal } from '@angular/core';
import { Iso, V3, dot3, f3, v3 } from './iso';
import { euler, mApply3, mMul3, noseBox, rotY, rotZ } from './quat';
import { num } from './vec-plane';

const BODY = noseBox(1.3, 0.55, 0.3);
const RING = Array.from({ length: 49 }, (_, i) => (i * 2 * Math.PI) / 48);

/** Yaw, pitch and roll as three nested gimbal rings, and what happens to them at pitch = ±90°. */
@Component({
  selector: 'w-gimbal',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Euler angles on three gimbal rings</h3></div>
      <div class="w-controls" role="group" aria-label="Presets">
        <button type="button" class="w-btn" (click)="set(0, 0, 0)">Reset</button>
        <button type="button" class="w-btn" (click)="set(30, 20, 0)">Yaw 30°, pitch 20°</button>
        <button type="button" class="w-btn" [class.on]="locked()" (click)="set(40, 90, 0)">Pitch 90°</button>
      </div>
      <p class="w-hint">Blue ring: yaw about Z. Green: pitch about the turned Y. Red: roll about the turned X, the nose. Move the sliders, then try them again with pitch at 90°.</p>
      <div class="w-grid two">
        <svg viewBox="0 0 300 280" class="view" role="img" [attr.aria-label]="message()">
          @for (a of frame; track a.l) {
            <line [attr.x1]="cam.p(o).x" [attr.y1]="cam.p(o).y" [attr.x2]="cam.p(a.v).x" [attr.y2]="cam.p(a.v).y" class="ax" />
            <text [attr.x]="cam.p(a.v).x + 3" [attr.y]="cam.p(a.v).y + 4" class="lbl">{{ a.l }}</text>
          }
          <polyline [attr.points]="cam.pts(rings().yaw)" class="ring yaw" />
          <polyline [attr.points]="cam.pts(rings().pitch)" class="ring pitch" />
          <polyline [attr.points]="cam.pts(rings().roll)" class="ring roll" />
          <line [attr.x1]="cam.p(axes().yaw[0]).x" [attr.y1]="cam.p(axes().yaw[0]).y" [attr.x2]="cam.p(axes().yaw[1]).x" [attr.y2]="cam.p(axes().yaw[1]).y" class="spin yaw" />
          <line [attr.x1]="cam.p(axes().roll[0]).x" [attr.y1]="cam.p(axes().roll[0]).y" [attr.x2]="cam.p(axes().roll[1]).x" [attr.y2]="cam.p(axes().roll[1]).y" class="spin roll" />
          <polygon [attr.points]="cam.pts(top())" class="top" />
          @for (e of edges; track $index) {
            <line [attr.x1]="cam.p(body()[e[0]]).x" [attr.y1]="cam.p(body()[e[0]]).y" [attr.x2]="cam.p(body()[e[1]]).x" [attr.y2]="cam.p(body()[e[1]]).y" class="edge" />
          }
        </svg>
        <div>
          <label class="w-field mb-1"><span><b class="c-yaw">yaw</b> about Z = {{ yaw() }}°</span>
            <input type="range" min="-180" max="180" step="5" [value]="yaw()" (input)="yaw.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-1"><span><b class="c-pitch">pitch</b> about the new Y = {{ pitch() }}°</span>
            <input type="range" min="-90" max="90" step="5" [value]="pitch()" (input)="pitch.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2"><span><b class="c-roll">roll</b> about the new X = {{ roll() }}°</span>
            <input type="range" min="-180" max="180" step="5" [value]="roll()" (input)="roll.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            @for (r of R(); track $index) {
              <tr><th>{{ $index === 0 ? 'R = Rz·Ry·Rx' : '' }}</th><td>{{ row(r) }}</td></tr>
            }
            <tr><th>nose points to</th><td>{{ f3(nose(), 2) }}</td></tr>
            <tr><th>yaw axis ∠ roll axis</th><td [class.hl]="locked()" [class.ok]="!locked()">{{ num(gap(), 0) }}°</td></tr>
            @if (locked()) {
              <tr><th>yaw − roll</th><td class="hl">{{ yaw() - roll() }}°</td></tr>
            }
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="locked()" [class.info]="!locked()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .ax { stroke: var(--text-muted); stroke-width: 1.2; }
    .ring { fill: none; stroke-width: 3; opacity: 0.8; }
    .ring.yaw { stroke: #3b82f6; }
    .ring.pitch { stroke: #10b981; }
    .ring.roll { stroke: #ef4444; stroke-width: 2.5; }
    .spin { stroke-width: 2; stroke-dasharray: 6 4; }
    .spin.yaw { stroke: #3b82f6; }
    .spin.roll { stroke: #ef4444; }
    .edge { stroke: var(--text-main); stroke-width: 1.6; stroke-linecap: round; }
    .top { fill: rgba(245, 158, 11, 0.45); stroke: none; }
    .c-yaw { color: #2563eb; }
    .c-pitch { color: #059669; }
    .c-roll { color: #dc2626; }
  `]
})
export class GimbalWidget {
  readonly num = num;
  readonly f3 = f3;
  readonly cam = new Iso(30, 150, 150, 'se');
  readonly o = v3(0, 0, 0);
  readonly frame = [{ l: 'X', v: v3(3.6, 0, 0) }, { l: 'Y', v: v3(0, 3.6, 0) }, { l: 'Z', v: v3(0, 0, 3.4) }];
  readonly edges = BODY.edges;

  yaw = signal(30);
  pitch = signal(20);
  roll = signal(0);

  R = computed(() => euler(this.yaw(), this.pitch(), this.roll()));
  /** The frame after yaw only, and after yaw and pitch: the middle and inner rings are carried by them. */
  afterYaw = computed(() => rotZ(this.yaw()));
  afterPitch = computed(() => mMul3(rotZ(this.yaw()), rotY(this.pitch())));
  body = computed(() => BODY.corners.map(p => mApply3(this.R(), p)));
  top = computed(() => BODY.top.map(i => this.body()[i]));
  nose = computed(() => mApply3(this.R(), v3(1, 0, 0)));
  rollAxis = computed(() => mApply3(this.afterPitch(), v3(1, 0, 0)));
  /** Angle between the yaw axis (world Z) and the roll axis: 90° − |pitch|. */
  gap = computed(() => (Math.acos(Math.min(1, Math.abs(dot3(this.rollAxis(), v3(0, 0, 1))))) * 180) / Math.PI);
  locked = computed(() => Math.abs(this.pitch()) === 90);

  rings = computed(() => ({
    yaw: RING.map(a => v3(2.9 * Math.cos(a), 2.9 * Math.sin(a), 0)),
    pitch: RING.map(a => mApply3(this.afterYaw(), v3(2.5 * Math.cos(a), 0, 2.5 * Math.sin(a)))),
    roll: RING.map(a => mApply3(this.afterPitch(), v3(0, 2.1 * Math.cos(a), 2.1 * Math.sin(a))))
  }));
  axes = computed(() => {
    const k = this.rollAxis();
    return { yaw: [v3(0, 0, -3.2), v3(0, 0, 3.2)], roll: [this.scale(k, -2.9), this.scale(k, 2.9)] };
  });

  message = computed(() => {
    if (this.locked()) {
      return `Gimbal lock: with pitch at ${this.pitch()}°, the red roll ring has swung into the plane of the blue yaw ring, so yaw and roll now turn about the same vertical line. Only yaw − roll (here ${this.yaw() - this.roll()}°) changes anything; one way of turning is gone until pitch moves away from ±90°.`;
    }
    return `Three angles, applied in order: yaw about Z, then pitch about the turned Y, then roll about the turned X. The yaw and roll axes are ${num(this.gap(), 0)}° apart (90° − |pitch|), so the three rings still turn the body three independent ways.`;
  });

  set(y: number, p: number, r: number) { this.yaw.set(y); this.pitch.set(p); this.roll.set(r); }
  row(r: number[]) { return `[${r.map(x => num(x, 2)).join('  ')}]`; }
  private scale(v: V3, k: number) { return v3(v.x * k, v.y * k, v.z * k); }
}
