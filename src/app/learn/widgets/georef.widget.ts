import { Component, computed, signal } from '@angular/core';
import { P, num } from './vec-plane';

/** An L-shaped building in project coordinates (metres), with the project base point at corner A. */
const CORNERS: { l: string; p: P }[] = [
  { l: 'A', p: { x: 0, y: 0 } }, { l: 'B', p: { x: 24, y: 0 } }, { l: 'C', p: { x: 24, y: 10 } },
  { l: 'D', p: { x: 10, y: 10 } }, { l: 'E', p: { x: 10, y: 18 } }, { l: 'F', p: { x: 0, y: 18 } }
];
const SURVEY: P = { x: -6, y: -4 };
const E0 = 512340, N0 = 180220, Z0 = 42.5;
const S = 6.2, CX = 150, CY = 128, MID: P = { x: 12, y: 9 };

/** Project coordinates to shared survey coordinates: turn by the angle to true north, then move. */
@Component({
  selector: 'w-georef',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Project north, true north and shared coordinates</h3></div>
      <div class="w-controls" role="group" aria-label="View">
        <button type="button" class="w-btn" [class.on]="!trueUp()" [attr.aria-pressed]="!trueUp()" (click)="trueUp.set(false)">Project north up</button>
        <button type="button" class="w-btn" [class.on]="trueUp()" [attr.aria-pressed]="trueUp()" (click)="trueUp.set(true)">True north up</button>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 260" class="view" role="img" [attr.aria-label]="message()">
          <polygon [attr.points]="outline()" class="bld" />
          @for (c of corners; track c.l) {
            <g (click)="sel.set($index)" class="pick">
              <circle [attr.cx]="scr(c.p).x" [attr.cy]="scr(c.p).y" [attr.r]="sel() === $index ? 6 : 4" class="cn" [class.on]="sel() === $index" />
              <text [attr.x]="scr(c.p).x + 7" [attr.y]="scr(c.p).y - 6" class="hl-t">{{ c.l }}</text>
            </g>
          }
          <circle [attr.cx]="scr(corners[0].p).x" [attr.cy]="scr(corners[0].p).y" r="9" class="pbp" />
          <polygon [attr.points]="tri(scr(survey))" class="sp" />
          <text [attr.x]="scr(survey).x - 8" [attr.y]="scr(survey).y + 18" class="lbl">survey point</text>
          <g [attr.transform]="'translate(250 64)'">
            <circle r="40" class="ring" />
            <line x1="0" y1="0" [attr.x2]="arrow(pnAngle()).x" [attr.y2]="arrow(pnAngle()).y" class="pn" />
            <line x1="0" y1="0" [attr.x2]="arrow(tnAngle()).x" [attr.y2]="arrow(tnAngle()).y" class="tn" />
            <circle r="3" class="hub" />
            <text [attr.x]="arrow(pnAngle()).x + (tnLeft() ? 5 : -5)" [attr.y]="arrow(pnAngle()).y + 4" [attr.text-anchor]="tnLeft() ? 'start' : 'end'" class="lbl">PN</text>
            <text [attr.x]="arrow(tnAngle()).x + (tnLeft() ? -5 : 5)" [attr.y]="arrow(tnAngle()).y + 4" [attr.text-anchor]="tnLeft() ? 'end' : 'start'" class="hl-t">TN</text>
          </g>
        </svg>
        <div>
          <label class="w-field mb-2">angle to true north θ = {{ theta() }}°
            <input type="range" min="-40" max="40" step="1" [value]="theta()" (input)="theta.set(+$any($event.target).value)" />
          </label>
          <div class="w-controls" role="group" aria-label="Corner">
            @for (c of corners; track c.l) {
              <button type="button" class="w-btn" [class.on]="sel() === $index" [attr.aria-pressed]="sel() === $index" (click)="sel.set($index)">{{ c.l }}</button>
            }
          </div>
          <table class="wtable mono"><tbody>
            <tr><th></th><th>project</th><th>shared</th></tr>
            <tr><th>x / E</th><td>{{ num(cur().x, 2) }}</td><td class="ok">{{ big(shared().x) }}</td></tr>
            <tr><th>y / N</th><td>{{ num(cur().y, 2) }}</td><td class="ok">{{ big(shared().y) }}</td></tr>
            <tr><th>z / elev</th><td>0.00</td><td class="ok">{{ num(z0, 2) }}</td></tr>
            <tr><th>bearing A→B</th><td colspan="2">{{ bearing() }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .bld { fill: rgba(59, 130, 246, 0.18); stroke: #3b82f6; stroke-width: 2; stroke-linejoin: round; }
    .pick { cursor: pointer; }
    .cn { fill: var(--bg-main); stroke: #3b82f6; stroke-width: 2; }
    .cn.on { fill: #10b981; stroke: #10b981; }
    .pbp { fill: none; stroke: #8b5cf6; stroke-width: 2; }
    .sp { fill: #f59e0b; stroke: var(--bg-main); stroke-width: 1.5; }
    .ring { fill: none; stroke: var(--border-color); stroke-width: 1; }
    .pn { stroke: var(--text-muted); stroke-width: 2.5; stroke-dasharray: 5 3; }
    .hub { fill: var(--text-main); }
    .tn { stroke: #ef4444; stroke-width: 3; stroke-linecap: round; }
  `]
})
export class GeorefWidget {
  readonly num = num;
  readonly corners = CORNERS;
  readonly survey = SURVEY;
  readonly z0 = Z0;

  theta = signal(18);
  trueUp = signal(false);
  sel = signal(2);

  rad = computed(() => (this.theta() * Math.PI) / 180);
  cur = computed(() => CORNERS[this.sel()].p);
  /** E = E0 + x cos θ + y sin θ, N = N0 − x sin θ + y cos θ (project north is θ clockwise from true north). */
  shared = computed(() => this.toShared(this.cur()));
  /** On screen, true north is θ anticlockwise from project north; with true north up the building turns θ clockwise. */
  pnAngle = computed(() => (this.trueUp() ? this.theta() : 0));
  tnAngle = computed(() => (this.trueUp() ? 0 : -this.theta()));
  /** True north is anticlockwise of project north when θ ≥ 0, so its label goes on the left. */
  tnLeft = computed(() => this.theta() >= 0);
  outline = computed(() => CORNERS.map(c => { const s = this.scr(c.p); return `${s.x},${s.y}`; }).join(' '));
  bearing = computed(() => {
    const a = this.toShared(CORNERS[0].p), b = this.toShared(CORNERS[1].p);
    let az = (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
    if (az < 0) az += 360;
    return `${num(az, 1)}° from true north`;
  });

  message = computed(() => {
    const th = this.theta(), s = this.shared(), c = CORNERS[this.sel()];
    const turn = th === 0 ? 'Project north and true north agree, so only the move matters.' : `Project north is ${Math.abs(th)}° ${th > 0 ? 'east (clockwise)' : 'west (anticlockwise)'} of true north.`;
    return `${turn} Corner ${c.l} is (${num(c.p.x, 0)}, ${num(c.p.y, 0)}) in the project but E ${this.big(s.x)}, N ${this.big(s.y)} on the survey grid. The building is drawn the same; only the numbers attached to it change.`;
  });

  toShared(p: P): P {
    const t = this.rad(), c = Math.cos(t), s = Math.sin(t);
    return { x: E0 + p.x * c + p.y * s, y: N0 - p.x * s + p.y * c };
  }
  /** Screen position: the building around its middle, turned θ clockwise when true north is up. */
  scr(p: P): P {
    const t = this.trueUp() ? this.rad() : 0, c = Math.cos(t), s = Math.sin(t);
    const dx = p.x - MID.x, dy = p.y - MID.y;
    const x = dx * c + dy * s, y = -dx * s + dy * c;
    return { x: CX + x * S, y: CY - y * S };
  }
  arrow(deg: number): P {
    const t = (deg * Math.PI) / 180;
    return { x: Math.sin(t) * 34, y: -Math.cos(t) * 34 };
  }
  tri(p: P) { return `${p.x},${p.y - 7} ${p.x + 6},${p.y + 5} ${p.x - 6},${p.y + 5}`; }
  big(v: number) { return v.toFixed(3); }
}
