import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Step { line: number; profile: string; length: string; text: string }

/** Step through `new Beam(...)` with chained constructors and field initializers. */
@Component({
  selector: 'w-constructor-flow',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>What happens inside new</h3></div>
      <div class="w-controls" role="group" aria-label="Constructor call">
        @for (c of calls; track c.id; let i = $index) {
          <button type="button" class="w-btn mono" [class.on]="call() === i" (click)="setCall(i)" [attr.aria-pressed]="call() === i">{{ c.label }}</button>
        }
      </div>

      <div class="w-grid two">
        <app-code [code]="code" title="Beam.cs" [compact]="true" [copyable]="false" [active]="[step().line]" />
        <div>
          <div class="obj">
            <div class="w-label">The new object (heap)</div>
            <div class="row-f"><span class="mono">Profile</span><strong class="mono">{{ step().profile }}</strong></div>
            <div class="row-f"><span class="mono">Length</span><strong class="mono">{{ step().length }}</strong></div>
          </div>
          <div class="w-panel mt-2" aria-live="polite">
            <div class="w-label">Step {{ pos() + 1 }} / {{ steps().length }}</div>
            {{ step().text }}
          </div>
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="go(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn" (click)="go(pos() - 1)" [disabled]="pos() === 0"><i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="pos() === steps().length - 1">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .obj { padding: 10px; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.06); }
    .row-f { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-top: 1px solid var(--border-color); font-size: 0.9rem; }
    .row-f strong { color: var(--purple); }
  `]
})
export class ConstructorFlowWidget {
  code = [
    'class Beam',
    '{',
    '    public string Profile = "IPE200";   // field initializer',
    '    public double Length;',
    '',
    '    public Beam() : this(6.0) { }',
    '',
    '    public Beam(double length) : this(length, "IPE200") { }',
    '',
    '    public Beam(double length, string profile)',
    '    {',
    '        Length = length;',
    '        Profile = profile;',
    '    }',
    '}'
  ].join('\n');

  calls = [
    { id: 0, label: 'new Beam()', len: '6', prof: 'IPE200' },
    { id: 1, label: 'new Beam(4.5)', len: '4.5', prof: 'IPE200' },
    { id: 2, label: 'new Beam(8, "HEA300")', len: '8', prof: 'HEA300' }
  ];
  call = signal(2);
  pos = signal(0);

  setCall(i: number) { this.call.set(i); this.pos.set(0); }
  go(p: number) { this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p))); }

  steps = computed<Step[]>(() => {
    const c = this.calls[this.call()];
    const s: Step[] = [
      { line: 1, profile: 'null', length: '0', text: `${c.label}: first the runtime reserves memory for a Beam on the heap. Every field starts at its default value: null for string, 0 for double.` }
    ];
    if (c.id === 0) s.push({ line: 6, profile: 'null', length: '0', text: 'The parameterless constructor is chosen. Its ": this(6.0)" says: first run the constructor that takes one double, passing 6.0.' });
    if (c.id <= 1) s.push({ line: 8, profile: 'null', length: '0', text: `Beam(double length) runs with length = ${c.len}. It chains again with ": this(length, "IPE200")".` });
    s.push({ line: 10, profile: 'null', length: '0', text: `Beam(double, string) is the constructor that does the real work (length = ${c.len}, profile = "${c.prof}"). It doesn't chain to another Beam constructor, so field initializers run now.` });
    s.push({ line: 3, profile: '"IPE200"', length: '0', text: 'Field initializers run before any constructor body: Profile = "IPE200".' });
    s.push({ line: 12, profile: '"IPE200"', length: c.len, text: `Constructor body: Length = ${c.len}.` });
    s.push({ line: 13, profile: `"${c.prof}"`, length: c.len, text: `Profile = "${c.prof}" overwrites the initial value.` });
    if (c.id <= 1) s.push({ line: 8, profile: `"${c.prof}"`, length: c.len, text: 'Back in Beam(double length): its body { } is empty, nothing to do.' });
    if (c.id === 0) s.push({ line: 6, profile: `"${c.prof}"`, length: c.len, text: 'Back in Beam(): its body is empty too.' });
    s.push({ line: 15, profile: `"${c.prof}"`, length: c.len, text: `Done. new returns a reference to the fully built object: Profile = "${c.prof}", Length = ${c.len}. Chaining meant the setup code was written only once.` });
    return s;
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);
}
