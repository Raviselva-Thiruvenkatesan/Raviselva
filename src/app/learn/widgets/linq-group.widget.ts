import { Component, computed, signal } from '@angular/core';
import { BEAMS, BeamRow } from './beam-data';

type Key = 'Profile' | 'Level';

/** GroupBy with aggregates, and a demo of deferred execution vs ToList(). */
@Component({
  selector: 'w-linq-group',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Grouping and deferred execution</h3></div>

      <div class="w-controls" role="group" aria-label="Group key">
        <span class="small text-muted">GroupBy(b =&gt; b.</span>
        <button type="button" class="w-btn mono" [class.on]="key() === 'Profile'" (click)="key.set('Profile')" [attr.aria-pressed]="key() === 'Profile'">Profile</button>
        <button type="button" class="w-btn mono" [class.on]="key() === 'Level'" (click)="key.set('Level')" [attr.aria-pressed]="key() === 'Level'">Level</button>
        <span class="small text-muted">)</span>
      </div>
      <div class="code mono">
        <div>var summary = beams.GroupBy(b =&gt; b.{{ key() }})</div>
        <div>    .Select(g =&gt; new {{ '{' }} g.Key, Count = g.Count(), TotalKg = g.Sum(b =&gt; b.Kg), MaxLen = g.Max(b =&gt; b.Length) {{ '}' }});</div>
      </div>
      <div class="groups">
        @for (g of groups(); track g.key) {
          <div class="grp">
            <div class="gk mono">Key = {{ key() === 'Profile' ? '"' + g.key + '"' : g.key }}</div>
            <div class="items">@for (b of g.items; track b.Mark) { <span class="mono">{{ b.Mark }}</span> }</div>
            <div class="agg mono">Count {{ g.items.length }} · TotalKg {{ g.kg }} · MaxLen {{ g.max }}</div>
          </div>
        }
      </div>

      <div class="w-label mt-4">Deferred execution</div>
      <div class="code mono">
        <div>var list = new List&lt;Beam&gt;(beams);</div>
        <div>var longOnes = list.Where(b =&gt; b.Length &gt; 7){{ snapshot() ? '.ToList()' : '' }};   <span class="c">// {{ snapshot() ? 'runs NOW, result stored' : 'only a recipe: nothing runs yet' }}</span></div>
        @if (added()) { <div>list.Add(new Beam("B9", Length: 7.5));</div> }
        <div>Console.WriteLine(longOnes.Count());</div>
      </div>
      <div class="w-controls mt-2">
        <label class="small d-inline-flex gap-1 align-items-center"><input type="checkbox" [checked]="snapshot()" (change)="snapshot.set(!snapshot())"> add <span class="mono">.ToList()</span></label>
        <button type="button" class="w-btn mono" (click)="added.set(!added())">{{ added() ? 'undo list.Add(B9)' : 'list.Add(B9, 7.5 m)' }}</button>
      </div>
      <div class="w-msg info" aria-live="polite"><i class="bi bi-hourglass-split" aria-hidden="true"></i><span>Prints <strong class="mono">{{ deferredCount() }}</strong>. {{ deferredWhy() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .code { padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.78rem; overflow-x: auto; white-space: pre; line-height: 1.6; }
    .c { color: #64748b; }
    .groups { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); margin-top: 0.8rem; }
    .grp { padding: 10px; border-radius: 12px; border: 2px solid rgba(139, 92, 246, 0.45); background: rgba(139, 92, 246, 0.05); display: grid; gap: 6px; animation: pop 0.3s ease-out; }
    .gk { font-weight: 700; color: var(--purple); }
    .items { display: flex; flex-wrap: wrap; gap: 4px; }
    .items span { font-size: 0.75rem; padding: 2px 7px; border-radius: 6px; background: var(--bg-main); border: 1px solid var(--border-color); }
    .agg { font-size: 0.75rem; color: var(--text-muted); }
    @keyframes pop { from { transform: scale(0.9); opacity: 0; } }
  `]
})
export class LinqGroupWidget {
  key = signal<Key>('Profile');
  snapshot = signal(false);
  added = signal(true);

  groups = computed(() => {
    const k = this.key();
    const map = new Map<string, BeamRow[]>();
    for (const b of BEAMS) {
      const key = String(b[k]);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return [...map].map(([key, items]) => ({
      key, items,
      kg: items.reduce((s, b) => s + b.Kg, 0),
      max: Math.max(...items.map(b => b.Length))
    }));
  });

  private base = BEAMS.filter(b => b.Length > 7).length;
  deferredCount = computed(() => this.base + (this.added() && !this.snapshot() ? 1 : 0));
  deferredWhy = computed(() => {
    if (!this.added()) return 'Nothing was added, so both versions agree.';
    return this.snapshot()
      ? 'ToList() ran the query immediately and stored the result, so the beam added afterwards is not in it.'
      : 'Where only stores the recipe. It actually runs when Count() enumerates it, after B9 was added, so B9 is included. Each enumeration runs the query again.';
  });
}
