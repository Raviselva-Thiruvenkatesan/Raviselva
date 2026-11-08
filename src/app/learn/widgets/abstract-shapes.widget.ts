import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Kind = 'Rectangle' | 'Circle' | 'Triangle';
interface Shape { id: number; kind: Kind; a: number; b: number }

/** An abstract Shape that can't be created, concrete shapes that can, and one loop that sums their areas. */
@Component({
  selector: 'w-abstract-shapes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Abstract base, concrete shapes</h3></div>
      <p class="w-hint">Add shapes to a <span class="mono">List&lt;Shape&gt;</span>. Each one must implement the abstract <span class="mono">Area()</span> in its own way. Then try to create a plain Shape.</p>

      <div class="w-controls">
        <label class="w-field">Shape
          <select [ngModel]="kind()" (ngModelChange)="kind.set($event)">
            @for (k of kinds; track k) { <option [value]="k">{{ k }}</option> }
          </select>
        </label>
        <label class="w-field">{{ labelA() }} <input class="mono" type="number" min="0.1" step="0.5" style="width:5rem" [ngModel]="a()" (ngModelChange)="a.set(+$event || 0)"></label>
        @if (kind() !== 'Circle') {
          <label class="w-field">height <input class="mono" type="number" min="0.1" step="0.5" style="width:5rem" [ngModel]="b()" (ngModelChange)="b.set(+$event || 0)"></label>
        }
        <button type="button" class="w-btn primary align-self-end" (click)="add()" [disabled]="shapes().length >= 6"><i class="bi bi-plus-lg" aria-hidden="true"></i> Add</button>
        <button type="button" class="w-btn align-self-end mono" (click)="tryAbstract()">new Shape()</button>
      </div>

      <div class="list">
        @for (s of shapes(); track s.id) {
          <div class="shape">
            <div class="ico" aria-hidden="true"><i class="bi" [class.bi-square]="s.kind === 'Rectangle'" [class.bi-circle]="s.kind === 'Circle'" [class.bi-triangle]="s.kind === 'Triangle'"></i></div>
            <div class="mono small">{{ ctor(s) }}</div>
            <div class="small text-muted">Area() → {{ formula(s) }}</div>
            <strong class="mono">{{ area(s).toFixed(2) }}</strong>
            <button type="button" class="rm" (click)="remove(s.id)" [attr.aria-label]="'Remove ' + s.kind"><i class="bi bi-x" aria-hidden="true"></i></button>
          </div>
        } @empty { <small class="text-muted">The list is empty.</small> }
      </div>

      <div class="total mono">foreach (Shape s in shapes) total += s.Area();  →  total = <strong>{{ total().toFixed(2) }}</strong></div>
      @if (msg(); as m) {
        <div class="w-msg err"><i class="bi bi-x-octagon" aria-hidden="true"></i><span>{{ m }}</span></div>
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .list { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); margin-bottom: 0.8rem; }
    .shape { position: relative; padding: 10px; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.05); display: grid; gap: 2px; animation: pop 0.3s ease-out; }
    .shape strong { font-size: 1.1rem; color: var(--purple); }
    .ico { font-size: 1.4rem; color: var(--purple); }
    .rm { position: absolute; top: 4px; right: 4px; border: 0; background: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; line-height: 1; }
    .rm:hover { color: #ef4444; }
    .total { padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.85rem; overflow-x: auto; white-space: nowrap; }
    .total strong { color: #c3e88d; }
    @keyframes pop { from { transform: scale(0.85); opacity: 0; } }
  `]
})
export class AbstractShapesWidget {
  kinds: Kind[] = ['Rectangle', 'Circle', 'Triangle'];
  kind = signal<Kind>('Circle');
  a = signal(1.5);
  b = signal(2);
  msg = signal('');
  private nextId = 3;
  shapes = signal<Shape[]>([
    { id: 1, kind: 'Rectangle', a: 4, b: 3 },
    { id: 2, kind: 'Triangle', a: 6, b: 2 }
  ]);

  labelA = computed(() => (this.kind() === 'Circle' ? 'radius' : this.kind() === 'Rectangle' ? 'width' : 'base'));
  total = computed(() => this.shapes().reduce((t, s) => t + this.area(s), 0));

  area(s: Shape) {
    return s.kind === 'Rectangle' ? s.a * s.b : s.kind === 'Circle' ? Math.PI * s.a * s.a : 0.5 * s.a * s.b;
  }
  formula(s: Shape) {
    return s.kind === 'Rectangle' ? 'Width × Height' : s.kind === 'Circle' ? 'π × r²' : '½ × Base × Height';
  }
  ctor(s: Shape) {
    return s.kind === 'Circle' ? `new Circle(${s.a})` : `new ${s.kind}(${s.a}, ${s.b})`;
  }

  add() {
    if (this.a() <= 0 || (this.kind() !== 'Circle' && this.b() <= 0)) { this.msg.set('Sizes must be positive (the constructor would throw).'); return; }
    this.shapes.update(l => [...l, { id: this.nextId++, kind: this.kind(), a: this.a(), b: this.b() }]);
    this.msg.set('');
  }
  remove(id: number) { this.shapes.update(l => l.filter(s => s.id !== id)); }
  tryAbstract() {
    this.msg.set('error CS0144: Cannot create an instance of the abstract type or interface \'Shape\'. A Shape is just an idea; only concrete shapes can exist.');
  }
}
