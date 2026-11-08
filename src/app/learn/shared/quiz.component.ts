import { Component, input, signal } from '@angular/core';
import { RichTextComponent } from './rich-text.component';

/** A single multiple-choice question with instant feedback. */
@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [RichTextComponent],
  template: `
    <fieldset class="quiz">
      <legend><i class="bi bi-patch-question" aria-hidden="true"></i> Quick check</legend>
      <p class="q"><app-rt [text]="question()" /></p>
      <div class="opts">
        @for (o of options(); track $index; let i = $index) {
          <button type="button" class="opt"
            [class.right]="picked() !== null && i === answer()"
            [class.wrong]="picked() === i && i !== answer()"
            [disabled]="picked() !== null"
            (click)="picked.set(i)">
            <span class="letter">{{ 'ABCD'[i] }}</span><span><app-rt [text]="o" /></span>
          </button>
        }
      </div>
      @if (picked() !== null) {
        <div class="fb" [class.ok]="picked() === answer()" role="status">
          <strong>{{ picked() === answer() ? 'Correct!' : 'Not quite.' }}</strong> <app-rt [text]="explain()" />
          @if (picked() !== answer()) {
            <button type="button" class="retry" (click)="picked.set(null)">Try again</button>
          }
        </div>
      }
    </fieldset>
  `,
  styles: [`
    .quiz { margin: 1.75rem 0; padding: 1rem 1.1rem 1.1rem; border-radius: 16px; border: 1px solid var(--border-color); background: var(--bg-secondary); box-shadow: var(--shadow-sm); }
    legend { float: none; width: auto; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--purple); padding: 0 0.4rem; margin: 0; }
    .q { font-weight: 600; margin: 0.25rem 0 0.75rem; }
    .opts { display: grid; gap: 8px; }
    .opt {
      display: flex; gap: 10px; align-items: center; text-align: left; width: 100%;
      padding: 0.6rem 0.8rem; border-radius: 12px; border: 1.5px solid var(--border-color);
      background: var(--bg-main); color: var(--text-main); font-size: 0.95rem; cursor: pointer; transition: border-color 0.15s, background 0.15s;
    }
    .opt:hover:not(:disabled), .opt:focus-visible { border-color: var(--purple); }
    .opt:disabled { cursor: default; }
    .letter { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-weight: 700; font-size: 0.8rem; background: rgba(139, 92, 246, 0.12); color: var(--purple); }
    .opt.right { border-color: #10b981; background: rgba(16, 185, 129, 0.12); }
    .opt.right .letter { background: #10b981; color: #fff; }
    .opt.wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
    .opt.wrong .letter { background: #ef4444; color: #fff; }
    .fb { margin-top: 0.8rem; padding: 0.7rem 0.9rem; border-radius: 12px; font-size: 0.93rem; background: rgba(239, 68, 68, 0.07); border: 1px solid rgba(239, 68, 68, 0.25); }
    .fb.ok { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); }
    .retry { margin-left: 8px; border: 0; background: none; color: var(--purple); font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0; }
  `]
})
export class QuizComponent {
  question = input.required<string>();
  options = input.required<string[]>();
  answer = input.required<number>();
  explain = input.required<string>();
  picked = signal<number | null>(null);
}
