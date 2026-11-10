import { Component, computed, signal } from '@angular/core';

interface Field { id: 'variant' | 'major' | 'minor' | 'patch'; label: string; bits: number; shift: number; cls: string; max: number }
const FIELDS: Field[] = [
  { id: 'variant', label: 'Variant', bits: 3, shift: 29, cls: 'fv', max: 7 },
  { id: 'major', label: 'Major', bits: 7, shift: 22, cls: 'fa', max: 127 },
  { id: 'minor', label: 'Minor', bits: 10, shift: 12, cls: 'fi', max: 1023 },
  { id: 'patch', label: 'Patch', bits: 12, shift: 0, cls: 'fp', max: 4095 }
];
const PRESETS = [
  { label: '1.0.0', v: [0, 1, 0, 0] },
  { label: '1.3.0 (Vk.Version13)', v: [0, 1, 3, 0] },
  { label: '1.4.304 (the test PC’s loader)', v: [0, 1, 4, 304] }
];

/** Pack a Vulkan version into 32 bits and see where each part goes. */
@Component({
  selector: 'w-version-bits',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A version in 32 bits</h3></div>
      <div class="w-controls" role="group" aria-label="Presets">
        @for (p of presets; track p.label) {
          <button type="button" class="w-btn small" [class.on]="isPreset(p.v)" [attr.aria-pressed]="isPreset(p.v)" (click)="vals.set(p.v.slice())">{{ p.label }}</button>
        }
      </div>
      @for (f of fields; track f.id; let i = $index) {
        <label class="w-field"><span><span class="sw {{ f.cls }}"></span>{{ f.label }} = {{ vals()[i] }} <span class="muted">({{ f.bits }} bits, from bit {{ f.shift }})</span></span>
          <input type="range" min="0" [max]="f.max" [value]="vals()[i]" (input)="set(i, +$any($event.target).value)" />
        </label>
      }
      <div class="bits mono" aria-label="The 32 bits, highest first">
        @for (b of bits(); track $index) { <span class="b {{ b.cls }}" [class.one]="b.on">{{ b.on ? 1 : 0 }}</span> }
      </div>
      <div class="out mono">
        <div>packed = ({{ vals()[0] }} &lt;&lt; 29) | ({{ vals()[1] }} &lt;&lt; 22) | ({{ vals()[2] }} &lt;&lt; 12) | {{ vals()[3] }}</div>
        <div>        = <b>{{ packed() }}</b> = 0x{{ hex() }}</div>
      </div>
      <div class="w-msg info" aria-live="polite"><span>{{ note() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .w-field { display: flex; flex-direction: column; gap: 2px; font-size: 0.82rem; font-weight: 600; margin: 0.25rem 0; }
    .w-field input { accent-color: #8b5cf6; width: 100%; }
    .muted { color: var(--text-muted); font-weight: 400; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
    .bits { display: grid; grid-template-columns: repeat(32, 1fr); gap: 1px; margin: 0.6rem 0 0.4rem; font-size: 0.62rem; }
    .b { text-align: center; padding: 3px 0; border-radius: 2px; opacity: 0.55; }
    .b.one { opacity: 1; font-weight: 800; }
    .fv { background: rgba(148, 163, 184, 0.45); } .fa { background: rgba(139, 92, 246, 0.45); }
    .fi { background: rgba(56, 189, 248, 0.45); } .fp { background: rgba(16, 185, 129, 0.45); }
    .out { font-size: 0.78rem; white-space: pre-wrap; word-break: break-all; }
  `]
})
export class VersionBitsWidget {
  readonly fields = FIELDS;
  readonly presets = PRESETS;
  vals = signal([0, 1, 4, 304]);

  set(i: number, v: number) { const a = this.vals().slice(); a[i] = v; this.vals.set(a); }
  isPreset(v: number[]) { return v.every((x, i) => x === this.vals()[i]); }
  packed = computed(() => { const [va, ma, mi, pa] = this.vals(); return ((va << 29) | (ma << 22) | (mi << 12) | pa) >>> 0; });
  hex = computed(() => this.packed().toString(16).toUpperCase().padStart(8, '0'));
  bits = computed(() => Array.from({ length: 32 }, (_, k) => {
    const bit = 31 - k;
    const f = FIELDS.find(x => bit >= x.shift && bit < x.shift + x.bits)!;
    return { on: ((this.packed() >>> bit) & 1) === 1, cls: f.cls };
  }));
  note = computed(() => {
    const [va, ma, mi] = this.vals();
    if (va !== 0) return 'A non-zero variant means a variant of the Vulkan API (such as Vulkan SC for safety-critical systems). Desktop Vulkan always uses 0.';
    if (ma === 0) return 'Major version 0 never happened: Vulkan 1.0 was the first release.';
    return `Because the major version sits in the highest bits, a newer version is always a bigger number: checking that ${ma}.${mi} is at least 1.3 is just packed >= Vk.Version13 (here ${ma > 1 || mi >= 3 ? 'true' : 'false'}).`;
  });
}
