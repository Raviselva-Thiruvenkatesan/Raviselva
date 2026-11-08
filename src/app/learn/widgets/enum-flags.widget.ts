import { Component, computed, signal } from '@angular/core';

const STATUS = ['Draft', 'InReview', 'Approved', 'Fabricated', 'Erected'];
const FLAGS = [
  { name: 'Read', value: 1 },
  { name: 'Write', value: 2 },
  { name: 'Export', value: 4 },
  { name: 'Delete', value: 8 }
];

/** Plain enums are named numbers; [Flags] enums combine bits. */
@Component({
  selector: 'w-enum-flags',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Enums are named numbers</h3></div>

      <div class="w-label">enum MemberStatus</div>
      <div class="steps" role="group" aria-label="Status">
        @for (s of status; track s; let i = $index) {
          <button type="button" class="st" [class.on]="st() === i" [class.past]="i < st()" (click)="st.set(i)" [attr.aria-pressed]="st() === i">
            <span class="mono">{{ s }}</span><small class="mono">= {{ i }}</small>
          </button>
        }
      </div>
      <div class="code mono">
        MemberStatus s = MemberStatus.{{ status[st()] }};<br>
        s.ToString() <span class="c">→ "{{ status[st()] }}"</span> · (int)s <span class="c">→ {{ st() }}</span> · s &gt; MemberStatus.InReview <span class="c">→ {{ st() > 1 ? 'true' : 'false' }}</span>
      </div>

      <div class="w-label mt-3">[Flags] enum Permission: each value is one bit</div>
      <div class="flags" role="group" aria-label="Permissions">
        @for (f of flags; track f.name) {
          <label class="flag" [class.on]="has(f.value)">
            <input type="checkbox" [checked]="has(f.value)" (change)="toggle(f.value)">
            <span class="mono">{{ f.name }}</span>
            <small class="mono">= {{ f.value }} ({{ bin(f.value) }})</small>
          </label>
        }
      </div>
      <div class="bits" aria-hidden="true">
        @for (b of [8, 4, 2, 1]; track b) { <span class="bit" [class.on]="has(b)">{{ has(b) ? 1 : 0 }}</span> }
      </div>
      <div class="code mono">
        Permission p = {{ expr() }};<br>
        (int)p <span class="c">→ {{ mask() }}</span> · p.ToString() <span class="c">→ "{{ text() }}"</span> · p.HasFlag(Permission.Write) <span class="c">→ {{ has(2) ? 'true' : 'false' }}</span>
      </div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .steps { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 0.7rem; }
    .st { display: flex; flex-direction: column; align-items: center; padding: 6px 10px; border-radius: 10px; border: 2px solid var(--border-color); background: var(--bg-main); color: var(--text-main); cursor: pointer; font-size: 0.82rem; }
    .st small { color: var(--text-muted); font-size: 0.7rem; }
    .st.past { border-color: rgba(16, 185, 129, 0.45); }
    .st.on { border-color: var(--purple); background: rgba(139, 92, 246, 0.14); color: var(--purple); font-weight: 700; }
    .code { padding: 0.6rem 0.9rem; border-radius: 10px; background: #0b1020; color: #e2e8f0; font-size: 0.83rem; line-height: 1.8; overflow-x: auto; }
    .c { color: #c3e88d; }
    .flags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0.6rem; }
    .flag { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 10px; border: 2px solid var(--border-color); cursor: pointer; font-size: 0.85rem; }
    .flag small { color: var(--text-muted); font-size: 0.7rem; }
    .flag.on { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .flag input { accent-color: #10b981; }
    .bits { display: flex; gap: 4px; margin-bottom: 0.6rem; }
    .bit { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 6px; font-family: 'Cascadia Code', Consolas, monospace; font-weight: 700; border: 1.5px solid var(--border-color); color: var(--text-muted); }
    .bit.on { background: #10b981; border-color: #10b981; color: #fff; }
  `]
})
export class EnumFlagsWidget {
  status = STATUS;
  flags = FLAGS;
  st = signal(2);
  mask = signal(1 | 4);

  has(v: number) { return (this.mask() & v) === v; }
  toggle(v: number) { this.mask.update(m => m ^ v); }
  bin(v: number) { return v.toString(2).padStart(4, '0'); }

  private names = computed(() => FLAGS.filter(f => this.has(f.value)).map(f => f.name));
  expr = computed(() => this.names().map(n => 'Permission.' + n).join(' | ') || '0');
  text = computed(() => this.names().join(', ') || '0');
}
