import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Op = '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=';

/** Try arithmetic and comparison operators with int or double operands. */
@Component({
  selector: 'w-operator-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Operator playground</h3></div>
      <p class="w-hint">Change the numbers, the type and the operator. Try <span class="mono">7 / 2</span> as int and as double, and dividing by 0.</p>

      <div class="w-controls">
        <div role="group" aria-label="Type" class="d-flex gap-2">
          <button type="button" class="w-btn mono" [class.on]="type() === 'int'" (click)="type.set('int')" [attr.aria-pressed]="type() === 'int'">int</button>
          <button type="button" class="w-btn mono" [class.on]="type() === 'double'" (click)="type.set('double')" [attr.aria-pressed]="type() === 'double'">double</button>
        </div>
        <label class="w-field">a <input class="mono" type="number" size="6" [ngModel]="a()" (ngModelChange)="a.set(+$event || 0)"></label>
        <label class="w-field">b <input class="mono" type="number" size="6" [ngModel]="b()" (ngModelChange)="b.set(+$event || 0)"></label>
      </div>

      <div class="ops" role="group" aria-label="Operator">
        @for (o of ops; track o) {
          <button type="button" class="w-btn mono" [class.on]="op() === o" (click)="op.set(o)" [attr.aria-pressed]="op() === o">{{ o }}</button>
        }
      </div>

      <div class="eq" aria-live="polite">
        <div class="code mono">
          <span class="k">{{ type() }}</span> a = {{ shown(a()) }}, b = {{ shown(b()) }};<br>
          <span class="k">var</span> result = a {{ op() }} b;
        </div>
        <div class="arrow" aria-hidden="true"><i class="bi bi-arrow-right"></i></div>
        <div class="result" [class.bad]="res().error">
          <small>result</small>
          <strong class="mono">{{ res().value }}</strong>
          <small class="mono">{{ res().type }}</small>
        </div>
      </div>
      <div class="w-msg" [class.err]="res().error" [class.info]="!res().error">
        <i class="bi" [class.bi-x-octagon]="res().error" [class.bi-lightbulb]="!res().error" aria-hidden="true"></i>
        <span>{{ res().why }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .ops { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1rem; }
    .ops .w-btn { min-width: 44px; justify-content: center; }
    .eq { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .code { flex: 1 1 220px; padding: 0.7rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.92rem; line-height: 1.7; }
    .k { color: #c792ea; }
    .arrow { color: var(--text-muted); font-size: 1.3rem; }
    .result {
      min-width: 130px; display: flex; flex-direction: column; align-items: center; padding: 0.55rem 1rem; border-radius: 12px;
      border: 2px solid rgba(139, 92, 246, 0.5); background: rgba(139, 92, 246, 0.07);
    }
    .result.bad { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.06); }
    .result strong { font-size: 1.35rem; word-break: break-all; text-align: center; }
    .result small { color: var(--text-muted); font-size: 0.75rem; }
  `]
})
export class OperatorLabWidget {
  ops: Op[] = ['+', '-', '*', '/', '%', '==', '!=', '<', '>', '<=', '>='];
  type = signal<'int' | 'double'>('int');
  a = signal(7);
  b = signal(2);
  op = signal<Op>('/');

  shown(n: number) {
    return this.type() === 'int' ? String(Math.trunc(n) | 0) : String(n);
  }

  res = computed((): { value: string; type: string; why: string; error?: boolean } => {
    const isInt = this.type() === 'int';
    const a = isInt ? Math.trunc(this.a()) | 0 : this.a();
    const b = isInt ? Math.trunc(this.b()) | 0 : this.b();
    const op = this.op();

    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
      const r = op === '==' ? a === b : op === '!=' ? a !== b : op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
      return { value: String(r), type: 'bool', why: `Comparison operators always give a bool: true or false. Is ${a} ${op} ${b}? ${r ? 'Yes' : 'No'}.` };
    }

    if (isInt) {
      if ((op === '/' || op === '%') && b === 0) {
        return { value: 'DivideByZeroException', type: 'crash', error: true, why: 'Integer division by zero is not allowed: the program throws an exception. Always check that the divisor is not 0.' };
      }
      let r: number;
      switch (op) {
        case '+': r = (a + b) | 0; break;
        case '-': r = (a - b) | 0; break;
        case '*': r = Math.imul(a, b); break;
        case '/': r = Math.trunc(a / b) | 0; break;
        default: r = a % b;
      }
      const exact = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : r;
      if (exact !== r && op !== '/') {
        return { value: String(r), type: 'int', why: `Overflow! The real answer ${exact} doesn't fit in an int (max 2,147,483,647), so it silently wraps around. Use long for bigger numbers, or a checked block to get an error instead.` };
      }
      const why = op === '/' ? `Both operands are int, so this is integer division: the decimal part is thrown away (${a} / ${b} = ${a / b} → ${r}). Make one side a double to keep it.`
        : op === '%' ? `% gives the remainder after division: ${a} = ${b} × ${Math.trunc(a / b)} + ${r}. Handy for "is it even?" (n % 2 == 0).`
        : `int ${op} int gives an int.`;
      return { value: String(r), type: 'int', why };
    }

    let r: number;
    switch (op) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/': r = a / b; break;
      default: r = a % b;
    }
    const fmt = Number.isNaN(r) ? 'NaN' : r === Infinity ? '∞' : r === -Infinity ? '-∞' : String(r);
    const why = op === '/' && b === 0
      ? 'Dividing a double by zero does not crash: you get Infinity (∞), or NaN ("not a number") for 0 / 0.'
      : op === '/' ? 'With double, division keeps the decimal part.'
      : String(r).length > 12 ? 'Doubles are stored in binary, so some decimals can’t be exact (0.1 + 0.2 = 0.30000000000000004). Use decimal for money.'
      : `double ${op} double gives a double.`;
    return { value: fmt, type: 'double', why };
  });
}
