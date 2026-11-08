import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

type Mode = 'override' | 'new' | 'none';
const KINDS = ['Beam', 'Column', 'Brace'] as const;
const OWN: Record<string, string> = { Beam: 'Beam: check bending', Column: 'Column: check buckling', Brace: 'Brace: check tension' };

/** One loop, many object types: see which Check() runs with override, new (hiding) or no override. */
@Component({
  selector: 'w-virtual-dispatch',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Which method actually runs?</h3></div>
      <p class="w-hint">The loop calls <span class="mono">m.Check()</span> through a <span class="mono">StructuralMember</span> variable. Change how the child classes declare <span class="mono">Check()</span>.</p>

      <div class="w-controls" role="group" aria-label="Declaration style">
        <button type="button" class="w-btn mono" [class.on]="mode() === 'override'" (click)="mode.set('override')" [attr.aria-pressed]="mode() === 'override'">virtual + override</button>
        <button type="button" class="w-btn mono" [class.on]="mode() === 'new'" (click)="mode.set('new')" [attr.aria-pressed]="mode() === 'new'">new (hiding)</button>
        <button type="button" class="w-btn mono" [class.on]="mode() === 'none'" (click)="mode.set('none')" [attr.aria-pressed]="mode() === 'none'">no Check() in children</button>
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Members.cs" [compact]="true" [copyable]="false" />
        <div>
          <div class="w-label">foreach (StructuralMember m in members) m.Check();</div>
          <div class="rows" aria-live="polite">
            @for (k of kinds; track k; let i = $index) {
              <div class="row-i" [class.own]="runs(k) !== base">
                <span class="mono obj">[{{ i }}] {{ k }} object</span>
                <i class="bi bi-arrow-right" aria-hidden="true"></i>
                <span class="mono">{{ runs(k) }}</span>
              </div>
            }
          </div>
          <div class="w-label mt-3">Same object, different variable type</div>
          <div class="rows">
            <div class="row-i" [class.own]="true"><span class="mono obj">Beam b = new Beam(); b.Check()</span><i class="bi bi-arrow-right" aria-hidden="true"></i><span class="mono">{{ mode() === 'none' ? base : own['Beam'] }}</span></div>
            <div class="row-i" [class.own]="runs('Beam') !== base"><span class="mono obj">StructuralMember m = b; m.Check()</span><i class="bi bi-arrow-right" aria-hidden="true"></i><span class="mono">{{ runs('Beam') }}</span></div>
          </div>
          <div class="w-msg" [class.ok]="mode() === 'override'" [class.err]="mode() === 'new'" [class.info]="mode() === 'none'">
            <i class="bi bi-lightbulb" aria-hidden="true"></i><span>{{ why() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .rows { display: grid; gap: 6px; }
    .row-i { display: grid; grid-template-columns: minmax(0, 1fr) 18px minmax(0, 1fr); gap: 8px; align-items: center; padding: 7px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); font-size: 0.82rem; }
    .row-i.own { border-color: rgba(16, 185, 129, 0.55); background: rgba(16, 185, 129, 0.08); }
    .obj { font-weight: 700; }
  `]
})
export class VirtualDispatchWidget {
  kinds = KINDS;
  own = OWN;
  base = 'Member: generic check';
  mode = signal<Mode>('override');

  runs(kind: string) {
    return this.mode() === 'override' ? OWN[kind] : this.base;
  }

  code = computed(() => {
    const m = this.mode();
    const baseKw = m === 'override' ? 'public virtual void' : 'public void';
    const lines = ['class StructuralMember', '{', `    ${baseKw} Check() => Console.WriteLine("Member: generic check");`, '}', ''];
    const child = (n: string, txt: string) => m === 'none'
      ? [`class ${n} : StructuralMember { }`]
      : [`class ${n} : StructuralMember`, '{', `    public ${m === 'override' ? 'override' : 'new'} void Check() => Console.WriteLine("${txt}");`, '}'];
    lines.push(...child('Beam', OWN['Beam']), '', ...child('Column', OWN['Column']), '', ...child('Brace', OWN['Brace']));
    return lines.join('\n');
  });

  why = computed(() => ({
    override: 'virtual + override: C# looks at the REAL object at run time and runs its own version. One loop handles every member type correctly. This is polymorphism.',
    new: 'new only HIDES the base method. The variable’s type decides: through a StructuralMember variable you get the base version, even for a Beam. Usually a bug; the compiler warns (CS0108) if you forget "new".',
    none: 'The children inherit Check() unchanged, so every object runs the base version.'
  }[this.mode()]));
}
