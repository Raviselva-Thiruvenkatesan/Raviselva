import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { M, mApply, mInv, mMove, mMul, mRot } from './affine';
import { P, arrowHead, num, shaftEnd } from './vec-plane';

type K = 'D' | 'W';

const DESK: P[] = [{ x: 0, y: 0 }, { x: 2.4, y: 0 }, { x: 2.4, y: 1.2 }, { x: 0, y: 1.2 }];
const SEAT: P[] = [{ x: -0.4, y: -0.4 }, { x: 0.4, y: -0.4 }, { x: 0.4, y: 0.4 }, { x: -0.4, y: 0.4 }];
const BACK: P[] = [{ x: -0.45, y: -0.4 }, { x: 0.45, y: -0.4 }, { x: 0.45, y: -0.6 }, { x: -0.45, y: -0.6 }];
const CHAIR_AT: P = { x: 1.2, y: -0.7 };   // where the chair sits, in the desk's own coordinates
const Q: P = { x: 0.4, y: 0.4 };           // the chair seat's front-right corner, in the chair's coordinates

/** A desk instance with a nested chair: local → parent → world, and back again with the inverse. */
@Component({
  selector: 'w-local-world',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Local and world coordinates</h3></div>
      <p class="w-hint">Drag the desk’s insertion point D and the world point W, and turn the desk and the chair.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'Q in world ' + fmt(qW())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <polygon [attr.points]="line(desk())" class="desk" />
          <polygon [attr.points]="line(seat())" class="chair" />
          <polygon [attr.points]="line(back())" class="chair back" />
          @for (a of axes(); track $index) {
            <line [attr.x1]="a.x1" [attr.y1]="a.y1" [attr.x2]="a.tip.x" [attr.y2]="a.tip.y" class="lax" [class.y]="a.y" />
            <polygon [attr.points]="a.head" class="laxh" [class.y]="a.y" />
          }
          <line [attr.x1]="px(pt('D').x)" [attr.y1]="py(pt('D').y)" [attr.x2]="px(pt('W').x)" [attr.y2]="py(pt('W').y)" class="ext" />
          <circle [attr.cx]="px(qW().x)" [attr.cy]="py(qW().y)" r="5" class="res" />
          <text [attr.x]="px(qW().x) + 7" [attr.y]="py(qW().y) + 12" class="hl-t">Q</text>
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="k === 'D' ? 'Desk insertion point D' : 'World point W'" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="5.5" class="dot" [class.ctl]="k === 'W'" />
              <text [attr.x]="px(pt(k).x) - 13" [attr.y]="py(pt(k).y) - 8" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <label class="w-field mb-1">desk rotation = {{ deskTurn() }}°
            <input type="range" min="-180" max="180" step="15" [value]="deskTurn()" (input)="deskTurn.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">chair rotation, inside the desk = {{ chairTurn() }}°
            <input type="range" min="-90" max="90" step="15" [value]="chairTurn()" (input)="chairTurn.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            <tr class="hl"><th colspan="2">Q, local → world</th></tr>
            <tr><th>in the chair</th><td>{{ fmt(q) }}</td></tr>
            <tr><th>in the desk</th><td>{{ fmt(qD()) }}</td></tr>
            <tr><th>in the world</th><td class="ok">{{ fmt(qW()) }}</td></tr>
            <tr class="hl"><th colspan="2">W, world → local</th></tr>
            <tr><th>in the world</th><td>{{ fmt(pt('W')) }}</td></tr>
            <tr><th>in the desk</th><td>{{ fmt(wD()) }}</td></tr>
            <tr><th>in the chair</th><td>{{ fmt(wC()) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .desk { fill: rgba(59, 130, 246, 0.22); stroke: #3b82f6; stroke-width: 2; }
    .chair { fill: rgba(139, 92, 246, 0.22); stroke: #8b5cf6; stroke-width: 1.5; }
    .chair.back { fill: rgba(139, 92, 246, 0.5); }
    .lax { stroke: #10b981; stroke-width: 2.5; }
    .lax.y { stroke: #f59e0b; }
    .laxh { fill: #10b981; }
    .laxh.y { fill: #f59e0b; }
  `]
})
export class LocalWorldWidget extends DragPlane<K> {
  readonly keys: K[] = ['D', 'W'];
  readonly q = Q;

  protected readonly pts = { D: signal<P>({ x: -1, y: 0 }), W: signal<P>({ x: -0.25, y: 1.25 }) };
  deskTurn = signal(30);
  chairTurn = signal(0);

  deskW = computed(() => mMul(mMove(this.pt('D').x, this.pt('D').y), mRot(this.deskTurn())));
  chairD = computed(() => mMul(mMove(CHAIR_AT.x, CHAIR_AT.y), mRot(this.chairTurn())));
  chairW = computed(() => mMul(this.deskW(), this.chairD()));

  desk = computed(() => DESK.map(p => mApply(this.deskW(), p)));
  seat = computed(() => SEAT.map(p => mApply(this.chairW(), p)));
  back = computed(() => BACK.map(p => mApply(this.chairW(), p)));
  qD = computed(() => mApply(this.chairD(), Q));
  qW = computed(() => mApply(this.deskW(), this.qD()));
  wD = computed(() => mApply(mInv(this.deskW())!, this.pt('W')));
  wC = computed(() => mApply(mInv(this.chairD())!, this.wD()));
  axes = computed(() => [...this.axesOf(this.deskW(), 1.2), ...this.axesOf(this.chairW(), 0.7)]);

  message = computed(() => {
    const w = this.wD(), inside = w.x >= 0 && w.x <= 2.4 && w.y >= 0 && w.y <= 1.2;
    return `World = DeskInWorld · ChairInDesk · local. The chair is stored once, relative to the desk, so turning the desk carries it along. Going back needs the inverses: W is at ${this.fmt(w)} in desk coordinates, so it is ${inside ? 'on the desk top' : 'off the desk'} (the desk runs 0 to 2.4 by 0 to 1.2).`;
  });

  override fmt(p: P) { return `(${num(p.x)}, ${num(p.y)})`; }
  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
  private axesOf(m: M, l: number) {
    const o = mApply(m, { x: 0, y: 0 });
    return [{ x: l, y: 0 }, { x: 0, y: l }].map((v, i) => {
      const e = mApply(m, v), x1 = this.px(o.x), y1 = this.py(o.y), x2 = this.px(e.x), y2 = this.py(e.y);
      return { y: i === 1, x1, y1, tip: shaftEnd(x1, y1, x2, y2, 8), head: arrowHead(x1, y1, x2, y2, 8) };
    });
  }
}
