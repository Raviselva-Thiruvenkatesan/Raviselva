import { Component, computed, signal } from '@angular/core';

type Rule = 'finish' | 'start' | 'short';
interface Booking { id: string; what: string; s: number; e: number }
interface Frame { cur: string | null; taken: string[]; rejected: string[]; say: string }

const BOOKINGS: Booking[] = [
  { id: 'A', what: 'Rebar delivery', s: 6, e: 9 },
  { id: 'B', what: 'Formwork', s: 9, e: 12 },
  { id: 'C', what: 'Pump set-up', s: 8, e: 10 },
  { id: 'D', what: 'Steel beams', s: 12, e: 15 },
  { id: 'E', what: 'Roof panels', s: 15, e: 18 },
  { id: 'F', what: 'Glass crate', s: 14, e: 16 },
  { id: 'G', what: 'All-day hire', s: 5, e: 18 },
  { id: 'H', what: 'Generator', s: 10, e: 11 }
];
const T0 = 5, T1 = 18;

const RULES: { id: Rule; label: string; key: (b: Booking) => number }[] = [
  { id: 'finish', label: 'Earliest finish', key: b => b.e },
  { id: 'start', label: 'Earliest start', key: b => b.s },
  { id: 'short', label: 'Shortest first', key: b => b.e - b.s }
];

/** Greedy: consider bookings in the rule's order; take each one that does not clash with what is taken. */
function run(rule: Rule): Frame[] {
  const r = RULES.find(x => x.id === rule)!;
  const order = [...BOOKINGS].sort((x, y) => r.key(x) - r.key(y) || x.e - y.e);
  const taken: Booking[] = [], rejected: string[] = [], f: Frame[] = [];
  f.push({ cur: null, taken: [], rejected: [], say: `Order the requests by “${r.label.toLowerCase()}”: ${order.map(b => b.id).join(', ')}. Take each one that fits, never reconsider.` });
  for (const b of order) {
    const clash = taken.find(t => b.s < t.e && t.s < b.e);
    if (clash) {
      rejected.push(b.id);
      f.push({ cur: b.id, taken: taken.map(t => t.id), rejected: [...rejected], say: `${b.id} (${b.s}–${b.e}) clashes with ${clash.id} (${clash.s}–${clash.e}). Reject.` });
    } else {
      taken.push(b);
      f.push({ cur: b.id, taken: taken.map(t => t.id), rejected: [...rejected], say: `${b.id} (${b.s}–${b.e}) fits. Take it.` });
    }
  }
  f.push({ cur: null, taken: taken.map(t => t.id), rejected, say: '' });
  return f;
}

