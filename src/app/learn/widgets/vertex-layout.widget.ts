import { Component, computed, signal } from '@angular/core';

interface Attr { name: string; glsl: string; format: string; bytes: number; color: string }
type ColorMode = 'none' | 'float' | 'unorm';

const POSITION: Attr = { name: 'Position', glsl: 'vec3', format: 'R32G32B32Sfloat', bytes: 12, color: '#8b5cf6' };
const NORMAL: Attr = { name: 'Normal', glsl: 'vec3', format: 'R32G32B32Sfloat', bytes: 12, color: '#0ea5e9' };
const COLOR_FLOAT: Attr = { name: 'Colour', glsl: 'vec3', format: 'R32G32B32Sfloat', bytes: 12, color: '#f59e0b' };
const COLOR_UNORM: Attr = { name: 'Colour', glsl: 'vec4', format: 'R8G8B8A8Unorm', bytes: 4, color: '#f59e0b' };
const UV: Attr = { name: 'UV', glsl: 'vec2', format: 'R32G32Sfloat', bytes: 8, color: '#10b981' };

/** Choose a vertex's attributes and layout; see offsets, strides and the descriptions Vulkan needs. */
@Component({
  selector: 'w-vertex-layout',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Lay out a vertex</h3></div>
      <div class="w-controls" role="group" aria-label="Attributes">
        <button type="button" class="w-btn small" [class.on]="normal()" [attr.aria-pressed]="normal()" (click)="normal.set(!normal())">Normal</button>
        <button type="button" class="w-btn small" [class.on]="uv()" [attr.aria-pressed]="uv()" (click)="uv.set(!uv())">Texture coordinate</button>
        <span class="lbl">Colour:</span>
        @for (c of colorModes; track c.id) {
          <button type="button" class="w-btn small" [class.on]="color() === c.id" [attr.aria-pressed]="color() === c.id" (click)="color.set(c.id)">{{ c.label }}</button>
        }
      </div>
      <div class="w-controls" role="group" aria-label="Layout">
        <button type="button" class="w-btn small" [class.on]="!separate()" [attr.aria-pressed]="!separate()" (click)="separate.set(false)">Interleaved: one buffer</button>
        <button type="button" class="w-btn small" [class.on]="separate()" [attr.aria-pressed]="separate()" (click)="separate.set(true)">One buffer per attribute</button>
      </div>
      @for (row of strips(); track row.binding) {
        <div class="strip-head mono">Binding {{ row.binding }}: stride {{ row.stride }} bytes</div>
        <div class="strip" role="img" [attr.aria-label]="'Binding ' + row.binding + ', ' + row.stride + ' bytes per vertex'">
          @for (s of row.parts; track s.attr.name) {
            <div class="seg" [style.flex-grow]="s.attr.bytes" [style.background]="s.attr.color">
              <b>{{ s.attr.name }}</b><span>bytes {{ s.offset }}–{{ s.offset + s.attr.bytes - 1 }}</span>
            </div>
          }
        </div>
      }
      <div class="tw"><table class="wtable mono">
        <thead><tr><th scope="col">location</th><th scope="col">GLSL</th><th scope="col">format</th><th scope="col">binding</th><th scope="col">offset</th></tr></thead>
        <tbody>
          @for (a of rows(); track a.location) {
            <tr><td>{{ a.location }} ({{ a.attr.name }})</td><td>{{ a.attr.glsl }}</td><td>{{ a.attr.format }}</td><td>{{ a.binding }}</td><td>{{ a.offset }}</td></tr>
          }
        </tbody>
      </table></div>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .lbl { font-size: 0.8rem; font-weight: 700; align-self: center; margin-left: 4px; }
    .strip-head { font-size: 0.76rem; color: var(--text-muted); margin-top: 0.4rem; }
    .strip { display: flex; gap: 2px; margin: 0.2rem 0 0.3rem; }
    .seg { min-width: 0; border-radius: 6px; padding: 5px 6px; color: #fff; display: flex; flex-direction: column; font-size: 0.74rem; line-height: 1.25; overflow: hidden; }
    .seg span { font-size: 0.68rem; opacity: 0.9; white-space: nowrap; }
    .tw { overflow-x: auto; margin: 0.5rem 0; }
    .wtable { font-size: 0.72rem; }
    .wtable td, .wtable th { padding: 3px 4px; }
  `]
})
export class VertexLayoutWidget {
  readonly colorModes: { id: ColorMode; label: string }[] = [
    { id: 'none', label: 'none' }, { id: 'float', label: '3 floats' }, { id: 'unorm', label: '4 bytes (RGBA8)' }
  ];
  normal = signal(false);
  uv = signal(false);
  color = signal<ColorMode>('float');
  separate = signal(false);

  attrs = computed(() => {
    const list = [POSITION];
    if (this.normal()) list.push(NORMAL);
    if (this.color() === 'float') list.push(COLOR_FLOAT);
    if (this.color() === 'unorm') list.push(COLOR_UNORM);
    if (this.uv()) list.push(UV);
    return list;
  });
  rows = computed(() => {
    let offset = 0;
    return this.attrs().map((attr, i) => {
      const row = { location: i, attr, binding: this.separate() ? i : 0, offset: this.separate() ? 0 : offset };
      offset += attr.bytes;
      return row;
    });
  });
  strips = computed(() => {
    const rows = this.rows();
    if (this.separate()) return rows.map(r => ({ binding: r.binding, stride: r.attr.bytes, parts: [{ attr: r.attr, offset: 0 }] }));
    return [{ binding: 0, stride: this.bytes(), parts: rows.map(r => ({ attr: r.attr, offset: r.offset })) }];
  });
  bytes = computed(() => this.attrs().reduce((s, a) => s + a.bytes, 0));
  message = computed(() => {
    const b = this.bytes();
    const mb = (b * 1_000_000 / 1_048_576).toFixed(1);
    const base = `${b} bytes per vertex: ${mb} MiB for a million vertices.`;
    if (this.color() === 'float') return `${base} Storing the colour as RGBA8 instead would save 8 bytes per vertex; the hardware converts it to floats as it reads.`;
    if (this.separate()) return `${base} Separate buffers let a pass that only needs positions (a depth or shadow pass) read 12 bytes per vertex instead of the whole vertex.`;
    return `${base} Interleaving keeps each vertex’s data together, which suits drawing when every attribute is used.`;
  });
}
