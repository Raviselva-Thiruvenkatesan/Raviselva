import { Component, computed, signal } from '@angular/core';

type Use = 'colour' | 'depth' | 'sampled';
interface PassDef { name: string; reads: [string, Use][]; writes: [string, Use][] }
const LAYOUT: Record<Use, string> = { colour: 'ColorAttachment', depth: 'DepthAttachment', sampled: 'ShaderReadOnly' };
const STAGE: Record<Use, number> = { colour: 1, depth: 2, sampled: 4 };

/** Module 6's frame as a render graph: switch passes on and off and watch culling, validation and barriers. */
@Component({
  selector: 'w-render-graph',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A frame graph at work</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn small" [class.on]="shadows()" [attr.aria-pressed]="shadows()" (click)="shadows.set(!shadows())">Shadows</button>
        <button type="button" class="w-btn small" [class.on]="ssao()" [attr.aria-pressed]="ssao()" (click)="ssao.set(!ssao())">Ambient occlusion</button>
        <button type="button" class="w-btn small" [class.on]="debugOut()" [attr.aria-pressed]="debugOut()" (click)="debugOut.set(!debugOut())">Show the debug view</button>
        <button type="button" class="w-btn small bug" [class.on]="bug()" [attr.aria-pressed]="bug()" (click)="bug.set(!bug())">Bug: delete the shadow pass only</button>
      </div>
      <div class="passes">
        @for (p of result().passes; track p.name) {
          <div class="pass" [class.culled]="p.culled" [class.bad]="p.error">
            <div class="pn">{{ p.name }} @if (p.culled) { <span class="tag">culled</span> }</div>
            <div class="io">
              @for (r of p.def.reads; track r[0]) { <span class="chip im in">{{ r[0] }}</span> }
              <span class="arrow">→</span>
              @for (w of p.def.writes; track w[0]) { <span class="chip im out">{{ w[0] }}</span> }
            </div>
            @if (!p.culled && !p.error) {
              <ul class="bar mono">
                @for (b of p.barriers; track b) { <li>{{ b }}</li> } @empty { <li class="none">no barriers</li> }
              </ul>
            }
          </div>
        }
      </div>
      <div class="w-msg" [class.ok]="!result().error" [class.err]="!!result().error" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.76rem; padding: 3px 8px; }
    .bug.on { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; }
    .passes { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 6px; margin: 0.4rem 0; }
    .pass { border: 1.5px solid rgba(139, 92, 246, 0.45); border-radius: 10px; padding: 6px 8px; background: var(--bg-main); }
    .pass.culled { opacity: 0.45; border-style: dashed; }
    .pass.bad { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .pn { font-weight: 800; font-size: 0.86rem; }
    .tag { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-left: 4px; }
    .io { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; margin: 4px 0; }
    .im { font-size: 0.7rem; padding: 1px 6px; font-family: monospace; }
    .im.in { border-color: #0891b2; } .im.out { border-color: #10b981; }
    .arrow { color: var(--text-muted); font-weight: 800; }
    .bar { margin: 0; padding-left: 1rem; font-size: 0.68rem; color: var(--text-muted); }
    .bar .none { list-style: none; margin-left: -1rem; }
  `]
})
export class RenderGraphWidget {
  shadows = signal(true);
  ssao = signal(true);
  debugOut = signal(false);
  bug = signal(false);

  private defs = computed<PassDef[]>(() => {
    const light: [string, Use][] = [['albedo', 'sampled'], ['normal', 'sampled']];
    if (this.shadows()) light.push(['shadowMap', 'sampled']);
    if (this.ssao()) light.push(['ao', 'sampled']);
    const list: PassDef[] = [];
    if (this.shadows() && !this.bug()) list.push({ name: 'Shadow map', reads: [], writes: [['shadowMap', 'depth']] });
    list.push({ name: 'G-buffer', reads: [], writes: [['albedo', 'colour'], ['normal', 'colour'], ['depth', 'depth']] });
    if (this.ssao()) list.push({ name: 'SSAO', reads: [['normal', 'sampled'], ['depth', 'sampled']], writes: [['ao', 'colour']] });
    list.push({ name: 'Lighting', reads: light, writes: [['hdr', 'colour']] });
    list.push({ name: 'Debug normals', reads: [['normal', 'sampled']], writes: [['debug', 'colour']] });
    list.push({ name: 'Tone map', reads: [['hdr', 'sampled']], writes: [['backbuffer', 'colour']] });
    return list;
  });

  /** The C# RenderGraph.Compile, in TypeScript: cull backwards from the outputs, then follow each image's state forwards. */
  result = computed(() => {
    const defs = this.defs(), outputs = new Set(['backbuffer', ...(this.debugOut() ? ['debug'] : [])]);
    const culled = new Array(defs.length).fill(false), needed = new Set(outputs);
    for (let i = defs.length - 1; i >= 0; i--) {
      culled[i] = !defs[i].writes.some(([im]) => needed.has(im));
      if (!culled[i]) defs[i].reads.forEach(([im]) => needed.add(im));
    }
    const state = new Map<string, { layout: string; stage: number; wrote: boolean }>();
    const written = new Set<string>();
    let error = '';
    const passes = defs.map((def, i) => {
      const barriers: string[] = [];
      let passError = false;
      if (!culled[i] && !error) {
        for (const [im] of def.reads) if (!written.has(im)) { error = `Pass '${def.name}' reads '${im}', but no earlier pass writes it`; passError = true; }
        if (!passError) for (const [im, use, writes] of [...def.reads.map(r => [...r, false] as const), ...def.writes.map(w => [...w, true] as const)]) {
          const old = state.get(im) ?? { layout: 'Undefined', stage: 0, wrote: false }, layout = LAYOUT[use], stage = STAGE[use];
          const change = old.layout !== layout;
          if (change || old.wrote || writes || (old.stage & stage) !== stage)
            barriers.push(change ? `${im}: ${old.layout} → ${layout}` : `${im}: ${old.wrote ? 'write' : 'read'} → ${writes ? 'write' : 'read'}`);
          state.set(im, !change && !old.wrote && !writes ? { layout, stage: old.stage | stage, wrote: false } : { layout, stage, wrote: writes });
          if (writes) written.add(im);
        }
      }
      return { name: def.name, def, culled: culled[i], barriers, error: passError };
    });
    const count = passes.filter(p => !p.culled && !p.error).reduce((n, p) => n + p.barriers.length, 0);
    return { passes, error, count, culledNames: passes.filter(p => p.culled).map(p => p.name) };
  });

  message = computed(() => {
    const r = this.result();
    if (r.error) return `Compile failed before anything ran: ${r.error}. Without a graph this would be a frame that samples an image nobody drew, with no error at all.`;
    const culled = r.culledNames.length ? `Culled: ${r.culledNames.join(', ')} (nothing that reaches an output reads what ${r.culledNames.length > 1 ? 'they write' : 'it writes'}). ` : 'Nothing culled. ';
    const normal = this.ssao() ? ' Lighting’s read of normal needs none: SSAO already moved it to ShaderReadOnly for the same stage.' : '';
    return `${culled}${r.count} barriers, all derived from the declared reads and writes.${normal}`;
  });
}
