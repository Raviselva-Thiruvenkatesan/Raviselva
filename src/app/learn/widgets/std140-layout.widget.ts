import { Component, computed, signal } from '@angular/core';

type FieldType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'float[4]';
interface TypeInfo { size: number; align: number; cs: string; csSize: number }
const TYPES: Record<FieldType, TypeInfo> = {
  float: { size: 4, align: 4, cs: 'float', csSize: 4 },
  int: { size: 4, align: 4, cs: 'int', csSize: 4 },
  vec2: { size: 8, align: 8, cs: 'Vector2', csSize: 8 },
  vec3: { size: 12, align: 16, cs: 'Vector3', csSize: 12 },
  vec4: { size: 16, align: 16, cs: 'Vector4', csSize: 16 },
  mat4: { size: 64, align: 16, cs: 'Matrix4x4', csSize: 64 },
  'float[4]': { size: 64, align: 16, cs: 'fixed float[4]', csSize: 16 }   // std140: every array element takes 16 bytes
};
const COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];
const PRESETS: { label: string; fields: FieldType[] }[] = [
  { label: 'This lesson’s block', fields: ['vec4', 'vec2', 'float'] },
  { label: 'The vec3 trap', fields: ['float', 'vec3', 'float'] },
  { label: 'A camera block', fields: ['mat4', 'mat4', 'vec3', 'float'] },
  { label: 'An array', fields: ['float[4]', 'float'] }
];
const roundUp = (n: number, a: number) => Math.ceil(n / a) * a;

/** Build a uniform block and compare where std140 puts each field with where a sequential C# struct does. */
@Component({
  selector: 'w-std140-layout',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>std140: where does each field go?</h3></div>
      <div class="w-controls" role="group" aria-label="Presets">
        @for (p of presets; track p.label) { <button type="button" class="w-btn small" (click)="fields.set(p.fields.slice())">{{ p.label }}</button> }
      </div>
      <div class="w-controls" role="group" aria-label="Add a field">
        @for (t of typeNames; track t) { <button type="button" class="w-btn small mono" [disabled]="fields().length >= 8" (click)="add(t)">+ {{ t }}</button> }
        <button type="button" class="w-btn small" [disabled]="!fields().length" (click)="fields.set(fields().slice(0, -1))"><i class="bi bi-backspace" aria-hidden="true"></i> Remove last</button>
      </div>
      <div class="rows" role="img" [attr.aria-label]="'std140 layout, ' + size() + ' bytes'">
        @for (r of rowIdx(); track r) {
          <div class="row"><span class="off mono">{{ r * 16 }}</span>
            @for (s of [0, 1, 2, 3]; track s) {
              <div class="slot" [style.background]="slotColor(r * 4 + s)" [class.pad]="slotColor(r * 4 + s) === ''">{{ slotLabel(r * 4 + s) }}</div>
            }
          </div>
        }
      </div>
      <table class="wtable mono">
        <thead><tr><th scope="col">Field</th><th scope="col">std140 offset</th><th scope="col">C# Sequential</th><th scope="col"></th></tr></thead>
        <tbody>
          @for (f of layout(); track $index) {
            <tr [class.bad]="f.offset !== f.csOffset"><td><span class="dot" [style.background]="f.color"></span>{{ f.type }} {{ f.name }}</td><td>{{ f.offset }}</td><td>{{ f.cs }} at {{ f.csOffset }}</td><td>{{ f.offset === f.csOffset ? '✓' : '✗' }}</td></tr>
          }
        </tbody>
      </table>
      <div class="w-msg" [class.ok]="!mismatch()" [class.err]="!!mismatch()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .rows { display: flex; flex-direction: column; gap: 2px; margin: 0.5rem 0; max-width: 420px; }
    .row { display: grid; grid-template-columns: 2.4rem repeat(4, 1fr); gap: 2px; align-items: stretch; }
    .off { font-size: 0.7rem; color: var(--text-muted); text-align: right; padding-right: 4px; align-self: center; }
    .slot { height: 1.5rem; border-radius: 4px; color: #fff; font-size: 0.68rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .slot.pad { background: repeating-linear-gradient(45deg, var(--bg-main), var(--bg-main) 4px, var(--border-color) 4px, var(--border-color) 6px); }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
    .wtable { font-size: 0.74rem; }
    tr.bad td { color: #dc2626; font-weight: 700; }
  `]
})
export class Std140LayoutWidget {
  readonly presets = PRESETS;
  readonly typeNames = Object.keys(TYPES) as FieldType[];
  fields = signal<FieldType[]>(PRESETS[0].fields.slice());
  add(t: FieldType) { this.fields.update(f => [...f, t]); }

  layout = computed(() => {
    let off = 0, csOff = 0;
    return this.fields().map((type, i) => {
      const t = TYPES[type];
      off = roundUp(off, t.align);
      const row = { type, name: String.fromCharCode(97 + i), offset: off, size: t.size, cs: t.cs, csOffset: csOff, color: COLORS[i % COLORS.length] };
      off += t.size;
      csOff += t.csSize;
      return row;
    });
  });
  size = computed(() => {
    const l = this.layout();
    return l.length ? roundUp(l[l.length - 1].offset + l[l.length - 1].size, 16) : 0;
  });
  rowIdx = computed(() => Array.from({ length: Math.max(1, this.size() / 16) }, (_, i) => i));
  /** Which field owns each 4-byte slot. Arrays only use the first 4 bytes of each 16-byte element. */
  owners = computed(() => {
    const slots: (number | null)[] = Array(this.size() / 4).fill(null);
    this.layout().forEach((f, i) => {
      for (let b = 0; b < f.size; b += 4) {
        if (f.type === 'float[4]' && b % 16 !== 0) continue;
        slots[(f.offset + b) / 4] = i;
      }
    });
    return slots;
  });
  slotColor(s: number) { const o = this.owners()[s]; return o == null ? '' : this.layout()[o].color; }
  slotLabel(s: number) {
    const o = this.owners()[s];
    if (o == null) return '';
    return this.owners()[s - 1] === o ? '' : this.layout()[o].name;
  }
  mismatch = computed(() => this.layout().find(f => f.offset !== f.csOffset));
  message = computed(() => {
    const m = this.mismatch();
    if (!this.layout().length) return 'Add some fields.';
    if (m) return `Mismatch: C# puts ${m.name} at offset ${m.csOffset}, but the shader reads it at ${m.offset}. Add padding fields before it, or use [StructLayout(LayoutKind.Explicit)] with [FieldOffset(${m.offset})].`;
    const pad = this.owners().filter(o => o == null).length * 4;
    return `C# and std140 agree on every offset. The block is ${this.size()} bytes` + (pad ? `, ${pad} of them padding (hatched).` : ', with no padding.');
  });
}
