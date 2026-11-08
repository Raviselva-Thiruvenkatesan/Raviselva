import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { P, len, lerp, minus, num, short } from './vec-plane';

type K = 'A' | 'B';
type Kind = 'line' | 'ray' | 'segment';

const RANGE: Record<Kind, [number, number]> = { line: [-Infinity, Infinity], ray: [0, Infinity], segment: [0, 1] };

/** P(t) = A + t(B − A): one formula for a line, a ray and a segment. */
@Component({
  selector: 'w-param-line',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>P(t) = A + t·(B − A)</h3></div>
      <div class="w-controls" role="group" aria-label="Shape">
        @for (k of kinds; track k) {
          <button type="button" class="w-btn" [class.on]="kind() === k" [attr.aria-pressed]="kind() === k" (click)="kind.set(k)">{{ k }}</button>
        }
      </div>
      <p class="w-hint">Move the t slider, and drag A and B (or focus one and use the arrow keys).</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="'P(' + short(t()) + ') = ' + fmt(p())"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          <!-- the whole line, faint; the part this shape allows, solid -->
          <line [attr.x1]="px(far(-1).x)" [attr.y1]="py(far(-1).y)" [attr.x2]="px(far(1).x)" [attr.y2]="py(far(1).y)" class="ext" />
          <line [attr.x1]="px(solid()[0].x)" [attr.y1]="py(solid()[0].y)" [attr.x2]="px(solid()[1].x)" [attr.y2]="py(solid()[1].y)" class="main" />
          @for (m of ticks; track m) {
            <circle [attr.cx]="px(at(m).x)" [attr.cy]="py(at(m).y)" r="2.5" class="tick" />
            <text [attr.x]="px(at(m).x) + nrm().x * 14" [attr.y]="py(at(m).y) - nrm().y * 14 + 4" text-anchor="middle" class="lbl">t={{ m }}</text>
          }
          <line [attr.x1]="px(pt('A').x)" [attr.y1]="py(pt('A').y)" [attr.x2]="px(p().x)" [attr.y2]="py(p().y)" class="reach" />
          <circle [attr.cx]="px(p().x)" [attr.cy]="py(p().y)" r="6.5" class="res" [class.bad]="!valid()" />
          <text [attr.x]="px(p().x) - nrm().x * 16" [attr.y]="py(p().y) + nrm().y * 16 + 4" text-anchor="middle" class="hl-t">P</text>
          @for (k of keys; track k) {
            <g class="handle" [class.active]="drag() === k" tabindex="0" role="slider" [attr.aria-label]="'Point ' + k" [attr.aria-valuetext]="fmt(pt(k))"
               (pointerdown)="start($event, k)" (keydown)="key($event, k)">
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="13" class="hit" />
              <circle [attr.cx]="px(pt(k).x)" [attr.cy]="py(pt(k).y)" r="6" class="dot" [class.alt]="k === 'B'" />
              <text [attr.x]="px(pt(k).x) - nrm().x * 16" [attr.y]="py(pt(k).y) + nrm().y * 16 + 4" text-anchor="middle" class="hl-t">{{ k }}</text>
            </g>
          }
        </svg>
        <div>
          <label class="w-field mb-2">t = {{ short(t(), 2) }}
            <input type="range" min="-1.5" max="2.5" step="0.05" [value]="t()" (input)="t.set(+$any($event.target).value)" />
          </label>
          <table class="wtable mono"><tbody>
            <tr><th>d = B − A</th><td>{{ fmtV(d()) }}</td></tr>
            <tr><th>t × d</th><td>{{ fmtV(td()) }}</td></tr>
            <tr><th>P = A + t × d</th><td>{{ fmt(p()) }}</td></tr>
            <tr><th>distance from A</th><td>{{ num(dist()) }}</td></tr>
            <tr><th>allowed t</th><td>{{ rangeText() }}</td></tr>
            <tr><th>on the {{ kind() }}?</th><td [class.ok]="valid()" [class.hl]="!valid()">{{ valid() ? 'yes' : 'no' }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.ok]="valid()" [class.err]="!valid()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .tick { fill: var(--text-muted); }
    .reach { stroke: #10b981; stroke-width: 2; stroke-dasharray: 2 3; }
  `]
})
export class ParamLineWidget extends DragPlane<K> {
  readonly keys: K[] = ['A', 'B'];
  readonly kinds: Kind[] = ['line', 'ray', 'segment'];
  readonly ticks = [0, 1];
  readonly num = num;

  protected readonly pts = { A: signal<P>({ x: -3, y: -2 }), B: signal<P>({ x: 1, y: 1 }) };
  kind = signal<Kind>('segment');
  t = signal(0.5);

  d = computed(() => minus(this.pt('B'), this.pt('A')));
  td = computed(() => ({ x: this.d().x * this.t(), y: this.d().y * this.t() }));
  p = computed(() => this.at(this.t()));
  dist = computed(() => Math.abs(this.t()) * len(this.d()));
  /** Unit normal of the line, to place labels beside it. */
  nrm = computed(() => { const l = len(this.d()) || 1; return { x: -this.d().y / l, y: this.d().x / l }; });
  valid = computed(() => { const [lo, hi] = RANGE[this.kind()]; return this.t() >= lo - 1e-9 && this.t() <= hi + 1e-9; });
  rangeText = computed(() => ({ line: 'any t', ray: 't ≥ 0', segment: '0 ≤ t ≤ 1' })[this.kind()]);
  /** End points of the solid part, clipped far outside the view for the unbounded ends. */
  solid = computed<[P, P]>(() => {
    const [lo, hi] = RANGE[this.kind()];
    return [lo === -Infinity ? this.far(-1) : this.at(lo), hi === Infinity ? this.far(1) : this.at(hi)];
  });

  message = computed(() => {
    const t = this.t(), k = this.kind();
    if (!this.valid()) {
      return t < 0
        ? `t = ${short(t, 2)} is behind A. That point is on the infinite line, but a ${k} starts at A, so P is not on it.`
        : `t = ${short(t, 2)} is past B. A segment stops at t = 1, so P lies on the extension, not on the segment itself.`;
    }
    if (Math.abs(t) < 1e-9) return 't = 0 gives A itself: the start of every line, ray and segment.';
    if (Math.abs(t - 1) < 1e-9) return 't = 1 gives B: A plus the whole of d.';
    if (Math.abs(t - 0.5) < 1e-9) return 't = 0.5 is the midpoint: half of d added to A.';
    return `P is A plus ${short(t, 2)} × d, so it is ${num(this.dist())} units from A, which is ${short(Math.abs(t) * 100, 1)}% of the length of AB${t < 0 ? ', behind A' : t > 1 ? ', past B' : ''}.`;
  });

  at(t: number) { return lerp(this.pt('A'), this.pt('B'), t); }
  /** A point well outside the view along the line, in direction s (±1). */
  far(s: number) { const l = len(this.d()) || 1; return this.at((s * 40) / l); }
  fmtV(v: P) { return `⟨${short(v.x, 2)}, ${short(v.y, 2)}⟩`; }

  protected override place(k: K, p: P) {
    const other = this.pt(k === 'A' ? 'B' : 'A');
    super.place(k, p);
    // Keep A and B apart, or the direction would vanish.
    if (len(minus(this.pt(k), other)) < 0.25) this.pts[k].set({ x: other.x + 0.5, y: other.y });
  }
}
