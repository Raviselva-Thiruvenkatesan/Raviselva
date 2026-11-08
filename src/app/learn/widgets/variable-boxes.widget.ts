import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface TypeInfo { name: string; bytes: number; kind: 'int' | 'real' | 'bool' | 'char' | 'string'; min?: bigint; max?: bigint; example: string; note: string }
interface Var { type: TypeInfo; name: string; value: string; literal: string }

const T: TypeInfo[] = [
  { name: 'int', bytes: 4, kind: 'int', min: -2147483648n, max: 2147483647n, example: '25', note: 'Whole numbers from about -2.1 billion to +2.1 billion. The default choice for whole numbers.' },
  { name: 'long', bytes: 8, kind: 'int', min: -9223372036854775808n, max: 9223372036854775807n, example: '9000000000', note: 'Very large whole numbers (±9.2 quintillion).' },
  { name: 'short', bytes: 2, kind: 'int', min: -32768n, max: 32767n, example: '1200', note: 'Small whole numbers, -32,768 to 32,767.' },
  { name: 'byte', bytes: 1, kind: 'int', min: 0n, max: 255n, example: '200', note: 'Whole numbers 0 to 255 only. Used for raw data like image pixels.' },
  { name: 'double', bytes: 8, kind: 'real', example: '72.5', note: 'Numbers with a decimal point, about 15–16 digits of precision. The default for decimals.' },
  { name: 'float', bytes: 4, kind: 'real', example: '3.14', note: 'Decimal numbers with less precision (about 7 digits). Needs an f suffix: 3.14f' },
  { name: 'decimal', bytes: 16, kind: 'real', example: '199.99', note: 'Exact decimal numbers (28–29 digits) for money. Needs an m suffix: 199.99m' },
  { name: 'bool', bytes: 1, kind: 'bool', example: 'true', note: 'Only true or false.' },
  { name: 'char', bytes: 2, kind: 'char', example: 'A', note: 'A single character, written in single quotes: \'A\'' },
  { name: 'string', bytes: 0, kind: 'string', example: 'Ravi', note: 'Text of any length, written in double quotes. The variable holds a reference; the text itself lives on the heap.' }
];

const KEYWORDS = new Set(['int', 'long', 'short', 'byte', 'double', 'float', 'decimal', 'bool', 'char', 'string', 'class',
  'if', 'else', 'for', 'while', 'new', 'return', 'static', 'void', 'public', 'private', 'true', 'false', 'null', 'var', 'object']);

