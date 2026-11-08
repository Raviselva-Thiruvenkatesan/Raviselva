import { Component, computed, signal } from '@angular/core';

type State = 'edit' | 'new' | 'risk' | 'safe';
interface Box { name: string; kind?: string; state: State }
interface Change {
  id: string; label: string; principle: string;
  /** Which of the god class's jobs the change touches. */
  job: number;
  after: Record<string, State>;
  added?: Box;
  /** Replaces the "edited / retest" stats on the god-class side when the change isn't an edit. */
  before?: string;
  note: string;
}

const JOBS = ['read the model file', 'calculate weights', 'write the PDF report', 'email the report'];

const CHANGES: Change[] = [
  { id: 'sql', label: 'Read the model from SQL Server instead of JSON', principle: 'Open/Closed + Dependency Inversion', job: 0,
    after: {}, added: { name: 'SqlModelSource', kind: ': IModelSource', state: 'new' },
    note: 'Add one new class that implements IModelSource and register it. No existing class is edited, so nothing else needs retesting.' },
  { id: 'excel', label: 'Also export the report to Excel', principle: 'Open/Closed', job: 2,
    after: {}, added: { name: 'ExcelReportWriter', kind: ': IReportWriter', state: 'new' },
    note: 'The app is open for extension (a new writer) but closed for modification (PdfReportWriter is untouched).' },
  { id: 'density', label: 'Change steel density from 7850 to 7860 kg/m³', principle: 'Single Responsibility', job: 1,
    after: { WeightCalculator: 'edit' },
    note: 'Only WeightCalculator knows about density, so only it changes, and only its tests need to run again.' },
  { id: 'teams', label: 'Send a Teams message instead of an email', principle: 'Dependency Inversion', job: 3,
    after: {}, added: { name: 'TeamsNotifier', kind: ': INotifier', state: 'new' },
    note: 'ReportService depends on the INotifier abstraction, not on SMTP, so swapping the notifier changes one registration line.' },
  { id: 'test', label: 'Write a unit test for the weight calculation', principle: 'Single Responsibility + Dependency Inversion', job: 1,
    after: {}, added: { name: 'WeightCalculatorTests', kind: '(test project)', state: 'new' },
    before: 'Can’t test the calculation alone: Run() needs a real file, the PDF library and a mail server.',
    note: 'Test WeightCalculator directly with a few beams in memory: no file, no PDF library, no mail server. Before the refactor this was nearly impossible.' }
];

/** One change request, two designs: a god class versus SOLID classes. Shows what must be edited and retested. */
@Component({
  selector: 'w-solid-impact',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>What does one change cost?</h3></div>
      <p class="w-hint">Pick a change request from the project manager and compare the two designs.</p>
      <div class="w-controls" role="group" aria-label="Change request">
        @for (c of changes; track c.id) {
          <button type="button" class="w-btn" [class.on]="cur().id === c.id" (click)="pick(c.id)" [attr.aria-pressed]="cur().id === c.id">{{ c.label }}</button>
        }
      </div>

      <div class="cols">
        <div class="col">
          <div class="w-label">Before: one class does everything</div>
          <div class="box" [class.edit]="!cur().before" [class.risk]="cur().before">
            <strong class="mono">ReportManager</strong> <small>(420 lines)</small>
            <ul>
              @for (j of jobs; track j; let i = $index) {
                <li [class.hit]="i === cur().job" [class.at-risk]="!cur().before && i !== cur().job">{{ j }}</li>
              }
            </ul>
          </div>
          @if (cur().before; as b) {
            <div class="stats"><span class="bad">{{ b }}</span></div>
          } @else {
            <div class="stats"><span><b>1</b> class edited</span><span><b class="bad">4</b> jobs to retest</span></div>
          }
        </div>
        <div class="col">
          <div class="w-label">After: one job per class</div>
          <div class="boxes">
            @for (b of afterBoxes(); track b.name) {
              <div class="box sm" [class]="b.state"><span class="mono">{{ b.name }}</span>@if (b.kind) { <small class="mono"> {{ b.kind }}</small> }</div>
            }
          </div>
          <div class="stats"><span><b>{{ edited() }}</b> edited</span><span><b>{{ added() }}</b> added</span><span><b class="good">{{ retest() }}</b> to retest</span></div>
        </div>
      </div>
      <div class="legend small"><span class="k edit"></span>edited <span class="k new"></span>new <span class="k risk"></span>at risk <span class="k safe"></span>untouched</div>
      <div class="w-msg info" aria-live="polite"><i class="bi bi-lightbulb" aria-hidden="true"></i><span><strong>{{ cur().principle }}.</strong> {{ cur().note }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .cols { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 700px) { .cols { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); } }
    .col { min-width: 0; }
    .boxes { display: grid; gap: 5px; }
    .box { padding: 8px 10px; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-main); font-size: 0.85rem; transition: all 0.2s; }
    .box.sm { padding: 5px 10px; }
    .box small { color: var(--text-muted); }
    .box ul { margin: 6px 0 0; padding-left: 1.1rem; font-size: 0.82rem; }
    li.hit { color: #b45309; font-weight: 700; }
    li.at-risk { color: #dc2626; }
    .edit { border-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
    .new { border-color: #10b981; background: rgba(16, 185, 129, 0.12); }
    .risk { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
    .safe { opacity: 0.7; }
    .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; font-size: 0.82rem; color: var(--text-muted); }
    .stats b { color: var(--text-main); font-size: 1rem; }
    .bad { color: #dc2626 !important; } .good { color: #059669 !important; }
    .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; color: var(--text-muted); }
    .k { width: 12px; height: 12px; border-radius: 3px; border: 1.5px solid var(--border-color); display: inline-block; margin-left: 6px; }
  `]
})
export class SolidImpactWidget {
  readonly changes = CHANGES;
  readonly jobs = JOBS;
  private readonly base = ['JsonModelSource', 'WeightCalculator', 'PdfReportWriter', 'EmailNotifier', 'ReportService'];
  private readonly kinds: Record<string, string> = {
    JsonModelSource: ': IModelSource', PdfReportWriter: ': IReportWriter', EmailNotifier: ': INotifier'
  };
  id = signal('sql');

  cur = computed(() => CHANGES.find(c => c.id === this.id())!);
  afterBoxes = computed<Box[]>(() => {
    const c = this.cur();
    const boxes: Box[] = this.base.map(n => ({ name: n, kind: this.kinds[n], state: c.after[n] ?? 'safe' }));
    if (c.added) boxes.push(c.added);
    return boxes;
  });
  edited = computed(() => this.afterBoxes().filter(b => b.state === 'edit').length);
  added = computed(() => this.afterBoxes().filter(b => b.state === 'new').length);
  retest = computed(() => this.edited() + this.added());

  pick(id: string) { this.id.set(id); }
}
