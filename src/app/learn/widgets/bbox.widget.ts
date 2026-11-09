import { Component, computed, signal } from '@angular/core';
import { Box2, aabb2, axes2, clash2, corners2 } from './solid';
import { P, num } from './vec-plane';

const S = 28, OX = 30, OY = 228;
const COLUMN: Box2 = { c: { x: 6.2, y: 2.2 }, hx: 0.4, hy: 0.4, a: 0 };
const BEAM_L = 3.2, BEAM_W = 0.5;

/** A beam turning in plan: its world-aligned box (AABB) grows, its own box (OBB) does not. */
@Component({
  selector: 'w-bbox',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>AABB and OBB of a turning beam</h3></div>
      <div class="w-controls" role="group" aria-label="Beam angle presets">
        @for (a of presets; track a) {
          <button type="button" class="w-btn" [class.on]="angle() === a" [attr.aria-pressed]="angle() === a" (click)="angle.set(a)">{{ a }}°</button>
        }
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 320 250" class="view" role="img" [attr.aria-label]="message()">
          @for (g of grid; track g) {
            <line [attr.x1]="sx(g)" y1="8" [attr.x2]="sx(g)" y2="242" class="grid" />
            @if (g <= 8) { <line x1="8" [attr.y1]="sy(g)" x2="312" [attr.y2]="sy(g)" class="grid" /> }
          }
          <rect [attr.x]="sx(box().x0)" [attr.y]="sy(box().y1)" [attr.width]="(box().x1 - box().x0) * s" [attr.height]="(box().y1 - box().y0) * s" class="aabb" />
          <polygon [attr.points]="pts(beam())" class="obb" />
          @if (showAxes()) {
            @for (a of beamAxes(); track $index) {
              <line [attr.x1]="sx(c.x)" [attr.y1]="sy(c.y)" [attr.x2]="sx(c.x + a.x * ($index === 0 ? beamL : beamW))" [attr.y2]="sy(c.y + a.y * ($index === 0 ? beamL : beamW))" class="axis" />
            }
          }
          <polygon [attr.points]="pts(column)" class="col" [class.hit]="obbHit()" [class.false]="aabbHit() && !obbHit()" />
          <circle [attr.cx]="sx(c.x)" [attr.cy]="sy(c.y)" r="3" class="ctr" />
          <text [attr.x]="sx(COLUMN.c.x) + 14" [attr.y]="sy(COLUMN.c.y) + 4" class="lbl">column</text>
          <text [attr.x]="sx(box().x0) + 4" [attr.y]="sy(box().y1) + 12" class="lbl">AABB</text>
        </svg>
        <div>
          <label class="w-field mb-2">beam angle θ = {{ angle() }}°
            <input type="range" min="0" max="180" step="5" [value]="angle()" (input)="angle.set(+$any($event.target).value)" />
          </label>
          <label class="d-flex align-items-center gap-2 small mb-2"><input type="checkbox" [checked]="showAxes()" (change)="showAxes.set(!showAxes())" /> Show the OBB’s own axes</label>
          <table class="wtable mono"><tbody>
            <tr><th>beam (OBB)</th><td>{{ beamL * 2 }} × {{ beamW * 2 }} m, area {{ num(beamArea, 2) }} m²</td></tr>
            <tr><th>AABB</th><td>{{ num(box().x1 - box().x0, 2) }} × {{ num(box().y1 - box().y0, 2) }} m</td></tr>
            <tr><th>AABB area</th><td [class.hl]="ratio() > 2">{{ num(aabbArea(), 2) }} m² ({{ num(ratio(), 1) }}× the beam)</td></tr>
            <tr><th>AABB vs column</th><td [class.hl]="aabbHit()" [class.ok]="!aabbHit()">{{ aabbHit() ? 'overlap' : 'apart' }}</td></tr>
            <tr><th>OBB vs column</th><td [class.hl]="obbHit()" [class.ok]="!obbHit()">{{ obbHit() ? 'overlap' : 'apart' }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.err]="obbHit()" [class.info]="!obbHit()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 380px; display: block; margin: 0 auto; }
    .aabb { fill: rgba(245, 158, 11, 0.08); stroke: #f59e0b; stroke-width: 2; stroke-dasharray: 6 4; }
    .obb { fill: rgba(59, 130, 246, 0.35); stroke: #3b82f6; stroke-width: 2; }
    .axis { stroke: #8b5cf6; stroke-width: 2; }
    .ctr { fill: #3b82f6; }
    .col { fill: rgba(148, 163, 184, 0.5); stroke: var(--text-muted); stroke-width: 1.5; }
    .col.false { fill: rgba(245, 158, 11, 0.45); stroke: #f59e0b; }
    .col.hit { fill: rgba(239, 68, 68, 0.55); stroke: #ef4444; }
  `]
})
export class BboxWidget {
  readonly num = num;
  readonly s = S;
  readonly COLUMN = COLUMN;
  readonly column = corners2(COLUMN);
  readonly grid = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly presets = [0, 30, 45, 90, 150];
  readonly c: P = { x: 4, y: 3.6 };
  readonly beamL = BEAM_L;
  readonly beamW = BEAM_W;
  readonly beamArea = 4 * BEAM_L * BEAM_W;

  angle = signal(30);
  showAxes = signal(true);

  obb = computed<Box2>(() => ({ c: this.c, hx: BEAM_L, hy: BEAM_W, a: this.angle() }));
  beam = computed(() => corners2(this.obb()));
  beamAxes = computed(() => axes2(this.obb()));
  box = computed(() => aabb2(this.beam()));
  aabbArea = computed(() => (this.box().x1 - this.box().x0) * (this.box().y1 - this.box().y0));
  ratio = computed(() => this.aabbArea() / this.beamArea);
  aabbHit = computed(() => {
    const b = this.box(), k = aabb2(this.column);
    return b.x0 < k.x1 && k.x0 < b.x1 && b.y0 < k.y1 && k.y0 < b.y1;
  });
  obbHit = computed(() => clash2(this.obb(), COLUMN));

  message = computed(() => {
    const r = num(this.ratio(), 1);
    if (this.obbHit()) return `At ${this.angle()}° the beam itself runs into the column: both tests report an overlap, and this one is a real clash.`;
    if (this.aabbHit()) return `False alarm: at ${this.angle()}° the AABB is ${r}× the beam’s area and covers the column, but the beam’s own box (OBB) misses it. A quick AABB test can only say “maybe”; a tighter test has to decide.`;
    const turned = this.angle() % 90 !== 0;
    return turned
      ? `At ${this.angle()}° the AABB has grown to ${r}× the beam’s area, but it still misses the column, so the cheap test is enough to say “no clash”.`
      : `At ${this.angle()}° the beam runs along a world axis, so its AABB and its OBB are the same rectangle.`;
  });

  sx(x: number) { return OX + x * S; }
  sy(y: number) { return OY - y * S; }
  pts(ps: P[]) { return ps.map(p => `${this.sx(p.x)},${this.sy(p.y)}`).join(' '); }
}
