import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Tab = 'strategy' | 'decorator' | 'factory';
interface Code { id: string; cls: string; name: string; factor: string; calc: (a: number, fy: number) => number }

const CODES: Code[] = [
  { id: 'is', cls: 'Is800Check', name: 'IS 800:2007', factor: 'A·fy / γm0, γm0 = 1.10', calc: (a, fy) => a * fy / 1.1 },
  { id: 'ec', cls: 'Eurocode3Check', name: 'EN 1993-1-1', factor: 'A·fy / γM0, γM0 = 1.00', calc: (a, fy) => a * fy / 1.0 },
  { id: 'aisc', cls: 'Aisc360Check', name: 'AISC 360 (LRFD)', factor: 'φ·Fy·Ag, φ = 0.90', calc: (a, fy) => 0.9 * a * fy }
];

/** Three classic patterns you can play with: swap a Strategy, stack Decorators, and let a Factory pick the class. */
@Component({
  selector: 'w-pattern-lab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Patterns in action</h3></div>
      <div class="w-controls" role="tablist" aria-label="Pattern">
        <button type="button" role="tab" class="w-btn" [class.on]="tab() === 'strategy'" [attr.aria-selected]="tab() === 'strategy'" (click)="tab.set('strategy')">Strategy</button>
        <button type="button" role="tab" class="w-btn" [class.on]="tab() === 'decorator'" [attr.aria-selected]="tab() === 'decorator'" (click)="tab.set('decorator')">Decorator</button>
        <button type="button" role="tab" class="w-btn" [class.on]="tab() === 'factory'" [attr.aria-selected]="tab() === 'factory'" (click)="tab.set('factory')">Factory</button>
      </div>

      @switch (tab()) {
        @case ('strategy') {
          <p class="w-hint">Tension check of a member, A = 5000 mm², fy = 250 MPa. The calculation is a <strong>swappable object</strong>.</p>
          <div class="w-controls">
            @for (c of codes; track c.id) {
              <button type="button" class="w-btn mono" [class.on]="code().id === c.id" (click)="codeId.set(c.id)" [attr.aria-pressed]="code().id === c.id">{{ c.cls }}</button>
            }
          </div>
          <div class="code mono">
            <div>ITensionCheck check = new {{ code().cls }}();</div>
            <div>var report = new MemberReport(check);   <span class="c">// MemberReport never changes</span></div>
            <div>report.Run(beam);</div>
          </div>
          <div class="w-msg ok" aria-live="polite"><span><strong>{{ code().name }}</strong>: {{ code().factor }} → design strength <strong class="mono">{{ strength() }} kN</strong></span></div>
        }
        @case ('decorator') {
          <p class="w-hint">Each wrapper adds one behaviour around <span class="mono">SqlBeamRepository</span>. The first database call times out once.</p>
          <div class="w-controls">
            <label class="chk"><input type="checkbox" [ngModel]="log()" (ngModelChange)="log.set($event)"> Logging</label>
            <label class="chk"><input type="checkbox" [ngModel]="cache()" (ngModelChange)="cache.set($event)"> Caching</label>
            <label class="chk"><input type="checkbox" [ngModel]="retry()" (ngModelChange)="retry.set($event)"> Retry</label>
          </div>
          <div class="code mono">IBeamRepository repo = {{ chain() }};</div>
          <div class="calls">
            @for (call of trace(); track $index; let i = $index) {
              <div>
                <div class="w-label">repo.Get("B12"), call {{ i + 1 }}</div>
                <ol class="log mono">
                  @for (l of call; track $index) { <li [class.bad]="l.includes('✗')" [class.good]="l.includes('✓')">{{ l }}</li> }
                </ol>
              </div>
            }
          </div>
        }
        @case ('factory') {
          <p class="w-hint">The caller only has a text from a drawing schedule. The factory decides which class to create.</p>
          <div class="w-controls">
            <label class="w-field">section name <input class="mono" [ngModel]="section()" (ngModelChange)="section.set($event)" spellcheck="false"></label>
            @for (s of samples; track s) { <button type="button" class="w-btn mono align-self-end" (click)="section.set(s)">{{ s }}</button> }
          </div>
          <div class="code mono">Section s = SectionFactory.Create("{{ section() }}");</div>
          <div class="w-msg" [class.ok]="made().ok" [class.err]="!made().ok" aria-live="polite"><span class="mono">{{ made().text }}</span></div>
        }
      }
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .code { padding: 0.55rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: nowrap; }
    .c { color: #64748b; }
    .chk { display: inline-flex; gap: 6px; align-items: center; font-size: 0.88rem; font-weight: 600; }
    .chk input { accent-color: var(--purple); }
    .calls { display: grid; gap: 10px; margin-top: 0.8rem; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 700px) { .calls { grid-template-columns: 1fr 1fr; } }
    .log { margin: 0; padding-left: 1.4rem; font-size: 0.78rem; display: grid; gap: 1px; }
    .bad { color: #dc2626; } .good { color: #059669; }
  `]
})
export class PatternLabWidget {
  readonly codes = CODES;
  readonly samples = ['IPE300', 'HEA200', 'RHS100x50x5', 'CHS114x6', 'Z150'];
  tab = signal<Tab>('strategy');

  // Strategy
  codeId = signal('is');
  code = computed(() => CODES.find(c => c.id === this.codeId())!);
  strength = computed(() => (this.code().calc(5000, 250) / 1000).toFixed(1));

  // Decorator
  log = signal(true);
  cache = signal(true);
  retry = signal(true);
  chain = computed(() => {
    let s = 'new SqlBeamRepository()';
    if (this.retry()) s = `new RetryRepository(${s})`;
    if (this.cache()) s = `new CachingRepository(${s})`;
    if (this.log()) s = `new LoggingRepository(${s})`;
    return s;
  });
  trace = computed(() => {
    let dbCalls = 0;
    let cached = false;
    const out: string[][] = [];
    for (let call = 0; call < 2; call++) {
      const t: string[] = [];
      if (this.log()) t.push('[Log]   Get("B12") started');
      let ok = true;
      if (this.cache() && cached) {
        t.push('[Cache] hit: returned from memory ✓');
      } else {
        if (this.cache()) t.push('[Cache] miss');
        const attempts = this.retry() ? 2 : 1;
        ok = false;
        for (let a = 1; a <= attempts && !ok; a++) {
          dbCalls++;
          const fail = dbCalls === 1;
          if (this.retry()) t.push(`[Retry] attempt ${a}`);
          t.push(fail ? '[Sql]   query: timeout ✗' : '[Sql]   query: row found');
          ok = !fail;
        }
        if (ok && this.cache()) { t.push('[Cache] stored B12'); cached = true; }
      }
      if (!ok) {
        if (this.log()) t.push('[Log]   failed: TimeoutException (logged, rethrown)');
        t.push('TimeoutException reaches the caller ✗');
      } else {
        t.push(this.log() ? '[Log]   finished ✓' : 'Beam B12 returned ✓');
      }
      out.push(t);
    }
    return out;
  });

  // Factory
  section = signal('IPE300');
  made = computed(() => {
    const s = this.section().trim().toUpperCase();
    const rules: [RegExp, string][] = [
      [/^(IPE|HEA|HEB|ISMB|W)\d/, 'ISection'],
      [/^(RHS|SHS)\d+X\d+X\d+(\.\d+)?$/, 'HollowRectSection'],
      [/^CHS\d+(\.\d+)?X\d+(\.\d+)?$/, 'CircularHollowSection'],
      [/^(ISA|L)\d+X\d+X\d+$/, 'AngleSection']
    ];
    const hit = rules.find(([re]) => re.test(s));
    return hit
      ? { ok: true, text: `→ new ${hit[1]}("${s}")   // returned as Section` }
      : { ok: false, text: `→ throws ArgumentException: unknown section "${s}"` };
  });
}
