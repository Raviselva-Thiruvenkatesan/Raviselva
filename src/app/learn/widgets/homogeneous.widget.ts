import { Component, computed, signal } from '@angular/core';
import { C, S } from './drag-plane';
import { mApply, mDir, mMove, mMul, mRot, mRows, mScale } from './affine';
import { P, arrowHead, num, shaftEnd, short } from './vec-plane';

const WALL: P[] = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 0.4 }, { x: 0, y: 0.4 }];
const END: P = { x: 3, y: 0 };
const MID: P = { x: 1.5, y: 0.4 };
const NORMAL: P = { x: 0, y: 1 };

/** One 3×3 matrix for move, rotate and scale, and the w = 1 / w = 0 difference between points and directions. */
@Component({
  selector: 'w-homogeneous',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Homogeneous coordinates: points and directions</h3></div>
      <div class="w-controls">
        <label class="d-flex align-items-center gap-2 small"><input type="checkbox" [checked]="wrong()" (change)="wrong.set(!wrong())" /> Treat the normal like a point (w = 1)</label>
      </div>
      <p class="w-hint">The wall is scaled, then rotated, then moved. P is its end point; the arrow is its face normal.</p>
      <div class="w-grid two">
        <svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <polygon [attr.points]="line(wall)" class="ghost" />
          <polygon [attr.points]="line(wallT())" class="wall" />
          <line [attr.x1]="nArrow().x1" [attr.y1]="nArrow().y1" [attr.x2]="nArrow().tip.x" [attr.y2]="nArrow().tip.y" class="nrm" [class.bad]="wrong()" />
          <polygon [attr.points]="nArrow().head" class="nrmh" [class.bad]="wrong()" />
          <circle [attr.cx]="px(pT().x)" [attr.cy]="py(pT().y)" r="5.5" class="res" />
          <text [attr.x]="px(pT().x) + 8" [attr.y]="py(pT().y) + 4" class="hl-t">P′</text>
          <circle [attr.cx]="px(oT().x)" [attr.cy]="py(oT().y)" r="3.5" class="res warn" />
          <text [attr.x]="px(oT().x) - 7" [attr.y]="py(oT().y) + 4" text-anchor="end" class="lbl">origin′</text>
        </svg>
        <div>
          <div class="sliders">
            <label class="w-field">move x = {{ tx() }}<input type="range" min="-4" max="4" step="0.5" [value]="tx()" (input)="tx.set(+$any($event.target).value)" /></label>
            <label class="w-field">move y = {{ ty() }}<input type="range" min="-4" max="4" step="0.5" [value]="ty()" (input)="ty.set(+$any($event.target).value)" /></label>
            <label class="w-field">rotate = {{ turn() }}°<input type="range" min="-180" max="180" step="15" [value]="turn()" (input)="turn.set(+$any($event.target).value)" /></label>
            <label class="w-field">scale = {{ s() }}<input type="range" min="0.5" max="2" step="0.1" [value]="s()" (input)="s.set(+$any($event.target).value)" /></label>
          </div>
          <table class="wtable mono mt-2 mat"><tbody>
            @for (r of rows(); track $index) {
              <tr>
                @for (v of r; track $index) { <td [class.t]="$index === 2">{{ short(v, 3) }}</td> }
              </tr>
            }
          </tbody></table>
          <table class="wtable mono mt-2"><tbody>
            <tr><th>P (3, 0, w = 1)</th><td>→ {{ fmt(pT()) }}</td></tr>
            <tr><th>n (0, 1, w = {{ wrong() ? 1 : 0 }})</th><td [class.hl]="wrong()">→ {{ fmt(nT()) }}</td></tr>
            <tr><th>|n′|</th><td>{{ num(nLen(), 3) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.info]="!wrong()" [class.err]="wrong()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .ghost { fill: none; stroke: var(--text-muted); stroke-width: 1.5; stroke-dasharray: 4 3; }
    .wall { fill: rgba(59, 130, 246, 0.3); stroke: #3b82f6; stroke-width: 2; stroke-linejoin: round; }
    .nrm { stroke: #10b981; stroke-width: 3; }
    .nrm.bad { stroke: #ef4444; }
    .nrmh { fill: #10b981; }
    .nrmh.bad { fill: #ef4444; }
    .sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
    .mat { width: auto; }
    .mat td { min-width: 3.4rem; }
    .mat td.t { color: #d97706; font-weight: 700; }
  `]
})
export class HomogeneousWidget {
  readonly grid = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  readonly num = num;
  readonly short = short;
  readonly wall = WALL;

  tx = signal(2);
  ty = signal(1);
  turn = signal(30);
  s = signal(1);
  wrong = signal(false);

  m = computed(() => mMul(mMove(this.tx(), this.ty()), mMul(mRot(this.turn()), mScale(this.s()))));
  rows = computed(() => mRows(this.m()));
  wallT = computed(() => WALL.map(p => mApply(this.m(), p)));
  pT = computed(() => mApply(this.m(), END));
  oT = computed(() => mApply(this.m(), { x: 0, y: 0 }));
  nT = computed(() => (this.wrong() ? mApply(this.m(), NORMAL) : mDir(this.m(), NORMAL)));
  nLen = computed(() => Math.hypot(this.nT().x, this.nT().y));
  nArrow = computed(() => {
    const a = mApply(this.m(), MID), n = this.nT(), b = { x: a.x + n.x, y: a.y + n.y };
    const x1 = this.px(a.x), y1 = this.py(a.y), x2 = this.px(b.x), y2 = this.py(b.y);
    return { x1, y1, tip: shaftEnd(x1, y1, x2, y2, 9), head: arrowHead(x1, y1, x2, y2, 9) };
  });

  message = computed(() => {
    if (this.wrong()) {
      return `With w = 1 the normal picks up the move (${short(this.tx())}, ${short(this.ty())}) as if it were a position, so it is knocked off course and has length ${num(this.nLen(), 3)}. Directions, normals and offsets must use w = 0.`;
    }
    const sc = this.s() === 1 ? '' : ` Its length is scaled by ${short(this.s())}, so normalise it before using it as a unit normal.`;
    return `The last column holds the move. A point has w = 1, so it is moved; the normal has w = 0, so it is only turned and scaled.${sc}`;
  });

  px(x: number) { return C + x * S; }
  py(y: number) { return C - y * S; }
  pp(p: P) { return `${this.px(p.x)},${this.py(p.y)}`; }
  fmt(p: P) { return `(${short(p.x)}, ${short(p.y)})`; }
  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
}
