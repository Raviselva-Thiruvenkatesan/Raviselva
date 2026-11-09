import { Component, computed, signal } from '@angular/core';
import { Iso, V3, add3, cross3, dot3, f3, mul3, sub3, v3 } from './iso';
import { num } from './vec-plane';

const A = v3(0, -2, 0), B = v3(0, 2, 0.3), C = v3(0, -0.4, 2.8);
const ORIGIN = v3(4.5, -1.2, 2.4);
const PAR_ORIGIN = v3(1.5, -3, 0.3), PAR_DIR = v3(0, 1, 0.2);

interface Hit { det: number; u: number; v: number; t: number; parallel: boolean }

/** Möller–Trumbore: t along the ray, and barycentric weights that say whether the plane hit is inside the triangle. */
function intersect(o: V3, d: V3): Hit {
  const e1 = sub3(B, A), e2 = sub3(C, A), p = cross3(d, e2), det = dot3(e1, p);
  if (Math.abs(det) < 1e-9) return { det, u: NaN, v: NaN, t: NaN, parallel: true };
  const inv = 1 / det, s = sub3(o, A), u = dot3(s, p) * inv, q = cross3(s, e1);
  return { det, u, v: dot3(d, q) * inv, t: dot3(e2, q) * inv, parallel: false };
}

