import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Method = 'Length' | 'ToUpper' | 'ToLower' | 'Trim' | 'Contains' | 'IndexOf' | 'Substring' | 'Replace' | 'Split' | 'index';

interface Out { code: string; value: string; hl: number[]; error?: boolean; note: string }

/** A string drawn as indexed character boxes, with common string methods to try. */
@Component({
  selector: 'w-string-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Inside a string</h3></div>
      <p class="w-hint">A string is a row of characters, each with an <strong>index</strong> that starts at 0. Edit the text and try the methods.</p>

      <label class="w-field w-100 mb-3">string text =
        <input class="mono" [ngModel]="text()" (ngModelChange)="text.set($event)" spellcheck="false" maxlength="40">
      </label>

      <div class="chars" aria-hidden="true">
        @for (c of chars(); track $index; let i = $index) {
          <div class="ch" [class.hl]="out().hl.includes(i)">
            <span class="c mono">{{ c === ' ' ? '␣' : c }}</span>
            <span class="i mono">{{ i }}</span>
          </div>
        }
      </div>
      <p class="small text-muted mt-1 mb-3">␣ = space · text.Length = {{ chars().length }}</p>

      <div class="ops" role="group" aria-label="Method">
        @for (m of methods; track m) {
          <button type="button" class="w-btn mono" [class.on]="method() === m" (click)="method.set(m)" [attr.aria-pressed]="method() === m">{{ m === 'index' ? 'text[i]' : m }}</button>
        }
      </div>

      @if (needsArg()) {
        <div class="w-controls">
          @if (method() === 'Substring' || method() === 'index') {
            <label class="w-field">{{ method() === 'index' ? 'i' : 'start' }} <input class="mono" type="number" min="0" style="width:5rem" [ngModel]="start()" (ngModelChange)="start.set(+$event || 0)"></label>
          }
          @if (method() === 'Substring') {
            <label class="w-field">length <input class="mono" type="number" min="0" style="width:5rem" [ngModel]="len()" (ngModelChange)="len.set(+$event || 0)"></label>
          }
          @if (method() === 'Contains' || method() === 'IndexOf' || method() === 'Replace' || method() === 'Split') {
            <label class="w-field">{{ method() === 'Split' ? 'separator' : 'find' }} <input class="mono" size="8" [ngModel]="find()" (ngModelChange)="find.set($event)" spellcheck="false"></label>
          }
          @if (method() === 'Replace') {
            <label class="w-field">with <input class="mono" size="8" [ngModel]="repl()" (ngModelChange)="repl.set($event)" spellcheck="false"></label>
          }
        </div>
      }

      <div class="res" [class.bad]="out().error" aria-live="polite">
        <code class="mono">{{ out().code }}</code>
        <i class="bi bi-arrow-right" aria-hidden="true"></i>
        <strong class="mono" [class.w-err]="out().error">{{ out().value }}</strong>
      </div>
      <p class="small text-muted mt-2 mb-0">{{ out().note }}</p>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .chars { display: flex; flex-wrap: wrap; gap: 3px; }
    .ch { display: flex; flex-direction: column; align-items: center; width: 30px; transition: transform 0.2s; }
    .ch .c {
      width: 30px; height: 34px; display: grid; place-items: center; font-size: 1rem; font-weight: 600;
      border: 1.5px solid var(--border-color); border-radius: 7px; background: var(--bg-main); transition: all 0.2s;
    }
    .ch .i { font-size: 0.66rem; color: var(--text-muted); margin-top: 2px; }
    .ch.hl { transform: translateY(-3px); }
    .ch.hl .c { border-color: var(--purple); background: rgba(139, 92, 246, 0.16); color: var(--purple); }
    .ch.hl .i { color: var(--purple); font-weight: 700; }
    .ops { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.9rem; }
    .ops .w-btn { padding: 5px 10px; font-size: 0.8rem; }
    .res {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 0.7rem 0.9rem; border-radius: 12px;
      border: 2px solid rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.06);
    }
    .res.bad { border-color: rgba(239, 68, 68, 0.45); background: rgba(239, 68, 68, 0.05); }
    .res code { color: var(--text-main); font-size: 0.9rem; word-break: break-all; }
    .res strong { font-size: 1.05rem; word-break: break-all; }
  `]
})
export class StringLabWidget {
  methods: Method[] = ['Length', 'index', 'ToUpper', 'ToLower', 'Trim', 'Contains', 'IndexOf', 'Substring', 'Replace', 'Split'];
  text = signal('  Hello, C# World  ');
  method = signal<Method>('Substring');
  start = signal(9);
  len = signal(2);
  find = signal('World');
  repl = signal('Ravi');

  chars = computed(() => [...this.text()]);
  needsArg = computed(() => !['Length', 'ToUpper', 'ToLower', 'Trim'].includes(this.method()));

  out = computed((): Out => {
    const s = this.text();
    const q = (v: string) => JSON.stringify(v);
    const range = (from: number, n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => from + i);
    switch (this.method()) {
      case 'Length':
        return { code: 'text.Length', value: String(s.length), hl: [], note: 'Length is a property (no brackets). The last index is always Length - 1.' };
      case 'index': {
        const i = this.start();
        if (i < 0 || i >= s.length) return { code: `text[${i}]`, value: 'IndexOutOfRangeException', hl: [], error: true, note: `Valid indexes are 0 to ${s.length - 1}.` };
        return { code: `text[${i}]`, value: `'${s[i]}'`, hl: [i], note: 'Square brackets read one character, a char (single quotes).' };
      }
      case 'ToUpper': return { code: 'text.ToUpper()', value: q(s.toUpperCase()), hl: [], note: 'Returns a NEW string. Strings are immutable: text itself is unchanged.' };
      case 'ToLower': return { code: 'text.ToLower()', value: q(s.toLowerCase()), hl: [], note: 'Useful for comparing input without caring about case.' };
      case 'Trim': {
        const lead = s.length - s.trimStart().length;
        const t = s.trim();
        return { code: 'text.Trim()', value: q(t), hl: range(lead, t.length), note: 'Removes spaces (and tabs/new lines) from both ends. TrimStart / TrimEnd do one side.' };
      }
      case 'Contains': {
        const f = this.find(); const at = s.indexOf(f);
        return { code: `text.Contains(${q(f)})`, value: String(s.includes(f)), hl: at >= 0 ? range(at, f.length) : [], note: 'Case-sensitive: "world" is not the same as "World".' };
      }
      case 'IndexOf': {
        const f = this.find(); const at = s.indexOf(f);
        return { code: `text.IndexOf(${q(f)})`, value: String(at), hl: at >= 0 ? range(at, f.length) : [], note: at >= 0 ? `Found at index ${at}.` : 'Returns -1 when the text is not found.' };
      }
      case 'Substring': {
        const st = this.start(); const n = this.len();
        if (st < 0 || n < 0 || st + n > s.length) {
          return { code: `text.Substring(${st}, ${n})`, value: 'ArgumentOutOfRangeException', hl: [], error: true, note: `start + length must not go past the end (Length is ${s.length}).` };
        }
        return { code: `text.Substring(${st}, ${n})`, value: q(s.substr(st, n)), hl: range(st, n), note: `Takes ${n} characters starting at index ${st}.` };
      }
      case 'Replace': {
        const f = this.find();
        if (!f) return { code: `text.Replace("", ${q(this.repl())})`, value: 'ArgumentException', hl: [], error: true, note: 'The text to find cannot be empty.' };
        return { code: `text.Replace(${q(f)}, ${q(this.repl())})`, value: q(s.split(f).join(this.repl())), hl: [], note: 'Replaces every match and returns a new string.' };
      }
      case 'Split': {
        const sep = this.find() || ' ';
        const parts = s.split(sep);
        return { code: `text.Split(${q(sep)})`, value: `string[${parts.length}] { ${parts.map(q).join(', ')} }`, hl: [], note: 'Cuts the string at every separator and returns an array of pieces.' };
      }
    }
  });
}
