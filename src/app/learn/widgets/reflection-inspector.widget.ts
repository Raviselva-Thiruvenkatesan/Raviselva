import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodeViewComponent } from '../shared/code-view.component';

interface Prop { name: string; type: string; attrs: string[]; value: string }

/** Inspect a type with reflection, then validate an object using the attributes reflection finds. */
@Component({
  selector: 'w-reflection-inspector',
  standalone: true,
  imports: [FormsModule, CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Code that reads code</h3></div>
      <div class="w-grid two">
        <app-code [code]="code" title="Beam.cs" [compact]="true" [copyable]="false" />
        <div>
          <div class="w-label">typeof(Beam).GetProperties()</div>
          <div class="props">
            @for (p of props(); track p.name) {
              <div class="prop">
                <div class="d-flex justify-content-between gap-2"><span class="mono"><b>{{ p.name }}</b> : {{ p.type }}</span></div>
                <div class="attrs">@for (a of p.attrs; track a) { <span class="mono">[{{ a }}]</span> } @empty { <small class="text-muted">no attributes</small> }</div>
                <label class="w-field">value <input class="mono" [ngModel]="p.value" (ngModelChange)="setValue(p.name, $event)" spellcheck="false" [attr.aria-label]="p.name + ' value'"></label>
              </div>
            }
          </div>
        </div>
      </div>
      <div class="code mono mt-2">
        <div>var errors = Validator.Check(beam);   <span class="c">// loops over properties and their attributes</span></div>
      </div>
      <div class="w-msg" [class.err]="errors().length" [class.ok]="!errors().length" aria-live="polite">
        <i class="bi" [class.bi-x-octagon]="errors().length" [class.bi-check-circle]="!errors().length" aria-hidden="true"></i>
        <span>{{ errors().length ? errors().join(' · ') : 'Valid: every attribute rule passed.' }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .props { display: grid; gap: 6px; }
    .prop { padding: 8px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); display: grid; gap: 4px; font-size: 0.82rem; }
    .attrs { display: flex; flex-wrap: wrap; gap: 4px; }
    .attrs span { font-size: 0.72rem; padding: 1px 6px; border-radius: 6px; color: #b45309; background: rgba(245, 158, 11, 0.12); }
    .prop input { width: 100%; }
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; }
    .c { color: #64748b; }
  `]
})
export class ReflectionInspectorWidget {
  code = [
    'public class Beam',
    '{',
    '    [Required, MaxLength(6)]',
    '    public string Mark { get; set; } = "";',
    '',
    '    [Required]',
    '    public string Profile { get; set; } = "";',
    '',
    '    [Range(0.5, 24)]',
    '    public double LengthM { get; set; }',
    '',
    '    public int Level { get; set; }',
    '}'
  ].join('\n');

  props = signal<Prop[]>([
    { name: 'Mark', type: 'String', attrs: ['Required', 'MaxLength(6)'], value: 'B12' },
    { name: 'Profile', type: 'String', attrs: ['Required'], value: 'IPE300' },
    { name: 'LengthM', type: 'Double', attrs: ['Range(0.5, 24)'], value: '6.5' },
    { name: 'Level', type: 'Int32', attrs: [], value: '2' }
  ]);

  setValue(name: string, v: string) {
    this.props.update(ps => ps.map(p => (p.name === name ? { ...p, value: v } : p)));
  }

  errors = computed(() => {
    const out: string[] = [];
    for (const p of this.props()) {
      for (const a of p.attrs) {
        if (a === 'Required' && !p.value.trim()) out.push(`${p.name} is required`);
        const max = /^MaxLength\((\d+)\)$/.exec(a);
        if (max && p.value.length > +max[1]) out.push(`${p.name} must be at most ${max[1]} characters`);
        const range = /^Range\(([\d.]+), ([\d.]+)\)$/.exec(a);
        if (range) {
          const n = Number(p.value);
          if (p.value.trim() === '' || isNaN(n)) out.push(`${p.name} must be a number`);
          else if (n < +range[1] || n > +range[2]) out.push(`${p.name} must be between ${range[1]} and ${range[2]}`);
        }
      }
      if (p.type === 'Int32' && p.value.trim() !== '' && !/^-?\d+$/.test(p.value.trim())) out.push(`${p.name} must be a whole number`);
    }
    return out;
  });
}
