import { Component, computed, signal } from '@angular/core';

type ViewType = 'Type2D' | 'Type2DArray' | 'TypeCube';
const MIPS = 5, LAYERS = 6;

/** A 6-layer, 5-mip image (a cube map): choose a view type and subresource range and see what it covers. */
@Component({
  selector: 'w-image-view',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>What does the view see?</h3></div>
      <p class="w-hint">The image: 6 array layers (the faces of a cube map), each with 5 mip levels, 256 × 256 down to 16 × 16.</p>
      <div class="w-controls" role="group" aria-label="View type">
        @for (t of types; track t) {
          <button type="button" class="w-btn small" [class.on]="type() === t" [attr.aria-pressed]="type() === t" (click)="type.set(t)">{{ t }}</button>
        }
      </div>
      <div class="ranges">
        <label class="w-field"><span>BaseMipLevel = {{ baseMip() }}</span><input type="range" min="0" [max]="mips - 1" [value]="baseMip()" (input)="baseMip.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>LevelCount = {{ levels() }}</span><input type="range" min="1" [max]="mips" [value]="levels()" (input)="levels.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>BaseArrayLayer = {{ baseLayer() }}</span><input type="range" min="0" [max]="layers - 1" [value]="baseLayer()" (input)="baseLayer.set(+$any($event.target).value)" /></label>
        <label class="w-field"><span>LayerCount = {{ layerCount() }}</span><input type="range" min="1" [max]="layers" [value]="layerCount()" (input)="layerCount.set(+$any($event.target).value)" /></label>
      </div>
      <div class="grid" role="img" [attr.aria-label]="message()">
        <div></div>
        @for (l of layerIdx; track l) { <div class="colh">layer {{ l }}</div> }
        @for (m of mipIdx; track m) {
          <div class="rowh">mip {{ m }} <span class="muted">{{ size(m) }}²</span></div>
          @for (l of layerIdx; track l) {
            <div class="cell" [class.in]="inView(m, l)" [class.bad]="inView(m, l) && !valid()"></div>
          }
        }
      </div>
      <div class="w-msg" [class.ok]="valid()" [class.err]="!valid()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .ranges { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0 12px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.8rem; font-weight: 600; margin: 0.2rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .grid { display: grid; grid-template-columns: 4.6rem repeat(6, 1fr); gap: 3px; margin: 0.6rem 0; font-size: 0.7rem; }
    .colh { text-align: center; font-weight: 700; color: var(--text-muted); }
    .rowh { font-weight: 700; white-space: nowrap; }
    .muted { color: var(--text-muted); font-weight: 400; }
    .cell { height: 1.4rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .cell.in { background: rgba(139, 92, 246, 0.55); border-color: #8b5cf6; }
    .cell.in.bad { background: rgba(220, 38, 38, 0.45); border-color: #dc2626; }
  `]
})
export class ImageViewWidget {
  readonly types: ViewType[] = ['Type2D', 'Type2DArray', 'TypeCube'];
  readonly mips = MIPS; readonly layers = LAYERS;
  readonly mipIdx = Array.from({ length: MIPS }, (_, i) => i);
  size(m: number) { return 256 / 2 ** m; }
  readonly layerIdx = Array.from({ length: LAYERS }, (_, i) => i);
  type = signal<ViewType>('Type2D');
  baseMip = signal(0); levels = signal(1); baseLayer = signal(0); layerCount = signal(1);

  inView(m: number, l: number) {
    return m >= this.baseMip() && m < this.baseMip() + this.levels() && l >= this.baseLayer() && l < this.baseLayer() + this.layerCount();
  }
  problem = computed(() => {
    if (this.baseMip() + this.levels() > MIPS) return `Mips ${this.baseMip()} to ${this.baseMip() + this.levels() - 1} run past the last level (4).`;
    if (this.baseLayer() + this.layerCount() > LAYERS) return `Layers ${this.baseLayer()} to ${this.baseLayer() + this.layerCount() - 1} run past the last layer (5).`;
    if (this.type() === 'Type2D' && this.layerCount() !== 1) return 'A Type2D view shows exactly one layer: set LayerCount to 1, or use Type2DArray.';
    if (this.type() === 'TypeCube' && this.layerCount() !== 6) return 'A cube view needs exactly 6 layers, one per face (+X, −X, +Y, −Y, +Z, −Z).';
    return '';
  });
  valid = computed(() => !this.problem());
  message = computed(() => {
    if (!this.valid()) return 'Invalid view: ' + this.problem();
    const mips = this.levels() === 1 ? `mip ${this.baseMip()}` : `mips ${this.baseMip()}–${this.baseMip() + this.levels() - 1}`;
    const lays = this.layerCount() === 1 ? `layer ${this.baseLayer()}` : `layers ${this.baseLayer()}–${this.baseLayer() + this.layerCount() - 1}`;
    const use = this.type() === 'TypeCube' ? 'A shader samples it as a cube with a direction vector (sky, reflections).'
      : this.type() === 'Type2DArray' ? 'A shader picks a layer by index: handy for shadow-map cascades or texture atlases.'
      : this.levels() === 1 ? 'One 2D image: what you can render into, for example to generate this mip level.' : 'One 2D image with a mip chain, for sampling.';
    return `${this.type()} view of ${mips}, ${lays}. ${use}`;
  });
}
