import { Component, computed, signal } from '@angular/core';

// The triangle fragment shader from module 2 (vColor in, outColor = vec4(vColor, 1.0)), compiled by shaderc for Vulkan 1.3.
// Each inner array is one instruction; the first is the 5-word header.
const RAW: number[][] = [[119734787, 67072, 851979, 19, 0], [131089, 1], [393227, 1, 1280527431, 1685353262, 808793134, 0], [196622, 0, 1], [458767, 4, 4, 1852399981, 0, 9, 12], [196624, 4, 7], [196611, 2, 450], [655364, 1197427783, 1279741775, 1885560645, 1953718128, 1600482425, 1701734764, 1919509599, 1769235301, 25974], [524292, 1197427783, 1279741775, 1852399429, 1685417059, 1768185701, 1952671090, 6649449], [262149, 4, 1852399981, 0], [327685, 9, 1131705711, 1919904879, 0], [262149, 12, 1819231094, 29295], [262215, 9, 30, 0], [262215, 12, 30, 0], [131091, 2], [196641, 3, 2], [196630, 6, 32], [262167, 7, 6, 4], [262176, 8, 3, 7], [262203, 8, 9, 3], [262167, 10, 6, 3], [262176, 11, 1, 10], [262203, 11, 12, 1], [262187, 6, 14, 1065353216], [327734, 2, 4, 0, 3], [131320, 5], [262205, 10, 13, 12], [327761, 6, 15, 13, 0], [327761, 6, 16, 13, 1], [327761, 6, 17, 13, 2], [458832, 7, 18, 15, 16, 17, 14], [196670, 9, 18], [65789], [65592]];
const OPT: number[][] = [[119734787, 67072, 851979, 19, 0], [131089, 1], [393227, 1, 1280527431, 1685353262, 808793134, 0], [196622, 0, 1], [458767, 4, 4, 1852399981, 0, 9, 12], [196624, 4, 7], [262215, 9, 30, 0], [262215, 12, 30, 0], [131091, 2], [196641, 3, 2], [196630, 6, 32], [262167, 7, 6, 4], [262176, 8, 3, 7], [262203, 8, 9, 3], [262167, 10, 6, 3], [262176, 11, 1, 10], [262203, 11, 12, 1], [262187, 6, 14, 1065353216], [327734, 2, 4, 0, 3], [131320, 5], [262205, 10, 13, 12], [327761, 6, 15, 13, 0], [327761, 6, 16, 13, 1], [327761, 6, 17, 13, 2], [458832, 7, 18, 15, 16, 17, 14], [196670, 9, 18], [65789], [65592]];

const OPS: Record<number, [string, string]> = {
  3: ['OpSource', 'The source language and version: GLSL 450. Debug information.'],
  4: ['OpSourceExtension', 'An extension the source used. Debug information.'],
  5: ['OpName', 'Gives an ID a name, for debuggers and reflection. The optimiser removes these.'],
  11: ['OpExtInstImport', 'Imports a set of extended instructions (GLSL’s maths functions).'],
  14: ['OpMemoryModel', 'Logical addressing, GLSL450 memory model.'],
  15: ['OpEntryPoint', 'The shader’s entry: a fragment shader whose function is “main”, with the global inputs and outputs it uses.'],
  16: ['OpExecutionMode', 'Fragment coordinates start at the upper left, as Vulkan requires.'],
  17: ['OpCapability', 'A feature the module needs: Shader.'],
  19: ['OpTypeVoid', 'Declares the void type.'],
  22: ['OpTypeFloat', 'Declares a 32-bit float type.'],
  23: ['OpTypeVector', 'Declares a vector type: vec3 or vec4 of floats.'],
  32: ['OpTypePointer', 'A pointer type with a storage class: what an OpVariable is declared with.'],
  33: ['OpTypeFunction', 'The type of a function returning void.'],
  43: ['OpConstant', 'A constant: the float 1.0.'],
  54: ['OpFunction', 'Starts the function main.'],
  56: ['OpFunctionEnd', 'Ends the function.'],
  59: ['OpVariable', 'A global variable. Its storage class (Input, Output, Uniform, PushConstant…) is what reflection looks at.'],
  61: ['OpLoad', 'Reads vColor.'],
  62: ['OpStore', 'Writes the result to outColor.'],
  71: ['OpDecorate', 'Attaches a decoration to an ID: here Location 0, which connects the variable to the pipeline. It survives optimisation.'],
  80: ['OpCompositeConstruct', 'Builds vec4(r, g, b, 1.0).'],
  81: ['OpCompositeExtract', 'Takes one component out of vColor.'],
  248: ['OpLabel', 'Starts a block of code.'],
  253: ['OpReturn', 'Returns from main.']
};
const STORAGE: Record<number, string> = { 0: 'UniformConstant', 1: 'Input', 2: 'Uniform', 3: 'Output', 9: 'PushConstant' };
const DECORATION: Record<number, string> = { 30: 'Location', 33: 'Binding', 34: 'DescriptorSet', 11: 'BuiltIn' };

