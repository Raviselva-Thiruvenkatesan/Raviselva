import { Component, computed, signal } from '@angular/core';
import { Iso, V3, dot3, f3, mul3, rad, sub3, v3 } from './iso';
import { num } from './vec-plane';

type Mode = 'normal' | 'vertical';

const EAVES = 2;   // the roof starts at z = 2 along the line y = 0

/** A point above or below a roof plane: signed distance, the foot along the normal, and the vertical drop. */
@Component({
  selector: 'w-point-plane',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A point and a roof plane</h3></div>
      <div class="w-controls" role="group" aria-label="Projection">
        <button type="button" class="w-btn" [class.on]="mode() === 'normal'" [attr.aria-pressed]="mode() === 'normal'" (click)="mode.set('normal')">Project along the normal</button>
        <button type="button" class="w-btn" [class.on]="mode() === 'vertical'" [attr.aria-pressed]="mode() === 'vertical'" (click)="mode.set('vertical')">Drop vertically</button>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 290" class="view" role="img" [attr.aria-label]="'Signed distance ' + num(s())">
          <polygon [attr.points]="cam.pts(ground)" class="ground" />
          <polygon [attr.points]="cam.pts(roof())" class="roof" [class.under]="s() < 0" />
          <polyline [attr.points]="cam.pts([v3(0, 0, eaves), v3(5, 0, eaves)])" class="eaves" />
          <!-- the point's plan position, for depth -->
          <line [attr.x1]="cam.p(p()).x" [attr.y1]="cam.p(p()).y" [attr.x2]="cam.p(plan()).x" [attr.y2]="cam.p(plan()).y" class="drop" />
          <circle [attr.cx]="cam.p(plan()).x" [attr.cy]="cam.p(plan()).y" r="2.5" class="planp" />
          <line [attr.x1]="cam.p(p()).x" [attr.y1]="cam.p(p()).y" [attr.x2]="cam.p(q()).x" [attr.y2]="cam.p(q()).y" class="proj" />
          <circle [attr.cx]="cam.p(q()).x" [attr.cy]="cam.p(q()).y" r="5" class="res" />
          <text [attr.x]="cam.p(q()).x + 8" [attr.y]="cam.p(q()).y + 12" class="hl-t">Q</text>
          <circle [attr.cx]="cam.p(p()).x" [attr.cy]="cam.p(p()).y" r="6" class="pt" />
          <text [attr.x]="cam.p(p()).x + 8" [attr.y]="cam.p(p()).y - 6" class="hl-t">P</text>
        </svg>
        <div>
          <label class="w-field mb-1">roof pitch = {{ pitch() }}°
            <input type="range" min="0" max="45" step="1" [value]="pitch()" (input)="pitch.set(+$any($event.target).value)" />
          </label>
          @for (c of coords; track c.k) {
            <label class="w-field mb-1">P.{{ c.k }} = {{ num(c.sig(), 2) }}
              <input type="range" min="0" [attr.max]="c.max" step="0.25" [value]="c.sig()" (input)="c.sig.set(+$any($event.target).value)" />
            </label>
          }
          <table class="wtable mono mt-2"><tbody>
            <tr><th>unit normal n</th><td>{{ f3(n(), 3) }}</td></tr>
            <tr><th>d</th><td>{{ num(d(), 3) }}</td></tr>
            <tr><th>s = n·P + d</th><td [class.ok]="s() >= 0" [class.hl]="s() < 0">{{ num(s(), 3) }}</td></tr>
            @if (mode() === 'normal') {
              <tr><th>Q = P − s × n</th><td>{{ f3(q()) }}</td></tr>
            } @else {
              <tr><th>roof z at (x, y)</th><td>{{ num(roofZ(), 3) }}</td></tr>
              <tr><th>vertical gap</th><td>{{ num(p().z - roofZ(), 3) }}</td></tr>
            }
            <tr><th>|P − Q|</th><td>{{ num(dist(), 3) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.info]="s() >= 0" [class.err]="s() < 0" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .ground { fill: rgba(148, 163, 184, 0.12); stroke: var(--border-color); stroke-width: 1; }
    .roof { fill: rgba(59, 130, 246, 0.25); stroke: #3b82f6; stroke-width: 2; }
    .roof.under { fill: rgba(59, 130, 246, 0.4); }
    .eaves { stroke: #1d4ed8; stroke-width: 3; }
    .drop { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 2 3; }
    .planp { fill: var(--text-muted); }
    .proj { stroke: #10b981; stroke-width: 2.5; stroke-dasharray: 5 3; }
    .pt { fill: #8b5cf6; stroke: var(--bg-main); stroke-width: 2; }
  `]
})
export class PointPlaneWidget {
  readonly cam = new Iso(18, 70, 215, 'se');
  readonly ground: V3[] = [v3(0, 0, 0), v3(5, 0, 0), v3(5, 5, 0), v3(0, 5, 0)];
  readonly eaves = EAVES;
  readonly v3 = v3;
  readonly num = num;
  readonly f3 = f3;

  mode = signal<Mode>('normal');
  pitch = signal(30);
  px = signal(3);
  py = signal(2);
  pz = signal(6);
  readonly coords = [{ k: 'x', sig: this.px, max: 5 }, { k: 'y', sig: this.py, max: 5 }, { k: 'z', sig: this.pz, max: 8 }];

  p = computed(() => v3(this.px(), this.py(), this.pz()));
  plan = computed(() => v3(this.px(), this.py(), 0));
  n = computed(() => { const a = rad(this.pitch()); return v3(0, -Math.sin(a) || 0, Math.cos(a)); });
  d = computed(() => -dot3(this.n(), v3(0, 0, EAVES)));
  s = computed(() => dot3(this.n(), this.p()) + this.d());
  roofZ = computed(() => EAVES + Math.tan(rad(this.pitch())) * this.py());
  roof = computed(() => {
    const t = Math.tan(rad(this.pitch()));
    return [v3(0, 0, EAVES), v3(5, 0, EAVES), v3(5, 5, EAVES + 5 * t), v3(0, 5, EAVES + 5 * t)];
  });
  q = computed(() => (this.mode() === 'normal' ? sub3(this.p(), mul3(this.n(), this.s())) : v3(this.px(), this.py(), this.roofZ())));
  dist = computed(() => { const v = sub3(this.p(), this.q()); return Math.sqrt(dot3(v, v)); });

  message = computed(() => {
    const s = this.s(), side = s > 1e-9 ? 'above the roof (the side the normal points to)' : s < -1e-9 ? 'below the roof, inside the building' : 'exactly on the roof plane';
    if (this.mode() === 'normal') {
      return `s = n·P + d = ${num(s, 3)}: P is ${side}. Q = P − s × n is the closest point of the plane, ${num(Math.abs(s), 3)} away. Use this for clearances and offsets measured square to the roof.`;
    }
    const gap = this.pz() - this.roofZ();
    return `Dropping straight down meets the roof at z = ${num(this.roofZ(), 3)}, a gap of ${num(gap, 3)}. That is longer than the perpendicular distance ${num(Math.abs(s), 3)} whenever the roof slopes: vertical gap = s ÷ cos(pitch). Use this to set an object down on a roof or terrain.`;
  });
}
