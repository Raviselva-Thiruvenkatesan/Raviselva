import { Component, computed, signal } from '@angular/core';
import { SqlOutputComponent } from './sql-output.component';
import { INJ } from './master-data';

const LABELS = ['Honest: Patel', 'Honest: O’Brien', 'Always true', 'UNION: steal emails', 'Extra statement'];

/** What the same input does to a query built by concatenation and to a parameterized one (real SQL Server results). */
@Component({
  selector: 'w-injection-lab',
  standalone: true,
  imports: [SqlOutputComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Concatenated or parameterized?</h3></div>
      <div class="w-controls" role="group" aria-label="What the user types">
        @for (r of runs; track $index; let i = $index) {
          <button type="button" class="w-btn small" [class.on]="pick() === i" [attr.aria-pressed]="pick() === i" (click)="pick.set(i)">{{ labels[i] }}</button>
        }
      </div>
      <div class="typed">Search box: <span class="mono">{{ run().input }}</span></div>
      <div class="w-controls" role="group" aria-label="How the procedure builds the query">
        <button type="button" class="w-btn small" [class.on]="!safe()" [attr.aria-pressed]="!safe()" (click)="safe.set(false)">EXEC ('… ''' + &#64;LastName + ''' …')</button>
        <button type="button" class="w-btn small" [class.on]="safe()" [attr.aria-pressed]="safe()" (click)="safe.set(true)">sp_executesql with &#64;LastName</button>
      </div>
      <div class="cols">
        <div class="pane">
          <div class="ph">What SQL Server receives</div>
          <pre class="sqlbox mono">@if (safe()) {<span>SELECT CustomerId, FirstName, LastName, City
FROM dbo.Customers
WHERE LastName = </span><span class="param">&#64;LastName</span>
<span class="dim">-- &#64;LastName (a value, never SQL) = </span><span class="param">N'{{ quoted() }}'</span>} @else {<span>SELECT CustomerId, FirstName, LastName, City
FROM dbo.Customers
WHERE LastName = '</span><span class="inj">{{ run().input }}</span><span>'</span>}</pre>
        </div>
        <div class="pane">
          <div class="ph">Result</div>
          <app-sql-output [text]="out()" label="Result" />
          @if (!safe() && run().pennies) { <div class="dmg">Afterwards: <b>{{ run().pennies }}</b> of 12 products cost 0.01.</div> }
        </div>
      </div>
      <div class="w-msg" [class.ok]="!bad()" [class.err]="bad()" aria-live="polite"><span>{{ verdict() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .small { font-size: 0.78rem; padding: 4px 9px; }
    .typed { font-size: 0.85rem; margin: 0.3rem 0; overflow-wrap: anywhere; }
    .typed .mono { background: var(--bg-secondary); padding: 1px 6px; border-radius: 5px; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.7rem; margin-top: 0.4rem; }
    @media (max-width: 700px) { .cols { grid-template-columns: 1fr; } }
    .pane { min-width: 0; }
    .ph { font-size: 0.74rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.3rem; }
    .sqlbox { font-size: 0.72rem; background: #0b1020; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .inj { background: rgba(239, 68, 68, 0.35); color: #fecaca; border-radius: 3px; }
    .param { color: #86efac; font-weight: 700; }
    .dim { color: #94a3b8; }
    .dmg { margin-top: 0.4rem; font-size: 0.82rem; color: #dc2626; }
  `]
})
export class InjectionLabWidget {
  readonly runs = INJ;
  readonly labels = LABELS;
  pick = signal(2);
  safe = signal(false);
  run = computed(() => INJ[this.pick()]);
  quoted = computed(() => this.run().input.replace(/'/g, '\'\''));
  out = computed(() => (this.safe() ? this.run().good : this.run().bad));
  bad = computed(() => !this.safe() && this.pick() >= 1);

  verdict = computed(() => {
    const i = this.pick();
    if (this.safe()) return i === 0
      ? 'Found as expected. The statement text never changes; only the parameter’s value does.'
      : 'No customer has that surname, so no rows, and no error. The quote and the SQL keywords were just characters in a value.';
    switch (i) {
      case 0: return 'Honest input works either way. That is why injection bugs survive testing.';
      case 1: return 'A real surname breaks the query: the quote in O’Brien ends the string early. Errors like this are how attackers find the weakness.';
      case 2: return 'The quote closed the string, OR 1 = 1 matched every row, and -- commented out the leftover quote. Every customer is returned.';
      case 3: return 'UNION added a second query of the attacker’s choosing. The page that shows names now shows email addresses and phone numbers.';
      default: return 'The semicolon started a second statement. The search found nothing, but every price in the shop is now 0.01.';
    }
  });
}