/** Declare variables and see them as labelled boxes in memory, with type sizes and range checks. */
@Component({
  selector: 'w-variable-boxes',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Variables are labelled boxes in memory</h3></div>
      <p class="w-hint">Pick a type, give it a name and a value, then press <strong>Declare</strong>. Try putting 300 in a byte!</p>

      <div class="w-controls">
        <label class="w-field">Type
          <select [ngModel]="typeName()" (ngModelChange)="setType($event)">
            @for (t of types; track t.name) { <option [value]="t.name">{{ t.name }}</option> }
          </select>
        </label>
        <label class="w-field">Name
          <input class="mono" size="10" [ngModel]="name()" (ngModelChange)="name.set($event)" spellcheck="false">
        </label>
        <label class="w-field">Value
          <input class="mono" size="12" [ngModel]="value()" (ngModelChange)="value.set($event)" spellcheck="false" (keyup.enter)="declare()">
        </label>
        <button type="button" class="w-btn primary align-self-end" (click)="declare()" [disabled]="!!check().error">
          <i class="bi bi-plus-lg" aria-hidden="true"></i> Declare</button>
        <button type="button" class="w-btn align-self-end" (click)="reset()">Reset</button>
      </div>

      <div class="decl mono" aria-live="polite">
        <span class="k">{{ type().name }}</span> {{ name() || '?' }} = <span class="v">{{ check().literal || '…' }}</span>;
      </div>
      @if (check().error; as e) {
        <div class="w-msg err"><i class="bi bi-x-octagon w-err" aria-hidden="true"></i><span>{{ e }}</span></div>
      } @else {
        <div class="w-msg info"><i class="bi bi-info-circle" aria-hidden="true"></i>
          <span><strong>{{ type().name }}</strong> · {{ type().bytes ? type().bytes + (type().bytes === 1 ? ' byte' : ' bytes') : 'reference (8 bytes) + the text on the heap' }} · {{ type().note }}</span></div>
      }

      <div class="w-label mt-3">Memory</div>
      <div class="memory" role="list" aria-label="Declared variables">
        @for (v of vars(); track v.name) {
          <div class="box" role="listitem" [class.ref]="v.type.kind === 'string'">
            <div class="cells" aria-hidden="true">
              @for (c of cells(v.type); track $index) { <i></i> }
            </div>
            <div class="val mono">{{ v.literal }}</div>
            <div class="lbl"><span class="mono">{{ v.name }}</span><small>{{ v.type.name }}</small></div>
          </div>
        } @empty {
          <p class="text-muted small mb-0">No variables yet.</p>
        }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .decl { font-size: 1rem; padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; overflow-x: auto; white-space: nowrap; }
    .decl .k { color: #c792ea; }
    .decl .v { color: #c3e88d; }
    .memory { display: flex; flex-wrap: wrap; gap: 12px; }
    .box {
      min-width: 104px; padding: 8px; border-radius: 12px; text-align: center;
      border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.06);
      animation: pop 0.35s ease-out;
    }
    .box.ref { border-color: rgba(14, 165, 233, 0.5); background: rgba(14, 165, 233, 0.06); }
    .cells { display: flex; gap: 2px; justify-content: center; margin-bottom: 6px; flex-wrap: wrap; max-width: 140px; margin-inline: auto; }
    .cells i { width: 8px; height: 8px; border-radius: 2px; background: var(--purple); opacity: 0.55; }
    .ref .cells i { background: #0ea5e9; }
    .val { font-size: 1.05rem; font-weight: 600; word-break: break-all; }
    .lbl { display: flex; justify-content: center; gap: 6px; align-items: baseline; margin-top: 4px; font-size: 0.85rem; }
    .lbl small { color: var(--text-muted); }
    @keyframes pop { from { transform: scale(0.7); opacity: 0; } to { transform: none; opacity: 1; } }
  `]
})
export class VariableBoxesWidget {
  types = T;
  typeName = signal('int');
  name = signal('age');
  value = signal('25');
  vars = signal<Var[]>([]);

  type = computed(() => T.find(t => t.name === this.typeName())!);

  constructor() {
    this.vars.set([
      { type: T[0], name: 'age', value: '25', literal: '25' },
      { type: T[9], name: 'name', value: 'Ravi', literal: '"Ravi"' }
    ]);
    this.name.set('score');
    this.value.set('90');
  }

  check = computed((): { literal: string; error?: string } => {
    const t = this.type();
    const name = this.name().trim();
    const raw = this.value().trim();
    const literal = this.literal(t, raw);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return { literal, error: 'A name must start with a letter or _ and contain only letters, digits and _ (no spaces).' };
    if (KEYWORDS.has(name)) return { literal, error: `"${name}" is a C# keyword, so it can't be a variable name.` };
    if (this.vars().some(v => v.name === name)) return { literal, error: `A variable named "${name}" already exists. Each name can be declared only once in the same scope.` };
    if (t.kind === 'int') {
      if (!/^[+-]?\d+$/.test(raw)) return { literal, error: `An ${t.name} holds whole numbers only, like ${t.example}.` };
      const n = BigInt(raw);
      if (n < t.min! || n > t.max!) return { literal, error: `Error CS0031: ${raw} doesn't fit in a ${t.name}. Range: ${t.min} to ${t.max}.` };
    }
    if (t.kind === 'real' && !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(raw)) return { literal, error: `A ${t.name} holds numbers like ${t.example}.` };
    if (t.kind === 'bool' && raw !== 'true' && raw !== 'false') return { literal, error: 'A bool can only be true or false (lowercase).' };
    if (t.kind === 'char' && [...raw].length !== 1) return { literal, error: 'A char holds exactly one character.' };
    return { literal };
  });

  setType(name: string) {
    this.typeName.set(name);
    this.value.set(this.type().example);
  }

  declare() {
    if (this.check().error) return;
    if (this.vars().length >= 8) this.vars.update(v => v.slice(1));
    this.vars.update(v => [...v, { type: this.type(), name: this.name().trim(), value: this.value().trim(), literal: this.check().literal }]);
  }

  reset() {
    this.vars.set([]);
  }

  cells(t: TypeInfo) {
    return Array.from({ length: t.bytes || 8 });
  }

  private literal(t: TypeInfo, raw: string) {
    if (!raw) return '';
    switch (t.kind) {
      case 'string': return `"${raw}"`;
      case 'char': return `'${raw}'`;
      case 'real': return t.name === 'float' ? raw + 'f' : t.name === 'decimal' ? raw + 'm' : raw;
      default: return raw;
    }
  }
}
