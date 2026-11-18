import { Component, computed, signal } from '@angular/core';

const GROUND = 20, WALL_X = 6, WALL_H = 4, STEP = 0.04, SCALE = 29, X0 = 10, Y0 = 170;

/** A cross-section through a shadow map: ground and a wall lit from the left, texels along the light, and the depth bias. */
@Component({
  selector: 'w-shadow-bias',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Acne, leaks and the bias</h3></div>
      <div class="sliders">
        <label class="w-field"><span>Sun height: {{ elevation() }}°</span><input type="range" min="10" max="80" step="1" [value]="elevation()" (input)="elevation.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Texel size: {{ texel().toFixed(2) }} m</span><input type="range" min="0.1" max="1" step="0.05" [value]="texel()" (input)="texel.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>Bias: {{ bias().toFixed(2) }} m</span><input type="range" min="0" max="1.5" step="0.01" [value]="bias()" (input)="bias.set(+$any($event.target).value)" /></label>
      </div>
      <div class="tw">
        <svg viewBox="0 0 610 205" class="view" role="img" [attr.aria-label]="message()">
          @for (r of rays(); track $index) { <line [attr.x1]="r[0]" [attr.y1]="r[1]" [attr.x2]="r[2]" [attr.y2]="r[3]" class="ray" /> }
          @for (s of samples(); track s.x) { <rect [attr.x]="px(s.x)" [attr.y]="Y0" [attr.width]="STEP * SCALE + 0.4" height="12" [attr.fill]="s.lit ? '#e2e8f0' : '#475569'" /> }
          <line [attr.x1]="px(shadow()[0])" [attr.y1]="Y0 + 18" [attr.x2]="px(shadow()[1])" [attr.y2]="Y0 + 18" class="exact" />
          <text [attr.x]="(px(shadow()[0]) + px(shadow()[1])) / 2" [attr.y]="Y0 + 30" class="lbl">exact shadow</text>
          <rect [attr.x]="px(WALL_X) - 4" [attr.y]="Y0 - WALL_H * SCALE" width="8" [attr.height]="WALL_H * SCALE" class="wall" />
          <text x="14" y="16" class="lbl l">sun</text>
        </svg>
      </div>
      <p class="w-hint">The strip is the ground as the shadow test sees it. Below it, the dashed line marks where the shadow really is. Without bias, acne needs about {{ needed().toFixed(2) }} m to disappear.</p>
      <div class="w-msg" [class.ok]="acne() === 0 && gap() < 0.05" [class.err]="acne() > 0 || gap() >= 0.05" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 4px 14px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .tw { overflow-x: auto; }
    .view { width: 100%; min-width: 460px; display: block; margin: 0.4rem 0; background: #0b0f17; border-radius: 8px; }
    .ray { stroke: rgba(250, 204, 21, 0.45); stroke-width: 1.2; stroke-dasharray: 6 5; }
    .wall { fill: #b45309; }
    .exact { stroke: #f87171; stroke-width: 2; stroke-dasharray: 4 3; }
    .lbl { font-size: 10px; fill: #94a3b8; text-anchor: middle; } .lbl.l { text-anchor: start; fill: #facc15; }
  `]
})
export class ShadowBiasWidget {
  readonly STEP = STEP; readonly SCALE = SCALE; readonly Y0 = Y0; readonly WALL_X = WALL_X; readonly WALL_H = WALL_H;
  elevation = signal(35);
  texel = signal(0.5);
  bias = signal(0);

  px(x: number) { return X0 + x * SCALE; }
  private e = computed(() => this.elevation() * Math.PI / 180);

  /** Light space: u runs across the light, depth along it (away from the sun, which shines from the left). */
  samples = computed(() => {
    const e = this.e(), t = this.texel(), b = this.bias(), sin = Math.sin(e), cos = Math.cos(e), out: { x: number; lit: boolean }[] = [];
    const stored = (u: number) => {
      const centre = (Math.floor(u / t) + 0.5) * t;
      let depth = centre / sin * cos;                                                  // the ground at the texel's centre
      const y = (centre - WALL_X * sin) / cos;                                         // the wall at that u, if it is there
      if (y >= 0 && y <= WALL_H) depth = Math.min(depth, WALL_X * cos - y * sin);
      return depth;
    };
    for (let x = STEP / 2; x < GROUND; x += STEP) out.push({ x, lit: x * cos - b <= stored(x * sin) + 1e-9 });
    return out;
  });

  shadow = computed(() => [WALL_X, WALL_X + WALL_H / Math.tan(this.e())].map(x => Math.min(x, GROUND)));
  rays = computed(() => {
    const e = this.e(), dx = Math.cos(e), dy = Math.sin(e);
    return [WALL_X - 3, WALL_X, WALL_X + WALL_H / Math.tan(e)].map(x => {
      const len = 9;
      return [this.px(x - dx * len), Y0 - dy * len * SCALE, this.px(x), Y0];
    }).map(r => r.map(v => +v.toFixed(1)));
  });

  /** Lit ground (outside the exact shadow) drawn dark: acne. */
  acne = computed(() => { const [s0, s1] = this.shadow(); const open = this.samples().filter(s => s.x < s0 - 0.3 || s.x > s1 + 0.3); return open.filter(s => !s.lit).length / open.length; });
  /** Ground just behind the wall drawn lit: the shadow has come loose (peter-panning). */
  gap = computed(() => { const first = this.samples().find(s => s.x > WALL_X && !s.lit); return first ? first.x - WALL_X : this.shadow()[1] - WALL_X; });
  needed = computed(() => this.texel() / 2 / Math.tan(this.e()));

  message = computed(() => {
    const acne = Math.round(this.acne() * 100), gap = this.gap();
    if (acne > 0) return `Shadow acne: ${acne}% of the open ground is drawn dark. Each texel stores one depth, and the sloped ground (seen from the sun) is up to ${this.needed().toFixed(2)} m deeper at a texel’s edge than at its centre. Raise the bias past that, or make texels smaller.`;
    if (gap >= 0.05) return `No acne, but the shadow starts ${gap.toFixed(2)} m from the wall: the bias also pushes the wall’s own depth test, so light leaks under it (peter-panning). The gap is the bias × cos(sun height).`;
    return 'No acne and the shadow touches the wall: the bias is just large enough. Lower sun angles and larger texels need more.';
  });
}
