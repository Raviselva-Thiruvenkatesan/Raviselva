import { Component, computed, signal } from '@angular/core';
import { DragPlane } from './drag-plane';
import { M, mApply, mDet, mOf } from './affine';
import { P, arrowHead, num, shaftEnd, short } from './vec-plane';

type K = 'P';
type Entry = 'a' | 'b' | 'c' | 'd';

/** An "F" outline, so that turning and mirroring are easy to see. */
export const F_SHAPE: P[] = [
  { x: 0, y: 0 }, { x: 0.6, y: 0 }, { x: 0.6, y: 1 }, { x: 1.4, y: 1 }, { x: 1.4, y: 1.6 },
  { x: 0.6, y: 1.6 }, { x: 0.6, y: 2 }, { x: 1.8, y: 2 }, { x: 1.8, y: 2.6 }, { x: 0, y: 2.6 }
];

const PRESETS: { label: string; m: [number, number, number, number] }[] = [
  { label: 'Identity', m: [1, 0, 0, 1] },
  { label: 'Scale ×1.5', m: [1.5, 0, 0, 1.5] },
  { label: 'Stretch X', m: [2, 0, 0, 1] },
  { label: 'Shear', m: [1, 0, 0.8, 1] },
  { label: 'Rotate 30°', m: [0.866, 0.5, -0.5, 0.866] },
  { label: 'Mirror in Y axis', m: [-1, 0, 0, 1] },
  { label: 'Squash', m: [1, 0.5, 2, 1] }
];

/** A 2×2 matrix acting on the plane: its columns are where the X and Y axes land. */
@Component({
  selector: 'w-matrix-2d',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A 2×2 matrix moves the whole plane</h3></div>
      <div class="w-controls" role="group" aria-label="Presets">
        @for (p of presets; track p.label) {
          <button type="button" class="w-btn" [class.on]="isPreset(p.m)" (click)="load4(p.m)">{{ p.label }}</button>
        }
      </div>
      <p class="w-hint">Move the sliders or pick a preset, and drag the point P. The green arrow is the first column, the purple one the second.</p>
      <div class="w-grid two">
        <svg #svg viewBox="0 0 300 300" class="plane" role="img" [attr.aria-label]="message()"
             (pointermove)="move($event, svg)" (pointerup)="drag.set(null)" (pointercancel)="drag.set(null)">
          @for (g of grid; track g) {
            <line [attr.x1]="px(g)" [attr.y1]="py(-6)" [attr.x2]="px(g)" [attr.y2]="py(6)" class="grid" [class.axis]="g === 0" />
            <line [attr.x1]="px(-6)" [attr.y1]="py(g)" [attr.x2]="px(6)" [attr.y2]="py(g)" class="grid" [class.axis]="g === 0" />
          }
          @for (l of warped(); track $index) {
            <line [attr.x1]="px(l[0].x)" [attr.y1]="py(l[0].y)" [attr.x2]="px(l[1].x)" [attr.y2]="py(l[1].y)" class="warp" />
          }
          <polygon [attr.points]="line(shape)" class="ghost" />
          <polygon [attr.points]="line(shapeT())" class="shape" [class.flip]="det() < 0" />
          <polygon [attr.points]="line(square())" class="unit" />
          @for (c of cols(); track c.k) {
            <line [attr.x1]="px(0)" [attr.y1]="py(0)" [attr.x2]="c.tip.x" [attr.y2]="c.tip.y" class="col" [class.j]="c.k === 'j'" />
            <polygon [attr.points]="c.head" class="colh" [class.j]="c.k === 'j'" />
          }
          <line [attr.x1]="px(pt('P').x)" [attr.y1]="py(pt('P').y)" [attr.x2]="px(pT().x)" [attr.y2]="py(pT().y)" class="ext" />
          <circle [attr.cx]="px(pT().x)" [attr.cy]="py(pT().y)" r="5.5" class="res" />
          <text [attr.x]="px(pT().x) + 8" [attr.y]="py(pT().y) - 7" class="hl-t">P′</text>
          <g class="handle" [class.active]="drag() === 'P'" tabindex="0" role="slider" aria-label="Point P" [attr.aria-valuetext]="fmt(pt('P'))"
             (pointerdown)="start($event, 'P')" (keydown)="key($event, 'P')">
            <circle [attr.cx]="px(pt('P').x)" [attr.cy]="py(pt('P').y)" r="13" class="hit" />
            <circle [attr.cx]="px(pt('P').x)" [attr.cy]="py(pt('P').y)" r="5.5" class="dot alt" />
            <text [attr.x]="px(pt('P').x) + 8" [attr.y]="py(pt('P').y) - 7" class="hl-t">P</text>
          </g>
        </svg>
        <div>
          <div class="sliders">
            @for (e of entries; track e.k) {
              <label class="w-field">{{ e.k }} = {{ num(m()[e.k], 2) }}
                <input type="range" min="-2" max="2" step="0.1" [value]="m()[e.k]" [attr.aria-label]="e.label" (input)="set(e.k, +$any($event.target).value)" />
              </label>
            }
          </div>
          <table class="wtable mono mt-2 mat"><tbody>
            <tr><th rowspan="2">M</th><td class="ci">{{ short(m().a, 3) }}</td><td class="cj">{{ short(m().c, 3) }}</td></tr>
            <tr><td class="ci">{{ short(m().b, 3) }}</td><td class="cj">{{ short(m().d, 3) }}</td></tr>
          </tbody></table>
          <table class="wtable mono mt-2"><tbody>
            <tr><th>P</th><td>{{ fmt(pt('P')) }}</td></tr>
            <tr><th>x′ = a·x + c·y</th><td>{{ num(pT().x) }}</td></tr>
            <tr><th>y′ = b·x + d·y</th><td>{{ num(pT().y) }}</td></tr>
            <tr><th>det = ad − bc</th><td [class.ok]="det() > 1e-9" [class.hl]="det() <= 1e-9">{{ num(det(), 3) }}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="w-msg" [class.info]="det() > 1e-9" [class.err]="det() <= 1e-9" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss', './plane.scss'],
  styles: [`
    .warp { stroke: #8b5cf6; stroke-width: 1; opacity: 0.35; }
    .ghost { fill: none; stroke: var(--text-muted); stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.8; }
    .shape { fill: rgba(59, 130, 246, 0.25); stroke: #3b82f6; stroke-width: 2; stroke-linejoin: round; }
    .shape.flip { fill: rgba(245, 158, 11, 0.25); stroke: #f59e0b; }
    .unit { fill: rgba(139, 92, 246, 0.12); stroke: none; }
    .col { stroke: #10b981; stroke-width: 3.5; }
    .col.j { stroke: #8b5cf6; }
    .colh { fill: #10b981; }
    .colh.j { fill: #8b5cf6; }
    .sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
    .mat { width: auto; }
    .mat td { min-width: 3.6rem; font-weight: 700; }
    .ci { color: #059669; }
    .cj { color: #7c3aed; }
  `]
})
export class Matrix2dWidget extends DragPlane<K> {
  readonly num = num;
  readonly presets = PRESETS;
  readonly shape = F_SHAPE.map(p => ({ x: p.x + 0.5, y: p.y + 0.5 }));
  readonly entries: { k: Entry; label: string }[] = [
    { k: 'a', label: 'a, top left' }, { k: 'c', label: 'c, top right' }, { k: 'b', label: 'b, bottom left' }, { k: 'd', label: 'd, bottom right' }
  ];

