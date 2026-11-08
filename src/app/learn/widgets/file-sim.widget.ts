import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** A pretend disk: write, append, read and delete a file, and build paths with Path. */
@Component({
  selector: 'w-file-sim',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Reading and writing a file</h3></div>
      <p class="w-hint">A simulated disk with one file path. Try reading before the file exists, then write, append and read again.</p>

      <div class="w-controls">
        <label class="w-field">text <input class="mono" size="18" [ngModel]="text()" (ngModelChange)="text.set($event)" spellcheck="false"></label>
        <button type="button" class="w-btn primary align-self-end mono" (click)="write()">WriteAllText</button>
        <button type="button" class="w-btn align-self-end mono" (click)="append()">AppendAllText</button>
        <button type="button" class="w-btn align-self-end mono" (click)="readLines()">ReadAllLines</button>
        <button type="button" class="w-btn align-self-end mono" (click)="exists()">Exists</button>
        <button type="button" class="w-btn align-self-end mono" (click)="del()">Delete</button>
      </div>

      <div class="w-grid two">
        <div class="disk">
          <div class="w-label"><i class="bi bi-hdd" aria-hidden="true"></i> {{ path() }}</div>
          @if (content() === null) {
            <div class="nofile">(file does not exist)</div>
          } @else {
            <pre class="file mono">@for (l of lines(); track $index) {<span class="fl"><span class="n">{{ $index + 1 }}</span>{{ l }}</span>}</pre>
            <small class="text-muted">{{ content()!.length }} characters · {{ lines().length }} line(s)</small>
          }
        </div>
        <div>
          <div class="w-msg mt-0" [class.err]="err()" [class.ok]="!err()" aria-live="polite">
            <code class="mono">{{ code() }}</code><span>{{ msg() }}</span>
          </div>
          <div class="w-label mt-3">Path helpers</div>
          <div class="w-controls mb-1">
            <label class="w-field">folder <input class="mono" size="14" [ngModel]="folder()" (ngModelChange)="folder.set($event)" spellcheck="false"></label>
            <label class="w-field">file <input class="mono" size="10" [ngModel]="file()" (ngModelChange)="file.set($event)" spellcheck="false"></label>
          </div>
          <table class="paths">
            <tbody>
              <tr><td class="mono">Path.Combine(folder, file)</td><td class="mono">{{ path() }}</td></tr>
              <tr><td class="mono">Path.GetFileName</td><td class="mono">{{ file() }}</td></tr>
              <tr><td class="mono">Path.GetFileNameWithoutExtension</td><td class="mono">{{ stem() }}</td></tr>
              <tr><td class="mono">Path.GetExtension</td><td class="mono">{{ ext() }}</td></tr>
              <tr><td class="mono">Path.GetDirectoryName</td><td class="mono">{{ trimmedFolder() }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .disk { padding: 10px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .disk .w-label { text-transform: none; letter-spacing: 0; font-family: 'Cascadia Code', Consolas, monospace; word-break: break-all; }
    .nofile { color: var(--text-muted); font-style: italic; padding: 18px 0; text-align: center; }
    .file { margin: 0 0 4px; padding: 8px 0; background: #0b1020; color: #e2e8f0; border-radius: 8px; font-size: 0.82rem; max-height: 170px; overflow: auto; }
    .fl { display: block; padding-right: 8px; white-space: pre; }
    .n { display: inline-block; width: 2rem; text-align: right; padding-right: 0.6rem; color: #475569; }
    .w-msg { flex-wrap: wrap; }
    .w-msg code { font-weight: 700; color: var(--text-main); word-break: break-all; }
    .paths { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    .paths td { padding: 4px 6px; border-bottom: 1px solid var(--border-color); word-break: break-all; }
    .paths td:last-child { color: var(--purple); font-weight: 700; }
  `]
})
export class FileSimWidget {
  folder = signal('C:\\Projects\\Tower');
  file = signal('report.txt');
  text = signal('B1,IPE300,6.0');
  content = signal<string | null>(null);
  code = signal('File.ReadAllLines(path)');
  msg = signal('Nothing written yet. What happens if you read now?');
  err = signal(false);

  trimmedFolder = computed(() => this.folder().replace(/[\\/]+$/, ''));
  path = computed(() => (this.trimmedFolder() ? this.trimmedFolder() + '\\' : '') + this.file());
  ext = computed(() => { const i = this.file().lastIndexOf('.'); return i > 0 ? this.file().slice(i) : ''; });
  stem = computed(() => { const i = this.file().lastIndexOf('.'); return i > 0 ? this.file().slice(0, i) : this.file(); });
  lines = computed(() => {
    const c = this.content() ?? '';
    const l = c.split('\n');
    if (l.length && l[l.length - 1] === '') l.pop();
    return l;
  });

  private say(code: string, msg: string, err = false) { this.code.set(code); this.msg.set(msg); this.err.set(err); }

  write() {
    this.content.set(this.text() + '\n');
    this.say(`File.WriteAllText(path, "${this.text()}\\n");`, 'Created the file, or REPLACED everything that was in it.');
  }
  append() {
    const existed = this.content() !== null;
    this.content.set((this.content() ?? '') + this.text() + '\n');
    this.say(`File.AppendAllText(path, "${this.text()}\\n");`, existed ? 'Added to the end; existing text kept.' : 'The file didn’t exist, so it was created.');
  }
  readLines() {
    if (this.content() === null) return this.say('string[] lines = File.ReadAllLines(path);', `FileNotFoundException: Could not find file '${this.path()}'. Check File.Exists first, or catch the exception.`, true);
    this.say('string[] lines = File.ReadAllLines(path);', `lines.Length = ${this.lines().length}. Each line is one string, without the line break.`);
  }
  exists() { this.say('File.Exists(path)', `= ${this.content() !== null}`); }
  del() {
    const had = this.content() !== null;
    this.content.set(null);
    this.say('File.Delete(path);', had ? 'File deleted.' : 'Nothing to delete (Delete doesn’t throw when the file is missing).');
  }
}
