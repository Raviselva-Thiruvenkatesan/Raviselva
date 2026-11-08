import { Component, computed, signal } from '@angular/core';

interface Row { code: string; result: string; bad?: boolean; note: string }

/** Flip a value between null and non-null and see what each null-handling operator does. */
@Component({
  selector: 'w-null-safety',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Handling null safely</h3></div>

      <div class="w-controls" role="group" aria-label="Value">
        <span class="mono small">string? name =</span>
        <button type="button" class="w-btn mono" [class.on]="name() === 'Ravi'" (click)="name.set('Ravi')" [attr.aria-pressed]="name() === 'Ravi'">"Ravi"</button>
        <button type="button" class="w-btn mono" [class.on]="name() === null" (click)="name.set(null)" [attr.aria-pressed]="name() === null">null</button>
        <span class="mono small ms-3">int? stock =</span>
        <button type="button" class="w-btn mono" [class.on]="stock() === 12" (click)="stock.set(12)" [attr.aria-pressed]="stock() === 12">12</button>
        <button type="button" class="w-btn mono" [class.on]="stock() === null" (click)="stock.set(null)" [attr.aria-pressed]="stock() === null">null</button>
      </div>

      <div class="rows" aria-live="polite">
        @for (r of rows(); track r.code) {
          <div class="row-n" [class.bad]="r.bad">
            <code class="mono">{{ r.code }}</code>
            <strong class="mono">{{ r.result }}</strong>
            <small>{{ r.note }}</small>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .rows { display: grid; gap: 6px; }
    .row-n { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 2px 12px; align-items: center; padding: 7px 12px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); }
    .row-n code { font-size: 0.84rem; color: var(--text-main); word-break: break-word; }
    .row-n strong { font-size: 0.88rem; color: #059669; word-break: break-word; }
    .row-n small { grid-column: 1 / -1; font-size: 0.76rem; color: var(--text-muted); }
    .row-n.bad { border-color: rgba(239, 68, 68, 0.45); background: rgba(239, 68, 68, 0.05); }
    .row-n.bad strong { color: #dc2626; }
    @media (max-width: 520px) { .row-n { grid-template-columns: 1fr; } }
  `]
})
export class NullSafetyWidget {
  name = signal<string | null>('Ravi');
  stock = signal<number | null>(12);

  rows = computed<Row[]>(() => {
    const n = this.name();
    const s = this.stock();
    const isNull = n === null;
    return [
      { code: 'name.Length', result: isNull ? 'NullReferenceException' : String(n.length), bad: isNull,
        note: isNull ? 'Crash! You can’t use a member of null. The compiler warns (CS8602) because name is string?.' : 'Fine while name holds a string.' },
      { code: 'name?.Length', result: isNull ? 'null (int?)' : String(n.length),
        note: '?. (null-conditional): if name is null, the whole expression becomes null instead of crashing.' },
      { code: 'name?.Length ?? 0', result: isNull ? '0' : String(n.length),
        note: '?? (null-coalescing): use the right side when the left is null.' },
      { code: 'name ?? "Guest"', result: isNull ? '"Guest"' : `"${n}"`, note: 'A default value in one expression.' },
      { code: 'name ??= "Guest";', result: isNull ? 'name is now "Guest"' : 'name unchanged', note: '??= assigns only when the variable is null.' },
      { code: 'if (name is not null) …', result: isNull ? 'skipped' : 'runs', note: 'Inside the if, the compiler knows name isn’t null: no warnings.' },
      { code: 'name!.Length', result: isNull ? 'NullReferenceException' : String(n.length), bad: isNull,
        note: '! (null-forgiving) only silences the warning. It doesn’t make null safe. Use it only when you are certain.' },
      { code: 'stock.HasValue', result: s === null ? 'false' : 'true', note: 'int? (Nullable<int>) can hold a number or null.' },
      { code: 'stock.Value', result: s === null ? 'InvalidOperationException' : String(s), bad: s === null, note: 'Reading .Value of an empty nullable throws.' },
      { code: 'stock.GetValueOrDefault()', result: s === null ? '0' : String(s), note: 'The type’s default (0) when null. Same as stock ?? 0.' }
    ];
  });
}
