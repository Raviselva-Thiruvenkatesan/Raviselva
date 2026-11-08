import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface TypeArg { name: string; comparable: boolean; a: string; b: string; max: string }

const TYPES: TypeArg[] = [
  { name: 'int', comparable: true, a: '7', b: '12', max: '12' },
  { name: 'double', comparable: true, a: '2.5', b: '1.75', max: '2.5' },
  { name: 'string', comparable: true, a: '"Beam"', b: '"Column"', max: 'Column' },
  { name: 'char', comparable: true, a: "'Q'", b: "'K'", max: 'Q' },
  { name: 'Beam', comparable: false, a: 'new Beam("B1")', b: 'new Beam("B2")', max: '' }
];

/** One generic method, many types: see T replaced, and what a constraint allows. */
@Component({
  selector: 'w-generic-box',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Write once, use with any type</h3></div>
      <p class="w-hint">Choose what <span class="mono">T</span> is. The compiler makes a version of <span class="mono">Larger&lt;T&gt;</span> for that type. Then turn the constraint on and try <span class="mono">Beam</span>.</p>

      <div class="w-controls" role="group" aria-label="Type argument">
        <span class="small text-muted">T =</span>
        @for (t of types; track t.name) {
          <button type="button" class="w-btn mono" [class.on]="sel().name === t.name" (click)="pick(t)" [attr.aria-pressed]="sel().name === t.name">{{ t.name }}</button>
        }
        <label class="small ms-2 d-inline-flex gap-1 align-items-center"><input type="checkbox" [checked]="constraint()" (change)="constraint.set(!constraint())"> <span class="mono">where T : IComparable&lt;T&gt;</span></label>
      </div>

      <div class="w-grid two">
        <div>
          <div class="w-label">Generic definition</div>
          <app-code [code]="generic()" title="Larger.cs" [compact]="true" [copyable]="false" [marked]="constraint() ? [2] : []" />
        </div>
        <div>
          <div class="w-label">What it means for T = {{ sel().name }}</div>
          <app-code [code]="concrete()" title="Program.cs" [compact]="true" [copyable]="false" [output]="output()" />
        </div>
      </div>
      <div class="w-msg" [class.err]="error()" [class.ok]="!error()" aria-live="polite">
        <i class="bi" [class.bi-x-octagon]="error()" [class.bi-check-circle]="!error()" aria-hidden="true"></i><span>{{ msg() }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss']
})
export class GenericBoxWidget {
  types = TYPES;
  sel = signal<TypeArg>(TYPES[0]);
  constraint = signal(true);

  pick(t: TypeArg) { this.sel.set(t); }

  generic = computed(() => [
    'static T Larger<T>(T a, T b)',
    this.constraint() ? '    where T : IComparable<T>' : '    // no constraint',
    '{',
    this.constraint() ? '    return a.CompareTo(b) >= 0 ? a : b;' : '    return a.CompareTo(b) >= 0 ? a : b;   // ✗ ?',
    '}'
  ].join('\n'));

  concrete = computed(() => {
    const t = this.sel();
    return [
      `${t.name} x = ${t.a};`,
      `${t.name} y = ${t.b};`,
      `${t.name} big = Larger<${t.name}>(x, y);   // or just Larger(x, y)`,
      'Console.WriteLine(big);'
    ].join('\n');
  });

  error = computed(() => !this.constraint() || !this.sel().comparable);

  output = computed(() => (this.error() ? '' : this.sel().max));

  msg = computed(() => {
    const t = this.sel();
    if (!this.constraint()) return 'error CS1061: \'T\' does not contain a definition for \'CompareTo\'. Without a constraint, T could be ANY type, so the compiler only allows what every type has (like ToString). The constraint is a promise that makes CompareTo available.';
    if (!t.comparable) return 'error CS0315: Beam can’t be used as T, because Beam doesn’t implement IComparable<Beam>. The constraint protects the method: it only accepts types that know how to compare themselves.';
    return `Compiles. T is ${t.name} everywhere, so the result is a ${t.name}: no casts, no boxing, and a wrong type is caught at compile time.`;
  });
}
