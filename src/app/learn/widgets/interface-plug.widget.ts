import { Component, computed, signal } from '@angular/core';

interface Iface { name: string; member: string; desc: string }
interface Cls { name: string; base: string; impl: string[] }

const IFACES: Iface[] = [
  { name: 'IWeighable', member: 'double WeightKg { get; }', desc: 'can report its weight' },
  { name: 'IExportable', member: 'string ToIfc()', desc: 'can be exported to an IFC file' },
  { name: 'IPrintable', member: 'void Print()', desc: 'can print itself' }
];

const CLASSES: Cls[] = [
  { name: 'Beam', base: 'StructuralMember', impl: ['IWeighable', 'IExportable', 'IPrintable'] },
  { name: 'Bolt', base: 'object', impl: ['IWeighable', 'IExportable'] },
  { name: 'Report', base: 'object', impl: ['IPrintable'] },
  { name: 'Drawing', base: 'Document', impl: ['IExportable', 'IPrintable'] }
];

/** Interfaces as capabilities: unrelated classes can share one, and code can use any object that has it. */
@Component({
  selector: 'w-interface-plug',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Interfaces are capabilities</h3></div>
      <p class="w-hint">Pick an interface. Every class that implements it lights up, even classes that share no base class. Code written against the interface works with all of them.</p>

      <div class="w-controls" role="group" aria-label="Interface">
        @for (i of ifaces; track i.name) {
          <button type="button" class="w-btn mono" [class.on]="sel() === i.name" (click)="sel.set(i.name)" [attr.aria-pressed]="sel() === i.name">{{ i.name }}</button>
        }
      </div>

      <div class="decl mono"><span class="k">interface</span> <span class="t">{{ current().name }}</span> {{ '{' }} {{ current().member }}; {{ '}' }}</div>

      <div class="grid">
        @for (c of classes; track c.name) {
          <div class="cls" [class.fit]="c.impl.includes(sel())">
            <div class="cname mono">class {{ c.name }}</div>
            <div class="cdecl mono small">: {{ declOf(c) }}</div>
            <div class="plugs">
              @for (i of ifaces; track i.name) {
                <span class="plug mono" [class.has]="c.impl.includes(i.name)" [class.on]="i.name === sel()">{{ i.name.slice(1) }}</span>
              }
            </div>
            <small>{{ c.impl.includes(sel()) ? '✓ can be used as ' + sel() : '✗ not ' + sel() }}</small>
          </div>
        }
      </div>

      <div class="code mono">
        <div><span class="c">// works for EVERY class above that is {{ current().name }}</span></div>
        <div>static void Process(<span class="t">{{ current().name }}</span> item) {{ '{' }} {{ callName() }}; {{ '}' }}</div>
        <div class="mt-1"><span class="c">// fits: {{ fits().join(', ') || 'none' }}</span></div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .decl, .code { padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.85rem; overflow-x: auto; white-space: nowrap; }
    .decl { margin-bottom: 0.9rem; }
    .code { margin-top: 0.9rem; }
    .k { color: #c792ea; } .t { color: #82aaff; } .c { color: #64748b; }
    .grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
    .cls { padding: 10px; border-radius: 12px; border: 2px solid var(--border-color); background: var(--bg-main); opacity: 0.55; transition: all 0.25s; display: grid; gap: 4px; }
    .cls.fit { opacity: 1; border-color: #10b981; background: rgba(16, 185, 129, 0.08); }
    .cname { font-weight: 700; }
    .cdecl { color: var(--text-muted); word-break: break-word; }
    .plugs { display: flex; flex-wrap: wrap; gap: 4px; }
    .plug { font-size: 0.68rem; padding: 2px 6px; border-radius: 6px; border: 1px dashed var(--border-color); color: var(--text-muted); }
    .plug.has { border-style: solid; color: var(--text-main); }
    .plug.has.on { background: #10b981; border-color: #10b981; color: #fff; }
    .cls small { font-size: 0.75rem; color: var(--text-muted); }
  `]
})
export class InterfacePlugWidget {
  ifaces = IFACES;
  classes = CLASSES;
  sel = signal('IExportable');

  current = computed(() => IFACES.find(i => i.name === this.sel())!);
  fits = computed(() => CLASSES.filter(c => c.impl.includes(this.sel())).map(c => c.name));
  callName = computed(() => ({
    IWeighable: 'Console.WriteLine(item.WeightKg)',
    IExportable: 'File.AppendAllText("model.ifc", item.ToIfc())',
    IPrintable: 'item.Print()'
  } as Record<string, string>)[this.sel()]);

  declOf(c: Cls) {
    return (c.base === 'object' ? c.impl : [c.base, ...c.impl]).join(', ');
  }
}