/** Crane booking requests on a timeline, scheduled greedily by three different rules. */
@Component({
  selector: 'w-interval-scheduler',
  standalone: true,
  template: `
    <div class="widget">
      <div class="w-head"><span class="badge-try">Interactive</span><h3>Greedy crane booking</h3></div>
      <p class="w-hint">One tower crane, eight requests for it (hours of the day). Accept as many as possible without overlaps. Each rule is greedy: it makes the choice that looks best right now. Which rule is right?</p>
      <div class="w-controls" role="group" aria-label="Greedy rule">
        @for (r of rules; track r.id) { <button type="button" class="w-btn" [class.on]="rule() === r.id" (click)="setRule(r.id)" [attr.aria-pressed]="rule() === r.id">{{ r.label }}</button> }
      </div>

      <svg [attr.viewBox]="'0 0 340 ' + (bookings.length * 26 + 30)" class="tl" role="img" [attr.aria-label]="'Accepted: ' + (f().taken.join(', ') || 'none')">
        @for (h of hours; track h) {
          <line [attr.x1]="x(h)" [attr.x2]="x(h)" y1="4" [attr.y2]="bookings.length * 26 + 8" class="grid" />
          <text [attr.x]="x(h)" [attr.y]="bookings.length * 26 + 22" text-anchor="middle" class="hr">{{ h }}</text>
        }
        @for (b of bookings; track b.id; let i = $index) {
          <g [class.taken]="f().taken.includes(b.id)" [class.rej]="f().rejected.includes(b.id)" [class.cur]="b.id === f().cur" class="bar">
            <rect [attr.x]="x(b.s)" [attr.y]="8 + i * 26" [attr.width]="x(b.e) - x(b.s)" height="18" rx="5" />
            <text [attr.x]="label(b).x" [attr.y]="21 + i * 26" [attr.text-anchor]="label(b).anchor" class="lab" [class.out]="label(b).out">{{ b.id }} · {{ b.what }}</text>
          </g>
        }
      </svg>

      <div class="w-controls mt-2">
        <button type="button" class="w-btn primary" (click)="idx.set(idx() + 1)" [disabled]="atEnd()">Step</button>
        <button type="button" class="w-btn" (click)="idx.set(frames().length - 1)">Finish</button>
        <button type="button" class="w-btn" (click)="idx.set(0)">Restart</button>
        <span class="small">Accepted <b>{{ f().taken.length }}</b> · best possible <b>{{ best }}</b></span>
      </div>
      <div class="w-msg" [class.ok]="atEnd() && f().taken.length === best" [class.err]="atEnd() && f().taken.length < best" [class.info]="!atEnd()" aria-live="polite"><span>{{ message() }}</span></div>
    </div>
  `,
  styleUrls: ['./widget.scss'],
  styles: [`
    .tl { width: 100%; max-width: 520px; display: block; margin: 0 auto; }
    .grid { stroke: var(--border-color); stroke-width: 1; stroke-dasharray: 2 3; }
    .hr { font-size: 9px; fill: var(--text-muted); }
    .bar rect { fill: rgba(139, 92, 246, 0.2); stroke: rgba(139, 92, 246, 0.55); stroke-width: 1.2; transition: all 0.2s; }
    .bar .lab { font-size: 10px; font-weight: 700; fill: var(--text-main); }
    .bar.taken rect { fill: rgba(16, 185, 129, 0.45); stroke: #10b981; }
    .bar.rej rect { fill: rgba(239, 68, 68, 0.12); stroke: #ef4444; stroke-dasharray: 4 3; }
    .bar.rej .lab, .bar .lab.out { fill: var(--text-muted); }
    .bar.cur rect { stroke: #f59e0b; stroke-width: 3; }
  `]
})
export class IntervalSchedulerWidget {
  readonly bookings = BOOKINGS;
  readonly rules = RULES;
  readonly hours = Array.from({ length: T1 - T0 + 1 }, (_, i) => T0 + i);
  readonly best = run('finish').at(-1)!.taken.length;
  rule = signal<Rule>('finish');
  idx = signal(0);
  frames = computed(() => run(this.rule()));
  f = computed(() => this.frames()[Math.min(this.idx(), this.frames().length - 1)]);
  atEnd = computed(() => this.idx() >= this.frames().length - 1);
  message = computed(() => {
    const f = this.f();
    if (!this.atEnd()) return f.say;
    const n = f.taken.length;
    if (this.rule() === 'finish') return `${n} bookings: ${f.taken.join(', ')}. Finishing first always leaves the most time for the rest. This greedy rule is provably optimal.`;
    if (this.rule() === 'start') return `Only ${n}: the all-day hire G starts first and blocks everything. A greedy rule that looks sensible can be badly wrong.`;
    return `Only ${n}: the short bookings H, C and F knock out A, B, D and E, four longer bookings that would have fitted one after another. Short is not the same as “leaves the most room”.`;
  });

  x(h: number) { return 10 + ((h - T0) / (T1 - T0)) * 320; }

  /** Put the label inside the bar if it fits, otherwise beside it (right if there is room, else left). */
  label(b: Booking) {
    const w = (b.id.length + 3 + b.what.length) * 5.4 + 8;
    if (this.x(b.e) - this.x(b.s) >= w) return { x: this.x(b.s) + 5, anchor: 'start', out: false };
    if (this.x(b.e) + 4 + w <= 336) return { x: this.x(b.e) + 4, anchor: 'start', out: true };
    return { x: this.x(b.s) - 4, anchor: 'end', out: true };
  }
  setRule(r: Rule) { this.rule.set(r); this.idx.set(0); }
}
