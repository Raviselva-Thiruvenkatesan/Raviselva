import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodeViewComponent } from '../shared/code-view.component';

interface Ext { name: string; sig: string; body: string; call: string; run: (s: string) => string }

const EXTS: Ext[] = [
  { name: 'ToTitleCase', sig: 'public static string ToTitleCase(this string s)', body: 'CultureInfo.InvariantCulture.TextInfo.ToTitleCase(s.ToLower())', call: 'ToTitleCase()',
    run: s => s.toLowerCase().replace(/(^|\s)(\S)/g, (_m, sp: string, c: string) => sp + c.toUpperCase()) },
  { name: 'WordCount', sig: 'public static int WordCount(this string s)', body: 's.Split(\' \', StringSplitOptions.RemoveEmptyEntries).Length', call: 'WordCount()',
    run: s => String(s.split(' ').filter(x => x).length) },
  { name: 'Truncate', sig: 'public static string Truncate(this string s, int max)', body: 's.Length <= max ? s : s[..max] + "…"', call: 'Truncate(10)',
    run: s => '"' + (s.length <= 10 ? s : s.slice(0, 10) + '…') + '"' },
  { name: 'IsBlank', sig: 'public static bool IsBlank(this string? s)', body: 'string.IsNullOrWhiteSpace(s)', call: 'IsBlank()',
    run: s => (s.trim() === '' ? 'True' : 'False') }
];

/** Add a method to string without changing it: see the extension call and the static call it becomes. */
@Component({
  selector: 'w-extension-chain',
  standalone: true,
  imports: [FormsModule, CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Adding methods to string</h3></div>
      <div class="w-controls">
        <label class="w-field">string text = <input class="mono" size="24" [ngModel]="text()" (ngModelChange)="text.set($event)" spellcheck="false"></label>
      </div>
      <div class="w-controls" role="group" aria-label="Extension method">
        @for (e of exts; track e.name) {
          <button type="button" class="w-btn mono" [class.on]="sel().name === e.name" (click)="sel.set(e)" [attr.aria-pressed]="sel().name === e.name">{{ e.name }}</button>
        }
      </div>

      <app-code [code]="def()" title="StringExtensions.cs" [compact]="true" [copyable]="false" [marked]="[3]" />

      <div class="calls" aria-live="polite">
        <div class="call"><small>You write</small><code class="mono">text.{{ sel().call }}</code></div>
        <div class="eq" aria-hidden="true">=</div>
        <div class="call"><small>The compiler turns it into</small><code class="mono">StringExtensions.{{ staticCall() }}</code></div>
        <div class="eq" aria-hidden="true">→</div>
        <div class="call res"><small>Result</small><strong class="mono">{{ result() }}</strong></div>
      </div>
      <p class="small text-muted mt-2 mb-0">The <span class="mono">this</span> before the first parameter is what makes it an extension method. string itself is unchanged; you just get nicer syntax and IntelliSense shows the method on every string.</p>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .calls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 0.9rem; }
    .call { display: grid; gap: 2px; padding: 8px 12px; border-radius: 12px; border: 1.5px solid var(--border-color); background: var(--bg-main); min-width: 0; }
    .call small { font-size: 0.7rem; color: var(--text-muted); }
    .call code { color: var(--text-main); font-size: 0.85rem; word-break: break-all; }
    .call.res { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .call.res strong { color: #059669; word-break: break-all; }
    .eq { font-weight: 700; color: var(--text-muted); }
  `]
})
export class ExtensionChainWidget {
  exts = EXTS;
  text = signal('steel beam schedule for level two');
  sel = signal<Ext>(EXTS[0]);

  def = computed(() => [
    'public static class StringExtensions',
    '{',
    `    ${this.sel().sig}`,
    `        => ${this.sel().body};`,
    '}'
  ].join('\n'));

  staticCall = computed(() => {
    const c = this.sel().call;
    const args = c.slice(c.indexOf('(') + 1, -1);
    return `${this.sel().name}(text${args ? ', ' + args : ''})`;
  });

  result = computed(() => {
    const r = this.sel().run(this.text());
    return this.sel().name === 'ToTitleCase' ? `"${r}"` : r;
  });
}
