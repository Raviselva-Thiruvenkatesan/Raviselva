import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodeViewComponent } from '../shared/code-view.component';

/** A property guarding its private field: try to set values and watch the setter accept or reject them. */
@Component({
  selector: 'w-property-guard',
  standalone: true,
  imports: [FormsModule, CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>A property is a guarded door to a field</h3></div>
      <p class="w-hint">Outside code can’t touch <span class="mono">_length</span> directly. It must go through the <span class="mono">Length</span> property, whose <span class="mono">set</span> checks the value. Try 7.5, 0, -3 or 45.</p>

      <div class="w-controls">
        <label class="w-field">beam.Length =
          <input class="mono" type="number" step="0.5" style="width:6rem" [ngModel]="input()" (ngModelChange)="input.set(+$event)" (keyup.enter)="set()">
        </label>
        <button type="button" class="w-btn primary align-self-end" (click)="set()">Run setter</button>
        <button type="button" class="w-btn align-self-end" (click)="get()">Read beam.WeightKg</button>
      </div>

      <div class="w-grid two">
        <app-code [code]="code" title="Beam.cs" [compact]="true" [copyable]="false" [active]="active()" [marked]="[5, 6, 7, 8, 9, 10, 11, 12, 13, 14]" />
        <div>
          <div class="obj">
            <div class="w-label">beam object</div>
            <div class="f priv"><i class="bi bi-lock-fill" aria-hidden="true"></i><span class="mono">_length</span><strong class="mono">{{ stored() }}</strong><small>private field</small></div>
            <div class="f"><i class="bi bi-door-open" aria-hidden="true"></i><span class="mono">Length</span><strong class="mono">{{ stored() }}</strong><small>property (get/set)</small></div>
            <div class="f"><i class="bi bi-calculator" aria-hidden="true"></i><span class="mono">WeightKg</span><strong class="mono">{{ weight() }}</strong><small>read-only, calculated</small></div>
          </div>
          <div class="w-msg" [class.err]="error()" [class.ok]="!error()" aria-live="polite">
            <i class="bi" [class.bi-x-octagon]="error()" [class.bi-check-circle]="!error()" aria-hidden="true"></i><span>{{ msg() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .obj { padding: 10px; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.05); }
    .f { display: grid; grid-template-columns: 20px 1fr auto; gap: 2px 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--border-color); font-size: 0.9rem; }
    .f i { color: var(--purple); }
    .f.priv i { color: #f59e0b; }
    .f strong { color: var(--purple); }
    .f small { grid-column: 2 / -1; color: var(--text-muted); font-size: 0.72rem; margin-top: -4px; }
  `]
})
export class PropertyGuardWidget {
  code = [
    'class Beam',
    '{',
    '    private double _length = 6;          // backing field',
    '',
    '    public double Length',
    '    {',
    '        get => _length;',
    '        set',
    '        {',
    '            if (value <= 0 || value > 30)',
    '                throw new ArgumentOutOfRangeException(nameof(value));',
    '            _length = value;',
    '        }',
    '    }',
    '',
    '    public double KgPerMetre { get; set; } = 22.4;   // auto-property',
    '',
    '    public double WeightKg => Length * KgPerMetre;   // computed',
    '}'
  ].join('\n');

  input = signal(7.5);
  stored = signal(6);
  active = signal<number[]>([3]);
  error = signal(false);
  msg = signal('The object starts with _length = 6. Change it only through the property.');

  weight = computed(() => +(this.stored() * 22.4).toFixed(2));

  set() {
    const v = this.input();
    if (!(v > 0 && v <= 30)) {
      this.active.set([10, 11]);
      this.error.set(true);
      this.msg.set(`set ran with value = ${v}. The check failed, so it threw ArgumentOutOfRangeException. _length is unchanged (${this.stored()}): the object can never hold an invalid length.`);
      return;
    }
    this.stored.set(v);
    this.active.set([12]);
    this.error.set(false);
    this.msg.set(`set ran with value = ${v}. The check passed, so _length = ${v}. WeightKg updates automatically because it is calculated on every read.`);
  }

  get() {
    this.active.set([18]);
    this.error.set(false);
    this.msg.set(`Reading WeightKg runs its getter: Length × KgPerMetre = ${this.stored()} × 22.4 = ${this.weight()} kg. It has no setter, so beam.WeightKg = 5 would not compile.`);
  }
}
