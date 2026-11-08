import { Component, computed, signal } from '@angular/core';
import { CodeViewComponent } from '../shared/code-view.component';

interface Step { line: number; open: boolean | null; text: string; thrown?: boolean }

/** Compare a file handle with and without `using`, with or without an exception in the middle. */
@Component({
  selector: 'w-using-scope',
  standalone: true,
  imports: [CodeViewComponent],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Is the file still locked?</h3></div>
      <div class="w-controls">
        <button type="button" class="w-btn mono" [class.on]="useUsing()" (click)="setUsing(true)" [attr.aria-pressed]="useUsing()">with using</button>
        <button type="button" class="w-btn mono" [class.on]="!useUsing()" (click)="setUsing(false)" [attr.aria-pressed]="!useUsing()">without using</button>
        <label class="small ms-2 d-inline-flex gap-1 align-items-center"><input type="checkbox" [checked]="fail()" (change)="toggleFail()"> WriteLine throws (disk full)</label>
      </div>

      <div class="w-grid two">
        <app-code [code]="code()" title="Export.cs" [compact]="true" [copyable]="false" [active]="[step().line]" />
        <div>
          <div class="file" [class.open]="step().open === true" [class.closed]="step().open === false">
            <i class="bi" [class.bi-lock-fill]="step().open === true" [class.bi-unlock]="step().open !== true" aria-hidden="true"></i>
            <div><strong class="mono">report.csv</strong>
              <small>{{ step().open === null ? 'not opened yet' : step().open ? 'OPEN and locked: other programs can’t use it' : 'closed and released' }}</small></div>
          </div>
          @if (step().thrown) { <div class="thrown mono"><i class="bi bi-lightning-charge-fill" aria-hidden="true"></i> IOException thrown</div> }
          <div class="w-panel mt-2" aria-live="polite">
            <div class="w-label">Step {{ pos() + 1 }} / {{ steps().length }}</div>
            {{ step().text }}
          </div>
        </div>
      </div>

      <div class="w-controls mt-3 mb-0">
        <button type="button" class="w-btn" (click)="go(0)" [disabled]="pos() === 0"><i class="bi bi-skip-backward" aria-hidden="true"></i> Reset</button>
        <button type="button" class="w-btn" (click)="go(pos() - 1)" [disabled]="pos() === 0"><i class="bi bi-chevron-left" aria-hidden="true"></i> Back</button>
        <button type="button" class="w-btn primary" (click)="go(pos() + 1)" [disabled]="pos() === steps().length - 1">Step <i class="bi bi-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .file { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; border: 2px dashed var(--border-color); transition: all 0.25s; }
    .file i { font-size: 1.6rem; color: var(--text-muted); }
    .file small { display: block; font-size: 0.78rem; color: var(--text-muted); }
    .file.open { border-style: solid; border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .file.open i { color: #f59e0b; }
    .file.closed { border-style: solid; border-color: #10b981; background: rgba(16, 185, 129, 0.08); }
    .file.closed i { color: #10b981; }
    .thrown { margin-top: 8px; padding: 6px 10px; border-radius: 8px; font-size: 0.82rem; font-weight: 700; color: #dc2626; background: rgba(239, 68, 68, 0.1); }
  `]
})
export class UsingScopeWidget {
  useUsing = signal(true);
  fail = signal(true);
  pos = signal(0);

  setUsing(v: boolean) { this.useUsing.set(v); this.pos.set(0); }
  toggleFail() { this.fail.update(f => !f); this.pos.set(0); }
  go(p: number) { this.pos.set(Math.max(0, Math.min(this.steps().length - 1, p))); }

  code = computed(() => this.useUsing()
    ? ['using (var writer = new StreamWriter("report.csv"))', '{', '    writer.WriteLine("Mark,Kg");', '    writer.WriteLine("B1,253");', '}   // writer.Dispose() runs here, ALWAYS', 'Console.WriteLine("Exported");'].join('\n')
    : ['var writer = new StreamWriter("report.csv");', 'writer.WriteLine("Mark,Kg");', 'writer.WriteLine("B1,253");', 'writer.Dispose();   // only if we get this far', 'Console.WriteLine("Exported");'].join('\n'));

  steps = computed<Step[]>(() => {
    const u = this.useUsing(), f = this.fail();
    const s: Step[] = [{ line: 1, open: true, text: 'new StreamWriter opens the file and gets an operating-system handle. The file is locked while it is open.' }];
    const w1 = u ? 3 : 2, w2 = u ? 4 : 3;
    s.push({ line: w1, open: true, text: 'Writes the header line (into a buffer in memory).' });
    if (f) {
      s.push({ line: w2, open: true, thrown: true, text: 'The second WriteLine throws an IOException. Execution jumps out immediately.' });
      if (u) {
        s.push({ line: 5, open: false, thrown: true, text: 'Leaving the using block, even because of an exception, calls Dispose(): the buffer is flushed and the handle released. The exception then continues to the caller.' });
      } else {
        s.push({ line: 4, open: true, thrown: true, text: 'This Dispose() line is SKIPPED by the exception. The file stays open and locked until the garbage collector eventually finalises the writer, maybe much later. Trying to open report.csv again fails with "being used by another process".' });
      }
      return s;
    }
    s.push({ line: w2, open: true, text: 'Writes the data line.' });
    s.push({ line: u ? 5 : 4, open: false, text: u ? 'End of the using block: Dispose() flushes and closes the file automatically.' : 'Dispose() closes the file. This works, but only on the happy path.' });
    s.push({ line: u ? 6 : 5, open: false, text: 'The file is closed and other programs can open it.' });
    return s;
  });

  step = computed(() => this.steps()[Math.min(this.pos(), this.steps().length - 1)]);
}
