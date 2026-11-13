import { Component, computed, signal } from '@angular/core';

type Cull = 'None' | 'Front' | 'Back' | 'FrontAndBack';
type Front = 'Clockwise' | 'CounterClockwise';
type Poly = 'Fill' | 'Line' | 'Point';
const BASE: [number, number][] = [[100, 25], [160, 125], [40, 125]];   // top, bottom right, bottom left: clockwise on screen

/** Rasterisation state: winding, front face, cull mode and polygon mode, applied to the lesson's triangle. */
@Component({
  selector: 'w-pipeline-state',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Rasterisation state</h3></div>
      <div class="rows">
        <div class="w-controls" role="group" aria-label="Vertex order">
          <span class="lbl">Vertex order</span>
          <button type="button" class="w-btn small" [class.on]="!reversed()" [attr.aria-pressed]="!reversed()" (click)="reversed.set(false)">0 → 1 → 2 (clockwise)</button>
          <button type="button" class="w-btn small" [class.on]="reversed()" [attr.aria-pressed]="reversed()" (click)="reversed.set(true)">0 → 2 → 1 (counter-clockwise)</button>
        </div>
        <div class="w-controls" role="group" aria-label="FrontFace">
          <span class="lbl">FrontFace</span>
          @for (f of fronts; track f) { <button type="button" class="w-btn small" [class.on]="front() === f" [attr.aria-pressed]="front() === f" (click)="front.set(f)">{{ f }}</button> }
        </div>
        <div class="w-controls" role="group" aria-label="CullMode">
          <span class="lbl">CullMode</span>
          @for (c of culls; track c) { <button type="button" class="w-btn small" [class.on]="cull() === c" [attr.aria-pressed]="cull() === c" (click)="cull.set(c)">{{ c }}</button> }
        </div>
        <div class="w-controls" role="group" aria-label="PolygonMode">
          <span class="lbl">PolygonMode</span>
          @for (p of polys; track p) { <button type="button" class="w-btn small" [class.on]="poly() === p" [attr.aria-pressed]="poly() === p" (click)="poly.set(p)">{{ p }}</button> }
        </div>
      </div>
      <svg viewBox="0 0 200 150" class="view" role="img" [attr.aria-label]="message()">
        <rect width="200" height="150" class="screen" />
        @if (!culled()) {
          @if (poly() === 'Fill') { <polygon [attr.points]="points()" class="fill" /> }
          @if (poly() === 'Line') { <polygon [attr.points]="points()" class="line" /> }
          @if (poly() === 'Point') { @for (p of order(); track $index) { <circle [attr.cx]="p[0]" [attr.cy]="p[1]" r="2.2" class="pt" /> } }
        } @else {
          <polygon [attr.points]="points()" class="ghost" />
        }
        @for (p of order(); track $index; let i = $index) {
          <text [attr.x]="p[0] + (p[0] < 100 ? -9 : p[0] > 100 ? 5 : -3)" [attr.y]="p[1] + (p[1] < 50 ? -5 : 12)" class="idx">{{ i }}</text>
        }
        <path [attr.d]="arrow()" class="arrow" marker-end="url(#ps-head)" />
        <defs><marker id="ps-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="head" /></marker></defs>
      </svg>
      <div class="w-msg" [class.ok]="!culled()" [class.err]="culled()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .lbl { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); min-width: 6.5rem; }
    .rows .w-controls { margin-bottom: 0.3rem; }
    .view { width: 100%; max-width: 380px; display: block; margin: 0.5rem auto; }
    .screen { fill: #0f172a; }
    .fill { fill: rgba(167, 139, 250, 0.75); }
    .line { fill: none; stroke: #c4b5fd; stroke-width: 1; }
    .pt { fill: #c4b5fd; }
    .ghost { fill: none; stroke: rgba(148, 163, 184, 0.35); stroke-dasharray: 3 3; }
    .idx { font-size: 9px; font-weight: 800; fill: #e2e8f0; }
    .arrow { fill: none; stroke: #f59e0b; stroke-width: 1.2; }
    .head { fill: #f59e0b; }
  `]
})
export class PipelineStateWidget {
  readonly fronts: Front[] = ['Clockwise', 'CounterClockwise'];
  readonly culls: Cull[] = ['None', 'Front', 'Back', 'FrontAndBack'];
  readonly polys: Poly[] = ['Fill', 'Line', 'Point'];
  reversed = signal(false);
  front = signal<Front>('Clockwise');
  cull = signal<Cull>('None');
  poly = signal<Poly>('Fill');

  order = computed(() => this.reversed() ? [BASE[0], BASE[2], BASE[1]] : BASE);
  points = computed(() => this.order().map(p => p.join(',')).join(' '));
  /** A curved arrow around the centre showing the on-screen winding. */
  arrow = computed(() => this.reversed() ? 'M 112 70 A 14 14 0 1 0 100 98' : 'M 88 70 A 14 14 0 1 1 100 98');
  isFront = computed(() => (this.reversed() ? 'CounterClockwise' : 'Clockwise') === this.front());
  culled = computed(() => this.cull() === 'FrontAndBack' || (this.cull() === 'Front' && this.isFront()) || (this.cull() === 'Back' && !this.isFront()));
  message = computed(() => {
    const side = this.isFront() ? 'front' : 'back';
    const wind = this.reversed() ? 'counter-clockwise' : 'clockwise';
    if (this.culled()) return `On screen the corners run ${wind}, so with FrontFace = ${this.front()} this is a ${side} face, and CullMode ${this.cull()} discards it before any pixel is shaded.`;
    const mode = this.poly() === 'Fill' ? 'filled' : this.poly() === 'Line' ? 'drawn as its three edges (needs the fillModeNonSolid feature)' : 'drawn as its three corner points (needs fillModeNonSolid)';
    return `A ${side} face (${wind} on screen, FrontFace = ${this.front()}), not culled, ${mode}.`;
  });
}
