import { Component, computed, signal } from '@angular/core';

type Mod = 'public' | 'private' | 'protected' | 'internal' | 'protected internal' | 'private protected';

const PLACES = [
  { id: 'same', label: 'Inside the same class', icon: 'bi-house' },
  { id: 'derivedIn', label: 'Derived class, same project', icon: 'bi-diagram-2' },
  { id: 'otherIn', label: 'Any other class, same project', icon: 'bi-building' },
  { id: 'derivedOut', label: 'Derived class, other project', icon: 'bi-diagram-2-fill' },
  { id: 'otherOut', label: 'Any class, other project', icon: 'bi-globe' }
] as const;

const RULES: Record<Mod, boolean[]> = {
  'public':             [true, true, true, true, true],
  'protected internal': [true, true, true, true, false],
  'internal':           [true, true, true, false, false],
  'protected':          [true, true, false, true, false],
  'private protected':  [true, true, false, false, false],
  'private':            [true, false, false, false, false]
};

const WHY: Record<Mod, string> = {
  'public': 'Anyone can use it. Use for the members that make up your class’s intended API.',
  'protected internal': 'Anything in the same project, plus derived classes anywhere. Rarely needed.',
  'internal': 'Anything in the same project (assembly). The default for top-level classes. Good for helpers you don’t want other projects to use.',
  'protected': 'The class itself and classes that inherit from it, in any project.',
  'private protected': 'The class and its derived classes, but only inside the same project.',
  'private': 'Only code inside the same class. The default for members, and the right choice for fields.'
};

/** Pick an access modifier and see from where a member can be reached. */
@Component({
  selector: 'w-access-matrix',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Who can see this member?</h3></div>
      <p class="w-hint">Choose a modifier for <span class="mono">Beam.Length</span>. Green places may use it; red ones get a compile error.</p>

      <div class="w-controls" role="group" aria-label="Access modifier">
        @for (m of mods; track m) {
          <button type="button" class="w-btn mono" [class.on]="mod() === m" (click)="mod.set(m)" [attr.aria-pressed]="mod() === m">{{ m }}</button>
        }
      </div>

      <div class="decl mono"><span class="k">{{ mod() }}</span> <span class="k">double</span> Length;</div>

      <ul class="places" aria-live="polite">
        @for (p of places; track p.id; let i = $index) {
          <li [class.yes]="rules()[i]" [class.no]="!rules()[i]">
            <i class="bi {{ p.icon }}" aria-hidden="true"></i>
            <span>{{ p.label }}</span>
            <strong>{{ rules()[i] ? '✓ allowed' : '✗ CS0122' }}</strong>
          </li>
        }
      </ul>
      <div class="w-msg info"><i class="bi bi-lightbulb" aria-hidden="true"></i><span>{{ why() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .decl { font-size: 0.95rem; padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; margin-bottom: 0.8rem; }
    .k { color: #c792ea; }
    .places { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
    .places li {
      display: grid; grid-template-columns: 22px 1fr auto; gap: 10px; align-items: center; padding: 8px 12px; border-radius: 10px;
      border: 1.5px solid var(--border-color); font-size: 0.9rem; transition: all 0.25s;
    }
    .places li.yes { border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.08); }
    .places li.yes strong { color: #059669; }
    .places li.no { border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.05); opacity: 0.8; }
    .places li.no strong { color: #dc2626; }
    .places strong { font-size: 0.8rem; white-space: nowrap; }
  `]
})
export class AccessMatrixWidget {
  mods = Object.keys(RULES) as Mod[];
  places = PLACES;
  mod = signal<Mod>('private');
  rules = computed(() => RULES[this.mod()]);
  why = computed(() => WHY[this.mod()]);
}