function text(words: number[]): string {
  const bytes: number[] = [];
  for (const w of words) for (let k = 0; k < 4; k++) { const b = (w >>> (8 * k)) & 255; if (b === 0) return String.fromCharCode(...bytes); bytes.push(b); }
  return String.fromCharCode(...bytes);
}

/** A real SPIR-V module, word by word: click an instruction to see its words and what it means. */
@Component({
  selector: 'w-spirv-words',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside a SPIR-V module</h3></div>
      <div class="w-controls" role="group" aria-label="Compiled with">
        <button type="button" class="w-btn small" [class.on]="!opt()" [attr.aria-pressed]="!opt()" (click)="pick(false)">Not optimised ({{ count(false) }} words)</button>
        <button type="button" class="w-btn small" [class.on]="opt()" [attr.aria-pressed]="opt()" (click)="pick(true)">Optimised ({{ count(true) }} words)</button>
      </div>
      <div class="cols">
        <div class="list mono" role="list">
          @for (ins of rows(); track $index; let i = $index) {
            <button type="button" role="listitem" class="ins" [class.sel]="i === sel()" [class.refl]="ins.refl" (click)="sel.set(i)">
              <span class="off">{{ ins.offset }}</span><span>{{ ins.text }}</span>
            </button>
          }
        </div>
        <div class="w-panel detail">
          <div class="mono words">
            @for (w of cur().words; track $index; let k = $index) { <span class="word" [class.first]="k === 0">{{ hex(w) }}</span> }
          </div>
          @if (sel() > 0) {
            <div class="split mono">first word {{ hex(cur().words[0]) }} = length <b>{{ cur().length }}</b> &lt;&lt; 16 | opcode <b>{{ cur().opcode }}</b></div>
          }
          <div>{{ cur().about }}</div>
        </div>
      </div>
      <p class="w-hint">Highlighted lines are the ones reflection reads: names, decorations, pointer types and variables.</p>
      <div class="w-msg info" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .cols { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 10px; margin: 0.4rem 0; align-items: start; }
    @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
    .list { max-height: 300px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-main); }
    .ins { display: flex; gap: 8px; width: 100%; text-align: left; border: 0; background: none; color: var(--text-main); font: inherit; font-size: 0.72rem; padding: 2px 6px; cursor: pointer; white-space: nowrap; }
    .ins.refl { background: rgba(16, 185, 129, 0.1); }
    .ins.sel { background: rgba(139, 92, 246, 0.25); }
    .off { color: var(--text-muted); min-width: 2rem; text-align: right; }
    .detail { font-size: 0.82rem; display: flex; flex-direction: column; gap: 6px; }
    .words { display: flex; flex-wrap: wrap; gap: 3px; }
    .word { padding: 1px 4px; border-radius: 4px; background: var(--bg-main); border: 1px solid var(--border-color); font-size: 0.72rem; }
    .word.first { border-color: #8b5cf6; }
    .split { font-size: 0.74rem; color: var(--text-muted); }
  `]
})
export class SpirvWordsWidget {
  opt = signal(false);
  sel = signal(12);

  pick(o: boolean) { this.opt.set(o); this.sel.set(o ? 6 : 12); }
  count(o: boolean) { return (o ? OPT : RAW).reduce((n, i) => n + i.length, 0); }
  hex(w: number) { return '0x' + (w >>> 0).toString(16).toUpperCase().padStart(8, '0'); }

  rows = computed(() => {
    const data = this.opt() ? OPT : RAW;
    const names = new Map<number, string>();
    for (const ins of data.slice(1)) if ((ins[0] & 65535) === 5) names.set(ins[1], text(ins.slice(2)));
    const id = (n: number) => '%' + (names.get(n) ?? n);
    let offset = 0;
    return data.map((w, i) => {
      const at = offset; offset += w.length;
      if (i === 0) return { offset: at, words: w, refl: false, text: `header: magic 0x07230203, SPIR-V 1.6, bound ${w[3]}`, about: 'Five words: the magic number, the version (1.6 for Vulkan 1.3), the generator (shaderc), the ID bound (every ID is below 19) and a reserved zero.' };
      const op = w[0] & 65535, [name, about] = OPS[op] ?? [`Op${op}`, ''];
      const a = w.slice(1);
      let t: string;
      switch (op) {
        case 3: t = `${name} GLSL ${a[1]}`; break;
        case 4: t = `${name} "${text(a)}"`; break;
        case 5: t = `${name} %${a[0]} "${text(a.slice(1))}"`; break;
        case 11: t = `${id(a[0])} = ${name} "${text(a.slice(1))}"`; break;
        case 14: t = `${name} Logical GLSL450`; break;
        case 15: t = `${name} Fragment ${id(a[1])} "${text(a.slice(2, 4))}" ${a.slice(4).map(id).join(' ')}`; break;
        case 16: t = `${name} ${id(a[0])} OriginUpperLeft`; break;
        case 17: t = `${name} Shader`; break;
        case 71: t = `${name} ${id(a[0])} ${DECORATION[a[1]] ?? a[1]} ${a.slice(2).join(' ')}`; break;
        case 19: case 248: t = `${id(a[0])} = ${name}`; break;
        case 22: t = `${id(a[0])} = ${name} ${a[1]}`; break;
        case 23: t = `${id(a[0])} = ${name} ${id(a[1])} ${a[2]}`; break;
        case 32: t = `${id(a[0])} = ${name} ${STORAGE[a[1]] ?? a[1]} ${id(a[2])}`; break;
        case 33: t = `${id(a[0])} = ${name} ${id(a[1])}`; break;
        case 43: t = `${id(a[1])} = ${name} ${id(a[0])} ${new Float32Array(new Uint32Array([a[2]]).buffer)[0].toFixed(1)}`; break;
        case 59: t = `${id(a[1])} = ${name} ${id(a[0])} ${STORAGE[a[2]] ?? a[2]}`; break;
        case 62: t = `${name} ${id(a[0])} ${id(a[1])}`; break;
        case 253: case 56: t = name; break;
        default: t = `${id(a[1])} = ${name} ${id(a[0])} ${a.slice(2).map((x, k) => (op === 81 && k === 1 ? String(x) : op === 54 && k === 0 ? 'None' : id(x))).join(' ')}`;
      }
      return { offset: at, words: w, refl: [5, 71, 32, 59].includes(op), text: t, about };
    });
  });

  cur = computed(() => {
    const row = this.rows()[Math.min(this.sel(), this.rows().length - 1)];
    return { ...row, length: row.words[0] >>> 16, opcode: row.words[0] & 65535 };
  });

  message = computed(() => this.opt()
    ? 'Optimised: the OpSource, OpSourceExtension and OpName lines are gone, so variables are just numbers (%9, %12). The Location decorations and the Input and Output variables remain: the pipeline needs them.'
    : 'Not optimised: OpName lines give IDs readable names (%vColor, %outColor). Reflection finds each global OpVariable, follows its pointer type to the data type, and reads its decorations.');
}
