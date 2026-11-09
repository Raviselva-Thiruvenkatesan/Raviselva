import { Component, computed, input, output, signal } from '@angular/core';
import { CodeLang, highlight } from './highlight';

/**
 * Highlighted C# or T-SQL code with line numbers (T-SQL when `lang` is 'sql' or the title ends in .sql). Widgets pass `active` (1-based line numbers) to show
 * which line is running, and `marked` for a softer highlight of a whole block.
 */
@Component({
  selector: 'app-code',
  standalone: true,
  template: `
    <figure class="code-box" [class.compact]="compact()">
      <figcaption class="code-head">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="file">{{ title() || (language() === 'sql' ? 'T-SQL' : 'C#') }}</span>
        @if (copyable()) {
          <button type="button" class="copy" (click)="copy()" [attr.aria-label]="copied() ? 'Copied' : 'Copy code'">
            <i class="bi" [class.bi-check2]="copied()" [class.bi-clipboard]="!copied()" aria-hidden="true"></i>
            {{ copied() ? 'Copied' : 'Copy' }}
          </button>
        }
      </figcaption>
      <pre><code>@for (line of lines(); track $index; let n = $index) {<span class="ln"
          [class.active]="active().includes(n + 1)"
          [class.marked]="marked().includes(n + 1)"
          [class.clickable]="clickable()"
          (click)="clickable() && lineClick.emit(n + 1)"><span class="lno" aria-hidden="true">{{ n + 1 }}</span><span class="src">@for (t of line; track $index) {<span [class]="t.k">{{ t.v }}</span>}{{ line.length ? '' : ' ' }}</span></span>}</code></pre>
      @if (output()) {
        <div class="out">
          <span class="out-label"><i class="bi bi-terminal" aria-hidden="true"></i> Output</span>
          <pre [class.grid]="language() === 'sql'">{{ output() }}</pre>
        </div>
      }
    </figure>
  `,
  styles: [`
    .code-box {
      margin: 1.25rem 0;
      border-radius: 14px;
      overflow: hidden;
      background: #0b1020;
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 10px 30px -12px rgba(2, 6, 23, 0.5);
    }
    .compact { margin: 0; }
    .code-head {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px;
      background: #111833;
      border-bottom: 1px solid rgba(148, 163, 184, 0.14);
      color: #94a3b8; font-size: 0.78rem;
    }
    .dots { display: inline-flex; gap: 5px; }
    .dots i { width: 9px; height: 9px; border-radius: 50%; background: #334155; }
    .dots i:nth-child(1) { background: #f87171; }
    .dots i:nth-child(2) { background: #fbbf24; }
    .dots i:nth-child(3) { background: #34d399; }
    .file { flex: 1; font-family: 'Cascadia Code', Consolas, monospace; }
    .copy {
      border: 0; background: transparent; color: #94a3b8; font-size: 0.78rem;
      display: inline-flex; gap: 4px; align-items: center; cursor: pointer; border-radius: 6px; padding: 2px 6px;
    }
    .copy:hover, .copy:focus-visible { color: #e2e8f0; background: rgba(148, 163, 184, 0.14); }
    pre { margin: 0; padding: 0.75rem 0; overflow-x: auto; color: #e2e8f0; }
    code {
      font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
      font-size: 0.86rem; line-height: 1.65; display: block; min-width: max-content; font-variant-ligatures: none;
    }
    .ln { display: block; padding-right: 1rem; border-left: 3px solid transparent; transition: background 0.2s; }
    .ln.marked { background: rgba(139, 92, 246, 0.12); }
    .ln.active { background: rgba(56, 189, 248, 0.2); border-left-color: #38bdf8; }
    .ln.clickable { cursor: pointer; }
    .ln.clickable:hover { background: rgba(148, 163, 184, 0.1); }
    .lno { display: inline-block; width: 2.6rem; padding-right: 0.9rem; text-align: right; color: #475569; user-select: none; }
    .kw { color: #c792ea; }
    .type { color: #82aaff; }
    .fn { color: #ffcb6b; }
    .str { color: #c3e88d; }
    .num { color: #f78c6c; }
    .com { color: #64748b; font-style: italic; }
    .out { border-top: 1px solid rgba(148, 163, 184, 0.14); background: #060a16; }
    .out-label {
      display: flex; gap: 6px; align-items: center;
      padding: 6px 14px 0; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b;
    }
    .out pre { padding: 0.35rem 1rem 0.8rem; font-family: 'Cascadia Code', Consolas, monospace; font-size: 0.86rem; color: #a7f3d0; white-space: pre-wrap; }
    .out pre.grid { white-space: pre; overflow-x: auto; }
  `]
})
export class CodeViewComponent {
  code = input.required<string>();
  title = input<string>('');
  lang = input<CodeLang | ''>('');
  output = input<string>('');
  active = input<number[]>([]);
  marked = input<number[]>([]);
  clickable = input(false);
  copyable = input(true);
  compact = input(false);
  lineClick = output<number>();

  language = computed<CodeLang>(() => this.lang() || (/\.sql$/i.test(this.title()) ? 'sql' : 'cs'));
  lines = computed(() => highlight(this.code(), this.language()));
  copied = signal(false);

  async copy() {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch { /* clipboard blocked: nothing to do */ }
  }
}