/** A pick ray against one triangle: plane hit, then the inside test with barycentric weights. */
@Component({
  selector: 'w-ray-triangle',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Does the ray hit the triangle?</h3></div>
      <div class="w-controls" role="group" aria-label="Presets">
        <button type="button" class="w-btn" (click)="set(0.2, 1, false, false)">Hit</button>
        <button type="button" class="w-btn" (click)="set(1.6, 2, false, false)">Miss past an edge</button>
        <button type="button" class="w-btn" [class.on]="reverse()" (click)="set(0.2, 1, true, false)">Pointing away</button>
        <button type="button" class="w-btn" [class.on]="parallel()" (click)="set(0.2, 1, false, true)">Parallel</button>
      </div>
      <div class="w-grid two">
        <svg viewBox="0 0 300 270" class="view" role="img" [attr.aria-label]="message()">
          <polygon [attr.points]="cam.pts(plane)" class="pl" />
          <polygon [attr.points]="cam.pts(tri)" class="tri" [class.on]="hits()" />
          @for (p of corners; track p.l) {
            <text [attr.x]="cam.p(p.v).x + ($index === 1 ? 6 : -14)" [attr.y]="cam.p(p.v).y + 4" class="hl-t">{{ p.l }}</text>
          }
          @if (planePoint(); as hp) {
            @if (!reverse()) {
              <line [attr.x1]="cam.p(o()).x" [attr.y1]="cam.p(o()).y" [attr.x2]="cam.p(hp).x" [attr.y2]="cam.p(hp).y" class="ray" />
              <line [attr.x1]="cam.p(hp).x" [attr.y1]="cam.p(hp).y" [attr.x2]="cam.p(far()).x" [attr.y2]="cam.p(far()).y" class="ray past" />
            } @else {
              <line [attr.x1]="cam.p(o()).x" [attr.y1]="cam.p(o()).y" [attr.x2]="cam.p(far()).x" [attr.y2]="cam.p(far()).y" class="ray" />
              <line [attr.x1]="cam.p(o()).x" [attr.y1]="cam.p(o()).y" [attr.x2]="cam.p(hp).x" [attr.y2]="cam.p(hp).y" class="ray behind" />
            }
            <circle [attr.cx]="cam.p(hp).x" [attr.cy]="cam.p(hp).y" r="5" class="hp" [class.miss]="!hits()" />
          } @else {
            <line [attr.x1]="cam.p(o()).x" [attr.y1]="cam.p(o()).y" [attr.x2]="cam.p(far()).x" [attr.y2]="cam.p(far()).y" class="ray" />
          }
          <circle [attr.cx]="cam.p(o()).x" [attr.cy]="cam.p(o()).y" r="4.5" class="org" />
          <text [attr.x]="cam.p(o()).x + 7" [attr.y]="cam.p(o()).y - 5" class="hl-t">O</text>
        </svg>
        <div>
          <label class="w-field mb-1">aim across = {{ aimA() }}
            <input type="range" min="-3" max="3" step="0.1" [value]="aimA()" [disabled]="parallel()" (input)="aimA.set(+$any($event.target).value)" />
          </label>
          <label class="w-field mb-2">aim up = {{ aimB() }}
            <input type="range" min="-0.6" max="3.4" step="0.1" [value]="aimB()" [disabled]="parallel()" (input)="aimB.set(+$any($event.target).value)" />
          </label>
          @if (!hit().parallel) {
            <div class="bars" role="img" [attr.aria-label]="'weights ' + num(w(), 2) + ', ' + num(hit().u, 2) + ', ' + num(hit().v, 2)">
              @for (b of bars(); track b.k) {
                <div class="bar-row">
                  <span class="mono k">{{ b.k }}</span>
                  <span class="track"><span class="zero"></span><span class="fill" [class.neg]="b.v < 0" [style.left.%]="b.v < 0 ? 33 + clamp(b.v) * 33 : 33" [style.width.%]="abs(clamp(b.v)) * 33"></span></span>
                  <span class="mono v">{{ num(b.v, 2) }}</span>
                </div>
              }
            </div>
          }
          <table class="wtable mono mt-2"><tbody>
            <tr><th>det = e₁ · (d × e₂)</th><td [class.hl]="hit().parallel">{{ num(hit().det, 3) }}</td></tr>
            @if (!hit().parallel) {
              <tr><th>t</th><td [class.hl]="hit().t <= 0" [class.ok]="hit().t > 0">{{ num(hit().t, 3) }}</td></tr>
              <tr><th>plane point</th><td>{{ f3(planePoint()!, 2) }}</td></tr>
            }
            <tr><th>result</th><td [class.ok]="hits()" [class.hl]="!hits()">{{ hits() ? 'hit' : 'miss' }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.ok]="hits()" [class.info]="!hits()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .view { width: 100%; max-width: 360px; display: block; margin: 0 auto; }
    .pl { fill: rgba(148, 163, 184, 0.12); stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 4 4; }
    .tri { fill: rgba(59, 130, 246, 0.3); stroke: #3b82f6; stroke-width: 2; stroke-linejoin: round; }
    .tri.on { fill: rgba(16, 185, 129, 0.35); stroke: #10b981; }
    .ray { stroke: #f59e0b; stroke-width: 2.5; }
    .ray.past { stroke-dasharray: 5 4; opacity: 0.6; }
    .ray.behind { stroke: var(--text-muted); stroke-dasharray: 3 4; stroke-width: 1.5; }
    .org { fill: #f59e0b; }
    .hp { fill: #10b981; stroke: var(--bg-main); stroke-width: 2; }
    .hp.miss { fill: var(--bg-main); stroke: #ef4444; stroke-width: 2.5; }
    .bars { display: grid; gap: 6px; }
    .bar-row { display: grid; grid-template-columns: 2.6rem 1fr 3rem; align-items: center; gap: 8px; }
    .bar-row .k { font-weight: 800; font-size: 0.8rem; }
    .bar-row .v { text-align: right; }
    .track { position: relative; height: 14px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color); }
    .zero { position: absolute; left: 33%; top: -2px; bottom: -2px; width: 1px; background: var(--text-muted); }
    .fill { position: absolute; top: 2px; bottom: 2px; background: #10b981; border-radius: 2px; }
    .fill.neg { background: #ef4444; }
  `]
})
export class RayTriangleWidget {
  readonly num = num;
  readonly f3 = f3;
  readonly cam = new Iso(30, 120, 175, 'se');
  readonly tri = [A, B, C];
  readonly plane = [v3(0, -3, -0.6), v3(0, 3, -0.6), v3(0, 3, 3.4), v3(0, -3, 3.4)];
  readonly corners = [{ l: 'A', v: A }, { l: 'B', v: B }, { l: 'C', v: C }];

  aimA = signal(0.2);
  aimB = signal(1);
  reverse = signal(false);
  parallel = signal(false);

  o = computed(() => (this.parallel() ? PAR_ORIGIN : ORIGIN));
  d = computed(() => {
    if (this.parallel()) return PAR_DIR;
    const d = sub3(v3(0, this.aimA(), this.aimB()), ORIGIN);
    return this.reverse() ? mul3(d, -1) : d;
  });
  hit = computed(() => intersect(this.o(), this.d()));
  w = computed(() => 1 - this.hit().u - this.hit().v);
  hits = computed(() => { const h = this.hit(); return !h.parallel && h.u >= 0 && h.v >= 0 && this.w() >= 0 && h.t > 0; });
  planePoint = computed(() => { const h = this.hit(); return h.parallel ? null : add3(this.o(), mul3(this.d(), h.t)); });
  far = computed(() => add3(this.o(), mul3(this.d(), this.parallel() ? 5.6 : 1.3)));
  bars = computed(() => [{ k: 'A: w', v: this.w() }, { k: 'B: u', v: this.hit().u }, { k: 'C: v', v: this.hit().v }]);

  message = computed(() => {
    const h = this.hit();
    if (h.parallel) return 'The ray runs parallel to the triangle’s plane, so det = 0 and there is no single meeting point. The test stops before dividing by zero.';
    if (h.t <= 0) return `The line meets the plane at t = ${num(h.t, 2)}: behind the origin. A ray only goes forwards, so this is a miss even though the point lies inside the triangle.`;
    const bad = this.bars().filter(b => b.v < 0).map(b => b.k.split(':')[0]);
    if (bad.length) return `The ray meets the plane at t = ${num(h.t, 2)}, but the weight for ${bad.join(' and ')} is negative, so the point is outside the triangle, beyond the edge opposite ${bad.length > 1 ? 'those corners' : 'that corner'}.`;
    return `Hit at t = ${num(h.t, 2)}. The point is w·A + u·B + v·C with all three weights between 0 and 1 and adding up to 1, so it lies inside the triangle.`;
  });

  set(a: number, b: number, rev: boolean, par: boolean) { this.aimA.set(a); this.aimB.set(b); this.reverse.set(rev); this.parallel.set(par); }
  clamp(v: number) { return Math.max(-1, Math.min(2, v)); }
  abs(v: number) { return Math.abs(v); }
}
