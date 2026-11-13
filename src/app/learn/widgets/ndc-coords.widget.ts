import { Component, computed, signal } from '@angular/core';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6'];
const NAMES = ['0 (red)', '1 (green)', '2 (blue)'];

/** Move the triangle's corners in normalised device coordinates and see where they land, in Vulkan and in OpenGL. */
@Component({
  selector: 'w-ndc-coords',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>From gl_Position to pixels</h3></div>
      <div class="w-controls" role="group" aria-label="API">
        <button type="button" class="w-btn small" [class.on]="!gl()" [attr.aria-pressed]="!gl()" (click)="gl.set(false)">Vulkan (y down)</button>
        <button type="button" class="w-btn small" [class.on]="gl()" [attr.aria-pressed]="gl()" (click)="gl.set(true)">OpenGL (y up)</button>
        <span class="sep"></span>
        @for (n of names; track $index; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="sel() === i" [attr.aria-pressed]="sel() === i" (click)="sel.set(i)"><span class="dot" [style.background]="colors[i]"></span>Vertex {{ n }}</button>
        }
      </div>
      <div class="sliders">
        <label class="w-field"><span>x = {{ pts()[sel()][0].toFixed(2) }}</span><input type="range" min="-1" max="1" step="0.05" [value]="pts()[sel()][0]" (input)="move(0, +$any($event.target).value)" /></label>
        <label class="w-field"><span>y = {{ pts()[sel()][1].toFixed(2) }}</span><input type="range" min="-1" max="1" step="0.05" [value]="pts()[sel()][1]" (input)="move(1, +$any($event.target).value)" /></label>
      </div>
      <svg viewBox="-14 -14 228 178" class="view" role="img" aria-label="An 800 by 600 window with the triangle drawn in it">
        <rect x="0" y="0" width="200" height="150" class="screen" />
        <line x1="100" y1="0" x2="100" y2="150" class="axis" /><line x1="0" y1="75" x2="200" y2="75" class="axis" />
        <text x="2" y="-4" class="t">({{ '-1, ' + (gl() ? '+1' : '-1') }})</text>
        <text x="198" y="160" class="t end">({{ '+1, ' + (gl() ? '-1' : '+1') }})</text>
        <polygon [attr.points]="poly()" class="tri" />
        @for (p of screenPts(); track $index; let i = $index) { <circle [attr.cx]="p[0]" [attr.cy]="p[1]" r="4" [attr.fill]="colors[i]" [class.sel]="i === sel()" /> }
      </svg>
      <table class="wtable mono">
        <thead><tr><th scope="col">Vertex</th><th scope="col">gl_Position.xy</th><th scope="col">Pixel in 800 × 600</th></tr></thead>
        <tbody>
          @for (p of pts(); track $index; let i = $index) {
            <tr><td><span class="dot" [style.background]="colors[i]"></span>{{ i }}</td><td>({{ p[0].toFixed(2) }}, {{ p[1].toFixed(2) }})</td><td>({{ pixel(p)[0] }}, {{ pixel(p)[1] }})</td></tr>
          }
        </tbody>
      </table>
      <div class="w-msg info" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .sep { width: 8px; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
    .sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .view { width: 100%; max-width: 420px; display: block; margin: 0.5rem auto; }
    .screen { fill: #0f172a; }
    .axis { stroke: rgba(148, 163, 184, 0.35); stroke-dasharray: 3 3; }
    .t { font-size: 7px; fill: var(--text-muted); }
    .end { text-anchor: end; }
    .tri { fill: rgba(167, 139, 250, 0.45); stroke: #c4b5fd; stroke-width: 0.8; }
    circle.sel { stroke: #fff; stroke-width: 1.5; }
    .wtable { font-size: 0.78rem; }
  `]
})
export class NdcCoordsWidget {
  readonly colors = COLORS;
  readonly names = NAMES;
  gl = signal(false);
  sel = signal(0);
  pts = signal<[number, number][]>([[0, -0.5], [0.5, 0.5], [-0.5, 0.5]]);

  move(axis: 0 | 1, v: number) {
    const a = this.pts().map(p => [...p] as [number, number]);
    a[this.sel()][axis] = v;
    this.pts.set(a);
  }
  /** NDC to the 200 x 150 drawing: Vulkan maps y = -1 to the top, OpenGL to the bottom. */
  screenPts = computed(() => this.pts().map(([x, y]) => [(x + 1) * 100, (this.gl() ? 1 - y : y + 1) * 75]));
  poly = computed(() => this.screenPts().map(p => p.join(',')).join(' '));
  pixel(p: [number, number]) {
    const y = this.gl() ? 1 - p[1] : p[1] + 1;
    return [Math.round((p[0] + 1) / 2 * 800), Math.round(y / 2 * 600)];
  }
  note = computed(() => this.gl()
    ? 'OpenGL puts y = +1 at the top. The same shader drawn by OpenGL shows the triangle upside down compared with Vulkan; ported code usually flips y in the projection matrix.'
    : 'Pixel = ((x + 1) / 2 × width, (y + 1) / 2 × height). The lesson’s triangle has its tip at y = −0.5, a quarter of the way down: pixel row 150.');
}
