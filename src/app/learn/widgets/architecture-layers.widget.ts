import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Layer = 'Presentation' | 'Infrastructure' | 'Application' | 'Domain';
interface Item { code: string; layer: Layer; why: string }

const LAYERS: { name: Layer; project: string; holds: string }[] = [
  { name: 'Presentation', project: 'SteelTools.Wpf', holds: 'windows, view models, DI setup' },
  { name: 'Infrastructure', project: 'SteelTools.Infrastructure', holds: 'database, files, IFC, PDF, email' },
  { name: 'Application', project: 'SteelTools.Application', holds: 'use cases and the interfaces they need' },
  { name: 'Domain', project: 'SteelTools.Domain', holds: 'entities and engineering rules' }
];

/** Which projects may reference which. Presentation → Infrastructure is allowed only to register services. */
const ALLOWED: Record<Layer, Layer[]> = {
  Domain: [],
  Application: ['Domain'],
  Infrastructure: ['Application', 'Domain'],
  Presentation: ['Application', 'Domain', 'Infrastructure']
};

const ITEMS: Item[] = [
  { code: 'class Beam { double WeightKg() }', layer: 'Domain', why: 'A core engineering concept with its own rules. It must not know about databases or windows.' },
  { code: 'rule: utilisation ≤ 1.0', layer: 'Domain', why: 'Business rules are the most valuable code, so they live in the centre, with no dependencies.' },
  { code: 'interface IBeamRepository', layer: 'Application', why: 'The use case says WHAT it needs; Infrastructure provides HOW. The interface sits with the code that uses it.' },
  { code: 'class CheckBeamsHandler', layer: 'Application', why: 'A use case: load beams, apply domain rules, return results. It talks only to interfaces.' },
  { code: 'class SteelDbContext : DbContext', layer: 'Infrastructure', why: 'EF Core is an external technology detail.' },
  { code: 'class SqlBeamRepository', layer: 'Infrastructure', why: 'Implements IBeamRepository using the database.' },
  { code: 'class PdfReportWriter', layer: 'Infrastructure', why: 'Depends on a third-party PDF library: a replaceable detail.' },
  { code: 'MainWindow.xaml', layer: 'Presentation', why: 'UI is the outermost layer. You could swap WPF for a web API without touching the core.' },
  { code: 'class BeamListViewModel', layer: 'Presentation', why: 'Turns use-case results into something the view can bind to.' },
  { code: 'App.xaml.cs: services.Add…', layer: 'Presentation', why: 'The composition root: the one place that knows every concrete class and wires them together.' }
];

/** Sort classes into layers, and test which project references are allowed. */
@Component({
  selector: 'w-architecture-layers',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Where does this code go?</h3></div>
      <p class="w-hint">Pick a piece of code, then click the layer you think it belongs to.</p>
      <div class="chips">
        @for (it of items; track it.code; let i = $index) {
          <button type="button" class="chip mono" [class.sel]="sel() === i" [class.done]="placed()[i]" (click)="sel.set(i)" [attr.aria-pressed]="sel() === i">{{ it.code }}@if (placed()[i]) { <i class="bi bi-check2" aria-hidden="true"></i> }</button>
        }
      </div>
      <div class="layers">
        @for (l of layers; track l.name; let d = $index) {
          <button type="button" class="layer" [style.margin-inline.px]="d * 14" [class.right]="flash() === l.name && ok()" [class.wrong]="flash() === l.name && !ok()" (click)="place(l.name)">
            <strong>{{ l.name }}</strong> <small class="mono">{{ l.project }}</small>
            <small class="d-block">{{ l.holds }}</small>
          </button>
        }
      </div>
      @if (feedback(); as f) {
        <div class="w-msg" [class.ok]="ok()" [class.err]="!ok()" aria-live="polite"><span>{{ f }}</span></div>
      }
      <div class="w-label mt-3">Can this project reference that one?</div>
      <div class="w-controls mb-0">
        <label class="w-field">from
          <select [ngModel]="from()" (ngModelChange)="from.set($event)">@for (l of layers; track l.name) { <option [value]="l.name">{{ l.name }}</option> }</select>
        </label>
        <span class="align-self-end pb-2">→</span>
        <label class="w-field">to
          <select [ngModel]="to()" (ngModelChange)="to.set($event)">@for (l of layers; track l.name) { <option [value]="l.name">{{ l.name }}</option> }</select>
        </label>
      </div>
      <div class="w-msg" [class.ok]="refOk()" [class.err]="!refOk()"><span>{{ refMsg() }}</span></div>
      <p class="small text-muted mt-2 mb-0">Score: {{ score() }} / {{ items.length }}</p>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 0.8rem; }
    .chip { font-size: 0.74rem; padding: 4px 9px; border-radius: 8px; border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); cursor: pointer; }
    .chip.sel { border-color: var(--purple); background: rgba(139, 92, 246, 0.12); }
    .chip.done { opacity: 0.6; }
    .chip.done i { color: #10b981; }
    .layers { display: grid; gap: 4px; }
    .layer { text-align: left; padding: 7px 12px; border-radius: 12px; border: 1.5px solid var(--border-color); background: var(--bg-main); color: var(--text-main); cursor: pointer; font-size: 0.86rem; transition: all 0.2s; }
    .layer small { color: var(--text-muted); font-size: 0.72rem; }
    .layer:hover { border-color: var(--purple); }
    .layer:nth-child(4) { background: rgba(139, 92, 246, 0.1); }
    .right { border-color: #10b981; background: rgba(16, 185, 129, 0.15) !important; }
    .wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.1) !important; }
    @media (max-width: 480px) { .layer { margin-inline: 0 !important; } }
  `]
})
export class ArchitectureLayersWidget {
  readonly layers = LAYERS;
  readonly items = ITEMS;
  sel = signal(0);
  placed = signal<boolean[]>(ITEMS.map(() => false));
  flash = signal<Layer | null>(null);
  ok = signal(false);
  feedback = signal('');
  from = signal<Layer>('Application');
  to = signal<Layer>('Infrastructure');

  score = computed(() => this.placed().filter(Boolean).length);

  place(layer: Layer) {
    const i = this.sel();
    const it = ITEMS[i];
    const right = it.layer === layer;
    this.flash.set(layer);
    this.ok.set(right);
    this.feedback.set(right ? `Correct: ${it.layer}. ${it.why}` : `Not quite: it belongs in ${it.layer}. ${it.why}`);
    if (right) {
      this.placed.update(p => p.map((v, k) => (k === i ? true : v)));
      const next = this.placed().findIndex(v => !v);
      if (next >= 0) this.sel.set(next);
    }
  }

  refOk = computed(() => this.from() === this.to() || ALLOWED[this.from()].includes(this.to()));

  refMsg = computed(() => {
    const f = this.from(), t = this.to();
    if (f === t) return 'Same project.';
    if (!ALLOWED[f].includes(t)) {
      if (f === 'Domain') return `✗ Domain → ${t}: the core must depend on nothing. Otherwise a database or UI change could break your engineering rules.`;
      return `✗ ${f} → ${t}: dependencies must point inwards. If ${f} needs something from ${t}, define an interface in ${f} and let ${t} implement it.`;
    }
    if (f === 'Presentation' && t === 'Infrastructure') return '✓ Allowed, but only so the composition root can register implementations. View models should still talk to Application interfaces.';
    return `✓ ${f} → ${t}: points inwards, towards the core.`;
  });
}
