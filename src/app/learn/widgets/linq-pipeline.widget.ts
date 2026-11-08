import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BEAMS, BeamRow } from './beam-data';

type SortKey = 'none' | 'Length' | 'Kg' | 'Mark';
type Proj = 'all' | 'mark' | 'anon';

/** Build a LINQ query step by step and watch the data flow through Where → OrderBy → Select → Take. */
@Component({
  selector: 'w-linq-pipeline',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Build a LINQ query</h3></div>

      <div class="ctrls">
        <label class="w-field"><span><input type="checkbox" [checked]="useWhere()" (change)="useWhere.set(!useWhere())"> Where Length &gt;</span>
          <input class="mono" type="number" step="0.5" style="width:5rem" [ngModel]="minLen()" (ngModelChange)="minLen.set(+$event || 0)" [disabled]="!useWhere()">
        </label>
        <label class="w-field"><span><input type="checkbox" [checked]="useProfile()" (change)="useProfile.set(!useProfile())"> &amp;&amp; Profile ==</span>
          <select [ngModel]="profile()" (ngModelChange)="profile.set($event)" [disabled]="!useProfile()">
            @for (p of profiles; track p) { <option [value]="p">{{ p }}</option> }
          </select>
        </label>
        <label class="w-field">OrderBy
          <select [ngModel]="sort()" (ngModelChange)="sort.set($event)">
            <option value="none">(none)</option><option value="Length">Length</option><option value="Kg">Kg</option><option value="Mark">Mark</option>
          </select>
        </label>
        <label class="w-field"><span><input type="checkbox" [checked]="desc()" (change)="desc.set(!desc())"> Descending</span></label>
        <label class="w-field">Select
          <select [ngModel]="proj()" (ngModelChange)="proj.set($event)">
            <option value="all">whole Beam</option><option value="mark">b.Mark</option><option value="anon">new {{ '{' }} Mark, Kg {{ '}' }}</option>
          </select>
        </label>
        <label class="w-field">Take <input class="mono" type="number" min="0" max="8" style="width:4.5rem" [ngModel]="take()" (ngModelChange)="take.set(+$event || 0)"></label>
      </div>

      <div class="code mono">
        @for (l of code(); track $index) { <div>{{ l }}</div> }
      </div>

      <div class="flow" aria-hidden="true">
        @for (s of stages(); track s.name; let last = $last) {
          <span class="st"><b>{{ s.count }}</b> {{ s.name }}</span>
          @if (!last) { <i class="bi bi-chevron-right"></i> }
        }
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>@for (h of headers(); track h) { <th>{{ h }}</th> }</tr></thead>
          <tbody>
            @for (r of rows(); track $index) { <tr>@for (c of r; track $index) { <td class="mono">{{ c }}</td> }</tr> }
            @empty { <tr><td [attr.colspan]="headers().length" class="text-muted">empty sequence</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .ctrls { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 0.8rem; align-items: flex-end; }
    .ctrls .w-field span { display: inline-flex; gap: 4px; align-items: center; }
    .code { padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.8rem; overflow-x: auto; white-space: pre; line-height: 1.6; }
    .flow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 0.7rem 0; font-size: 0.8rem; color: var(--text-muted); }
    .st { padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-main); }
    .st b { color: var(--purple); }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th, td { padding: 5px 10px; border-bottom: 1px solid var(--border-color); text-align: left; }
    th { background: rgba(139, 92, 246, 0.08); }
  `]
})
export class LinqPipelineWidget {
  profiles = ['IPE200', 'IPE300', 'HEA200'];
  useWhere = signal(true);
  minLen = signal(5);
  useProfile = signal(false);
  profile = signal('IPE300');
  sort = signal<SortKey>('Kg');
  desc = signal(true);
  proj = signal<Proj>('anon');
  take = signal(3);

  private filtered = computed(() => BEAMS.filter(b =>
    (!this.useWhere() || b.Length > this.minLen()) && (!this.useProfile() || b.Profile === this.profile())));

  private sorted = computed(() => {
    const k = this.sort();
    if (k === 'none') return this.filtered();
    const dir = this.desc() ? -1 : 1;
    return [...this.filtered()].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * dir);
  });

  private taken = computed(() => this.sorted().slice(0, Math.max(0, this.take())));

  stages = computed(() => {
    const s = [{ name: 'beams', count: BEAMS.length }];
    if (this.useWhere() || this.useProfile()) s.push({ name: 'Where', count: this.filtered().length });
    if (this.sort() !== 'none') s.push({ name: this.desc() ? 'OrderByDescending' : 'OrderBy', count: this.sorted().length });
    if (this.proj() !== 'all') s.push({ name: 'Select', count: this.sorted().length });
    s.push({ name: `Take(${this.take()})`, count: this.taken().length });
    return s;
  });

  headers = computed(() => (this.proj() === 'all' ? ['Mark', 'Profile', 'Length', 'Level', 'Kg'] : this.proj() === 'mark' ? ['string'] : ['Mark', 'Kg']));

  rows = computed(() => this.taken().map((b: BeamRow) =>
    this.proj() === 'all' ? [b.Mark, b.Profile, String(b.Length), String(b.Level), String(b.Kg)]
      : this.proj() === 'mark' ? [`"${b.Mark}"`] : [b.Mark, String(b.Kg)]));

  code = computed(() => {
    const conds: string[] = [];
    if (this.useWhere()) conds.push(`b.Length > ${this.minLen()}`);
    if (this.useProfile()) conds.push(`b.Profile == "${this.profile()}"`);
    const lines = ['var result = beams'];
    if (conds.length) lines.push(`    .Where(b => ${conds.join(' && ')})`);
    if (this.sort() !== 'none') lines.push(`    .${this.desc() ? 'OrderByDescending' : 'OrderBy'}(b => b.${this.sort()})`);
    if (this.proj() === 'mark') lines.push('    .Select(b => b.Mark)');
    if (this.proj() === 'anon') lines.push('    .Select(b => new { b.Mark, b.Kg })');
    lines.push(`    .Take(${this.take()})`, '    .ToList();');
    return lines;
  });
}