  protected readonly pts = { P: signal<P>({ x: 3, y: -2 }) };
  m = signal<M>(mOf(1, 0.5, -0.5, 1));

  det = computed(() => mDet(this.m()));
  pT = computed(() => mApply(this.m(), this.pt('P')));
  shapeT = computed(() => this.shape.map(p => mApply(this.m(), p)));
  square = computed(() => [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }].map(p => mApply(this.m(), p)));
  /** The image of the grid lines x = k and y = k. */
  warped = computed(() => {
    const out: P[][] = [];
    for (let k = -4; k <= 4; k++) {
      out.push([mApply(this.m(), { x: k, y: -4 }), mApply(this.m(), { x: k, y: 4 })]);
      out.push([mApply(this.m(), { x: -4, y: k }), mApply(this.m(), { x: 4, y: k })]);
    }
    return out;
  });
  cols = computed(() => {
    const m = this.m(), o = { x: this.px(0), y: this.py(0) };
    return [{ k: 'i', v: { x: m.a, y: m.b } }, { k: 'j', v: { x: m.c, y: m.d } }].map(c => {
      const e = { x: this.px(c.v.x), y: this.py(c.v.y) };
      return { k: c.k, tip: shaftEnd(o.x, o.y, e.x, e.y, 10), head: arrowHead(o.x, o.y, e.x, e.y, 10) };
    });
  });

  message = computed(() => {
    const d = this.det(), m = this.m();
    if (Math.abs(d) < 1e-9) return `det = 0: both columns lie on one line, so the whole plane is squashed onto it. Areas become 0 and the matrix has no inverse: you cannot get P back from P′.`;
    const cols = `The X axis lands on (${short(m.a)}, ${short(m.b)}) and the Y axis on (${short(m.c)}, ${short(m.d)}): the two columns.`;
    if (d < 0) return `${cols} det = ${num(d, 3)} is negative: areas scale by ${num(Math.abs(d), 3)} and the shape is mirrored (the F reads backwards).`;
    return `${cols} Every area is multiplied by det = ${num(d, 3)}; the unit square becomes the purple parallelogram.`;
  });

  set(k: Entry, v: number) { this.m.update(m => ({ ...m, [k]: v })); }
  load4(v: [number, number, number, number]) { this.m.set(mOf(v[0], v[1], v[2], v[3])); }
  isPreset(v: [number, number, number, number]) { const m = this.m(); return m.a === v[0] && m.b === v[1] && m.c === v[2] && m.d === v[3]; }
  line(pts: P[]) { return pts.map(p => this.pp(p)).join(' '); }
}
